import { isHomepageHeadlineAction, isHomepageHeadlineRequest, validActionId, validHeadline, validSiteActionRequest, type HomepageHeadlineAction } from './site-action';

describe('homepage headline action contract', () => {
  const action: HomepageHeadlineAction = {
    id: '8fd0b404-ab58-4a6c-9ae7-6d7a46b90cc7', type: 'homepage.headline', status: 'prepared',
    before: { tagline: '' }, after: { tagline: 'Careful repairs, lasting peace of mind.' },
    request: 'Improve my homepage headline', reason: 'Focuses on the customer benefit.',
    source: 'template', actorUid: 'owner', createdAt: '2026-10-07T01:00:00.000Z',
  };

  it('accepts the narrow headline intent and rejects unrelated operations', () => {
    for (const request of ['Improve my homepage headline', 'Rewrite my tagline', 'Make my hero title clearer', 'Change the home page heading']) {
      expect(isHomepageHeadlineRequest(request)).toBe(true);
    }
    for (const request of ['Delete my account', 'Create a new page', 'Publish my website', 'Change the homepage photo', '']) {
      expect(isHomepageHeadlineRequest(request)).toBe(false);
    }
  });

  it('bounds request input and requires a UUID rather than an arbitrary document path', () => {
    expect(validSiteActionRequest('a'.repeat(500))).toBe(true);
    expect(validSiteActionRequest('a'.repeat(501))).toBe(false);
    expect(validSiteActionRequest('<script>headline</script>')).toBe(false);
    expect(validActionId(action.id)).toBe(true);
    expect(validActionId('../other-owner')).toBe(false);
    expect(validActionId('')).toBe(false);
  });

  it('requires short, nonempty, single-line plain text proposals', () => {
    expect(validHeadline('a'.repeat(160))).toBe(true);
    for (const value of ['a'.repeat(161), '', '   ', '<b>Repairs</b>', 'Repairs\nDone right', 'Repairs\tDone right', 'Repairs\u0000', undefined]) {
      expect(validHeadline(value)).toBe(false);
    }
  });

  it('guards stored history fields and accepts raw blank prior headlines', () => {
    expect(isHomepageHeadlineAction(action)).toBe(true);
    expect(isHomepageHeadlineAction({ ...action, status: 'applied', appliedAt: '2026-10-07T01:02:00Z' })).toBe(true);
    for (const malformed of [
      { ...action, status: 'running' }, { ...action, before: undefined }, { ...action, actorUid: '' },
      { ...action, after: { tagline: '<img src=x>' } }, { ...action, source: 'user' },
      { ...action, createdAt: 'yesterday' }, { ...action, appliedAt: 10 },
    ]) expect(isHomepageHeadlineAction(malformed)).toBe(false);
  });
});
