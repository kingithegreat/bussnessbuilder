import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import { randomUUID } from 'node:crypto';
import { dispatchEnquiryWebhook } from './server-webhook';
import { initServerMonitoring, captureServerError } from './server-monitoring';
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

// Initialise error monitoring (no-op unless SENTRY_DSN is set).
void initServerMonitoring();

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
    console.error('Error loading site:', e); captureServerError(e);
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
    const pages: { slug: string; published: boolean; title: string; content: string }[] = pagesSnap.data()!['pages'] || [];
    const page = pages.find(p => p.slug === slug && p.published);
    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }
    res.json({ title: page.title, content: page.content, slug: page.slug });
  } catch (e) {
    console.error('Error loading page:', e); captureServerError(e);
    res.status(500).json({ error: 'Server error' });
  }
});

class RateLimitStore {
  private store = new Map<string, { count: number; resetAt: number }>();
  private readonly maxEntries: number;

  constructor(maxEntries = 10_000) {
    this.maxEntries = maxEntries;
    setInterval(() => this.sweep(), 60_000).unref();
  }

  isLimited(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const current = this.store.get(key);
    if (!current || current.resetAt <= now) {
      if (this.store.size >= this.maxEntries) this.sweep();
      if (this.store.size >= this.maxEntries) return true;
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }
    current.count += 1;
    return current.count > limit;
  }

  private sweep() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.resetAt <= now) this.store.delete(key);
    }
  }
}

const rateLimiter = new RateLimitStore();

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
    if (rateLimiter.isLimited(`enq:${uid}:${ip}`, 5, 60_000)) {
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

    // Fire-and-forget outbound webhook (gated on the same new-enquiry opt-in)
    (async () => {
      const url = process.env['ENQUIRY_WEBHOOK_URL'];
      if (!url) return;
      const notifSnap = await db.doc(`users/${uid}/businessData/notifications`).get();
      const prefs = notifSnap.exists ? notifSnap.data()! : null;
      const result = await dispatchEnquiryWebhook({ url, prefs, uid, enquiry });
      if (!result.delivered && result.status !== undefined) {
        console.warn(`Enquiry webhook returned HTTP ${result.status}`);
      }
    })().catch(err => console.warn('Enquiry webhook failed:', err));

  } catch (e) {
    if (e instanceof Error && e.message === 'SITE_NOT_FOUND') {
      res.status(404).json({ error: 'Site not found' });
      return;
    }
    console.error('Error submitting enquiry:', e); captureServerError(e);
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
    const slug = generateSlug(name);
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
    console.error('Slug claim error:', e); captureServerError(e);
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
    console.error('Admin users error:', e); captureServerError(e);
    res.status(500).json({ error: 'Server error' });
  }
});

let metricsCache: { data: unknown; expiresAt: number } | null = null;

