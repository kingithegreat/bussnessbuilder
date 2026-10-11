/**
 * schema.org JSON-LD for a published site: LocalBusiness with address/area,
 * contact, opening hours text, and approved reviews + AggregateRating.
 * Pure: inputs in, plain object out (serialise with `jsonLdScript`).
 */
export interface JsonLdInput {
  name: string;
  description?: string;
  url?: string;
  email?: string;
  phone?: string;
  address?: string;
  serviceArea?: string;
  openingHours?: string;
  logoUrl?: string;
  imageUrl?: string;
  priceRange?: string;
  reviews?: { author: string; rating: number; text: string; date?: string }[];
}

export function buildLocalBusinessJsonLd(i: JsonLdInput): Record<string, unknown> | null {
  if (!i.name) return null;
  const out: Record<string, unknown> = { '@context': 'https://schema.org', '@type': 'LocalBusiness', name: i.name };
  if (i.description) out['description'] = i.description.slice(0, 500);
  if (i.url) out['url'] = i.url;
  if (i.email) out['email'] = i.email;
  if (i.phone) out['telephone'] = i.phone;
  if (i.logoUrl) out['logo'] = i.logoUrl;
  if (i.imageUrl || i.logoUrl) out['image'] = i.imageUrl || i.logoUrl;
  if (i.priceRange) out['priceRange'] = i.priceRange;
  if (i.address) out['address'] = { '@type': 'PostalAddress', streetAddress: i.address, addressCountry: 'NZ' };
  if (i.serviceArea) out['areaServed'] = i.serviceArea;
  if (i.openingHours) out['openingHours'] = i.openingHours.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const reviews = (i.reviews || []).filter(r => r.author && r.text && r.rating >= 1 && r.rating <= 5).slice(0, 20);
  if (reviews.length) {
    out['review'] = reviews.map(r => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.author },
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
      reviewBody: r.text.slice(0, 1000),
      ...(r.date ? { datePublished: r.date.slice(0, 10) } : {}),
    }));
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    out['aggregateRating'] = { '@type': 'AggregateRating', ratingValue: Math.round(avg * 10) / 10, reviewCount: reviews.length, bestRating: 5, worstRating: 1 };
  }
  return out;
}

/** Safe for embedding in <script type="application/ld+json"> (no "</script>" breakout). */
export function jsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}
