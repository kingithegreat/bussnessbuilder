import { INDUSTRY_TEMPLATES, applyTemplateSections, getIndustryTemplate, templateServices } from './industry-templates';
import { BUSINESS_PRESETS } from './presets';

const sections = ['hero', 'about', 'services', 'products', 'pricing', 'testimonials', 'gallery', 'faq', 'contact', 'location', 'hours', 'badges', 'cta']
  .map((id, order) => ({ id, order, visible: ['hero', 'about', 'services', 'contact'].includes(id), heading: id, subheading: '', imageUrl: undefined as string | undefined }));

describe('industry templates', () => {
  it('covers the requested industries with complete content', () => {
    expect(INDUSTRY_TEMPLATES.map(t => t.id)).toEqual(['lawn-garden', 'builder-trades', 'cafe', 'hair-beauty', 'cleaning', 'fitness', 'mobile-detailing']);
    expect(new Set(INDUSTRY_TEMPLATES.map(t => t.id)).size).toBe(INDUSTRY_TEMPLATES.length);
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
  it('has a mobile car detailing template with detailing services, FAQs and photos', () => {
    const t = getIndustryTemplate('mobile-detailing')!;
    expect(t.label).toBe('Mobile car detailing');
    expect(t.businessType).toBe('other');
    const names = t.services.map(s => s.name).join('|');
    for (const n of ['Interior valet', 'Exterior wash & wax', 'Full detail', 'Ceramic paint protection', 'Pet hair']) expect(names).toContain(n);
    for (const s of t.services) expect(s.price).toMatch(/\$\d/);
    const qs = t.faqs.map(f => f.question.toLowerCase()).join('|');
    expect(qs).toContain('water or power');
    expect(qs).toContain('how long');
    const svc = templateServices(t);
    expect(svc.map(s => s.imageUrl)).toEqual(t.serviceImages);
    const out = applyTemplateSections(sections, t);
    expect(out.find(s => s.id === 'services')!.heading).toBe('Detailing services');
    expect(out.filter(s => s.visible).map(s => s.id)).toEqual(t.sections);
  });
});
