import { bookingLink, bookingOfferEmail, bookingOfferMailto, publicSitePath, quotePrefillFromEnquiry } from './enquiry-handoff';

describe('enquiry hand-off helpers (F8)', () => {
  const lead = { name: '  Jane   Smith ', email: ' jane@example.co.nz ', serviceInterest: ' Full  interior detail ' };

  it('carries customer name, email and service into a quote, trimmed', () => {
    expect(quotePrefillFromEnquiry(lead)).toEqual({
      customerName: 'Jane Smith', customerEmail: 'jane@example.co.nz', description: 'Full interior detail',
    });
  });

  it('copes with missing fields without inventing anything', () => {
    expect(quotePrefillFromEnquiry({ name: '', email: undefined as unknown as string, serviceInterest: '' }))
      .toEqual({ customerName: '', customerEmail: '', description: '' });
  });

  it('prefers the friendly slug and falls back to the uid', () => {
    expect(publicSitePath('kowhai-coast', 'u1')).toBe('/s/kowhai-coast');
    expect(publicSitePath('', 'u1')).toBe('/site/u1');
    expect(publicSitePath('', '')).toBe('');
  });

  it('links to the #book section of the public site', () => {
    expect(bookingLink('https://app.example/', '/s/abc')).toBe('https://app.example/s/abc#book');
    expect(bookingLink('https://app.example', '')).toBe('');
  });

  it('writes a short booking invite with the link and business name', () => {
    const { subject, body } = bookingOfferEmail(lead, { businessName: 'Kōwhai Coast', bookingUrl: 'https://x/s/k#book' });
    expect(subject).toBe('Book your Full interior detail');
    expect(body).toContain('Hi Jane,');
    expect(body).toContain('about Full interior detail');
    expect(body).toContain('https://x/s/k#book');
    expect(body.trimEnd().endsWith('Kōwhai Coast')).toBe(true);
  });

  it('uses neutral wording when the enquiry has no name or service', () => {
    const { subject, body } = bookingOfferEmail({ name: '', serviceInterest: '' }, { bookingUrl: 'https://x#book' });
    expect(subject).toBe('Book a time with us');
    expect(body).toContain('Hi there,');
    expect(body).not.toContain(' about ');
  });

  it('builds an encoded mailto link, or nothing without an email or link', () => {
    const href = bookingOfferMailto(lead, { businessName: 'Biz & Co', bookingUrl: 'https://x/s/k#book' });
    expect(href.startsWith('mailto:jane@example.co.nz?subject=')).toBe(true);
    const params = new URLSearchParams(href.split('?')[1]);
    expect(params.get('subject')).toBe('Book your Full interior detail');
    expect(params.get('body')).toContain('https://x/s/k#book');
    expect(params.get('body')).toContain('Biz & Co');
    expect(bookingOfferMailto({ ...lead, email: '' }, { bookingUrl: 'https://x' })).toBe('');
    expect(bookingOfferMailto(lead, { bookingUrl: '' })).toBe('');
  });
});
