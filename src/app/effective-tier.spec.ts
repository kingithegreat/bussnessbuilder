import { checkoutSubscriptionStatus, effectiveTier, tierForPrices } from './effective-tier';

describe('effective subscription entitlements', () => {
  it('does not grant paid access from an unpaid completed checkout', () => {
    expect(effectiveTier({ tier: 'pro', status: checkoutSubscriptionStatus('unpaid', 'active') })).toBe('free');
    expect(effectiveTier({ tier: 'pro', status: checkoutSubscriptionStatus(undefined, 'active') })).toBe('free');
    expect(effectiveTier({ tier: 'pro', status: checkoutSubscriptionStatus('paid', 'active') })).toBe('pro');
    expect(effectiveTier({ tier: 'business', status: checkoutSubscriptionStatus('no_payment_required', 'trialing') })).toBe('business');
    expect(effectiveTier({ tier: 'pro', status: checkoutSubscriptionStatus('paid', 'past_due') })).toBe('free');
  });
  it('grants active and trialing paid plans', () => {
    expect(effectiveTier({ tier: 'pro', status: 'active' })).toBe('pro');
    expect(effectiveTier({ tier: 'business', status: 'trialing' })).toBe('business');
  });

  it('denies inactive, missing and unknown subscriptions', () => {
    for (const status of ['past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'paused', undefined]) {
      expect(effectiveTier({ tier: 'business', status })).toBe('free');
    }
    expect(effectiveTier(null)).toBe('free');
    expect(effectiveTier({ tier: 'unknown', status: 'active' })).toBe('free');
  });

  it('derives upgrades and downgrades from the current price, failing closed on unknown or ambiguous prices', () => {
    const prices = { pro: 'price_pro', business: 'price_business' };
    expect(tierForPrices(['price_business'], prices)).toBe('business');
    expect(tierForPrices(['price_pro'], prices)).toBe('pro');
    expect(tierForPrices(['old_price'], prices)).toBe('free');
    expect(tierForPrices([], prices)).toBe('free');
    expect(tierForPrices(['price_business', 'price_pro'], prices)).toBe('free');
    expect(tierForPrices([''], { pro: '', business: '' })).toBe('free');
    expect(tierForPrices(['same'], { pro: 'same', business: 'same' })).toBe('free');
  });
});
