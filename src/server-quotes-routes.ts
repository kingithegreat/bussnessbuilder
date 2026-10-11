import express from 'express';
import { randomUUID } from 'node:crypto';
import { FeatureDeps, authorizeOwner, isEmail, trimStr } from './server-owner';
import { Quote, QuoteKind, sanitizeQuote, nextQuoteNumber, quoteTotals } from './app/quote-rules';
import { quotePdf } from './app/quote-pdf';
import { formatMoney } from './app/money';

const MAX_QUOTES = 300;
const quotesPath = (uid: string) => `users/${uid}/businessData/quotes`;

/** Owner-only quotes & invoices: CRUD, status, and email (with PDF) via the shared email path. */
export function quotesRouter(deps: FeatureDeps): express.Router {
  const r = express.Router();
  const nowIso = () => (deps.now ? deps.now() : new Date()).toISOString();

  async function business(uid: string) {
    const db = await deps.getDb();
    const main = (await db.doc(`users/${uid}/businessData/main`).get()).data() || {};
    const p = (main['profile'] || {}) as Record<string, unknown>;
    return { name: trimStr(p['name'], 120), email: trimStr(p['email'], 200), phone: trimStr(p['phone'], 50), address: trimStr(p['address'], 200), gstNumber: trimStr(p['gstNumber'], 30) };
  }

  async function mutate<T>(uid: string, fn: (list: Quote[], counters: Record<QuoteKind, number>) => { list?: Quote[]; result: T }): Promise<T> {
    const db = await deps.getDb();
    const ref = db.doc(quotesPath(uid));
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = (snap.exists ? snap.data() : {}) as Record<string, unknown>;
      const list = (data['items'] || []) as Quote[];
      const counters = { quote: 0, invoice: 0, ...((data['counters'] as Record<string, number>) || {}) };
      const out = fn(list, counters);
      if (out.list) {
        // Remember the highest number ever issued so deleting one never frees it for reuse.
        for (const q of out.list) {
          const n = parseInt(q.number.replace(/^\D+-/, ''), 10);
          if (Number.isFinite(n)) counters[q.kind] = Math.max(counters[q.kind] || 0, n);
        }
        tx.set(ref, { items: out.list.slice(0, MAX_QUOTES), counters });
      }
      return out.result;
    });
  }

  r.get('/api/quotes', async (req, res) => {
    try {
      const uid = await authorizeOwner(deps, req, res); if (!uid) return;
      const db = await deps.getDb();
      const snap = await db.doc(quotesPath(uid)).get();
      res.json({ quotes: (snap.exists ? snap.data()?.['items'] : null) || [] });
    } catch (e) { console.error('Quotes list error:', e); res.status(500).json({ error: 'Server error' }); }
  });

  // Create (no id) or update a draft/sent quote.
  r.post('/api/quotes/save', express.json({ limit: '64kb' }), async (req, res) => {
    try {
      const uid = await authorizeOwner(deps, req, res); if (!uid) return;
      const raw = req.body?.quote || {};
      const id = typeof raw.id === 'string' && raw.id ? raw.id : '';
      const quote = await mutate(uid, (list, counters) => {
        const now = nowIso();
        const i = id ? list.findIndex(q => q.id === id) : -1;
        if (id && i < 0) return { result: null };
        const kind: QuoteKind = raw.kind === 'invoice' ? 'invoice' : 'quote';
        const existing = i >= 0 ? list[i] : null;
        const base = existing
          ? { ...existing, number: existing.kind === kind ? existing.number : nextQuoteNumber(list, kind, counters[kind]) }
          : { id: randomUUID(), number: nextQuoteNumber(list, kind, counters[kind]), status: 'draft' as const, createdAt: now };
        const q = sanitizeQuote(raw, base, now);
        const next = [...list];
        if (i >= 0) next[i] = q; else next.unshift(q);
        return { list: next, result: q };
      });
      if (!quote) { res.status(404).json({ error: 'Quote not found.' }); return; }
      res.json({ quote });
    } catch (e) { console.error('Quote save error:', e); res.status(500).json({ error: 'Server error' }); }
  });

  r.post('/api/quotes/:qid/status', express.json({ limit: '2kb' }), async (req, res) => {
    try {
      const uid = await authorizeOwner(deps, req, res); if (!uid) return;
      const status = req.body?.status;
      if (!['draft', 'sent', 'accepted'].includes(status)) { res.status(400).json({ error: 'Invalid status.' }); return; }
      const quote = await mutate(uid, (list) => {
        const i = list.findIndex(q => q.id === req.params['qid']);
        if (i < 0) return { result: null };
        const now = nowIso();
        const q: Quote = { ...list[i], status, updatedAt: now, ...(status === 'accepted' ? { acceptedAt: now } : {}), ...(status === 'sent' && !list[i].sentAt ? { sentAt: now } : {}) };
        const next = [...list]; next[i] = q;
        return { list: next, result: q };
      });
      if (!quote) { res.status(404).json({ error: 'Quote not found.' }); return; }
      res.json({ quote });
    } catch (e) { console.error('Quote status error:', e); res.status(500).json({ error: 'Server error' }); }
  });

  r.post('/api/quotes/:qid/delete', express.json({ limit: '2kb' }), async (req, res) => {
    try {
      const uid = await authorizeOwner(deps, req, res); if (!uid) return;
      const ok = await mutate(uid, (list) => {
        const next = list.filter(q => q.id !== req.params['qid']);
        return next.length === list.length ? { result: false } : { list: next, result: true };
      });
      res.status(ok ? 200 : 404).json(ok ? { success: true } : { error: 'Quote not found.' });
    } catch (e) { console.error('Quote delete error:', e); res.status(500).json({ error: 'Server error' }); }
  });

  r.post('/api/quotes/:qid/email', express.json({ limit: '4kb' }), async (req, res) => {
    try {
      const uid = await authorizeOwner(deps, req, res); if (!uid) return;
      if (deps.isLimited(`quote-email:${uid}`, 10, 60_000)) { res.status(429).json({ error: 'Too many emails. Please wait a minute.' }); return; }
      const db = await deps.getDb();
      const snap = await db.doc(quotesPath(uid)).get();
      const q = (((snap.exists ? snap.data()?.['items'] : null) || []) as Quote[]).find(x => x.id === req.params['qid']);
      if (!q) { res.status(404).json({ error: 'Quote not found.' }); return; }
      if (!isEmail(q.customerEmail)) { res.status(400).json({ error: "Add the customer's email address first." }); return; }
      const biz = await business(uid);
      const label = q.kind === 'invoice' ? 'invoice' : 'quote';
      const total = formatMoney(quoteTotals(q).total, q.currency);
      const message = trimStr(req.body?.message, 2000);
      const result = await deps.sendEmail({
        to: q.customerEmail, replyTo: biz.email || undefined,
        subject: `Your ${label} ${q.number} from ${biz.name || 'us'}`,
        text: `Hi ${q.customerName || 'there'},\n\n${message || `Please find your ${label} attached (total ${total}).`}\n\n${biz.name}${biz.phone ? '\n' + biz.phone : ''}`,
        attachments: [{ filename: `${q.number}.pdf`, content: Buffer.from(quotePdf(q, biz), 'latin1'), contentType: 'application/pdf' }],
      });
      if (!result.sent) {
        res.json({ sent: false, reason: result.reason });
        return;
      }
      const updated = await mutate(uid, (list) => {
        const i = list.findIndex(x => x.id === q.id);
        if (i < 0) return { result: q };
        const now = nowIso();
        const u: Quote = { ...list[i], status: list[i].status === 'accepted' ? 'accepted' : 'sent', sentAt: list[i].sentAt || now, updatedAt: now };
        const next = [...list]; next[i] = u;
        return { list: next, result: u };
      });
      res.json({ sent: true, quote: updated });
    } catch (e) { console.error('Quote email error:', e); res.status(500).json({ error: 'Server error' }); }
  });

  return r;
}
