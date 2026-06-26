import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import type { Firestore } from 'firebase-admin/firestore';

let _db: Firestore | null = null;
async function getDb() {
  if (_db) return _db;
  const admin = await import('firebase-admin/app');
  const firestore = await import('firebase-admin/firestore');
  if (admin.getApps().length === 0) {
    admin.initializeApp({ credential: admin.applicationDefault() });
  }
  _db = firestore.getFirestore();
  return _db;
}

async function verifyFirebaseUser(req: express.Request, uid: string): Promise<boolean> {
  const authHeader = req.header('authorization') || '';
  const [, token] = authHeader.match(/^Bearer (.+)$/) || [];
  if (!token) return false;

  try {
    const auth = await import('firebase-admin/auth');
    const decoded = await auth.getAuth().verifyIdToken(token);
    return decoded.uid === uid;
  } catch (e) {
    console.warn('Firebase auth verification failed:', e);
    return false;
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

async function resolveUid(db: Firestore, identifier: string): Promise<string> {
  const slugSnap = await db.doc(`slugs/${identifier}`).get();
  if (slugSnap.exists) {
    return slugSnap.data()!['uid'];
  }
  return identifier;
}

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine({
  trustProxyHeaders: true,
});

// Allow Firebase Auth popups to communicate back to the opener window.
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

/**
 * Liveness/readiness probe for Cloud Run (and any container orchestrator).
 */
app.get('/healthz', (_req, res) => {
  res.status(200).json({status: 'ok'});
});

/**
 * Public API: load a user's published site data (no auth required).
 */
app.get('/api/site/:uid', async (req, res) => {
  try {
    const db = await getDb();
    const uid = await resolveUid(db, req.params.uid);
    const mainSnap = await db.doc(`users/${uid}/businessData/main`).get();
    if (!mainSnap.exists) {
      res.status(404).json({ error: 'Site not found' });
      return;
    }
    const data = mainSnap.data()!;
    if (!data['isSetupComplete']) {
      res.status(404).json({ error: 'Site not published yet' });
      return;
    }

    const paySnap = await db.doc(`users/${uid}/businessData/payments`).get();
    const subSnap = await db.doc(`subscriptions/${uid}`).get();
    const hideBranding = subSnap.exists && subSnap.data()?.['tier'] === 'business';

    res.json({
      profile: data['profile'],
      services: data['services'] || [],
      testimonials: data['testimonials'] || [],
      faqs: data['faqs'] || [],
      customization: data['customization'],
      paymentSettings: paySnap.exists ? paySnap.data() : null,
      hideBranding,
    });
  } catch (e) {
    console.error('Error loading site:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Public API: load a single published content page by slug.
 */
app.get('/api/site/:uid/pages/:slug', async (req, res) => {
  try {
    const db = await getDb();
    const uid = await resolveUid(db, req.params.uid);
    const { slug } = req.params;
    const mainSnap = await db.doc(`users/${uid}/businessData/main`).get();
    if (!mainSnap.exists || !mainSnap.data()!['isSetupComplete']) {
      res.status(404).json({ error: 'Site not found' });
      return;
    }
    const pagesSnap = await db.doc(`users/${uid}/businessData/pages`).get();
    if (!pagesSnap.exists) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }
    const pages: Array<{ slug: string; published: boolean; title: string; content: string }> = pagesSnap.data()!['pages'] || [];
    const page = pages.find(p => p.slug === slug && p.published);
    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }
    res.json({ title: page.title, content: page.content, slug: page.slug });
  } catch (e) {
    console.error('Error loading page:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

const enquiryAttempts = new Map<string, { count: number; resetAt: number }>();
const ENQUIRY_WINDOW_MS = 60_000;
const ENQUIRY_LIMIT = 5;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const current = enquiryAttempts.get(key);
  if (!current || current.resetAt <= now) {
    enquiryAttempts.set(key, { count: 1, resetAt: now + ENQUIRY_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > ENQUIRY_LIMIT;
}

function asTrimmedString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function sanitizeFormData(value: unknown): Record<string, { label: string; value: string; type: string }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>).slice(0, 30);
  return Object.fromEntries(entries.map(([key, raw]) => {
    const item = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    return [key.slice(0, 80), {
      label: asTrimmedString(item['label'], 120),
      value: asTrimmedString(item['value'], 1000),
      type: asTrimmedString(item['type'], 40),
    }];
  }));
}

/**
 * Public API: submit an enquiry to a user's site (no auth required).
 */
app.post('/api/site/:uid/enquiry', express.json(), async (req, res) => {
  try {
    const db = await getDb();
    const uid = await resolveUid(db, req.params.uid);
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(`${uid}:${ip}`)) {
      res.status(429).json({ error: 'Too many enquiries. Please try again shortly.' });
      return;
    }

    const mainRef = db.doc(`users/${uid}/businessData/main`);

    const body = req.body;
    const email = asTrimmedString(body.email, 200);
    const name = asTrimmedString(body.name, 200);
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'A valid name and email are required' });
      return;
    }

    const enquiry = {
      id: randomUUID(),
      date: new Date().toISOString(),
      status: 'New',
      name,
      email,
      phone: asTrimmedString(body.phone, 50),
      serviceInterest: asTrimmedString(body.serviceInterest, 200) || 'Other',
      preferredDateTime: asTrimmedString(body.preferredDateTime, 100),
      urgency: 'Medium',
      message: asTrimmedString(body.message, 5000),
      leadScore: 'Warm',
      nextAction: 'Review and reply',
      formData: sanitizeFormData(body.formData),
    };

    const activity = {
      id: randomUUID(),
      type: 'enquiry_received',
      title: 'New Enquiry Received',
      description: `${enquiry.name} requested ${enquiry.serviceInterest}`,
      date: new Date().toISOString(),
    };

    await db.runTransaction(async transaction => {
      const mainSnap = await transaction.get(mainRef);
      if (!mainSnap.exists) throw new Error('SITE_NOT_FOUND');

      const data = mainSnap.data() || {};
      transaction.set(mainRef, {
        ...data,
        enquiries: [enquiry, ...(Array.isArray(data['enquiries']) ? data['enquiries'] : [])],
        activities: [activity, ...(Array.isArray(data['activities']) ? data['activities'] : [])],
      });
    });
    res.json({ success: true });

    // Fire-and-forget email notification
    (async () => {
      const notifSnap = await db.doc(`users/${uid}/businessData/notifications`).get();
      if (!notifSnap.exists) return;
      const prefs = notifSnap.data()!;
      if (!prefs['emailOnNewEnquiry'] || !prefs['notificationEmail']) return;

      const smtpHost = process.env['SMTP_HOST'];
      const smtpPort = process.env['SMTP_PORT'];
      const smtpUser = process.env['SMTP_USER'];
      const smtpPass = process.env['SMTP_PASS'];
      const smtpFrom = process.env['SMTP_FROM'];
      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpFrom) return;

      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Number(smtpPort) === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: smtpFrom,
        to: prefs['notificationEmail'],
        subject: `New Enquiry from ${enquiry.name}`,
        text: [
          `Name: ${enquiry.name}`,
          `Email: ${enquiry.email}`,
          `Phone: ${enquiry.phone || 'N/A'}`,
          `Service: ${enquiry.serviceInterest}`,
          `Message: ${enquiry.message}`,
        ].join('\n'),
      });
    })().catch(err => console.warn('Notification email failed:', err));

  } catch (e) {
    if (e instanceof Error && e.message === 'SITE_NOT_FOUND') {
      res.status(404).json({ error: 'Site not found' });
      return;
    }
    console.error('Error submitting enquiry:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Authenticated API: claim a URL slug for a user's site.
 */
app.post('/api/slugs/claim', express.json(), async (req, res) => {
  try {
    const { uid, name } = req.body;
    if (typeof uid !== 'string' || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }
    if (!await verifyFirebaseUser(req, uid)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const db = await getDb();
    let slug = generateSlug(name);
    if (!slug) {
      res.status(400).json({ error: 'Could not generate a URL from that name' });
      return;
    }

    const mainSnap = await db.doc(`users/${uid}/businessData/main`).get();
    const existingSlug = mainSnap.exists ? mainSnap.data()?.['siteSlug'] : null;

    if (existingSlug === slug) {
      res.json({ slug });
      return;
    }

    let candidate = slug;
    let suffix = 2;
    while (suffix <= 20) {
      const slugSnap = await db.doc(`slugs/${candidate}`).get();
      if (!slugSnap.exists || slugSnap.data()?.['uid'] === uid) break;
      candidate = `${slug}-${suffix}`;
      suffix++;
    }
    if (suffix > 20) {
      res.status(409).json({ error: 'Too many similar names — try a different business name' });
      return;
    }

    if (existingSlug && existingSlug !== candidate) {
      await db.doc(`slugs/${existingSlug}`).delete();
    }

    await db.doc(`slugs/${candidate}`).set({ uid, claimedAt: new Date().toISOString() });

    if (mainSnap.exists) {
      const data = mainSnap.data() || {};
      await db.doc(`users/${uid}/businessData/main`).set({ ...data, siteSlug: candidate });
    }

    res.json({ slug: candidate });
  } catch (e) {
    console.error('Slug claim error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- App admin endpoints (owner-only) ---

async function verifyAdmin(req: express.Request): Promise<string | null> {
  const authHeader = req.header('authorization') || '';
  const [, token] = authHeader.match(/^Bearer (.+)$/) || [];
  if (!token) return null;
  try {
    const auth = await import('firebase-admin/auth');
    const decoded = await auth.getAuth().verifyIdToken(token);
    const adminUids = (process.env['ADMIN_UIDS'] || '').split(',').map(s => s.trim()).filter(Boolean);
    return adminUids.includes(decoded.uid) ? decoded.uid : null;
  } catch {
    return null;
  }
}

app.get('/api/admin/verify', async (req, res) => {
  const uid = await verifyAdmin(req);
  if (!uid) { res.status(403).json({ error: 'Not authorized' }); return; }
  res.json({ admin: true, uid });
});

app.get('/api/admin/users', async (req, res) => {
  if (!await verifyAdmin(req)) { res.status(403).json({ error: 'Not authorized' }); return; }
  try {
    const db = await getDb();
    const usersSnap = await db.collection('users').get();
    const users = [];
    for (const userDoc of usersSnap.docs) {
      const data = userDoc.data();
      const mainSnap = await db.doc(`users/${userDoc.id}/businessData/main`).get();
      const subSnap = await db.doc(`subscriptions/${userDoc.id}`).get();
      const mainData = mainSnap.exists ? mainSnap.data() : null;
      users.push({
        uid: userDoc.id,
        email: data['email'] || '',
        displayName: data['displayName'] || '',
        createdAt: data['createdAt'] || '',
        isSetupComplete: mainData?.['isSetupComplete'] || false,
        businessName: mainData?.['profile']?.['name'] || '',
        siteSlug: mainData?.['siteSlug'] || '',
        tier: subSnap.exists ? subSnap.data()?.['tier'] || 'free' : 'free',
        enquiryCount: mainData ? (Array.isArray(mainData['enquiries']) ? mainData['enquiries'].length : 0) : 0,
        serviceCount: mainData ? (Array.isArray(mainData['services']) ? mainData['services'].length : 0) : 0,
      });
    }
    res.json({ users });
  } catch (e) {
    console.error('Admin users error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/metrics', async (req, res) => {
  if (!await verifyAdmin(req)) { res.status(403).json({ error: 'Not authorized' }); return; }
  try {
    const db = await getDb();
    const usersSnap = await db.collection('users').get();
    let totalUsers = usersSnap.size;
    let setupComplete = 0;
    let totalEnquiries = 0;
    let totalServices = 0;
    let proUsers = 0;
    let businessUsers = 0;
    for (const userDoc of usersSnap.docs) {
      const mainSnap = await db.doc(`users/${userDoc.id}/businessData/main`).get();
      if (mainSnap.exists) {
        const d = mainSnap.data()!;
        if (d['isSetupComplete']) setupComplete++;
        totalEnquiries += Array.isArray(d['enquiries']) ? d['enquiries'].length : 0;
        totalServices += Array.isArray(d['services']) ? d['services'].length : 0;
      }
      const subSnap = await db.doc(`subscriptions/${userDoc.id}`).get();
      if (subSnap.exists) {
        const tier = subSnap.data()?.['tier'];
        if (tier === 'pro') proUsers++;
        if (tier === 'business') businessUsers++;
      }
    }
    res.json({ totalUsers, setupComplete, totalEnquiries, totalServices, proUsers, businessUsers });
  } catch (e) {
    console.error('Admin metrics error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/discounts', async (req, res) => {
  if (!await verifyAdmin(req)) { res.status(403).json({ error: 'Not authorized' }); return; }
  try {
    const db = await getDb();
    const snap = await db.collection('discounts').get();
    const discounts = snap.docs.map(d => ({ code: d.id, ...d.data() }));
    res.json({ discounts });
  } catch (e) {
    console.error('Admin discounts error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/discounts', express.json(), async (req, res) => {
  if (!await verifyAdmin(req)) { res.status(403).json({ error: 'Not authorized' }); return; }
  try {
    const db = await getDb();
    const { code, type, value, expiresAt, maxUses, applicableTiers } = req.body;
    if (!code || !type || value == null) {
      res.status(400).json({ error: 'code, type, and value are required' });
      return;
    }
    const existing = await db.doc(`discounts/${code}`).get();
    if (existing.exists) {
      res.status(409).json({ error: 'Discount code already exists' });
      return;
    }
    await db.doc(`discounts/${code}`).set({
      type,
      value: Number(value),
      expiresAt: expiresAt || null,
      maxUses: maxUses ? Number(maxUses) : null,
      usedCount: 0,
      applicableTiers: applicableTiers || ['pro', 'business'],
      active: true,
      createdAt: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (e) {
    console.error('Admin create discount error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/discounts/:code', async (req, res) => {
  if (!await verifyAdmin(req)) { res.status(403).json({ error: 'Not authorized' }); return; }
  try {
    const db = await getDb();
    await db.doc(`discounts/${req.params.code}`).delete();
    res.json({ success: true });
  } catch (e) {
    console.error('Admin delete discount error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Authenticated API: delete a user's account and all data.
 */
app.delete('/api/account/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    if (!await verifyFirebaseUser(req, uid)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const db = await getDb();

    const subDocs = ['main', 'pages', 'notifications', 'payments', 'templates'];
    for (const subDoc of subDocs) {
      await db.doc(`users/${uid}/businessData/${subDoc}`).delete();
    }
    await db.doc(`users/${uid}`).delete();
    await db.doc(`subscriptions/${uid}`).delete();

    const slugsSnap = await db.collection('slugs').where('uid', '==', uid).get();
    for (const slugDoc of slugsSnap.docs) {
      await slugDoc.ref.delete();
    }

    try {
      const auth = await import('firebase-admin/auth');
      await auth.getAuth().deleteUser(uid);
    } catch (e) {
      console.warn('Could not delete Firebase Auth user:', e);
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Account deletion error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- AI generation endpoint ---

const aiRateLimits = new Map<string, { count: number; resetAt: number }>();
const AI_WINDOW_MS = 60_000;
const AI_LIMIT = 20;

function isAiRateLimited(uid: string): boolean {
  const now = Date.now();
  const current = aiRateLimits.get(uid);
  if (!current || current.resetAt <= now) {
    aiRateLimits.set(uid, { count: 1, resetAt: now + AI_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > AI_LIMIT;
}

app.post('/api/ai/generate', express.json(), async (req, res) => {
  try {
    const { uid, prompt, systemPrompt } = req.body;
    if (typeof uid !== 'string' || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }
    if (!await verifyFirebaseUser(req, uid)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) {
      res.json({ text: null, fallback: true });
      return;
    }

    if (isAiRateLimited(uid)) {
      res.status(429).json({ error: 'Too many AI requests. Please try again shortly.' });
      return;
    }

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: systemPrompt ? { systemInstruction: systemPrompt } : undefined,
      });
      const generatedText = response.text ?? null;
      res.json({ text: generatedText });
    } catch (aiErr) {
      console.warn('AI generation failed:', aiErr);
      res.json({ text: null, fallback: true });
    }
  } catch (e) {
    console.error('AI endpoint error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Stripe subscription endpoints ---

let _stripe: Stripe | null = null;
async function getStripe(): Promise<Stripe> {
  if (_stripe) return _stripe;
  const { default: Stripe } = await import('stripe');
  const secretKey = process.env['STRIPE_SECRET_KEY'];
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }
  _stripe = new Stripe(secretKey);
  return _stripe;
}

const PRICE_IDS: Record<string, string> = {
  pro: process.env['STRIPE_PRICE_ID_PRO'] || process.env['STRIPE_PRO_PRICE_ID'] || '',
  business: process.env['STRIPE_PRICE_ID_BUSINESS'] || process.env['STRIPE_BUSINESS_PRICE_ID'] || '',
};

app.post('/api/stripe/create-checkout-session', express.json(), async (req, res) => {
  try {
    const stripe = await getStripe();
    const { uid, tier } = req.body;
    if (typeof uid !== 'string' || typeof tier !== 'string' || !PRICE_IDS[tier]) {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }
    if (!await verifyFirebaseUser(req, uid)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const db = await getDb();
    const userSnap = await db.doc(`users/${uid}`).get();
    const email = userSnap.exists ? userSnap.data()?.['email'] : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_IDS[tier], quantity: 1 }],
      success_url: `${req.headers.origin || req.protocol + '://' + req.headers.host}/admin/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || req.protocol + '://' + req.headers.host}/pricing`,
      client_reference_id: uid,
      customer_email: email,
      metadata: { uid, tier },
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error('Checkout session error:', e);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

app.post('/api/stripe/customer-portal', express.json(), async (req, res) => {
  try {
    const stripe = await getStripe();
    const { uid } = req.body;
    if (typeof uid !== 'string') {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }
    if (!await verifyFirebaseUser(req, uid)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const db = await getDb();
    const subSnap = await db.doc(`subscriptions/${uid}`).get();
    if (!subSnap.exists || !subSnap.data()?.['stripeCustomerId']) {
      res.status(400).json({ error: 'No subscription found' });
      return;
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: subSnap.data()!['stripeCustomerId'],
      return_url: `${req.headers.origin || req.protocol + '://' + req.headers.host}/admin/settings`,
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error('Portal error:', e);
    res.status(500).json({ error: 'Failed to open portal' });
  }
});

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const stripe = await getStripe();
    const db = await getDb();
    const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];
    if (!webhookSecret) {
      res.status(500).json({ error: 'Webhook secret is not configured' });
      return;
    }

    const signature = req.header('stripe-signature');
    if (!signature) {
      res.status(400).json({ error: 'Missing Stripe signature' });
      return;
    }

    const parsed = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);

    if (parsed.type === 'checkout.session.completed') {
      const session = parsed.data.object;
      const uid = session.client_reference_id || session.metadata?.['uid'];
      const tier = session.metadata?.['tier'] || 'pro';
      if (uid) {
        await db.doc(`subscriptions/${uid}`).set({
          tier,
          status: 'active',
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        });
      }
    }

    if (parsed.type === 'customer.subscription.updated' || parsed.type === 'customer.subscription.deleted') {
      const sub = parsed.data.object as Stripe.Subscription & { current_period_end?: number };
      const customerId = sub.customer;
      const subsSnap = await db.collection('subscriptions').where('stripeCustomerId', '==', customerId).get();
      if (!subsSnap.empty) {
        const docRef = subsSnap.docs[0].ref;
        if (parsed.type === 'customer.subscription.deleted') {
          await docRef.update({ tier: 'free', status: 'canceled', cancelAtPeriodEnd: false });
        } else {
          await docRef.update({
            status: sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : sub.status,
            cancelAtPeriodEnd: sub.cancel_at_period_end || false,
            currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          });
        }
      }
    }

    res.json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    res.status(400).json({ error: 'Webhook failed' });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * Cloud Run injects the `PORT` env var (defaults to 8080); fall back to 4000 for
 * local runs. Binding to 0.0.0.0 is required so the container accepts traffic.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = Number(process.env['PORT']) || 4000;
  app.listen(port, '0.0.0.0', (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://0.0.0.0:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
