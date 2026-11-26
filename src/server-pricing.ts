/**
 * BusinessFlow's OWN subscription prices. Self-service plans are NZD-native
 * (see src/app/plans.ts). Stripe price IDs come from env vars only and nothing
 * here creates or edits anything in Stripe (see docs/STRIPE_NZD.md).
 *
 * - NZD ids (STRIPE_PRICE_ID_STARTER_NZD / _PRO_NZD / _BUSINESS_NZD) are the ONLY
 *   ids used for new checkouts.
 * - Legacy USD ids (STRIPE_PRICE_ID_PRO / _BUSINESS) are kept so existing USD
 *   subscribers keep their tier. They are never offered for new checkouts.
 */
import { tierForPrices, type EffectiveTier } from './app/effective-tier';
import {
  BOOKING_FEE_PERCENT, MANAGED_SERVICES_NZD, PAID_PLAN_TIERS, PLAN_MONTHLY_NZD, PRICE_CURRENCY, PRICE_GST_NOTE,
  isPaidPlanTier, type PaidPlanTier,
} from './app/plans';

type Env = Record<string, string | undefined>;
export interface LegacyPriceSet { pro: string; business: string }
export type NzdPriceSet = Record<PaidPlanTier, string>;

/** Legacy USD price ids: recognised for existing subscribers only, never used for checkout. */
export function usdPriceIds(env: Env): LegacyPriceSet {
  return {
    pro: env['STRIPE_PRICE_ID_PRO'] || env['STRIPE_PRO_PRICE_ID'] || '',
    business: env['STRIPE_PRICE_ID_BUSINESS'] || env['STRIPE_BUSINESS_PRICE_ID'] || '',
  };
}

/**
 * NZD price ids per plan ('' when that plan's id is unset). A plan whose id is
 * also configured for another plan is treated as unset so it can't sell the wrong tier.
 */
export function nzdPriceIds(env: Env): NzdPriceSet {
  const raw: NzdPriceSet = {
    starter: env['STRIPE_PRICE_ID_STARTER_NZD'] || '',
    pro: env['STRIPE_PRICE_ID_PRO_NZD'] || '',
    business: env['STRIPE_PRICE_ID_BUSINESS_NZD'] || '',
  };
  const out = { ...raw };
  for (const t of PAID_PLAN_TIERS) {
    if (raw[t] && PAID_PLAN_TIERS.some(o => o !== t && raw[o] === raw[t])) out[t] = '';
  }
  return out;
}

/**
 * Checkout price for a plan: the NZD id only. Returns '' when the plan is unknown
 * or its NZD id isn't configured; it never falls back to a legacy USD price, so a
 * plan advertised in NZD can't be charged in USD.
 */
export function checkoutPriceId(tier: unknown, env: Env): string {
  return isPaidPlanTier(tier) ? nzdPriceIds(env)[tier] : '';
}

/** Tier for a subscription's price ids, recognising NZD plans and legacy USD Pro/Business. */
export function tierForAnyPrices(priceIds: string[], env: Env): EffectiveTier {
  const nzd = nzdPriceIds(env);
  const usd = usdPriceIds(env);
  // An id reused across the NZD and legacy sets is ambiguous: grant nothing.
  const ids = [nzd.starter, nzd.pro, nzd.business, usd.pro, usd.business].filter(Boolean);
  if (priceIds.length === 1 && ids.filter(i => i === priceIds[0]).length > 1) return 'free';
  const fromNzd = tierForPrices(priceIds, nzd);
  if (fromNzd !== 'free') return fromNzd;
  return tierForPrices(priceIds, usd);
}

export interface PricingDisplay {
  currency: typeof PRICE_CURRENCY;
  /** Monthly NZD amounts. */
  plans: Record<PaidPlanTier, number>;
  bookingFeePercent: number;
  managed: { setupOnce: number; careMonthly: number };
  /** Shown next to every price, e.g. "NZD, excl. GST". */
  gstNote: string;
  /** Which plans have an NZD Stripe price id configured. Plans that don't can't be bought yet. */
  checkoutAvailable: Record<PaidPlanTier, boolean>;
}

/** Pricing-page payload. Static amounts; only reads env to say which plans can be bought now. */
export function pricingDisplay(env: Env): PricingDisplay {
  const ids = nzdPriceIds(env);
  return {
    currency: PRICE_CURRENCY,
    plans: { ...PLAN_MONTHLY_NZD },
    bookingFeePercent: BOOKING_FEE_PERCENT,
    managed: { ...MANAGED_SERVICES_NZD },
    gstNote: PRICE_GST_NOTE,
    checkoutAvailable: { starter: !!ids.starter, pro: !!ids.pro, business: !!ids.business },
  };
}

/**
 * Guard before creating a checkout session: the configured Stripe price must be a
 * monthly NZD price for exactly the advertised amount. `retrieve` is a read-only
 * Stripe call. Any mismatch or failure refuses the checkout.
 */
export async function verifyCheckoutPrice(
  tier: PaidPlanTier,
  priceId: string,
  retrieve: (id: string) => Promise<{ unit_amount: number | null; currency: string; recurring?: { interval?: string; interval_count?: number } | null; active?: boolean }>,
): Promise<'ok' | 'mismatch' | 'unavailable'> {
  try {
    const p = await retrieve(priceId);
    const monthly = p.recurring?.interval === 'month' && (p.recurring.interval_count ?? 1) === 1;
    return p.currency === 'nzd' && p.unit_amount === PLAN_MONTHLY_NZD[tier] * 100 && monthly && p.active !== false ? 'ok' : 'mismatch';
  } catch {
    return 'unavailable';
  }
}
