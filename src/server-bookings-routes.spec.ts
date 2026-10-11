import { bookingsRouter, pruneBookings } from './server-bookings-routes';
import { startFeatureServer } from './testing/feature-harness';

const now = () => new Date('2026-10-01T00:00:00Z');
const settings = {
  enabled: true, timezone: 'Pacific/Auckland', leadTimeHours: 0, slotStepMin: 30, maxDaysAhead: 60,
  services: [{ id: 'mow', name: 'Lawn mow', durationMin: 60, price: '$45' }],
  weekly: { mon: [], tue: [], wed: [{ start: '09:00', end: '12:00' }], thu: [], fri: [], sat: [], sun: [] },
  blackouts: [],
};
const docs = {
  'users/owner/businessData/main': { isSetupComplete: true, profile: { name: 'Pyes Pa Lawn Care', email: 'owner@example.invalid' } },
  'users/owner/businessData/bookings': { settings, bookings: [] },
};

describe('bookings HTTP journey', () => {
  let h: Awaited<ReturnType<typeof startFeatureServer>>;
  beforeEach(async () => { h = await startFeatureServer(bookingsRouter, docs, { now }); });
  afterEach(async () => { await h.close(); });

  it('lists slots, books one, blocks a double booking, and accepts it with ics', async () => {
    const avail = await h.call('GET', '/api/site/owner-slug/booking?date=2026-10-14&service=mow');
    expect(avail.status).toBe(200);
    expect(avail.body['slots']).toHaveLength(5);
    const start = avail.body['slots'][0].start;
    const booked = await h.call('POST', '/api/site/owner-slug/booking', { serviceId: 'mow', start, name: 'Kim', email: 'kim@example.invalid' });
    expect(booked.status).toBe(200);
    expect(booked.body['booking'].status).toBe('pending');
    const again = await h.call('POST', '/api/site/owner-slug/booking', { serviceId: 'mow', start, name: 'Lee', email: 'lee@example.invalid' });
    expect(again.status).toBe(409);
    const after = await h.call('GET', '/api/site/owner/booking?date=2026-10-14&service=mow');
    expect(after.body['slots']).toHaveLength(3); // 9:00 taken also blocks 9:30
    const ics = await h.call('GET', booked.body['icsUrl']);
    expect(ics.status).toBe(200);
    expect(ics.text).toContain('BEGIN:VCALENDAR');
    expect((await h.call('GET', booked.body['icsUrl'].replace(/t=.*/, 't=wrong'))).status).toBe(404);

    expect((await h.call('GET', '/api/bookings?uid=owner')).status).toBe(401);
    const list = await h.call('GET', '/api/bookings?uid=owner', undefined, true);
    expect(list.body['bookings']).toHaveLength(1);
    expect(list.body['bookings'][0].token).toBeUndefined();
    const id = list.body['bookings'][0].id;
    const accepted = await h.call('POST', `/api/bookings/${id}/status`, { uid: 'owner', status: 'accepted' }, true);
    expect(accepted.body['booking'].status).toBe('accepted');
    expect(accepted.body['emailSent']).toBe(false);
    const confirm = h.emails.find(e => e.subject.startsWith('Booking confirmed'));
    expect(confirm?.to).toBe('kim@example.invalid');
    expect(String(confirm?.attachments?.[0].content)).toContain('STATUS:CONFIRMED');
  });

  it('rejects bad input and disabled booking', async () => {
    expect((await h.call('POST', '/api/site/owner/booking', { serviceId: 'mow', start: 'x', name: '', email: 'bad' })).status).toBe(400);
    expect((await h.call('POST', '/api/site/owner/booking', { serviceId: 'mow', start: '2026-10-14T03:00:00.000Z', name: 'A', email: 'a@b.co' })).status).toBe(409);
    await h.call('PUT', '/api/bookings/settings', { uid: 'owner', settings: { ...settings, enabled: false } }, true);
    expect((await h.call('GET', '/api/site/owner/booking')).body).toEqual({ enabled: false });
  });
});

describe('pruneBookings', () => {
  it('drops long-past bookings and caps the list', () => {
    const now = new Date('2026-10-01T00:00:00Z');
    const old = { end: '2026-01-01T00:00:00Z' };
    const soon = { end: '2026-10-02T00:00:00Z' };
    expect(pruneBookings([soon, old], now)).toEqual([soon]);
    expect(pruneBookings(Array.from({ length: 400 }, () => soon), now)).toHaveLength(300);
  });
});
