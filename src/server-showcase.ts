/**
 * Demo showcases: two fully filled-in example businesses (a Tauranga mobile
 * mechanic and a Tauranga lawn-mowing round) that a funder, customer or beta
 * tester can click through with no placeholders.
 *
 * The seed is idempotent: each showcase carries a `showcaseVersion` on its main
 * doc and is only (re)written when that version changes, so bookings/enquiries
 * made during a walkthrough survive restarts. Turn it off with SHOWCASE_SEED=off.
 * Showcase owners can sign in only when DEMO_OWNER_PASSWORD is set (stored as a
 * GitHub Actions secret, passed to Cloud Run by deploy.yml); otherwise the
 * public sites still work and only the owner dashboard login is unavailable.
 */
import type { Firestore } from 'firebase-admin/firestore';
import { defaultState } from './app/default-state';
import type { AppState, Enquiry, Service } from './app/types';
import type { Booking, BookingSettings } from './app/booking-rules';
import type { Quote } from './app/quote-rules';

export const SHOWCASE_VERSION = 1;

export interface ShowcaseDef {
  id: string;
  uid: string;
  slug: string;
  label: string;
  ownerEmail: string;
  state: AppState;
  booking: BookingSettings;
  bookings: (now: Date) => Booking[];
  quotes: (now: Date) => Quote[];
  enquiries: (now: Date) => Enquiry[];
}

