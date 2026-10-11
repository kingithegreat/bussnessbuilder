import express from 'express';
import { createHash } from 'node:crypto';
import { FeatureDeps, authorizeOwner, clientIp, validUid } from './server-owner';
import { applyHit, isBot, normalizePath, summarizeStats, StatsDoc } from './app/stats-rules';

const statsPath = (uid: string) => `users/${uid}/businessData/stats`;

/** NZ calendar day for counting (owners are NZ-based; matches what they see). */
export function statsDay(now: Date, timeZone = 'Pacific/Auckland'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Daily-rotating, truncated visitor id. The IP is hashed in memory and never stored. */
export function visitorHash(salt: string, day: string, uid: string, ip: string, ua: string): string {
  return createHash('sha256').update(`${salt}|${day}|${uid}|${ip}|${ua}`).digest('hex').slice(0, 12);
}

export function statsRouter(deps: FeatureDeps): express.Router {
  const r = express.Router();
  const now = () => (deps.now ? deps.now() : new Date());
  const salt = deps.env['STATS_SALT'] || 'businessflow-stats-v1';

  // sendBeacon posts text/plain; accept both.
  r.post('/api/site/:id/hit', express.text({ limit: '1kb', type: '*/*' }), async (req, res) => {
    res.status(204).end(); // never make the visitor wait
    try {
      const ua = String(req.header('user-agent') || '');
      if (isBot(ua) || req.header('dnt') === '1' || req.header('sec-gpc') === '1') return;
      const ip = clientIp(req);
      if (deps.isLimited(`hit:${ip}`, 60, 60_000)) return;
      let body: { path?: unknown } = {};
      try { body = JSON.parse(typeof req.body === 'string' ? req.body : '{}'); } catch { body = {}; }
      const db = await deps.getDb();
      const uid = await deps.resolveUid(db, String(req.params['id']));
      if (!validUid(uid)) return;
      const day = statsDay(now());
      const visitor = visitorHash(salt, day, uid, ip, ua);
      const ref = db.doc(statsPath(uid));
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        tx.set(ref, applyHit(snap.exists ? (snap.data() as StatsDoc) : undefined, { day, path: normalizePath(body.path), visitor }));
      });
    } catch (e) {
      console.warn('Stats hit failed:', e);
    }
  });

  r.get('/api/stats', async (req, res) => {
    try {
      const uid = await authorizeOwner(deps, req, res); if (!uid) return;
      const days = Math.min(90, Math.max(7, Number(req.query['days']) || 30));
      const db = await deps.getDb();
      const [stats, main, bookings] = await Promise.all([
        db.doc(statsPath(uid)).get(),
        db.doc(`users/${uid}/businessData/main`).get(),
        db.doc(`users/${uid}/businessData/bookings`).get(),
      ]);
      const enquiries = ((main.data()?.['enquiries'] as { date?: string }[]) || []).map(e => toDay(e?.date));
      const bookingDates = ((bookings.data()?.['bookings'] as { createdAt?: string }[]) || []).map(b => toDay(b?.createdAt));
      res.setHeader('Cache-Control', 'no-store');
      res.json(summarizeStats(stats.exists ? (stats.data() as StatsDoc) : undefined, enquiries, bookingDates, statsDay(now()), days));
    } catch (e) { console.error('Stats error:', e); res.status(500).json({ error: 'Server error' }); }
  });

  return r;
}

/** ISO timestamp → NZ day (enquiry/booking dates are stored in UTC). */
function toDay(iso: unknown): string {
  const t = typeof iso === 'string' ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? statsDay(new Date(t)) : '';
}
