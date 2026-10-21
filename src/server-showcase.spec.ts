import { SHOWCASES, SHOWCASE_VERSION, buildShowcaseDocs, seedShowcases, showcaseBySlugOrUid } from './server-showcase';
import { buildPublicSiteData } from './server-site';
import { quoteTotals } from './app/quote-rules';
import { sanitizeBookingSettings } from './app/booking-rules';

const NOW = new Date('2026-10-21T00:00:00Z');

function fakeDb(existing: Record<string, Record<string, unknown>> = {}) {
  const store: Record<string, Record<string, unknown>> = { ...existing };
  const writes: string[] = [];
  return {
    store, writes,
    doc: (path: string) => ({
      get: async () => ({ exists: path in store, data: () => store[path] }),
      set: async (data: Record<string, unknown>) => { store[path] = data; writes.push(path); },
    }),
  };
}

describe('demo showcases', () => {
  it('has a Tauranga mobile mechanic and a Tauranga lawn-mowing business', () => {
    expect(SHOWCASES.map(s => s.state.profile.type)).toEqual(['mechanic', 'lawn mowing']);
    for (const s of SHOWCASES) {
      expect(s.state.profile.address).toContain('Tauranga');
      expect(s.state.profile.currency).toBe('NZD');
      expect(s.state.profile.pricesIncludeGst).toBe(true);
    }
  });

  it('lists the requested services with NZD prices and photos', () => {
    const mech = showcaseBySlugOrUid('demo-bay-mobile-mechanics')!;
    const names = mech.state.services.map(s => s.name).join('|');
    for (const n of ['WOF prep', 'Oil & filter', 'brake pads', 'Diagnostics', 'Battery']) expect(names).toContain(n);
    const lawn = showcaseBySlugOrUid('showcase-tauranga-lawn-co')!;
    const lnames = lawn.state.services.map(s => s.name).join('|');
    for (const n of ['Small section', 'Medium section', 'Large section', 'Edging', 'Green-waste', 'Fortnightly']) expect(lnames).toContain(n);
    for (const s of SHOWCASES) for (const svc of s.state.services) {
      expect(svc.price).toMatch(/\$\d/);
      expect(svc.imageUrl).toMatch(/^https:\/\//);
    }
  });

  it('builds a publishable site with no placeholder text', () => {
    for (const s of SHOWCASES) {
      const docs = buildShowcaseDocs(s, NOW);
      const main = docs[`users/${s.uid}/businessData/main`];
      const site = buildPublicSiteData(main, null, null);
      expect(site).not.toBeNull();
      const text = JSON.stringify(site);
      expect(text).not.toMatch(/coming soon|lorem|placeholder|TODO/i);
      expect(docs[`slugs/${s.slug}`]).toEqual(expect.objectContaining({ uid: s.uid }));
      expect(main['showcaseVersion']).toBe(SHOWCASE_VERSION);
    }
  });

  it('seeds bookings that the booking rules accept, and quotes with real totals', () => {
    for (const s of SHOWCASES) {
      const docs = buildShowcaseDocs(s, NOW);
      const bookings = docs[`users/${s.uid}/businessData/bookings`] as { settings: unknown; bookings: { start: string }[] };
      const settings = sanitizeBookingSettings(bookings.settings);
      expect(settings.enabled).toBe(true);
      expect(settings.services.length).toBeGreaterThan(2);
      expect(bookings.bookings.length).toBe(3);
      for (const b of bookings.bookings) expect(new Date(b.start).getTime()).toBeGreaterThan(NOW.getTime());
      const quotes = docs[`users/${s.uid}/businessData/quotes`] as { items: Parameters<typeof quoteTotals>[0][] };
      expect(quotes.items.length).toBe(3);
      for (const q of quotes.items) expect(quoteTotals(q).total).toBeGreaterThan(0);
    }
  });

  it('seeding is idempotent and can be switched off', async () => {
    const db = fakeDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await seedShowcases(db as any, {}, undefined, NOW)).toEqual(['mechanic', 'lawn']);
    const writes = db.writes.length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await seedShowcases(db as any, {}, undefined, NOW)).toEqual([]);
    expect(db.writes.length).toBe(writes);
    const off = fakeDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await seedShowcases(off as any, { SHOWCASE_SEED: 'off' }, undefined, NOW)).toEqual([]);
    expect(off.writes.length).toBe(0);
  });

  it('creates demo owner logins only when DEMO_OWNER_PASSWORD is set', async () => {
    const created: string[] = [];
    const auth = {
      getUser: async () => { throw new Error('no user'); },
      createUser: async (p: { uid: string }) => { created.push(p.uid); return p; },
      updateUser: async () => ({}),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedShowcases(fakeDb() as any, {}, auth, NOW);
    expect(created).toEqual([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedShowcases(fakeDb() as any, { DEMO_OWNER_PASSWORD: 'long-enough-pass' }, auth, NOW);
    expect(created).toEqual(['showcase-bay-mobile-mechanics', 'showcase-tauranga-lawn-co']);
  });

  it('never throws when Firestore fails', async () => {
    const db = { doc: () => ({ get: async () => { throw new Error('down'); }, set: async () => undefined }) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await seedShowcases(db as any, {}, undefined, NOW)).toEqual([]);
  });
});
