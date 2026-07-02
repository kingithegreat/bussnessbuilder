import { describe, it, expect } from 'vitest';
import {
  INSERTABLE_SECTION_TYPES,
  canRemoveSection,
  createSection,
  removeSectionAt,
  sectionRenderType,
} from './section-library';
import { SectionConfig } from './types';

const seeded = (id: string, order: number): SectionConfig => ({
  id,
  visible: true,
  order,
  heading: id,
  subheading: '',
});

describe('sectionRenderType', () => {
  it('falls back to the id for seeded sections without a type', () => {
    expect(sectionRenderType(seeded('services', 1))).toBe('services');
  });

  it('prefers the explicit type on inserted sections', () => {
    expect(sectionRenderType({ id: 'services-2', type: 'services' })).toBe('services');
    expect(sectionRenderType({ id: 'custom', type: 'custom' })).toBe('custom');
  });
});

describe('canRemoveSection', () => {
  it('protects seeded sections and allows inserted ones', () => {
    expect(canRemoveSection(seeded('hero', 1))).toBe(false);
    expect(canRemoveSection({ type: 'custom' })).toBe(true);
  });
});

describe('createSection', () => {
  it('appends with the next order and defaults from the library', () => {
    const existing = [seeded('hero', 1), seeded('about', 2)];
    const section = createSection('faq', existing);
    expect(section.order).toBe(3);
    expect(section.visible).toBe(true);
    expect(section.type).toBe('faq');
    expect(section.heading).toBe('FAQ');
    expect(section.layoutVariant).toBe('accordion');
  });

  it('generates unique ids when the type is already taken', () => {
    const existing = [seeded('services', 1)];
    const second = createSection('services', existing);
    expect(second.id).toBe('services-2');
    const third = createSection('services', [...existing, second]);
    expect(third.id).toBe('services-3');
  });

  it('uses the bare type as id when free', () => {
    expect(createSection('custom', [seeded('hero', 1)]).id).toBe('custom');
  });

  it('initialises empty content for custom sections only', () => {
    expect(createSection('custom', []).content).toBe('');
    expect(createSection('faq', []).content).toBeUndefined();
  });

  it('rejects unknown section types', () => {
    expect(() => createSection('bogus', [])).toThrow(/Unknown section type/);
  });

  it('does not offer hero or contact as insertable types', () => {
    const types = INSERTABLE_SECTION_TYPES.map((t) => t.type);
    expect(types).not.toContain('hero');
    expect(types).not.toContain('contact');
    expect(types).toContain('custom');
  });
});

describe('removeSectionAt', () => {
  it('removes an inserted section and closes the order gap', () => {
    const inserted = createSection('custom', [seeded('hero', 1), seeded('about', 2)]);
    const sections = [seeded('hero', 1), inserted, seeded('about', 3)];
    const next = removeSectionAt(sections, 1);
    expect(next.map((s) => s.id)).toEqual(['hero', 'about']);
    expect(next.map((s) => s.order)).toEqual([1, 2]);
  });

  it('refuses to remove seeded sections', () => {
    const sections = [seeded('hero', 1), seeded('about', 2)];
    expect(removeSectionAt(sections, 0)).toBe(sections);
  });

  it('no-ops on out-of-range indexes', () => {
    const sections = [seeded('hero', 1)];
    expect(removeSectionAt(sections, 5)).toBe(sections);
  });
});
