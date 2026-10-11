import { BusinessType, Service, FAQ } from './types';
import { getStockImages } from './stock-images';

/**
 * Ready-made industry templates for the setup wizard: copy, services, FAQs,
 * colours, section order and starter photos. Photos are Unsplash (free to use
 * under the Unsplash License) — the same source as stock-images.ts.
 * NZ-flavoured copy; prices are examples the owner edits.
 */
export interface IndustryTemplate {
  id: string;
  label: string;
  blurb: string;
  businessType: BusinessType;
  tagline: string;
  heroCopy: string;
  description: string;
  ctaText: string;
  tone: string;
  trustBadges: string[];
  enquiryFields: string[];
  services: Service[];
  faqs: FAQ[];
  colors: { primary: string; secondary: string; background: string };
  /** Visible homepage sections, in order. Others stay hidden (owner can turn them on). */
  sections: string[];
  headings: Partial<Record<string, { heading: string; subheading: string }>>;
  heroImage: string;
  aboutImage: string;
  openingHours: string;
  /** Optional override for service photos (defaults to stock images for the business type). */
  serviceImages?: string[];
}

const u = (id: string) => `https://images.unsplash.com/photo-${id}?w=1200&q=80`;

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'lawn-garden', label: 'Lawn care & gardening', blurb: 'Mowing, hedges, garden tidy-ups', businessType: 'lawn mowing',
    tagline: 'Tidy lawns and happy gardens, sorted.',
    heroCopy: 'Reliable lawn mowing and garden care, on a schedule that suits you.',
    description: 'We are a local, owner-operated lawn and garden service. We turn up when we say we will, leave your place tidy, and give honest, fixed quotes.',
    ctaText: 'Get a free quote', tone: 'Friendly, down-to-earth and reliable',
    trustBadges: ['Locally owned', 'Fixed-price quotes', 'Clippings taken away'],
    enquiryFields: ['Section size', 'How often?'],
    services: [
      { id: 'lg1', name: 'Lawn mowing', description: 'Mow, edges and clippings removed. One-off or regular.', price: '$45', duration: '45 min' },
      { id: 'lg2', name: 'Hedge trimming', description: 'Neat, even hedges with green waste taken away.', price: '$60', duration: '1 hr' },
      { id: 'lg3', name: 'Garden tidy-up', description: 'Weeding, pruning and mulch to get the garden back in shape.', price: 'from $120' },
    ],
    faqs: [
      { id: 'lgf1', question: 'Do you take the clippings away?', answer: 'Yes, clippings and green waste are included unless you want them for compost.' },
      { id: 'lgf2', question: 'What if it rains?', answer: "We'll move you to the next dry day and let you know by text." },
    ],
    colors: { primary: '#15803d', secondary: '#65a30d', background: '#f7fdf4' },
    sections: ['hero', 'services', 'about', 'testimonials', 'gallery', 'faq', 'contact'],
    headings: { services: { heading: 'What we do', subheading: 'Simple pricing, no surprises' }, gallery: { heading: 'Recent work', subheading: 'Before and after' } },
    heroImage: u('1558904541-efa843a96f01'), aboutImage: u('1416879595882-3373a0480b5b'),
    openingHours: 'Mon–Fri: 7:30am – 5pm\nSat: 8am – 12pm\nSun: Closed',
  },
  {
    id: 'builder-trades', label: 'Builders & trades', blurb: 'Builders, renovations, handyman', businessType: 'other',
    tagline: 'Quality building work, done right the first time.',
    heroCopy: 'Licensed, insured builders for renovations, decks and repairs.',
    description: 'We are a small team of qualified tradespeople. Clear quotes, tidy sites and work that is built to last, backed by our workmanship guarantee.',
    ctaText: 'Request a quote', tone: 'Straightforward, professional and confident',
    trustBadges: ['Licensed Building Practitioner', 'Fully insured', 'Workmanship guarantee'],
    enquiryFields: ['Type of job', 'Rough budget', 'Ideal start date'],
    services: [
      { id: 'bt1', name: 'Renovations', description: 'Kitchens, bathrooms and living spaces, managed start to finish.', price: 'Quoted' },
      { id: 'bt2', name: 'Decks & outdoor', description: 'Hardwood and composite decks, pergolas and fences.', price: 'Quoted' },
      { id: 'bt3', name: 'Repairs & maintenance', description: 'Rot repairs, doors, windows and general building maintenance.', price: 'from $85/hr' },
    ],
    faqs: [
      { id: 'btf1', question: 'Do you handle consents?', answer: 'Yes, we can manage building consent with your council where it is needed.' },
      { id: 'btf2', question: 'How soon can you start?', answer: "Most jobs can start within 2–4 weeks. We'll give you a firm date with your quote." },
    ],
    colors: { primary: '#c2410c', secondary: '#334155', background: '#fafaf9' },
    sections: ['hero', 'services', 'gallery', 'about', 'badges', 'testimonials', 'faq', 'contact'],
    headings: { gallery: { heading: 'Our projects', subheading: 'A few jobs we are proud of' } },
    heroImage: u('1504307651254-35680f356dfd'), aboutImage: u('1503387762-592deb58ef4e'),
    serviceImages: [u('1541888946425-d81bb19240f5'), u('1504307651254-35680f356dfd'), u('1503387762-592deb58ef4e')],
    openingHours: 'Mon–Fri: 7am – 5pm\nSat–Sun: Closed',
  },
  {
    id: 'cafe', label: 'Café', blurb: 'Coffee, brunch, cabinet food', businessType: 'cafe',
    tagline: 'Great coffee and good food, made with care.',
    heroCopy: 'Your local for proper coffee, all-day brunch and fresh cabinet food.',
    description: 'We are a neighbourhood café serving locally roasted coffee and food made fresh every morning. Dogs welcome on the deck.',
    ctaText: 'See the menu', tone: 'Warm, welcoming and relaxed',
    trustBadges: ['Locally roasted coffee', 'Vegan & GF options', 'Dog friendly'],
    enquiryFields: ['Number of people', 'Date'],
    services: [
      { id: 'cf1', name: 'Flat white', description: 'Locally roasted, smooth and strong.', price: '$5.50' },
      { id: 'cf2', name: 'Big brekkie', description: 'Eggs your way, bacon, mushrooms, hash brown and toast.', price: '$24' },
      { id: 'cf3', name: 'Catering platters', description: 'Sweet and savoury platters for the office or events.', price: 'from $60' },
    ],
    faqs: [
      { id: 'cff1', question: 'Do you take bookings?', answer: 'Walk-ins are welcome. For groups of 8 or more, please send us an enquiry.' },
      { id: 'cff2', question: 'Do you have gluten-free options?', answer: 'Yes, ask at the counter. Our cabinet always has GF and vegan choices.' },
    ],
    colors: { primary: '#92400e', secondary: '#b45309', background: '#fffbf5' },
    sections: ['hero', 'about', 'services', 'hours', 'location', 'gallery', 'testimonials', 'contact'],
    headings: { services: { heading: 'On the menu', subheading: 'A taste of what we serve' } },
    heroImage: u('1554118811-1e0d58224f24'), aboutImage: u('1495474472287-4d71bcdd2085'),
    openingHours: 'Mon–Fri: 7am – 3pm\nSat–Sun: 8am – 2pm',
  },
  {
    id: 'hair-beauty', label: 'Hair & beauty', blurb: 'Salons, barbers, beauty therapists', businessType: 'barber',
    tagline: 'Look good, feel great.',
    heroCopy: 'Cuts, colour and beauty treatments in a relaxed, friendly salon.',
    description: 'Our experienced stylists take the time to listen. Whether it is a quick trim or a full colour, you will leave feeling like you.',
    ctaText: 'Book an appointment', tone: 'Friendly, stylish and caring',
    trustBadges: ['Qualified stylists', 'Quality products', 'Easy online booking'],
    enquiryFields: ['Service wanted', 'Preferred stylist'],
    services: [
      { id: 'hb1', name: "Women's cut & blow-dry", description: 'Consultation, wash, cut and finish.', price: '$75', duration: '60 min' },
      { id: 'hb2', name: "Men's cut", description: 'Classic or modern cut, finished with a style.', price: '$40', duration: '30 min' },
      { id: 'hb3', name: 'Colour', description: 'Full colour, foils or balayage. Price depends on length.', price: 'from $120' },
    ],
    faqs: [
      { id: 'hbf1', question: 'Do I need to book?', answer: 'Bookings are best, but we fit in walk-ins when we can.' },
      { id: 'hbf2', question: 'Do you do patch tests?', answer: 'Yes. New colour clients need a quick patch test 48 hours before.' },
    ],
    colors: { primary: '#be185d', secondary: '#7c3aed', background: '#fdf7fb' },
    sections: ['hero', 'services', 'about', 'gallery', 'testimonials', 'hours', 'contact'],
    headings: { services: { heading: 'Services & prices', subheading: 'Treat yourself' } },
    heroImage: u('1560066984-138dadb4c035'), aboutImage: u('1522337360788-8b13dee7a37e'),
    openingHours: 'Tue–Fri: 9am – 6pm\nThu: 9am – 8pm\nSat: 9am – 3pm\nSun–Mon: Closed',
  },
  {
    id: 'cleaning', label: 'Cleaning', blurb: 'Home, office and end-of-tenancy', businessType: 'cleaner',
    tagline: 'Sparkling clean, every time.',
    heroCopy: 'Trusted home and office cleaning that gives you your weekends back.',
    description: 'We are police-vetted, insured cleaners who treat your home like our own. Regular or one-off, with eco-friendly products.',
    ctaText: 'Get a free quote', tone: 'Professional, trustworthy and detail-oriented',
    trustBadges: ['Police vetted', 'Fully insured', 'Eco-friendly products'],
    enquiryFields: ['Bedrooms', 'Bathrooms', 'How often?'],
    services: [
      { id: 'cl1', name: 'Regular clean', description: 'Weekly or fortnightly clean of kitchen, bathrooms and living areas.', price: 'from $120' },
      { id: 'cl2', name: 'Deep clean', description: 'Top-to-bottom clean including skirting boards, ovens and inside cupboards.', price: 'from $280' },
      { id: 'cl3', name: 'End-of-tenancy', description: 'Bond-back standard clean for moving out.', price: 'from $350' },
    ],
    faqs: [
      { id: 'clf1', question: 'Do I need to supply products?', answer: 'No, we bring everything, including eco-friendly products.' },
      { id: 'clf2', question: 'Do I need to be home?', answer: 'Not at all. Many clients give us a key or door code.' },
    ],
    colors: { primary: '#0e7490', secondary: '#0891b2', background: '#f5fbfd' },
    sections: ['hero', 'services', 'badges', 'about', 'testimonials', 'faq', 'contact'],
    headings: {},
    heroImage: u('1581578731548-c64695cc6952'), aboutImage: u('1556911220-bff31c812dba'),
    openingHours: 'Mon–Fri: 8am – 5pm\nSat: By arrangement\nSun: Closed',
  },
  {
    id: 'fitness', label: 'Fitness', blurb: 'Personal trainers, gyms, classes', businessType: 'personal trainer',
    tagline: 'Get stronger, fitter and more confident.',
    heroCopy: 'Personal training and small-group classes that fit your life.',
    description: 'I help busy people get fit without the guesswork. Friendly, judgement-free coaching with a plan built around you.',
    ctaText: 'Book a free session', tone: 'Energetic, encouraging and supportive',
    trustBadges: ['Registered exercise professional', 'First session free', 'All fitness levels'],
    enquiryFields: ['Your goal', 'Preferred times'],
    services: [
      { id: 'ft1', name: '1-on-1 personal training', description: 'A tailored session focused on your goals.', price: '$70', duration: '45 min' },
      { id: 'ft2', name: 'Small-group class', description: 'Strength and conditioning in groups of up to 6.', price: '$20', duration: '45 min' },
      { id: 'ft3', name: '8-week programme', description: 'Plan, check-ins and nutrition guidance.', price: '$399' },
    ],
    faqs: [
      { id: 'ftf1', question: "I'm a beginner. Is that OK?", answer: 'Absolutely. Every plan starts where you are now.' },
      { id: 'ftf2', question: 'Where are sessions held?', answer: 'At our studio, outdoors, or online. Your choice.' },
    ],
    colors: { primary: '#dc2626', secondary: '#111827', background: '#fafafa' },
    sections: ['hero', 'services', 'about', 'pricing', 'testimonials', 'faq', 'contact'],
    headings: { services: { heading: 'Ways to train', subheading: 'Pick what suits you' } },
    heroImage: u('1534438327276-14e5300c3a48'), aboutImage: u('1549060279-7e168fcee0c2'),
    openingHours: 'Mon–Fri: 6am – 8pm\nSat: 7am – 12pm\nSun: Closed',
  },
];

