/**
 * BusinessFlow's OWN subscription prices. USD is the live default; NZD prices
 * are used only when Aden sets STRIPE_PRICE_ID_PRO_NZD and
 * STRIPE_PRICE_ID_BUSINESS_NZD (see docs/STRIPE_NZD.md). Nothing here creates
 * or edits anything in Stripe.
 */
import { tierForPrices, type EffectiveTier } from './app/effective-tier';

type Env = Record<string, string | undefined>;
export interface PriceSet { pro: string; business: string }

export function usdPriceIds(env: Env): PriceSet {
  return {
    pro: env['STRIPE_PRICE_ID_PRO'] || env['STRIPE_PRO_PRICE_ID'] || '',
    business: env['STRIPE_PRICE_ID_BUSINESS'] || env['STRIPE_BUSINESS_PRICE_ID'] || '',
  };
}

/** Both NZD ids must be set, otherwise NZD is treated as not configured. */
export function nzdPriceIds(env: Env): PriceSet | null {
  const pro = env['STRIPE_PRICE_ID_PRO_NZD'] || '';
  const business = env['STRIPE_PRICE_ID_BUSINESS_NZD'] || '';
  return pro && business && pro !== business ? { pro, business } : null;
}

/** Checkout price for a tier: NZD when asked for and configured, else USD. */
export function checkoutPriceId(tier: string, currency: unknown, env: Env): string {
  const set = currency === 'nzd' && nzdPriceIds(env) ? nzdPriceIds(env)! : usdPriceIds(env);
  return tier === 'pro' ? set.pro : tier === 'business' ? set.business : '';
}

/** Tier for a subscription's price ids, recognising USD and (if set) NZD prices. */
export function tierForAnyPrices(priceIds: string[], env: Env): EffectiveTier {
  const usd = tierForPrices(priceIds, usdPriceIds(env));
  if (usd !== 'free') return usd;
  const nzd = nzdPriceIds(env);
  return nzd ? tierForPrices(priceIds, nzd) : 'free';
}

export interface PricingDisplay {
  currency: 'USD' | 'NZD';
  pro: number;
  business: number;
  gstInclusive: boolean;
}

export const USD_DISPLAY: PricingDisplay = { currency: 'USD', pro: 14, business: 22, gstInclusive: false };

/**
 * Pricing-page amounts. With NZD ids configured, reads their unit amounts from
 * Stripe (read-only) via `retrieve`; any failure falls back to USD.
 */
export async function pricingDisplay(env: Env, retrieve: (id: string) => Promise<{ unit_amount: number | null; currency: string }>): Promise<PricingDisplay> {
  const nzd = nzdPriceIds(env);
  if (!nzd) return USD_DISPLAY;
  try {
    const [pro, business] = await Promise.all([retrieve(nzd.pro), retrieve(nzd.business)]);
    if (pro.currency !== 'nzd' || business.currency !== 'nzd' || !pro.unit_amount || !business.unit_amount) return USD_DISPLAY;
    return { currency: 'NZD', pro: pro.unit_amount / 100, business: business.unit_amount / 100, gstInclusive: env['STRIPE_NZD_GST_INCLUSIVE'] !== 'false' };
  } catch {
    return USD_DISPLAY;
  }
}