const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=1200&q=80`;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const dayIso = (now: Date, addDays: number) => new Date(now.getTime() + addDays * 86_400_000).toISOString().slice(0, 10);
/** A NZ local wall-clock time on a day relative to now, as ISO UTC (NZDT = UTC+13, NZST = UTC+12; close enough for demo data). */
function nzSlot(now: Date, addDays: number, hour: number, durMin: number): { start: string; end: string } {
  const d = dayIso(now, addDays);
  const start = new Date(`${d}T${String(hour).padStart(2, '0')}:00:00+13:00`);
  return { start: start.toISOString(), end: new Date(start.getTime() + durMin * 60_000).toISOString() };
}

function sections(state: AppState, plan: string[], headings: Record<string, [string, string]>, hero: string, about: string) {
  const rank = new Map(plan.map((id, i) => [id, i]));
  state.customization.sections = state.customization.sections
    .sort((a, b) => (rank.get(a.id) ?? 100 + a.order) - (rank.get(b.id) ?? 100 + b.order))
    .map((s, i) => ({
      ...s,
      order: i,
      visible: rank.has(s.id),
      ...(headings[s.id] ? { heading: headings[s.id][0], subheading: headings[s.id][1] } : {}),
      ...(s.id === 'hero' ? { imageUrl: hero } : {}),
      ...(s.id === 'about' ? { imageUrl: about } : {}),
    }));
}

function weekdays(start: string, end: string, sat?: [string, string]): BookingSettings['weekly'] {
  const d = [{ start, end }];
  return { mon: d, tue: d, wed: d, thu: d, fri: d, sat: sat ? [{ start: sat[0], end: sat[1] }] : [], sun: [] };
}

function enquiry(now: Date, daysAgo: number, e: Partial<Enquiry> & Pick<Enquiry, 'id' | 'name' | 'serviceInterest' | 'message'>): Enquiry {
  return {
    email: '', phone: '', preferredDateTime: '', urgency: 'Medium', status: 'New', leadScore: 'Warm',
    ...e,
    date: new Date(now.getTime() - daysAgo * 86_400_000).toISOString(),
  };
}

function quote(now: Date, q: Omit<Quote, 'currency' | 'gstMode' | 'createdAt' | 'updatedAt' | 'issueDate' | 'dueDate'> & { ageDays: number }): Quote {
  const { ageDays, ...rest } = q;
  const created = new Date(now.getTime() - ageDays * 86_400_000).toISOString();
  return { ...rest, currency: 'NZD', gstMode: 'inclusive', issueDate: dayIso(now, -ageDays), dueDate: dayIso(now, 30 - ageDays), createdAt: created, updatedAt: created };
}

// ── (a) Mobile mechanic ────────────────────────────────────────────────────
function mechanicState(): AppState {
  const s = clone(defaultState);
  const services: Service[] = [
    { id: 'mm-wof', name: 'WOF prep check', description: 'Full pre-WOF inspection at your place: lights, tyres, brakes, wipers, seatbelts and leaks. You get a written list of anything that would fail, before you book your WOF.', price: '$79', duration: '45 min', imageUrl: img('1487754180451-c456f719905b') },
    { id: 'mm-oil', name: 'Oil & filter service', description: 'Quality oil to your manufacturer spec, new oil filter, fluid top-ups and a 20-point safety check. Most petrol cars and utes.', price: '$169', duration: '1 hr', imageUrl: img('1486262715619-67b85e0b08d3') },
    { id: 'mm-brake', name: 'Front brake pads', description: 'Supply and fit quality front pads, inspect rotors and calipers, test drive. Rotors quoted separately if needed.', price: 'from $249', duration: '1.5 hr', imageUrl: img('1530046339160-ce3e530c7d2b') },
    { id: 'mm-diag', name: 'Diagnostics & warning lights', description: 'Engine light on? We scan the fault codes, test the likely cause and explain the fix in plain English before any work.', price: '$95', duration: '45 min', imageUrl: img('1619642751034-765dfdf7c58e') },
    { id: 'mm-batt', name: 'Battery test & replacement', description: 'Free battery and charging test with any visit. Replacement battery supplied and fitted, old one recycled.', price: 'from $229', duration: '30 min', imageUrl: img('1622186477895-f2af6a0f5a97') },
  ];
  s.profile = {
    ...s.profile,
    name: 'Bay Mobile Mechanics', type: 'mechanic',
    tagline: 'We come to you, anywhere in Tauranga and the Mount.',
    description: "Bay Mobile Mechanics is run by Rangi, a qualified automotive technician with 15 years in Tauranga workshops. Since 2021 he has brought the workshop to his customers: at home, at work or on the side of the road. Fixed prices, no workshop drop-offs, and honest advice on what actually needs doing.",
    email: 'hello@baymobilemechanics.example', phone: '021 555 0142',
    address: 'Home-based, Bethlehem, Tauranga 3110', serviceArea: 'Tauranga, Mount Maunganui, Papamoa, Bethlehem and Te Puna',
    openingHours: 'Mon–Fri: 7:30am – 5:30pm\nSat: 8am – 12pm\nSun: Closed',
    toneOfVoice: 'Friendly, practical and straight-talking', brandColor: '#b91c1c',
    heroCopy: 'Servicing, brakes, batteries and WOF prep at your home or work. No tow, no waiting room.',
    ctaText: 'Get a quote', trustBadges: ['Qualified technician', 'Prices include GST', '12-month parts warranty'],
    enquiryFields: ['Vehicle make & model', 'Rego'], currency: 'NZD', pricesIncludeGst: true, gstNumber: '123-456-789',
  };
  s.services = services;
  s.testimonials = [
    { id: 'mt1', author: 'Kirsty M., Papamoa', rating: 5, text: 'Rangi did my brakes in the driveway while I worked from home. Fair price and he showed me the old pads.' },
    { id: 'mt2', author: 'Dave T., Bethlehem', rating: 5, text: 'Ute wouldn\u2019t start at 7am. He was there by 8, new battery fitted, I was on site by 9.' },
    { id: 'mt3', author: 'Aroha P., Mount Maunganui', rating: 5, text: 'The WOF prep check saved me a fail and a second trip. Highly recommend.' },
  ];
  s.faqs = [
    { id: 'mf1', question: 'Do I need a driveway?', answer: 'Any safe, flat spot works: your driveway, a work car park or the street outside, as long as it\u2019s legal to park there.' },
    { id: 'mf2', question: 'Are your prices GST-inclusive?', answer: 'Yes. Every price on this site includes GST. Parts beyond the listed job are always quoted before we fit them.' },
    { id: 'mf3', question: 'Can you do a WOF?', answer: 'We do the WOF prep check so you pass first time. The WOF itself is issued by a testing station.' },
    { id: 'mf4', question: 'How do I pay?', answer: 'Bank transfer or card on the day. You get a GST invoice by email.' },
  ];
  s.customization.branding = { ...s.customization.branding, primaryColor: '#b91c1c', secondaryColor: '#1f2937', backgroundColor: '#fafafa', ctaText: 'Get a quote' };
  sections(s, ['hero', 'services', 'about', 'testimonials', 'hours', 'faq', 'contact'],
    { services: ['Services & prices', 'All prices include GST'], about: ['About Rangi', 'Your local mobile mechanic'], testimonials: ['What customers say', 'Reviews from around the Bay'], hours: ['Hours', 'Book online any time'] },
    img('1486262715619-67b85e0b08d3'), img('1619642751034-765dfdf7c58e'));
  s.isSetupComplete = true;
  s.siteSlug = 'demo-bay-mobile-mechanics';
  return s;
}

// ── (b) Lawn mowing ────────────────────────────────────────────────────────
function lawnState(): AppState {
  const s = clone(defaultState);
  s.profile = {
    ...s.profile,
    name: 'Tauranga Lawn Co', type: 'lawn mowing',
    tagline: 'Tidy lawns, every fortnight, without the hassle.',
    description: 'Tauranga Lawn Co is a family-run mowing round covering Tauranga and the Mount. We mow, edge, blow the paths clean and take the clippings away. Most customers are on our fortnightly plan, so the lawn never gets away on them.',
    email: 'mow@taurangalawnco.example', phone: '022 555 0187',
    address: 'Home-based, Greerton, Tauranga 3112', serviceArea: 'Tauranga, Mount Maunganui, Papamoa, Ohauiti and Welcome Bay',
    openingHours: 'Mon–Fri: 7:30am – 5pm\nSat: 8am – 1pm\nSun: Closed',
    toneOfVoice: 'Friendly, down-to-earth and reliable', brandColor: '#15803d',
    heroCopy: 'Mowing, edging and green-waste removal at fixed prices. One-off or every fortnight.',
    ctaText: 'Get a free quote', trustBadges: ['Locally owned', 'Fixed prices incl. GST', 'Clippings taken away'],
    enquiryFields: ['Section size', 'How often?'], currency: 'NZD', pricesIncludeGst: true,
  };
  s.services = [
    { id: 'lc-s', name: 'Small section mow', description: 'Up to about 300 m² (most townhouses and units). Mow, edges trimmed, paths blown clean.', price: '$45', duration: '30 min', imageUrl: img('1564429238961-71748ccc7d38') },
    { id: 'lc-m', name: 'Medium section mow', description: '300–700 m², the typical Tauranga house section. Mow, edges and paths.', price: '$60', duration: '45 min', imageUrl: img('1558904541-efa843a96f01') },
    { id: 'lc-l', name: 'Large section mow', description: '700 m² and up, including lifestyle-style front lawns. Ride-on where it fits.', price: '$85', duration: '1 hr', imageUrl: img('1592417817098-8fd3d9eb14a5') },
    { id: 'lc-edge', name: 'Edging & tidy-up', description: 'Crisp edges along paths, gardens and driveways, with weeds pulled from the edges.', price: '$30', duration: '20 min', imageUrl: img('1416879595882-3373a0480b5b') },
    { id: 'lc-gw', name: 'Green-waste removal', description: 'Clippings, prunings and garden waste taken away and composted. Per trailer load.', price: '$40', duration: '15 min', imageUrl: img('1585320806297-9794b3e4eeae') },
    { id: 'lc-plan', name: 'Fortnightly lawn plan', description: 'A medium-section mow with edging every two weeks, clippings included. Skip a visit any time; no contract.', price: '$55 per visit', duration: '45 min', imageUrl: img('1500382017468-9049fed747ef') },
  ];
  s.testimonials = [
    { id: 'lt1', author: 'Sarah K., Papamoa', rating: 5, text: 'On the fortnightly plan for a year. Never missed a visit, and the edges are always sharp.' },
    { id: 'lt2', author: 'Graham W., Ohauiti', rating: 5, text: 'Big section, fair price. They text the day before and take everything away.' },
    { id: 'lt3', author: 'Mei L., Mount Maunganui', rating: 5, text: 'Easy to book online and great value for a rental property.' },
  ];
  s.faqs = [
    { id: 'lf1', question: 'Do I need to be home?', answer: 'No. Leave the gate unlocked and any dogs inside, and we\u2019ll get on with it.' },
    { id: 'lf2', question: 'What if it rains?', answer: 'We move you to the next dry day and let you know.' },
    { id: 'lf3', question: 'Are prices GST-inclusive?', answer: 'Yes, every price includes GST.' },
    { id: 'lf4', question: 'Is there a contract for the fortnightly plan?', answer: 'No contract. Pause or cancel any time.' },
  ];
  s.customization.branding = { ...s.customization.branding, primaryColor: '#15803d', secondaryColor: '#65a30d', backgroundColor: '#f7fdf4', ctaText: 'Get a free quote' };
  sections(s, ['hero', 'services', 'about', 'testimonials', 'hours', 'faq', 'contact'],
    { services: ['Mowing & prices', 'Fixed prices, GST included'], about: ['About us', 'A local family business'], testimonials: ['Happy lawns', 'From our regulars'], hours: ['Hours', 'Book online any time'] },
    img('1558904541-efa843a96f01'), img('1416879595882-3373a0480b5b'));
  s.isSetupComplete = true;
  s.siteSlug = 'demo-tauranga-lawn-co';
  return s;
}

const booking = (now: Date, id: string, svc: [string, string], day: number, hour: number, dur: number, name: string, notes: string, status: Booking['status']): Booking => ({
  id, serviceId: svc[0], serviceName: svc[1], ...nzSlot(now, day, hour, dur), name,
  email: `${name.split(' ')[0].toLowerCase()}@example.com`, phone: '021 000 0000', notes, status,
  createdAt: new Date(now.getTime() - 2 * 86_400_000).toISOString(),
});

export const SHOWCASES: ShowcaseDef[] = [
  {
    id: 'mechanic', uid: 'showcase-bay-mobile-mechanics', slug: 'demo-bay-mobile-mechanics', label: 'Mobile Mechanic',
    ownerEmail: 'demo.mechanic@example.com', state: mechanicState(),
    booking: {
      enabled: true, timezone: 'Pacific/Auckland', weekly: weekdays('07:30', '17:30', ['08:00', '12:00']),
      services: [
        { id: 'mm-wof', name: 'WOF prep check', durationMin: 45, price: '$79' },
        { id: 'mm-oil', name: 'Oil & filter service', durationMin: 60, price: '$169' },
        { id: 'mm-brake', name: 'Front brake pads', durationMin: 90, price: 'from $249' },
        { id: 'mm-diag', name: 'Diagnostics & warning lights', durationMin: 45, price: '$95' },
        { id: 'mm-batt', name: 'Battery test & replacement', durationMin: 30, price: 'from $229' },
      ],
      blackouts: [], slotStepMin: 30, leadTimeHours: 2, maxDaysAhead: 60,
    },
    bookings: (now) => [
      booking(now, 'demo-b1', ['mm-oil', 'Oil & filter service'], 1, 9, 60, 'Kirsty Morgan', '2016 Mazda CX-5, at work car park on Cameron Rd', 'accepted'),
      booking(now, 'demo-b2', ['mm-wof', 'WOF prep check'], 2, 13, 45, 'Hemi Walker', 'Corolla, WOF due next week', 'pending'),
      booking(now, 'demo-b3', ['mm-batt', 'Battery test & replacement'], 3, 8, 30, 'Dave Thompson', 'Hilux slow to start in the mornings', 'pending'),
    ],
    quotes: (now) => [
      quote(now, { ageDays: 3, id: 'demo-q1', number: 'Q-0001', kind: 'quote', status: 'sent', customerName: 'Aroha Paki', customerEmail: 'aroha@example.com', notes: '2014 Toyota RAV4. Price includes GST. Valid 30 days.', lines: [{ description: 'Front brake pads (supply & fit)', quantity: 1, unitPrice: 249 }, { description: 'Machine front rotors', quantity: 2, unitPrice: 65 }], sentAt: new Date(now.getTime() - 3 * 86_400_000).toISOString() }),
      quote(now, { ageDays: 1, id: 'demo-q2', number: 'Q-0002', kind: 'quote', status: 'draft', customerName: 'Ben Carter', customerEmail: 'ben@example.com', notes: 'Engine light on, 2012 Ford Ranger.', lines: [{ description: 'Diagnostics & fault scan', quantity: 1, unitPrice: 95 }] }),
      quote(now, { ageDays: 6, id: 'demo-i1', number: 'INV-0001', kind: 'invoice', status: 'sent', customerName: 'Dave Thompson', customerEmail: 'dave@example.com', notes: 'Thanks for your business. Bank transfer to 12-3456-7890123-00.', lines: [{ description: 'Oil & filter service', quantity: 1, unitPrice: 169 }, { description: 'Wiper blades (pair)', quantity: 1, unitPrice: 39 }], sentAt: new Date(now.getTime() - 6 * 86_400_000).toISOString() }),
    ],
    enquiries: (now) => [
      enquiry(now, 0, { id: 'demo-e1', name: 'Sam Rawiri', email: 'sam@example.com', phone: '027 000 0001', serviceInterest: 'Front brake pads', message: 'Squealing brakes on my 2015 Swift. Can you come to Papamoa on Thursday?', urgency: 'High', leadScore: 'Hot' }),
      enquiry(now, 2, { id: 'demo-e2', name: 'Lisa Chen', email: 'lisa@example.com', phone: '027 000 0002', serviceInterest: 'WOF prep check', message: 'WOF due end of the month on a 2010 Honda Jazz.', status: 'Quoted' }),
    ],
  },
  {
    id: 'lawn', uid: 'showcase-tauranga-lawn-co', slug: 'demo-tauranga-lawn-co', label: 'Lawn Mowing',
    ownerEmail: 'demo.lawn@example.com', state: lawnState(),
    booking: {
      enabled: true, timezone: 'Pacific/Auckland', weekly: weekdays('07:30', '17:00', ['08:00', '13:00']),
      services: [
        { id: 'lc-s', name: 'Small section mow', durationMin: 30, price: '$45' },
        { id: 'lc-m', name: 'Medium section mow', durationMin: 45, price: '$60' },
        { id: 'lc-l', name: 'Large section mow', durationMin: 60, price: '$85' },
        { id: 'lc-plan', name: 'Fortnightly lawn plan (first visit)', durationMin: 45, price: '$55 per visit' },
      ],
      blackouts: [], slotStepMin: 30, leadTimeHours: 2, maxDaysAhead: 60,
    },
    bookings: (now) => [
      booking(now, 'demo-b1', ['lc-plan', 'Fortnightly lawn plan (first visit)'], 1, 10, 45, 'Sarah King', 'Side gate code 1234, dog will be inside', 'accepted'),
      booking(now, 'demo-b2', ['lc-l', 'Large section mow'], 2, 14, 60, 'Graham Wilson', 'Back paddock too please', 'pending'),
      booking(now, 'demo-b3', ['lc-s', 'Small section mow'], 4, 9, 30, 'Mei Lin', 'Rental, tenants are aware', 'pending'),
    ],
    quotes: (now) => [
      quote(now, { ageDays: 2, id: 'demo-q1', number: 'Q-0001', kind: 'quote', status: 'sent', customerName: 'Tom Harris', customerEmail: 'tom@example.com', notes: 'Overgrown section, first cut then fortnightly. Prices include GST.', lines: [{ description: 'First cut (overgrown, large section)', quantity: 1, unitPrice: 120 }, { description: 'Green-waste removal (trailer load)', quantity: 2, unitPrice: 40 }, { description: 'Fortnightly lawn plan visit', quantity: 6, unitPrice: 55 }], sentAt: new Date(now.getTime() - 2 * 86_400_000).toISOString() }),
      quote(now, { ageDays: 5, id: 'demo-q2', number: 'Q-0002', kind: 'quote', status: 'accepted', customerName: 'Welcome Bay Body Corp', customerEmail: 'bodycorp@example.com', notes: 'Shared lawns, 4 units.', lines: [{ description: 'Medium section mow', quantity: 4, unitPrice: 60 }, { description: 'Edging & tidy-up', quantity: 4, unitPrice: 30 }], acceptedAt: new Date(now.getTime() - 4 * 86_400_000).toISOString() }),
      quote(now, { ageDays: 8, id: 'demo-i1', number: 'INV-0001', kind: 'invoice', status: 'sent', customerName: 'Sarah King', customerEmail: 'sarah@example.com', notes: 'October visits. Bank transfer to 12-3456-7890123-00.', lines: [{ description: 'Fortnightly lawn plan visit', quantity: 2, unitPrice: 55 }], sentAt: new Date(now.getTime() - 8 * 86_400_000).toISOString() }),
    ],
    enquiries: (now) => [
      enquiry(now, 0, { id: 'demo-e1', name: 'Tom Harris', email: 'tom@example.com', phone: '027 000 0003', serviceInterest: 'Fortnightly lawn plan', message: 'Just bought in Bethlehem, lawn is knee-high. Can you do a first cut and then fortnightly?', urgency: 'High', leadScore: 'Hot', status: 'Quoted' }),
      enquiry(now, 1, { id: 'demo-e2', name: 'Jo Patel', email: 'jo@example.com', phone: '027 000 0004', serviceInterest: 'Medium section mow', message: 'One-off mow before we sell, ideally this weekend.' }),
    ],
  },
];

export function showcaseBySlugOrUid(id: string): ShowcaseDef | undefined {
  return SHOWCASES.find((s) => s.slug === id || s.uid === id);
}

/** Pure: every Firestore doc a showcase needs, keyed by path. */
export function buildShowcaseDocs(def: ShowcaseDef, now: Date): Record<string, Record<string, unknown>> {
  const main = { ...clone(def.state), enquiries: def.enquiries(now), activities: [], showcase: true, showcaseVersion: SHOWCASE_VERSION };
  const quotes = def.quotes(now);
  return {
    [`users/${def.uid}/businessData/main`]: main,
    [`users/${def.uid}/businessData/bookings`]: { settings: def.booking, bookings: def.bookings(now) },
    [`users/${def.uid}/businessData/quotes`]: { items: quotes, counters: { quote: quotes.filter((q) => q.kind === 'quote').length, invoice: quotes.filter((q) => q.kind === 'invoice').length } },
    [`slugs/${def.slug}`]: { uid: def.uid, claimedAt: now.toISOString(), showcase: true },
  };
}

export interface ShowcaseAuth {
  getUser(uid: string): Promise<unknown>;
  createUser(p: { uid: string; email: string; password: string; displayName: string; emailVerified: boolean }): Promise<unknown>;
  updateUser(uid: string, p: { password: string }): Promise<unknown>;
}

/**
 * Idempotent seed. Writes a showcase only when its version differs, and keeps
 * the demo owner logins in step with DEMO_OWNER_PASSWORD when that is set.
 * Never throws: a failed seed must not stop the server.
 */
export async function seedShowcases(db: Firestore, env: Record<string, string | undefined>, auth?: ShowcaseAuth, now = new Date()): Promise<string[]> {
  if ((env['SHOWCASE_SEED'] || '').toLowerCase() === 'off') return [];
  const written: string[] = [];
  for (const def of SHOWCASES) {
    try {
      const snap = await db.doc(`users/${def.uid}/businessData/main`).get();
      if (!snap.exists || snap.data()?.['showcaseVersion'] !== SHOWCASE_VERSION) {
        for (const [path, data] of Object.entries(buildShowcaseDocs(def, now))) {
          await db.doc(path).set(data);
        }
        written.push(def.id);
      }
      const password = env['DEMO_OWNER_PASSWORD'];
      if (auth && password && password.length >= 10) {
        try {
          await auth.getUser(def.uid);
          await auth.updateUser(def.uid, { password });
        } catch {
          await auth.createUser({ uid: def.uid, email: def.ownerEmail, password, displayName: `${def.state.profile.name} (demo)`, emailVerified: true });
        }
      }
    } catch (e) {
      console.warn(`Showcase seed failed for ${def.id}:`, e);
    }
  }
  return written;
}
