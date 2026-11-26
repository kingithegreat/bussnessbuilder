import { checkoutPriceId, tierForAnyPrices, pricingDisplay, nzdPriceIds, verifyCheckoutPrice } from './server-pricing';
import { PLAN_MONTHLY_NZD, MANAGED_SERVICES_NZD, BOOKING_FEE_PERCENT, PRICE_GST_NOTE, formatNzd } from './app/plans';

const usd = { STRIPE_PRICE_ID_PRO: 'p_usd', STRIPE_PRICE_ID_BUSINESS: 'b_usd' };
const nzd = { STRIPE_PRICE_ID_STARTER_NZD: 's_nzd', STRIPE_PRICE_ID_PRO_NZD: 'p_nzd', STRIPE_PRICE_ID_BUSINESS_NZD: 'b_nzd' };
const both = { ...usd, ...nzd };

describe('NZD plan constants (F13)', () => {
  it('match the Beta-to-Live plan: NZ$29 / NZ$59 / NZ$99, 0% booking fee, NZ$750 setup, NZ$129/mo care', () => {
    expect(PLAN_MONTHLY_NZD).toEqual({ starter: 29, pro: 59, business: 99 });
    expect(BOOKING_FEE_PERCENT).toBe(0);
    expect(MANAGED_SERVICES_NZD).toEqual({ setupOnce: 750, careMonthly: 129 });
    expect(PRICE_GST_NOTE).toBe('NZD, excl. GST');
    expect(formatNzd(59)).toBe('NZ$59');
    expect(formatNzd(12.5)).toBe('NZ$12.50');
  });
});

describe('server pricing', () => {
  it('checkout uses NZD ids only and never falls back to a legacy USD price', () => {
    expect(checkoutPriceId('starter', both)).toBe('s_nzd');
    expect(checkoutPriceId('pro', both)).toBe('p_nzd');
    expect(checkoutPriceId('business', both)).toBe('b_nzd');
    expect(checkoutPriceId('pro', usd)).toBe('');
    expect(checkoutPriceId('business', usd)).toBe('');
    expect(checkoutPriceId('pro', { ...usd, STRIPE_PRICE_ID_STARTER_NZD: 's_nzd' })).toBe('');
    expect(checkoutPriceId('free', both)).toBe('');
    expect(checkoutPriceId(undefined, both)).toBe('');
    expect(checkoutPriceId({ toString: () => 'pro' }, both)).toBe('');
  });

  it('treats an NZD id reused for two plans as unconfigured for both', () => {
    const ids = nzdPriceIds({ STRIPE_PRICE_ID_STARTER_NZD: 'same', STRIPE_PRICE_ID_PRO_NZD: 'same', STRIPE_PRICE_ID_BUSINESS_NZD: 'b_nzd' });
    expect(ids).toEqual({ starter: '', pro: '', business: 'b_nzd' });
  });

  it('recognises NZD plans and keeps legacy USD Pro/Business subscribers on their tier', () => {
    expect(tierForAnyPrices(['s_nzd'], both)).toBe('starter');
    expect(tierForAnyPrices(['p_nzd'], both)).toBe('pro');
    expect(tierForAnyPrices(['b_nzd'], both)).toBe('business');
    expect(tierForAnyPrices(['p_usd'], both)).toBe('pro');
    expect(tierForAnyPrices(['b_usd'], both)).toBe('business');
    expect(tierForAnyPrices(['p_usd'], nzd)).toBe('free');
    expect(tierForAnyPrices(['b_nzd'], usd)).toBe('free');
    expect(tierForAnyPrices(['p_nzd', 'p_usd'], both)).toBe('free');
    expect(tierForAnyPrices(['unknown'], both)).toBe('free');
  });

  it('grants nothing for an id shared between a legacy USD id and an NZD id', () => {
    expect(tierForAnyPrices(['x'], { STRIPE_PRICE_ID_PRO: 'x', STRIPE_PRICE_ID_BUSINESS_NZD: 'x' })).toBe('free');
  });

  it('pricing display is static NZD and only reports which plans can be bought', () => {
    expect(pricingDisplay({})).toEqual({
      currency: 'NZD',
      plans: { starter: 29, pro: 59, business: 99 },
      bookingFeePercent: 0,
      managed: { setupOnce: 750, careMonthly: 129 },
      gstNote: 'NZD, excl. GST',
      checkoutAvailable: { starter: false, pro: false, business: false },
    });
    expect(pricingDisplay({ ...usd }).checkoutAvailable).toEqual({ starter: false, pro: false, business: false });
    expect(pricingDisplay({ STRIPE_PRICE_ID_PRO_NZD: 'p_nzd' }).checkoutAvailable).toEqual({ starter: false, pro: true, business: false });
    expect(pricingDisplay(both).checkoutAvailable).toEqual({ starter: true, pro: true, business: true });
  });

  it('verifies the Stripe price is a monthly NZD price for the advertised amount', async () => {
    const monthly = { interval: 'month', interval_count: 1 };
    expect(await verifyCheckoutPrice('pro', 'p', async () => ({ unit_amount: 5900, currency: 'nzd', recurring: monthly }))).toBe('ok');
    expect(await verifyCheckoutPrice('starter', 's', async () => ({ unit_amount: 2900, currency: 'nzd', recurring: monthly }))).toBe('ok');
    expect(await verifyCheckoutPrice('business', 'b', async () => ({ unit_amount: 9900, currency: 'nzd', recurring: monthly }))).toBe('ok');
    // wrong amount (e.g. an old NZ$25 price), wrong currency, not monthly, archived
    expect(await verifyCheckoutPrice('pro', 'p', async () => ({ unit_amount: 2500, currency: 'nzd', recurring: monthly }))).toBe('mismatch');
    expect(await verifyCheckoutPrice('pro', 'p', async () => ({ unit_amount: 5900, currency: 'usd', recurring: monthly }))).toBe('mismatch');
    expect(await verifyCheckoutPrice('pro', 'p', async () => ({ unit_amount: 5900, currency: 'nzd', recurring: { interval: 'year', interval_count: 1 } }))).toBe('mismatch');
    expect(await verifyCheckoutPrice('pro', 'p', async () => ({ unit_amount: 5900, currency: 'nzd', recurring: null }))).toBe('mismatch');
    expect(await verifyCheckoutPrice('pro', 'p', async () => ({ unit_amount: 5900, currency: 'nzd', recurring: monthly, active: false }))).toBe('mismatch');
    expect(await verifyCheckoutPrice('pro', 'p', async () => { throw new Error('down'); })).toBe('unavailable');
  });
});