app.get('/api/admin/metrics', async (req, res) => {
  if (!await verifyAdmin(req)) { res.status(403).json({ error: 'Not authorized' }); return; }
  try {
    if (metricsCache && metricsCache.expiresAt > Date.now()) {
      res.json(metricsCache.data);
      return;
    }
    const db = await getDb();
    const usersSnap = await db.collection('users').get();
    const totalUsers = usersSnap.size;
    let setupComplete = 0;
    let totalEnquiries = 0;
    let totalServices = 0;
    let proUsers = 0;
    let businessUsers = 0;
    const signupsByDate: Record<string, number> = {};
    const enquiriesByDate: Record<string, number> = {};
    const recentUsers: { uid: string; email: string; displayName: string; businessName: string; tier: string; createdAt: string; siteSlug: string }[] = [];
    const tierBreakdown = { free: 0, pro: 0, business: 0 };
    let totalTestimonials = 0;
    let totalFaqs = 0;
    const totalPageViews = 0;

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const createdAt = userData['createdAt'] || '';
      if (createdAt) {
        const dateKey = createdAt.slice(0, 10);
        signupsByDate[dateKey] = (signupsByDate[dateKey] || 0) + 1;
      }

      const mainSnap = await db.doc(`users/${userDoc.id}/businessData/main`).get();
      let businessName = '';
      let siteSlug = '';
      if (mainSnap.exists) {
        const d = mainSnap.data()!;
        if (d['isSetupComplete']) setupComplete++;
        businessName = d['profile']?.['name'] || '';
        siteSlug = d['siteSlug'] || '';
        const enquiries = Array.isArray(d['enquiries']) ? d['enquiries'] : [];
        totalEnquiries += enquiries.length;
        totalServices += Array.isArray(d['services']) ? d['services'].length : 0;
        totalTestimonials += Array.isArray(d['testimonials']) ? d['testimonials'].length : 0;
        totalFaqs += Array.isArray(d['faqs']) ? d['faqs'].length : 0;
        for (const enq of enquiries) {
          if (enq['date']) {
            const eDateKey = enq['date'].slice(0, 10);
            enquiriesByDate[eDateKey] = (enquiriesByDate[eDateKey] || 0) + 1;
          }
        }
      }

      let tier = 'free';
      const subSnap = await db.doc(`subscriptions/${userDoc.id}`).get();
      if (subSnap.exists) {
        tier = subSnap.data()?.['tier'] || 'free';
        if (tier === 'pro') proUsers++;
        if (tier === 'business') businessUsers++;
      }
      tierBreakdown[tier as keyof typeof tierBreakdown] = (tierBreakdown[tier as keyof typeof tierBreakdown] || 0) + 1;

      recentUsers.push({
        uid: userDoc.id,
        email: userData['email'] || '',
        displayName: userData['displayName'] || '',
        businessName,
        tier,
        createdAt,
        siteSlug,
      });
    }

    tierBreakdown.free = totalUsers - proUsers - businessUsers;
    recentUsers.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const recent5 = recentUsers.slice(0, 5);

    const result = {
      totalUsers, setupComplete, totalEnquiries, totalServices, proUsers, businessUsers,
      totalTestimonials, totalFaqs, totalPageViews,
      signupsByDate, enquiriesByDate, tierBreakdown, recentUsers: recent5,
    };
    metricsCache = { data: result, expiresAt: Date.now() + 30_000 };
    res.json(result);
  } catch (e) {
    console.error('Admin metrics error:', e); captureServerError(e);
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
    console.error('Admin discounts error:', e); captureServerError(e);
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
    console.error('Admin create discount error:', e); captureServerError(e);
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
    console.error('Admin delete discount error:', e); captureServerError(e);
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
    console.error('Account deletion error:', e); captureServerError(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- AI generation endpoint ---

// AI rate limiting uses the shared RateLimitStore above

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

    if (rateLimiter.isLimited(`ai:${uid}`, 20, 60_000)) {
      res.status(429).json({ error: 'Too many AI requests. Please try again shortly.' });
      return;
    }

    // Server-side tier enforcement: free users get template fallback only
    const db = await getDb();
    const subSnap = await db.doc(`subscriptions/${uid}`).get();
    const userTier = subSnap.exists ? (subSnap.data()?.['tier'] || 'free') : 'free';
    if (userTier === 'free') {
      res.json({ text: null, fallback: true });
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
    console.error('AI endpoint error:', e); captureServerError(e);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Authenticated API: generate an AI growth report from the user's complete business data.
 */
app.post('/api/ai/growth-report', express.json(), async (req, res) => {
  try {
    const { uid } = req.body;
    if (typeof uid !== 'string') {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }
    if (!await verifyFirebaseUser(req, uid)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (rateLimiter.isLimited(`ai:${uid}`, 20, 60_000)) {
      res.status(429).json({ error: 'Too many AI requests. Please try again shortly.' });
      return;
    }

    const db = await getDb();
    const mainSnap = await db.doc(`users/${uid}/businessData/main`).get();
    const analyticsSnap = await db.doc(`analytics/${uid}`).get();
    const subSnap = await db.doc(`subscriptions/${uid}`).get();

    const mainData = mainSnap.exists ? mainSnap.data()! : {};
    const analyticsData = analyticsSnap.exists ? analyticsSnap.data()! : {};
    const tier = subSnap.exists ? (subSnap.data()?.['tier'] || 'free') : 'free';

    const profile = mainData['profile'] || {};
    const services: { name: string; description: string; price?: string }[] = Array.isArray(mainData['services']) ? mainData['services'] : [];
    const enquiries: { status: string; leadScore?: string; serviceInterest: string; date: string; followUpDate?: string; lastContactedDate?: string; name: string; message: string }[] = Array.isArray(mainData['enquiries']) ? mainData['enquiries'] : [];
    const testimonials = Array.isArray(mainData['testimonials']) ? mainData['testimonials'] : [];
    const faqs = Array.isArray(mainData['faqs']) ? mainData['faqs'] : [];
    const viewsByDate: Record<string, number> = analyticsData['viewsByDate'] || {};

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const rangeStart = sevenDaysAgo.toISOString().slice(0, 10);
    const rangeEnd = now.toISOString().slice(0, 10);

    let recentViews = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      recentViews += viewsByDate[d.toISOString().slice(0, 10)] || 0;
    }

    const recentEnquiries = enquiries.filter(e => e.date && e.date >= rangeStart);
    const totalEnquiries = recentEnquiries.length;
    const wonCount = enquiries.filter(e => e.status === 'Won' || e.status === 'Booked').length;
    const conversionRate = enquiries.length > 0 ? Math.round((wonCount / enquiries.length) * 1000) / 10 : 0;

    const serviceCounts: Record<string, number> = {};
    for (const e of enquiries) {
      if (e.serviceInterest) serviceCounts[e.serviceInterest] = (serviceCounts[e.serviceInterest] || 0) + 1;
    }
    const topServices = Object.entries(serviceCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const today = now.toISOString().slice(0, 10);
    const leadSummary = {
      total: enquiries.length,
      new: enquiries.filter(e => e.status === 'New').length,
      hot: enquiries.filter(e => e.leadScore === 'Hot').length,
      warm: enquiries.filter(e => e.leadScore === 'Warm').length,
      cold: enquiries.filter(e => e.leadScore === 'Cold').length,
      needsFollowUp: enquiries.filter(e => {
        if (!e.followUpDate) return e.status === 'New' || e.status === 'Contacted';
        return e.followUpDate <= today && e.status !== 'Won' && e.status !== 'Lost';
      }).length,
    };

    const report: Record<string, unknown> = {
      id: `gr_${Date.now()}`,
      createdAt: now.toISOString(),
      dateRangeStart: rangeStart,
      dateRangeEnd: rangeEnd,
      pageViews: recentViews,
      enquiries: totalEnquiries,
      conversionRate,
      topServices,
      leadSummary,
      recommendations: [],
      generatedSummary: '',
      suggestedActions: [],
    };

    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey || tier === 'free') {
      const recs: { title: string; reason: string; suggestion: string; priority: string; type: string }[] = [];
      if (services.length === 0) recs.push({ title: 'Add your services', reason: 'Your site has no services listed', suggestion: 'Add at least 3 services with descriptions and prices to help visitors understand what you offer.', priority: 'high', type: 'service' });
      if (services.some(s => !s.price)) recs.push({ title: 'Add pricing to services', reason: 'Some services are missing prices', suggestion: 'Adding starting prices reduces friction and increases enquiries.', priority: 'high', type: 'pricing' });
      if (testimonials.length === 0) recs.push({ title: 'Add customer testimonials', reason: 'Social proof increases trust', suggestion: 'Ask your best customers for a short review and add it to your site.', priority: 'medium', type: 'trust' });
      if (faqs.length < 3) recs.push({ title: 'Add more FAQs', reason: 'FAQs reduce repetitive questions and improve SEO', suggestion: 'Add common questions visitors ask — availability, pricing, service area.', priority: 'medium', type: 'faq' });
      if (leadSummary.needsFollowUp > 0) recs.push({ title: `Follow up on ${leadSummary.needsFollowUp} leads`, reason: 'Leads go cold quickly', suggestion: 'Reply to new enquiries within 4 hours for the best conversion rate.', priority: 'high', type: 'lead-follow-up' });
      if (conversionRate < 20 && enquiries.length >= 3) recs.push({ title: 'Improve your conversion rate', reason: `Only ${conversionRate}% of enquiries convert`, suggestion: 'Strengthen your call-to-action and make the enquiry form shorter and easier.', priority: 'medium', type: 'cta' });
      report['recommendations'] = recs;
      report['generatedSummary'] = `Your site received ${recentViews} views and ${totalEnquiries} enquiries this week. ${leadSummary.needsFollowUp > 0 ? `You have ${leadSummary.needsFollowUp} leads that need follow-up.` : 'All leads are up to date.'}`;
      report['suggestedActions'] = recs.filter(r => r.priority === 'high').map(r => r.title);
      res.json(report);
      return;
    }

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Analyse this small service business and give practical growth recommendations.

Business: ${profile['name'] || 'Unknown'} (${profile['type'] || 'service business'})
Location: ${profile['serviceArea'] || 'Not specified'}
Services: ${services.map(s => `${s.name}${s.price ? ` (${s.price})` : ''}`).join(', ') || 'None listed'}
Total enquiries: ${enquiries.length}
Recent enquiries (7 days): ${totalEnquiries}
Page views (7 days): ${recentViews}
Conversion rate: ${conversionRate}%
Most requested: ${topServices.map(s => `${s.name} (${s.count})`).join(', ') || 'N/A'}
New leads: ${leadSummary.new}
Hot leads: ${leadSummary.hot}
Leads needing follow-up: ${leadSummary.needsFollowUp}
Testimonials: ${testimonials.length}
FAQs: ${faqs.length}
Services without prices: ${services.filter(s => !s.price).length}

Return a JSON object with:
{
  "summary": "2-3 sentence natural overview of how the business is doing and what to focus on",
  "recommendations": [{"title":"short title","reason":"why this matters","suggestion":"what to do","priority":"high|medium|low","type":"hero|service|faq|pricing|trust|cta|lead-follow-up|marketing|seo|general"}],
  "suggestedActions": ["action 1","action 2","action 3"]
}

Give 3-6 specific, actionable recommendations. Reference actual data. Be encouraging but honest. Do not suggest things the business already does well. The type field must match one of the listed values.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: 'You are a business growth coach for small service businesses. Return ONLY valid JSON, no markdown fences.',
          responseMimeType: 'application/json',
        },
      });

      const text = response.text?.trim() || '';
      try {
        const parsed = JSON.parse(text);
        report['generatedSummary'] = parsed.summary || '';
        report['recommendations'] = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
        report['suggestedActions'] = Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions : [];
      } catch {
        report['generatedSummary'] = text;
      }
    } catch (aiErr) {
      console.warn('Growth report AI failed:', aiErr);
      report['generatedSummary'] = `Your site received ${recentViews} views and ${totalEnquiries} enquiries this week.`;
    }

    res.json(report);
  } catch (e) {
    console.error('Growth report error:', e); captureServerError(e);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Authenticated API: draft an improvement for a growth recommendation.
 */
const VALID_REC_TYPES = ['hero', 'service', 'faq', 'pricing', 'trust', 'cta', 'lead-follow-up', 'marketing', 'seo', 'general'];

function getTemplateDraft(type: string, title: string, suggestion: string, profile: Record<string, unknown>, services: { name: string }[]): string {
  const name = (profile['name'] as string) || 'Your Business';
  const area = (profile['serviceArea'] as string) || 'your area';
  const bizType = (profile['type'] as string) || 'service business';
  switch (type) {
    case 'hero': return `Welcome to ${name} — trusted ${bizType} serving ${area}. We're here to help.`;
    case 'service': return `[Service Name]\n\nA compelling description of what this service includes and why customers choose it.\n\nStarting from $[price]`;
    case 'faq': return `Q: [Common question about your ${bizType}?]\n\nA: [Clear, helpful answer that builds confidence.]`;
    case 'pricing': return `Our pricing is transparent and competitive. ${services.length > 0 ? `We offer ${services.length} services` : 'Contact us for a free quote'}.`;
    case 'trust': return `"${name} provided excellent service. Highly recommended!"\n\n— Satisfied customer, ${area}`;
    case 'cta': return `Ready to get started? Contact ${name} today for a free consultation. We serve ${area} and surrounding areas.`;
    case 'lead-follow-up': return `Hi [Customer Name],\n\nThank you for your interest in ${name}. I wanted to follow up on your enquiry.\n\nWould you like to schedule a time to discuss your needs?\n\nBest regards,\nThe team at ${name}`;
    case 'marketing': return `Looking for a trusted ${bizType} in ${area}? ${name} is here to help!\n\nContact us today for a free quote.\n\n#${bizType.replace(/\s+/g, '')} #${area.replace(/\s+/g, '')} #LocalBusiness`;
    case 'seo': return `${name} — Professional ${bizType} in ${area}. Quality service, competitive pricing, and satisfied customers.`;
    default: return suggestion || `Improve your ${bizType} website to attract more customers.`;
  }
}

function buildDraftPrompt(type: string, suggestion: string, profile: Record<string, unknown>, services: { name: string; price?: string }[], faqCount: number, testimonialCount: number): string {
  const name = (profile['name'] as string) || 'Unknown Business';
  const bizType = (profile['type'] as string) || 'service business';
  const area = (profile['serviceArea'] as string) || 'Not specified';
  const tone = (profile['toneOfVoice'] as string) || 'Professional yet friendly';
  const ctx = `Business: ${name} (${bizType})\nLocation: ${area}\nTone: ${tone}\nServices: ${services.map(s => s.name).join(', ') || 'Not listed'}`;
  const typePrompts: Record<string, string> = {
    'hero': `Write a compelling hero section headline and subtitle for this business website.\n${ctx}\nRecommendation: ${suggestion}\nReturn JSON: {"draftContent":"headline\\n\\nsubtitle","explanation":"why this works"}`,
    'service': `Write a service description that convinces visitors to enquire.\n${ctx}\nRecommendation: ${suggestion}\nReturn JSON: {"draftContent":"service name\\n\\ndescription\\n\\nStarting from $[price]","explanation":"why this works"}`,
    'faq': `Write a helpful FAQ entry addressing a common customer concern.\n${ctx}\nExisting FAQs: ${faqCount}\nRecommendation: ${suggestion}\nReturn JSON: {"draftContent":"Q: question\\n\\nA: answer","explanation":"why this FAQ helps"}`,
    'pricing': `Write pricing guidance text for this business website.\n${ctx}\nRecommendation: ${suggestion}\nReturn JSON: {"draftContent":"pricing section text","explanation":"why this helps conversion"}`,
    'trust': `Write a testimonial request message to send to a satisfied customer.\n${ctx}\nExisting testimonials: ${testimonialCount}\nRecommendation: ${suggestion}\nReturn JSON: {"draftContent":"message text","explanation":"why social proof matters"}`,
    'cta': `Write a compelling call-to-action section.\n${ctx}\nRecommendation: ${suggestion}\nReturn JSON: {"draftContent":"CTA heading and text","explanation":"why this CTA works"}`,
    'lead-follow-up': `Draft a professional follow-up message for a lead who hasn't responded.\n${ctx}\nRecommendation: ${suggestion}\nReturn JSON: {"draftContent":"email body","explanation":"follow-up best practices used"}`,
    'marketing': `Write a marketing social media post.\n${ctx}\nRecommendation: ${suggestion}\nReturn JSON: {"draftContent":"social post with hashtags","explanation":"why this post engages"}`,
    'seo': `Write an SEO-optimized meta title and description.\n${ctx}\nRecommendation: ${suggestion}\nReturn JSON: {"draftContent":"Title: ...\\nDescription: ...","explanation":"SEO best practices used"}`,
  };
  return typePrompts[type] || `Draft an improvement for: ${suggestion}\n${ctx}\nReturn JSON: {"draftContent":"improvement text","explanation":"why this helps"}`;
}

app.post('/api/ai/draft-recommendation', express.json(), async (req, res) => {
  try {
    const { uid, recommendation } = req.body;
    if (typeof uid !== 'string' || !recommendation || typeof recommendation['title'] !== 'string' || typeof recommendation['type'] !== 'string') {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }
    if (!await verifyFirebaseUser(req, uid)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (rateLimiter.isLimited(`ai:${uid}`, 20, 60_000)) {
      res.status(429).json({ error: 'Too many AI requests. Please try again shortly.' });
      return;
    }

    const recType = VALID_REC_TYPES.includes(recommendation['type']) ? recommendation['type'] as string : 'general';
    const recTitle = String(recommendation['title']).slice(0, 200);
    const recSuggestion = String(recommendation['suggestion'] || '').slice(0, 500);

    const db = await getDb();
    const subSnap = await db.doc(`subscriptions/${uid}`).get();
    const userTier = subSnap.exists ? (subSnap.data()?.['tier'] || 'free') : 'free';

    const mainSnap = await db.doc(`users/${uid}/businessData/main`).get();
    const mainData = mainSnap.exists ? mainSnap.data()! : {};
    const profile = mainData['profile'] || {};
    const services: { name: string; price?: string }[] = Array.isArray(mainData['services']) ? mainData['services'] : [];
    const faqCount = Array.isArray(mainData['faqs']) ? mainData['faqs'].length : 0;
    const testimonialCount = Array.isArray(mainData['testimonials']) ? mainData['testimonials'].length : 0;

    if (userTier === 'free') {
      res.json({
        title: recTitle,
        draftType: recType,
        draftContent: getTemplateDraft(recType, recTitle, recSuggestion, profile, services),
        explanation: 'Template-based draft. Upgrade to Pro for AI-powered improvements.',
        fallback: true,
      });
      return;
    }

    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) {
      res.json({
        title: recTitle,
        draftType: recType,
        draftContent: getTemplateDraft(recType, recTitle, recSuggestion, profile, services),
        explanation: 'AI not available. Template draft provided.',
        fallback: true,
      });
      return;
    }

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const prompt = buildDraftPrompt(recType, recSuggestion, profile, services, faqCount, testimonialCount);
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: 'You are a website improvement expert for small service businesses. Draft clear, ready-to-use content. Return ONLY valid JSON.',
          responseMimeType: 'application/json',
        },
      });
      const text = response.text?.trim() || '';
      try {
        const parsed = JSON.parse(text);
        res.json({
          title: recTitle,
          draftType: recType,
          draftContent: parsed.draftContent || parsed.content || text,
          explanation: parsed.explanation || 'AI-generated draft.',
          fallback: false,
        });
      } catch {
        res.json({ title: recTitle, draftType: recType, draftContent: text, explanation: 'AI-generated draft.', fallback: false });
      }
    } catch (aiErr) {
      console.warn('Draft recommendation AI failed:', aiErr);
      res.json({
        title: recTitle,
        draftType: recType,
        draftContent: getTemplateDraft(recType, recTitle, recSuggestion, profile, services),
        explanation: 'AI failed. Template draft provided.',
        fallback: true,
      });
    }
  } catch (e) {
    console.error('Draft recommendation error:', e); captureServerError(e);
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

function getPriceId(tier: string): string {
  if (tier === 'pro') return process.env['STRIPE_PRICE_ID_PRO'] || process.env['STRIPE_PRO_PRICE_ID'] || '';
  if (tier === 'business') return process.env['STRIPE_PRICE_ID_BUSINESS'] || process.env['STRIPE_BUSINESS_PRICE_ID'] || '';
  return '';
}

app.post('/api/stripe/create-checkout-session', express.json(), async (req, res) => {
  try {
    const stripe = await getStripe();
    const { uid, tier } = req.body;
    const priceId = getPriceId(tier);
    if (typeof uid !== 'string' || typeof tier !== 'string' || !priceId) {
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
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.headers.origin || req.protocol + '://' + req.headers.host}/admin/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || req.protocol + '://' + req.headers.host}/pricing`,
      client_reference_id: uid,
      customer_email: email,
      metadata: { uid, tier },
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error('Checkout session error:', e); captureServerError(e);
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
    console.error('Portal error:', e); captureServerError(e);
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
    console.error('Webhook error:', e); captureServerError(e);
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
