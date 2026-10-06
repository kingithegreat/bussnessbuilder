import express from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { validActionId, validSiteActionRequest, isHomepageHeadlineRequest } from './app/site-action';
import { SiteActionError, prepareHeadlineAction, applyHeadlineAction, undoHeadlineAction, listHeadlineActions } from './server-site-actions';
import { generateHomepageHeadline } from './server-headline-generation';

export interface SiteActionRouteDependencies {
  getDb: () => Promise<Firestore>;
  verifyUser: (req: express.Request, uid: string) => Promise<boolean>;
  isLimited: (key: string, max: number, windowMs: number) => boolean;
  env: Record<string, string | undefined>;
}

/** Every operation is authenticated; server-owned records never grant client writes. */
export function siteActionRouter(deps: SiteActionRouteDependencies): express.Router {
  const router = express.Router();
  router.use(express.json({ limit: '8kb' }));
  async function authorize(req: express.Request, res: express.Response): Promise<string | null> {
    const uid = req.method === 'GET' ? req.query['uid'] : req.body?.['uid'];
    if (typeof uid !== 'string' || !uid || uid.length > 128 || uid.includes('/')) {
      res.status(400).json({ error: 'Invalid business account.', code: 'invalid_request' }); return null;
    }
    if (!await deps.verifyUser(req, uid)) {
      res.status(401).json({ error: 'Sign in to your business account.', code: 'unauthorized' }); return null;
    }
    if (deps.isLimited(`site-actions:${uid}`, 60, 60_000)) {
      res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.', code: 'rate_limited' }); return null;
    }
    return uid;
  }
  function fail(error: unknown, res: express.Response) {
    if (error instanceof SiteActionError) res.status(error.status).json({ error: error.message, code: error.code });
    else {
      console.error('Site action failed', error);
      res.status(500).json({ error: 'The action could not be completed. Reload history before trying again.', code: 'server_error' });
    }
  }
  router.get('/', async (req, res) => {
    try {
      const uid = await authorize(req, res); if (!uid) return;
      res.json({ actions: await listHeadlineActions(await deps.getDb(), uid) });
    } catch (error) { fail(error, res); }
  });
  router.post('/headline/prepare', async (req, res) => {
    try {
      const uid = await authorize(req, res); if (!uid) return;
      const { id, request, expectedHeadline } = req.body;
      if (!validActionId(id) || !validSiteActionRequest(request) || typeof expectedHeadline !== 'string' || expectedHeadline.length > 2000) {
        res.status(400).json({ error: 'Enter a short request for your homepage headline.', code: 'invalid_request' }); return;
      }
      if (!isHomepageHeadlineRequest(request)) {
        res.status(400).json({ error: 'I can prepare a homepage headline change here. Open Website for other changes.', code: 'unsupported_intent' }); return;
      }
      if (deps.isLimited(`ai:${uid}`, 20, 60_000)) {
        res.status(429).json({ error: 'Too many AI requests. Please wait a minute and try again.', code: 'rate_limited' }); return;
      }
      const db = await deps.getDb();
      const action = await prepareHeadlineAction(db, uid, { id, request, expectedHeadline }, context => generateHomepageHeadline(db, uid, context, deps.env));
      res.json({ action });
    } catch (error) { fail(error, res); }
  });
  for (const operation of ['approve', 'undo'] as const) {
    router.post(`/:id/${operation}`, async (req, res) => {
      try {
        const uid = await authorize(req, res); if (!uid) return;
        const id = req.params['id'];
        if (!validActionId(id)) { res.status(400).json({ error: 'Invalid action.', code: 'invalid_request' }); return; }
        const db = await deps.getDb();
        const action = operation === 'approve' ? await applyHeadlineAction(db, uid, id) : await undoHeadlineAction(db, uid, id);
        // Return the current committed field, including idempotent repeated requests.
        const current = (await db.doc(`users/${uid}/businessData/main`).get()).data();
        const headline = typeof current?.['profile']?.['tagline'] === 'string' ? current['profile']['tagline'] : '';
        res.json({ action, headline });
      } catch (error) { fail(error, res); }
    });
  }
  return router;
}
