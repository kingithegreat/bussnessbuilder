import { buildPublicSiteData } from './server-site';

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
