import { localKeywords, scoreSite } from './seo-inputs';

describe('seo inputs', () => {
  it('derives town and trade keywords', () => {
    expect(localKeywords({ serviceArea: 'Pyes Pa, Tauranga', type: 'lawn mowing' })).toEqual(['Tauranga', 'lawn mowing']);
    expect(localKeywords({ serviceArea: '', type: 'other' })).toEqual([]);
  });
  it('scores the home page and each published content page', () => {
    const r = scoreSite({
      profile: { name: 'Pyes Pa Lawn Care', tagline: 'Lawn mowing in Tauranga', serviceArea: 'Tauranga', type: 'lawn mowing', description: 'x' },
      customization: { sections: [{ id: 'hero', visible: true, order: 0, heading: 'H', subheading: '' }, { id: 'services', visible: true, order: 1, heading: 'Services', subheading: '' }] } as never,
      services: [{ id: 's', name: 'Mow', description: 'Lawn mowing', imageUrl: 'x' }], faqs: [],
      pages: [{ id: 'p', title: 'About', slug: 'about', content: '# About\n## Team', published: true, createdAt: '', updatedAt: '' }, { id: 'd', title: 'Draft', slug: 'd', content: '', published: false, createdAt: '', updatedAt: '' }],
      homePath: '/s/pyespa',
    });
    expect(r.map(x => x.input.path)).toEqual(['/s/pyespa', '/s/pyespa/pages/about']);
    expect(r[0].input.title).toBe('Pyes Pa Lawn Care — Lawn mowing in Tauranga');
    expect(r[0].result.checks.find(c => c.id === 'local-title')!.pass).toBe(true);
  });
});
