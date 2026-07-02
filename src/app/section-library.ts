// Section insertion helpers for the Page Builder (v1.3).
//
// Sections live in customization.sections as an ordered array. The 13 seeded
// sections (data.service.ts defaultState) have no `type` field and are
// identified by their `id` ('hero', 'about', ...). Inserted sections carry an
// explicit `type` (the render key) so their `id` can stay unique — the public
// page renderer switches on sectionRenderType() and tracks by id, which is what
// lets two instances of the same section type coexist.

import { SectionConfig } from './types';

export interface SectionTypeDef {
  type: string;
  label: string;
  defaultHeading: string;
  defaultSubheading: string;
  defaultVariant?: string;
}

// Section types users can insert. 'hero' and 'contact' are deliberately NOT
// insertable: the nav, scroll anchors, and the single enquiry FormGroup assume
// one instance of each. 'custom' is a free-content block rendered by the
// public page's default section (heading + subheading + content text).
export const INSERTABLE_SECTION_TYPES: SectionTypeDef[] = [
  { type: 'custom', label: 'Custom Content', defaultHeading: 'New Section', defaultSubheading: '' },
  { type: 'about', label: 'About Us', defaultHeading: 'About Us', defaultSubheading: 'Who we are', defaultVariant: 'default' },
  { type: 'services', label: 'Services', defaultHeading: 'Our Services', defaultSubheading: 'What we offer', defaultVariant: 'grid' },
  { type: 'products', label: 'Products', defaultHeading: 'Products', defaultSubheading: 'Browse our items' },
  { type: 'pricing', label: 'Pricing', defaultHeading: 'Pricing', defaultSubheading: 'Simple & transparent' },
  { type: 'testimonials', label: 'Testimonials', defaultHeading: 'Testimonials', defaultSubheading: 'What our clients say', defaultVariant: 'quote' },
  { type: 'gallery', label: 'Gallery', defaultHeading: 'Gallery', defaultSubheading: 'See our work' },
  { type: 'faq', label: 'FAQ', defaultHeading: 'FAQ', defaultSubheading: 'Frequently asked questions', defaultVariant: 'accordion' },
  { type: 'location', label: 'Location Map', defaultHeading: 'Location', defaultSubheading: 'Find us' },
  { type: 'hours', label: 'Business Hours', defaultHeading: 'Business Hours', defaultSubheading: 'When we are open' },
  { type: 'badges', label: 'Trust Badges', defaultHeading: 'Trust Badges', defaultSubheading: 'Why choose us' },
  { type: 'cta', label: 'Call to Action', defaultHeading: 'Ready to start?', defaultSubheading: 'Contact us today' },
];

// The key the renderer switches on. Seeded sections have no `type`, so their
// id doubles as the render key; inserted sections carry it explicitly.
export function sectionRenderType(section: Pick<SectionConfig, 'id' | 'type'>): string {
  return section.type || section.id;
}

// Only inserted sections are removable. The 13 seeded sections can be hidden
// but not deleted — keeps the safe v1 invariant that a user can always get
// their original page back by toggling visibility.
export function canRemoveSection(section: Pick<SectionConfig, 'type'>): boolean {
  return !!section.type;
}

function uniqueSectionId(type: string, existing: SectionConfig[]): string {
  const taken = new Set(existing.map((s) => s.id));
  if (!taken.has(type)) return type;
  let n = 2;
  while (taken.has(`${type}-${n}`)) n++;
  return `${type}-${n}`;
}

// Build a new section instance of the given type, appended after the existing
// ones. Throws on unknown types so a stale/forged select value can't insert
// an unrenderable section.
export function createSection(type: string, existing: SectionConfig[]): SectionConfig {
  const def = INSERTABLE_SECTION_TYPES.find((t) => t.type === type);
  if (!def) throw new Error(`Unknown section type: ${type}`);
  const section: SectionConfig = {
    id: uniqueSectionId(type, existing),
    type,
    visible: true,
    order: existing.length + 1,
    heading: def.defaultHeading,
    subheading: def.defaultSubheading,
  };
  if (def.defaultVariant) section.layoutVariant = def.defaultVariant;
  if (type === 'custom') section.content = '';
  return section;
}

// Remove the section at index and close the order gap. Returns a new array;
// no-ops (returns the input) if the index is out of range or the section is
// not removable.
export function removeSectionAt(sections: SectionConfig[], index: number): SectionConfig[] {
  const target = sections[index];
  if (!target || !canRemoveSection(target)) return sections;
  const next = sections.filter((_, i) => i !== index);
  next.forEach((s, i) => (s.order = i + 1));
  return next;
}
