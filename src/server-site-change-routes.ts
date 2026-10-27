import express from 'express';
import { FeatureDeps, authorizeOwner } from './server-owner';
import { prepareSiteChange, mutateSiteChange } from './server-site-changes';
import { SiteActionError } from './server-site-actions';
import { SiteChange } from './app/site-change';
import { changeOutcome } from './server-change-outcomes';
import { StatsDoc } from './app/stats-rules';
import { statsDay } from './server-stats-routes';
export function siteChangesRouter(deps: FeatureDeps): express.Router {
  const r = express.Router(); r.use('/api/changes', express.json({ limit: '80kb' }));
  const fail = (e: unknown, res: express.Response) => {
    if (e instanceof SiteActionError) res.status(e.status).json({ error: e.message, code: e.code });
    else { console.error('Site change failed', e); res.status(500).json({ error: 'Could not confirm this change. Retry the same operation.' }); }
  };
  r.get('/api/changes', async (req, res) => {
    try {
      const uid = await authorizeOwner(deps, req, res); if (!uid) return;
      const db = await deps.getDb();
      const [history, main, stats, bookings] = await Promise.all([
        db.collection(`businessActions/${uid}/changes`).orderBy('createdAt', 'desc').limit(20).get(),
        db.doc(`users/${uid}/businessData/main`).get(), db.doc(`users/${uid}/businessData/stats`).get(), db.doc(`users/${uid}/businessData/bookings`).get()]);
      const date = (raw: unknown) => typeof raw === 'string' && Number.isFinite(Date.parse(raw)) ? statsDay(new Date(raw)) : '';
      const enquiries = (main.data()?.['enquiries'] || []).map((e: { date: string }) => date(e.date));
      const bookingDays = (bookings.data()?.['bookings'] || []).map((b: { createdAt: string }) => date(b.createdAt));
      const actions = history.docs.map(s => s.data() as SiteChange).filter(a => a.actorUid === uid).map(a => ({ ...a,
        outcome: changeOutcome(a, stats.data() as StatsDoc | undefined, enquiries, bookingDays, statsDay(deps.now?.() || new Date())) }));
      res.set('Cache-Control', 'private, no-store').json({ actions });
    } catch (e) { fail(e, res); }
  });
  r.post('/api/changes/prepare', async (req, res) => {
    try { const uid = await authorizeOwner(deps, req, res); if (!uid) return;
      res.json({ action: await prepareSiteChange(await deps.getDb(), uid, req.body, deps.now?.()) });
    } catch (e) { fail(e, res); }
  });
  for (const operation of ['approve', 'undo'] as const) r.post(`/api/changes/:id/${operation}`, async (req, res) => {
    try { const uid = await authorizeOwner(deps, req, res); if (!uid) return;
      res.json(await mutateSiteChange(await deps.getDb(), uid, String(req.params['id']), operation, deps.now?.()));
    } catch (e) { fail(e, res); }
  });
  return r;
}
