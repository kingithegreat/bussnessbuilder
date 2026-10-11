import { scoreSeoPage, extractFromContent, GBP_STEPS } from './seo-score';

const good = {
  name: 'Home', path: '/', title: 'Pyes Pa Lawn Care — Lawn mowing in Tauranga',
  description: 'Reliable lawn mowing, hedge trimming and garden tidy-ups across Pyes Pa and Tauranga. Free quotes, fixed prices, clippings taken away.',
  h1: 'Lawn mowing in Tauranga', headings: ['Services', 'About'], images: [{ alt: 'Freshly mown lawn' }],
  text: ('We mow lawns in Tauranga and do lawn mowing for busy families. ' + 'word '.repeat(300)), localKeywords: ['Tauranga', 'lawn mowing'],
};

describe('SEO score', () => {
  it('scores a well-optimised page highly', () => {
    const r = scoreSeoPage(good);
    expect(r.score).toBe(100);
    expect(r.grade).toBe('Great');
  });
  it('gives concrete fixes for a thin page', () => {
    const r = scoreSeoPage({ ...good, title: 'Home', description: '', h1: '', headings: [], images: [{ alt: '' }, { alt: '' }], text: 'Hi' });
    expect(r.score).toBeLessThan(30);
    expect(r.grade).toBe('Needs work');
    const fix = (id: string) => r.checks.find(c => c.id === id)!.fix;
    expect(fix('alt')).toContain('2 images');
    expect(fix('local-title')).toContain('"Tauranga"');
    expect(fix('title')).toContain('Home — lawn mowing — Tauranga');
  });
  it('extracts structure from markdown and html', () => {
    const e = extractFromContent('# Our story\n\n## Team\n<h3>Tools</h3>\n![Our ute](x.jpg) <img src="y" alt="">\nWe love gardens.');
    expect(e.h1).toBe('Our story');
    expect(e.headings).toEqual(['Team', 'Tools']);
    expect(e.images).toEqual([{ alt: 'Our ute' }, { alt: '' }]);
    expect(e.text).toContain('We love gardens.');
  });
  it('links only to official Google pages', () => {
    expect(GBP_STEPS.every(s => /^https:\/\/(support|search)\.google\.com\//.test(s.link))).toBe(true);
  });
});
