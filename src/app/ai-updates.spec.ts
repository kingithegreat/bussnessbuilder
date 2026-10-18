import { nzSeason, parsePostResponse, templateSeasonalPost, adjustPrice, deterministicPriceChanges, parsePriceChanges, applyPriceChanges, cleanAbout, slugify } from './ai-updates';
import { Service } from './types';

const services: Service[] = [
  { id: 'a', name: 'Lawn mow', description: '', price: '$45' },
  { id: 'b', name: 'Hedge', description: '', price: 'from $60/hr' },
  { id: 'c', name: 'Quote job', description: '', price: 'Quoted' },
];

describe('ai updates', () => {
  it('knows NZ seasons', () => {
    expect(nzSeason(new Date('2026-10-12'))).toBe('spring');
    expect(nzSeason(new Date('2026-01-12'))).toBe('summer');
    expect(nzSeason(new Date('2026-07-12'))).toBe('winter');
  });
  it('parses post JSON (fenced or not) and falls back to title line', () => {
    expect(parsePostResponse('```json\n{"title":"Spring","content":"## Hi\\nText"}\n```')).toEqual({ title: 'Spring', content: '## Hi\nText' });
    expect(parsePostResponse('# Spring deal\nBook now')).toEqual({ title: 'Spring deal', content: 'Book now' });
    expect(parsePostResponse('')).toBeNull();
    expect(templateSeasonalPost({ name: 'Biz' }, services, 'spring').title).toBe('Spring special at Biz');
  });
  it('adjusts prices keeping their format', () => {
    expect(adjustPrice('$45', 10)).toBe('$49.50');
    expect(adjustPrice('$45', 10, 1)).toBe('$50');
    expect(adjustPrice('from $60/hr', 5)).toBe('from $63/hr');
    expect(adjustPrice('$19.99', 10)).toBe('$21.99');
    expect(adjustPrice('$47', 5, 5)).toBe('$50');
  });
  it('handles common % instructions without AI', () => {
    expect(deterministicPriceChanges('Raise all prices by 10%', services)).toEqual([
      { serviceId: 'a', name: 'Lawn mow', oldPrice: '$45', newPrice: '$49.50' },
      { serviceId: 'b', name: 'Hedge', oldPrice: 'from $60/hr', newPrice: 'from $66/hr' },
    ]);
    expect(deterministicPriceChanges('drop prices 50% and round to nearest $5', services)![0].newPrice).toBe('$25');
    expect(deterministicPriceChanges('mowing is now $50', services)).toBeNull();
  });
  it('validates AI price changes and applies only approved ones', () => {
    const c = parsePriceChanges('[{"id":"a","newPrice":"$50"},{"id":"zzz","newPrice":"$1"},{"id":"b","newPrice":"from $60/hr"},{"id":"c","newPrice":""}]', services);
    expect(c).toEqual([{ serviceId: 'a', name: 'Lawn mow', oldPrice: '$45', newPrice: '$50' }]);
    expect(parsePriceChanges('not json', services)).toEqual([]);
    expect(applyPriceChanges(services, c).map(s => s.price)).toEqual(['$50', 'from $60/hr', 'Quoted']);
  });
  it('cleans about text and slugs', () => {
    expect(cleanAbout('```\n## About\n**We** mow.\n```')).toBe('We mow.');
    expect(slugify('Spring special at Pyes Pa Lawn Care!')).toBe('spring-special-at-pyes-pa-lawn-care');
  });
});