export function getIndustryTemplate(id: string | null | undefined): IndustryTemplate | undefined {
  return INDUSTRY_TEMPLATES.find(t => t.id === id);
}

export interface SectionLike { id: string; visible: boolean; order: number; heading: string; subheading: string; imageUrl?: string }

/**
 * Apply a template's section plan to the existing section list: listed
 * sections become visible in the template's order (with its headings/images),
 * everything else is hidden but kept, so nothing the owner might want is lost.
 */
export function applyTemplateSections<T extends SectionLike>(sections: T[], t: IndustryTemplate): T[] {
  const rank = new Map(t.sections.map((id, i) => [id, i]));
  const ordered = [...sections].sort((a, b) => (rank.get(a.id) ?? 100 + a.order) - (rank.get(b.id) ?? 100 + b.order));
  return ordered.map((s, i) => {
    const h = t.headings[s.id];
    return {
      ...s,
      order: i,
      visible: rank.has(s.id),
      ...(h ? { heading: h.heading, subheading: h.subheading } : {}),
      ...(s.id === 'hero' ? { imageUrl: t.heroImage } : {}),
      ...(s.id === 'about' ? { imageUrl: t.aboutImage } : {}),
    };
  });
}

/** Template services with starter photos (so the gallery isn't empty on day one). */
export function templateServices(t: IndustryTemplate): Service[] {
  const pics = t.serviceImages?.length ? t.serviceImages : getStockImages(t.businessType, 'services').map(i => i.url).concat(getStockImages(t.businessType, 'about').map(i => i.url));
  return t.services.map((s, i) => ({ ...s, ...(pics.length ? { imageUrl: pics[i % pics.length] } : {}) }));
}
