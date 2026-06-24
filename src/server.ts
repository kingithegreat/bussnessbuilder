import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import { randomUUID } from 'node:crypto';

let _db: any = null;
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
    const uid = req.params.uid;
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

    res.json({
      profile: data['profile'],
      services: data['services'] || [],
      testimonials: data['testimonials'] || [],
      faqs: data['faqs'] || [],
      customization: data['customization'],
      paymentSettings: paySnap.exists ? paySnap.data() : null,
    });
  } catch (e) {
    console.error('Error loading site:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Public API: submit an enquiry to a user's site (no auth required).
 */
app.post('/api/site/:uid/enquiry', express.json(), async (req, res) => {
  try {
    const db = await getDb();
    const uid = req.params.uid;
    const mainRef = db.doc(`users/${uid}/businessData/main`);
    const mainSnap = await mainRef.get();
    if (!mainSnap.exists) {
      res.status(404).json({ error: 'Site not found' });
      return;
    }

    const body = req.body;
    if (!body.name || !body.email) {
      res.status(400).json({ error: 'Name and email are required' });
      return;
    }

    const data = mainSnap.data()!;
    const enquiry = {
      id: randomUUID(),
      date: new Date().toISOString(),
      status: 'New',
      name: String(body.name).slice(0, 200),
      email: String(body.email).slice(0, 200),
      phone: String(body.phone || '').slice(0, 50),
      serviceInterest: String(body.serviceInterest || 'Other').slice(0, 200),
      preferredDateTime: String(body.preferredDateTime || '').slice(0, 100),
      urgency: 'Medium',
      message: String(body.message || '').slice(0, 5000),
      leadScore: 'Warm',
      nextAction: 'Review and reply',
      formData: body.formData || {},
    };

    const activity = {
      id: randomUUID(),
      type: 'enquiry_received',
      title: 'New Enquiry Received',
      description: `${enquiry.name} requested ${enquiry.serviceInterest}`,
      date: new Date().toISOString(),
    };

    data['enquiries'] = [enquiry, ...(data['enquiries'] || [])];
    data['activities'] = [activity, ...(data['activities'] || [])];

    await mainRef.set(data);
    res.json({ success: true });
  } catch (e) {
    console.error('Error submitting enquiry:', e);
    res.status(500).json({ error: 'Server error' });
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
