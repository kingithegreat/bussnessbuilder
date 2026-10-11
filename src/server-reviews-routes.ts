import express from 'express';
import { randomUUID } from 'node:crypto';
import { FeatureDeps, authorizeOwner, clientIp, trimStr, validUid } from './server-owner';

export interface PendingReview { id: string; author: string; rating: number; text: string; role?: string; date: string }
const MAX_PENDING = 200;
const reviewsPath = (uid: string) => `users/${uid}/businessData/reviews`;
const mainPath = (uid: string) => `users/${uid}/businessData/main`;

/**
 * Reviews: public submissions go to moderation; owners approve (published as a
 * testimonial) or reject. Never scrapes third-party review sites.
 */
export function reviewsRouter(deps: FeatureDeps): express.Router {
  const r = express.Router();
  const now = () => (deps.now ? deps.now() : new Date());

  r.post('/api/site/:id/review', express.json({ limit: '8kb' }), async (req, res) => {
    try {
      const db = await deps.getDb();
      const uid = await deps.resolveUid(db, String(req.params['id']));
      if (!validUid(uid)) { res.status(404).json({ error: 'Not found' }); return; }
      if (deps.isLimited(`review:${uid}:${clientIp(req)}`, 3, 60_000)) { res.status(429).json({ error: 'Too many reviews. Please try again shortly.' }); return; }
      const b = req.body || {};
      if (trimStr(b.website, 100)) { res.json({ success: true }); return; } // honeypot
      const author = trimStr(b.author, 80);
      const text = trimStr(b.text, 1500);
      const rating = Math.round(Number(b.rating));
      if (!author || text.length < 5 || !(rating >= 1 && rating <= 5)) { res.status(400).json({ error: 'Please add your name, a star rating and a few words.' }); return; }
      const main = await db.doc(mainPath(uid)).get();
      if (!main.exists || !main.data()?.['isSetupComplete']) { res.status(404).json({ error: 'Site not found' }); return; }
      const review: PendingReview = { id: randomUUID(), author, rating, text, ...(trimStr(b.role, 80) ? { role: trimStr(b.role, 80) } : {}), date: now().toISOString() };
      const ref = db.doc(reviewsPath(uid));
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = (snap.exists ? snap.data() : {}) as Record<string, unknown>;
        const pending = (Array.isArray(data['pending']) ? data['pending'] : []) as PendingReview[];
        tx.set(ref, { ...data, pending: [review, ...pending].slice(0, MAX_PENDING) });
      });
      res.json({ success: true });
      const ownerEmail = trimStr(((main.data() || {})['profile'] || {})['email'], 320);
      if (ownerEmail) void deps.sendEmail({ to: ownerEmail, subject: `New ${rating}-star review waiting for approval`, text: `${author} left a ${rating}-star review:\n\n"${text}"\n\nApprove or reject it in BusinessFlow → Website → Services and content → Reviews.` }).catch(() => undefined);
    } catch (e) { console.error('Review submit error:', e); res.status(500).json({ error: 'Server error' }); }
  });

  r.get('/api/reviews', async (req, res) => {
    try {
      const uid = await authorizeOwner(deps, req, res); if (!uid) return;
      const db = await deps.getDb();
      const snap = await db.doc(reviewsPath(uid)).get();
      res.json({ pending: (snap.exists && Array.isArray(snap.data()?.['pending'])) ? snap.data()!['pending'] : [] });
    } catch (e) { console.error('Review list error:', e); res.status(500).json({ error: 'Server error' }); }
  });

  for (const action of ['approve', 'reject'] as const) {
    r.post(`/api/reviews/:rid/${action}`, express.json({ limit: '2kb' }), async (req, res) => {
      try {
        const uid = await authorizeOwner(deps, req, res); if (!uid) return;
        const db = await deps.getDb();
        const ref = db.doc(reviewsPath(uid));
        const mref = db.doc(mainPath(uid));
        const result = await db.runTransaction(async (tx) => {
          const [snap, msnap] = await Promise.all([tx.get(ref), tx.get(mref)]);
          const data = (snap.exists ? snap.data() : {}) as Record<string, unknown>;
          const pending = (Array.isArray(data['pending']) ? data['pending'] : []) as PendingReview[];
          const review = pending.find(p => p.id === req.params['rid']);
          if (!review) return null;
          tx.set(ref, { ...data, pending: pending.filter(p => p.id !== review.id) });
          if (action === 'approve' && msnap.exists) {
            const main = msnap.data() || {};
            const testimonials = Array.isArray(main['testimonials']) ? main['testimonials'] : [];
            const t = { id: review.id, author: review.author, rating: review.rating, text: review.text, ...(review.role ? { role: review.role } : {}), source: 'review', date: review.date };
            tx.set(mref, { ...main, testimonials: [...testimonials.filter((x: { id?: string }) => x?.id !== t.id), t] });
            return t;
          }
          return review;
        });
        if (!result) { res.status(404).json({ error: 'Review not found.' }); return; }
        res.json({ [action === 'approve' ? 'testimonial' : 'review']: result });
      } catch (e) { console.error('Review moderation error:', e); res.status(500).json({ error: 'Server error' }); }
    });
  }
  return r;
}
