import { scoreSeoPage, extractFromContent, SeoPageInput, SeoResult } from './seo-score';
import { BusinessProfile, CustomizationSettings, Service, FAQ, ContentPage } from './types';

export interface SiteSnapshot {
  profile: Partial<BusinessProfile>;
  customization: Partial<CustomizationSettings> | null;
  services: Service[];
  faqs: FAQ[];
  pages: ContentPage[];
  homePath: string;
}

/** Keywords locals search for: the town (last part of the service area) and the trade. */
export function localKeywords(p: Partial<BusinessProfile>): string[] {
  const parts = (p.serviceArea || '').split(/[,/]| and /).map(s => s.trim()).filter(Boolean);
  const town = parts[parts.length - 1] || '';
  const trade = p.type && p.type !== 'other' ? String(p.type) : '';
  return [town, trade].filter(Boolean);
}

/** Same title/description logic as the public page's setupSeo(). */
export function homeSeoInput(s: SiteSnapshot): SeoPageInput {
  const p = s.profile;
  const b = (s.customization?.branding || {}) as { seoTitle?: string; seoDescription?: string };
  const name = p.name || '';
  const sections = (s.customization?.sections || []).filter(x => x.visible);
  return {
    name: 'Home page', path: s.homePath,
    title: b.seoTitle || (p.tagline ? `${name} — ${p.tagline}` : name),
    description: (b.seoDescription || p.description || p.tagline || '').replace(/\s+/g, ' ').trim(),
    h1: p.tagline || name,
    headings: sections.filter(x => x.id !== 'hero').map(x => x.heading || ''),
    // The public page writes alt text for hero/about photos from the business name; service photos use the service name.
    images: s.services.filter(x => x.imageUrl).map(x => ({ alt: x.name || '' })),
    text: [p.description, p.tagline, ...s.services.map(x => `${x.name} ${x.description}`), ...s.faqs.map(f => `${f.question} ${f.answer}`)].filter(Boolean).join(' '),
    localKeywords: localKeywords(p),
  };
}

export function pageSeoInputs(s: SiteSnapshot): SeoPageInput[] {
  return s.pages.filter(pg => pg.published).map(pg => {
    const e = extractFromContent(pg.content);
    return {
      name: pg.title || pg.slug, path: `${s.homePath}/pages/${pg.slug}`,
      title: `${pg.title} | ${s.profile.name || ''}`.trim(),
      description: e.text.slice(0, 160),
      h1: e.h1 || pg.title, headings: e.headings, images: e.images, text: e.text,
      localKeywords: localKeywords(s.profile),
    };
  });
}

export function scoreSite(s: SiteSnapshot): { input: SeoPageInput; result: SeoResult; settingsHint: string }[] {
  return [
    { input: homeSeoInput(s), settingsHint: 'Website → Branding → SEO title & description' },
    ...pageSeoInputs(s).map(input => ({ input, settingsHint: 'Website → Pages and publishing' })),
  ].map(x => ({ ...x, result: scoreSeoPage(x.input, x.settingsHint) }));
}
