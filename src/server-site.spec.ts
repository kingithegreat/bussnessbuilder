import { buildPublicSiteData, buildPublicPageData } from './server-site';

describe('buildPublicSiteData', () => {
  const main = {
    isSetupComplete: true,
    profile: { name: 'Sparkle Cleaners' },
    services: [{ id: 'svc_1', name: 'Deep clean' }],
    testimonials: [{ id: 'tst_1', text: 'Great!' }],
    faqs: [{ id: 'faq_1', question: 'Q', answer: 'A' }],
    customization: { sections: [] },
  };

  it('assembles the payload from the three docs', () => {
    const payload = buildPublicSiteData(main, { enabled: true }, { tier: 'business' });
    expect(payload).toEqual({
      profile: { name: 'Sparkle Cleaners' },
      services: [{ id: 'svc_1', name: 'Deep clean' }],
      testimonials: [{ id: 'tst_1', text: 'Great!' }],
      faqs: [{ id: 'faq_1', question: 'Q', answer: 'A' }],
      customization: { sections: [] },
      paymentSettings: { enabled: true },
      hideBranding: true,
    });
  });

  it('returns null when the main doc is missing', () => {
    expect(buildPublicSiteData(undefined, null, null)).toBeNull();
  });

  it('returns null when setup is not complete', () => {
    expect(buildPublicSiteData({ ...main, isSetupComplete: false }, null, null)).toBeNull();
  });

  it('defaults collections to empty arrays and paymentSettings to null', () => {
    const payload = buildPublicSiteData({ isSetupComplete: true, profile: {} }, null, null);
    expect(payload).toMatchObject({
      services: [],
      testimonials: [],
      faqs: [],
      paymentSettings: null,
    });
  });

  it('only hides branding on the business tier', () => {
    expect(buildPublicSiteData(main, null, { tier: 'pro' })!.hideBranding).toBe(false);
    expect(buildPublicSiteData(main, null, null)!.hideBranding).toBe(false);
    expect(buildPublicSiteData(main, null, { tier: 'business' })!.hideBranding).toBe(true);
  });
});

describe('buildPublicPageData', () => {
  const main = { isSetupComplete: true };
  const pagesDoc = {
    pages: [
      { slug: 'about', title: 'About Us', content: 'Our story', published: true },
      { slug: 'draft', title: 'Draft', content: 'wip', published: false },
    ],
  };

  it('returns the matching published page', () => {
    expect(buildPublicPageData(main, pagesDoc, 'about')).toEqual({
      slug: 'about',
      title: 'About Us',
      content: 'Our story',
    });
  });

  it('returns null when setup is not complete', () => {
    expect(buildPublicPageData({ isSetupComplete: false }, pagesDoc, 'about')).toBeNull();
  });

  it('returns null when there is no pages doc', () => {
    expect(buildPublicPageData(main, null, 'about')).toBeNull();
  });

  it('returns null for an unknown or unpublished slug', () => {
    expect(buildPublicPageData(main, pagesDoc, 'missing')).toBeNull();
    expect(buildPublicPageData(main, pagesDoc, 'draft')).toBeNull();
  });

  it('defaults title and content to empty strings when malformed', () => {
    const malformed = { pages: [{ slug: 'about', published: true }] };
    expect(buildPublicPageData(main, malformed, 'about')).toEqual({
      slug: 'about',
      title: '',
      content: '',
    });
  });
});
