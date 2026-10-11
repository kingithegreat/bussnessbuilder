import { checkoutPriceId, tierForAnyPrices, pricingDisplay, USD_DISPLAY, nzdPriceIds } from './server-pricing';

const usd = { STRIPE_PRICE_ID_PRO: 'p_usd', STRIPE_PRICE_ID_BUSINESS: 'b_usd' };
const both = { ...usd, STRIPE_PRICE_ID_PRO_NZD: 'p_nzd', STRIPE_PRICE_ID_BUSINESS_NZD: 'b_nzd' };

describe('server pricing', () => {
  it('falls back to USD when NZD is not (fully) configured', () => {
    expect(nzdPriceIds({ ...usd, STRIPE_PRICE_ID_PRO_NZD: 'p_nzd' })).toBeNull();
    expect(checkoutPriceId('pro', 'nzd', usd)).toBe('p_usd');
    expect(checkoutPriceId('business', undefined, both)).toBe('b_usd');
    expect(checkoutPriceId('pro', 'nzd', both)).toBe('p_nzd');
    expect(checkoutPriceId('free', 'nzd', both)).toBe('');
  });
  it('recognises tiers for both currencies', () => {
    expect(tierForAnyPrices(['b_nzd'], both)).toBe('business');
    expect(tierForAnyPrices(['p_usd'], both)).toBe('pro');
    expect(tierForAnyPrices(['b_nzd'], usd)).toBe('free');
  });
  it('reads NZD amounts from Stripe or falls back', async () => {
    const retrieve = async (id: string) => ({ unit_amount: id === 'p_nzd' ? 2500 : 3900, currency: 'nzd' });
    expect(await pricingDisplay(usd, retrieve)).toEqual(USD_DISPLAY);
    expect(await pricingDisplay(both, retrieve)).toEqual({ currency: 'NZD', pro: 25, business: 39, gstInclusive: true });
    expect(await pricingDisplay(both, async () => { throw new Error('down'); })).toEqual(USD_DISPLAY);
    expect(await pricingDisplay(both, async () => ({ unit_amount: 1400, currency: 'usd' }))).toEqual(USD_DISPLAY);
  });
});
