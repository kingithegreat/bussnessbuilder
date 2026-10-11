import { INDUSTRY_TEMPLATES, applyTemplateSections, getIndustryTemplate, templateServices } from './industry-templates';
import { BUSINESS_PRESETS } from './presets';

const sections = ['hero', 'about', 'services', 'products', 'pricing', 'testimonials', 'gallery', 'faq', 'contact', 'location', 'hours', 'badges', 'cta']
  .map((id, order) => ({ id, order, visible: ['hero', 'about', 'services', 'contact'].includes(id), heading: id, subheading: '', imageUrl: undefined as string | undefined }));

describe('industry templates', () => {
  it('covers the six requested industries with complete content', () => {
    expect(INDUSTRY_TEMPLATES.map(t => t.id)).toEqual(['lawn-garden', 'builder-trades', 'cafe', 'hair-beauty', 'cleaning', 'fitness']);
    const types = new Set(['other', 'cafe', ...BUSINESS_PRESETS.map(p => p.id)]); // the wizard's type options
    for (const t of INDUSTRY_TEMPLATES) {
      expect(types.has(t.businessType)).toBe(true);
      expect(t.services.length).toBeGreaterThanOrEqual(3);
      expect(t.faqs.length).toBeGreaterThanOrEqual(2);
      expect(t.colors.primary).toMatch(/^#[0-9a-f]{6}$/);
      expect(t.heroImage).toMatch(/^https:\/\/images\.unsplash\.com\//);
      expect(t.sections[0]).toBe('hero');
      expect(t.sections).toContain('contact');
      expect(t.sections.every(id => sections.some(s => s.id === id))).toBe(true);
      expect(templateServices(t).every(s => !!s.imageUrl)).toBe(true);
    }
  });
  it('applies section plan without dropping sections', () => {
    const t = getIndustryTemplate('cafe')!;
    const out = applyTemplateSections(sections, t);
    expect(out).toHaveLength(sections.length);
    expect(out.filter(s => s.visible).map(s => s.id)).toEqual(t.sections);
    expect(out.find(s => s.id === 'hero')!.imageUrl).toBe(t.heroImage);
    expect(out.find(s => s.id === 'services')!.heading).toBe('On the menu');
    expect(out.map(s => s.order)).toEqual(out.map((_, i) => i));
  });
});
