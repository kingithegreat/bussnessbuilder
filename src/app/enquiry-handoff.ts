import { Enquiry } from './types';

/**
 * Enquiry → quote / booking hand-off (UX audit F8).
 *
 * Pure helpers so the inbox can offer "Create quote" and "Offer booking"
 * straight from an enquiry, with the customer's details carried across
 * instead of retyped.
 */

export interface QuotePrefill {
  customerName: string;
  customerEmail: string;
  /** First line item description: what the customer asked about. */
  description: string;
}

const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';

/** Customer details a new quote should start with. Never invents a price. */
export function quotePrefillFromEnquiry(enquiry: Pick<Enquiry, 'name' | 'email' | 'serviceInterest'>): QuotePrefill {
  return {
    customerName: clean(enquiry.name, 120),
    customerEmail: clean(enquiry.email, 200),
    description: clean(enquiry.serviceInterest, 200),
  };
}

/** Public site path for the owner: the friendly /s/<slug> when set, else /site/<uid>. */
export function publicSitePath(slug: string | null | undefined, uid: string | null | undefined): string {
  const s = clean(slug, 100);
  if (s) return `/s/${encodeURIComponent(s)}`;
  const u = clean(uid, 128);
  return u ? `/site/${encodeURIComponent(u)}` : '';
}

/** Absolute link to the booking form section (#book) on the owner's public site. */
export function bookingLink(origin: string, sitePath: string): string {
  if (!sitePath) return '';
  return `${origin.replace(/\/+$/, '')}${sitePath}#book`;
}

export interface BookingOfferEmail { subject: string; body: string }

/** Plain, friendly email that invites the customer to pick a time on the booking form. */
export function bookingOfferEmail(
  enquiry: Pick<Enquiry, 'name' | 'serviceInterest'>,
  opts: { businessName?: string; bookingUrl: string },
): BookingOfferEmail {
  const first = clean(enquiry.name, 120).split(' ')[0] || 'there';
  const service = clean(enquiry.serviceInterest, 200);
  const business = clean(opts.businessName, 120);
  const subject = service ? `Book your ${service}` : 'Book a time with us';
  const lines = [
    `Hi ${first},`,
    '',
    `Thanks for getting in touch${service ? ` about ${service}` : ''}. You can pick a time that suits you here:`,
    opts.bookingUrl,
    '',
    "Choose a slot and we'll confirm it by email. Any questions, just reply to this message.",
    '',
    'Thanks,',
    business || '',
  ];
  return { subject, body: lines.join('\n').trimEnd() };
}

/** mailto: link for the booking offer, with subject and body URL-encoded. */
export function bookingOfferMailto(
  enquiry: Pick<Enquiry, 'name' | 'email' | 'serviceInterest'>,
  opts: { businessName?: string; bookingUrl: string },
): string {
  const email = clean(enquiry.email, 200);
  if (!email || !opts.bookingUrl) return '';
  const { subject, body } = bookingOfferEmail(enquiry, opts);
  return `mailto:${encodeURIComponent(email).replace(/%40/g, '@')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
