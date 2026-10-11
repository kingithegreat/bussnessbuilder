import { buildLocalBusinessJsonLd, jsonLdScript } from './structured-data';

describe('structured data', () => {
  it('builds LocalBusiness with reviews and aggregate rating', () => {
    const d = buildLocalBusinessJsonLd({ name: 'Pyes Pa Lawn Care', phone: '021 123 4567', serviceArea: 'Tauranga', openingHours: 'Mon–Fri 8–5\nSat 9–1',
      reviews: [{ author: 'Kim', rating: 5, text: 'Great' }, { author: 'Lee', rating: 4, text: 'Good' }, { author: 'X', rating: 9, text: 'bad' }] })!;
    expect(d['@type']).toBe('LocalBusiness');
    expect(d['telephone']).toBe('021 123 4567');
    expect(d['openingHours']).toEqual(['Mon–Fri 8–5', 'Sat 9–1']);
    expect(d['aggregateRating']).toEqual({ '@type': 'AggregateRating', ratingValue: 4.5, reviewCount: 2, bestRating: 5, worstRating: 1 });
    expect((d['review'] as unknown[]).length).toBe(2);
  });
  it('returns null without a name and escapes script breakouts', () => {
    expect(buildLocalBusinessJsonLd({ name: '' })).toBeNull();
    expect(jsonLdScript({ a: '</script><b>' })).not.toContain('</script>');
  });
});
