import express from 'express';
import { randomUUID } from 'node:crypto';
import { FeatureDeps, authorizeOwner, clientIp, isEmail, trimStr, validUid } from './server-owner';
import { Booking, BookingStatus, sanitizeBookingSettings, isSlotBookable, busyFromBookings, availableSlots, buildIcs, formatSlot, defaultBookingSettings } from './app/booking-rules';

const MAX_BOOKINGS = 1000;
const docPath = (uid: string) => `users/${uid}/businessData/bookings`;

/**
 * Bookings API.
 *   Public:  GET  /api/site/:id/booking            settings + slots for ?date=&service=
 *            POST /api/site/:id/booking            request a booking (transactional, no double booking)
 *            GET  /api/site/:id/booking/:bid.ics   calendar file (needs the booking's private token)
 *   Owner:   GET  /api/bookings?uid=               settings + all bookings
 *            PUT  /api/bookings/settings           save settings
 *            POST /api/bookings/:bid/status        accept / decline (emails the customer)
 */
export function bookingsRouter(deps: FeatureDeps): express.Router {
  const r = express.Router();
  const now = () => (deps.now ? deps.now() : new Date());

  async function load(uid: string) {
    const db = await deps.getDb();
    const snap = await db.doc(docPath(uid)).get();
    const data = (snap.exists ? snap.data() : {}) as Record<string, unknown>;
    return {
      settings: sanitizeBookingSettings(data['settings'] ?? defaultBookingSettings()),
      bookings: (Array.isArray(data['bookings']) ? data['bookings'] : []) as (Booking & { token?: string })[],
    };
  }

  async function businessInfo(uid: string) {
    const db = await deps.getDb();
    const main = (await db.doc(`users/${uid}/businessData/main`).get()).data() || {};
    const profile = (main['profile'] || {}) as Record<string, unknown>;
    return { name: trimStr(profile['name'], 120) || 'Your booking', email: trimStr(profile['email'], 320), address: trimStr(profile['address'], 200) || trimStr(profile['serviceArea'], 200) };
  }

  r.get('/api/site/:id/booking', async (req, res) => {
    try {
      const db = await deps.getDb();
      const uid = await deps.resolveUid(db, String(req.params['id']));
      if (!validUid(uid)) { res.status(404).json({ error: 'Not found' }); return; }
      const { settings, bookings } = await load(uid);
      if (!settings.enabled) { res.json({ enabled: false }); return; }
      const date = String(req.query['date'] || '');
      const service = String(req.query['service'] || '');
      const slots = date && service ? availableSlots(settings, service, date, busyFromBookings(bookings), now()) : [];
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        enabled: true,
        timezone: settings.timezone,
        services: settings.services,
        weekly: settings.weekly,
        blackouts: settings.blackouts,
        maxDaysAhead: settings.maxDaysAhead,
        slots,
      });
    } catch (e) {
      console.error('Booking availability error:', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  r.post('/api/site/:id/booking', express.json({ limit: '8kb' }), async (req, res) => {
    try {
      const db = await deps.getDb();
      const uid = await deps.resolveUid(db, String(req.params['id']));
      if (!validUid(uid)) { res.status(404).json({ error: 'Not found' }); return; }
      if (deps.isLimited(`book:${uid}:${clientIp(req)}`, 5, 60_000)) { res.status(429).json({ error: 'Too many booking requests. Please try again shortly.' }); return; }
      const b = req.body || {};
      const name = trimStr(b.name, 120);
      const email = trimStr(b.email, 200);
      if (!name || !isEmail(email)) { res.status(400).json({ error: 'Please enter your name and a valid email.' }); return; }
      if (trimStr(b.website, 200)) { res.json({ success: true }); return; } // honeypot
      const ref = db.doc(docPath(uid));
      const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = (snap.exists ? snap.data() : {}) as Record<string, unknown>;
        const settings = sanitizeBookingSettings(data['settings']);
        const bookings = (Array.isArray(data['bookings']) ? data['bookings'] : []) as Booking[];
        const service = settings.services.find(s => s.id === b.serviceId);
        if (!settings.enabled || !service) return { ok: false as const, error: 'Online booking is not available right now.', status: 409 };
        if (!isSlotBookable(settings, service.id, String(b.start), busyFromBookings(bookings), now())) {
          return { ok: false as const, error: 'Sorry, that time was just taken or is no longer available. Please pick another.', status: 409 };
        }
        const start = new Date(String(b.start)).toISOString();
        const booking: Booking & { token: string } = {
          id: randomUUID(), serviceId: service.id, serviceName: service.name, start,
          end: new Date(Date.parse(start) + service.durationMin * 60_000).toISOString(),
          name, email, phone: trimStr(b.phone, 50), notes: trimStr(b.notes, 2000),
          status: 'pending', createdAt: now().toISOString(), token: randomUUID(),
        };
        tx.set(ref, { ...data, settings: data['settings'] ?? settings, bookings: [booking, ...bookings].slice(0, MAX_BOOKINGS) });
        return { ok: true as const, booking, timezone: settings.timezone };
      });
      if (!result.ok) { res.status(result.status).json({ error: result.error }); return; }
      const { booking, timezone } = result;
      res.json({ success: true, booking: { id: booking.id, serviceName: booking.serviceName, start: booking.start, end: booking.end, status: booking.status }, icsUrl: `/api/site/${encodeURIComponent(String(req.params['id']))}/booking/${booking.id}.ics?t=${booking.token}` });
      // Fire-and-forget emails: owner alert + customer acknowledgement.
      void (async () => {
        const biz = await businessInfo(uid);
        const when = formatSlot(booking.start, timezone);
        if (biz.email) await deps.sendEmail({ to: biz.email, replyTo: booking.email, subject: `New booking request: ${booking.serviceName}, ${when}`, text: `${booking.name} (${booking.email}${booking.phone ? ', ' + booking.phone : ''}) asked to book ${booking.serviceName} on ${when}.\n\nNotes: ${booking.notes || '—'}\n\nAccept or decline it in your BusinessFlow inbox.` });
        await deps.sendEmail({ to: booking.email, replyTo: biz.email || undefined, subject: `Booking request received — ${biz.name}`, text: `Hi ${booking.name},\n\nThanks for your booking request for ${booking.serviceName} on ${when}. ${biz.name} will confirm shortly.\n`, attachments: [{ filename: 'booking.ics', content: buildIcs(booking, biz.name, biz.address), contentType: 'text/calendar' }] });
      })().catch(e => console.warn('Booking email failed:', e));
    } catch (e) {
      console.error('Booking create error:', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  r.get('/api/site/:id/booking/:bid.ics', async (req, res) => {
    try {
      const db = await deps.getDb();
      const uid = await deps.resolveUid(db, String(req.params['id']));
      if (!validUid(uid)) { res.status(404).end(); return; }
      const { bookings } = await load(uid);
      const booking = bookings.find(b => b.id === req.params['bid']);
      if (!booking || !booking.token || booking.token !== req.query['t']) { res.status(404).type('text/plain').send('Not found'); return; }
      const biz = await businessInfo(uid);
      res.type('text/calendar').setHeader('Content-Disposition', 'attachment; filename="booking.ics"');
      res.send(buildIcs(booking, biz.name, biz.address));
    } catch (e) {
      console.error('Booking ics error:', e);
      res.status(500).end();
    }
  });

  r.get('/api/bookings', async (req, res) => {
    try {
      const uid = await authorizeOwner(deps, req, res); if (!uid) return;
      const { settings, bookings } = await load(uid);
      res.json({ settings, bookings: bookings.map(({ token: _t, ...b }) => b) });
    } catch (e) { console.error('Bookings list error:', e); res.status(500).json({ error: 'Server error' }); }
  });

  r.put('/api/bookings/settings', express.json({ limit: '32kb' }), async (req, res) => {
    try {
      const uid = await authorizeOwner(deps, req, res); if (!uid) return;
      const settings = sanitizeBookingSettings(req.body?.settings);
      const db = await deps.getDb();
      const ref = db.doc(docPath(uid));
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = (snap.exists ? snap.data() : {}) as Record<string, unknown>;
        tx.set(ref, { ...data, settings, bookings: Array.isArray(data['bookings']) ? data['bookings'] : [] });
      });
      res.json({ settings });
    } catch (e) { console.error('Booking settings error:', e); res.status(500).json({ error: 'Server error' }); }
  });

  r.post('/api/bookings/:bid/status', express.json({ limit: '4kb' }), async (req, res) => {
    try {
      const uid = await authorizeOwner(deps, req, res); if (!uid) return;
      const status = req.body?.status as BookingStatus;
      if (status !== 'accepted' && status !== 'declined') { res.status(400).json({ error: 'Status must be accepted or declined.' }); return; }
      const db = await deps.getDb();
      const ref = db.doc(docPath(uid));
      const updated = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = (snap.exists ? snap.data() : {}) as Record<string, unknown>;
        const bookings = (Array.isArray(data['bookings']) ? data['bookings'] : []) as (Booking & { token?: string })[];
        const i = bookings.findIndex(b => b.id === req.params['bid']);
        if (i < 0) return null;
        // Re-accepting a declined slot must not create a double booking.
        if (status === 'accepted' && bookings[i].status === 'declined') {
          const others = bookings.filter((_, j) => j !== i);
          const s = Date.parse(bookings[i].start), e = Date.parse(bookings[i].end);
          if (busyFromBookings(others).some(o => Date.parse(o.start) < e && s < Date.parse(o.end))) return 'conflict' as const;
        }
        const next = { ...bookings[i], status };
        const list = [...bookings]; list[i] = next;
        tx.set(ref, { ...data, bookings: list });
        return next;
      });
      if (updated === null) { res.status(404).json({ error: 'Booking not found.' }); return; }
      if (updated === 'conflict') { res.status(409).json({ error: 'That time now overlaps another booking.' }); return; }
      const { settings } = await load(uid);
      const biz = await businessInfo(uid);
      const when = formatSlot(updated.start, settings.timezone);
      const email = await deps.sendEmail(status === 'accepted'
        ? { to: updated.email, replyTo: biz.email || undefined, subject: `Booking confirmed — ${biz.name}`, text: `Hi ${updated.name},\n\nYour booking for ${updated.serviceName} on ${when} is confirmed. The calendar file is attached.\n\n${biz.name}`, attachments: [{ filename: 'booking.ics', content: buildIcs(updated, biz.name, biz.address), contentType: 'text/calendar' }] }
        : { to: updated.email, replyTo: biz.email || undefined, subject: `About your booking request — ${biz.name}`, text: `Hi ${updated.name},\n\nSorry, we can't do ${updated.serviceName} on ${when}. Please pick another time on our website or reply to this email.\n\n${biz.name}` });
      const { token: _t, ...booking } = updated;
      res.json({ booking, emailSent: email.sent });
    } catch (e) { console.error('Booking status error:', e); res.status(500).json({ error: 'Server error' }); }
  });

  return r;
}
