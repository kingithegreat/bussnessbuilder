/**
 * BusinessFlow's OWN self-service plan prices (what BusinessFlow charges its customers).
 * Single source of truth for the pricing page, landing page, dashboard labels and
 * server-side checkout verification. These are display amounts only: nothing here
 * creates or edits anything in Stripe (see docs/STRIPE_NZD.md).
 *
 * Source: Beta-to-Live Execution Plan (Gate 2) and Grand Master Plan section 2.1,
 * 27 Nov 2026. The plans give no GST wording, so every price is shown as
 * "NZD, excl. GST" until the owner decides otherwise.
 */
export type PaidPlanTier = 'starter' | 'pro' | 'business';

export const PRICE_CURRENCY = 'NZD' as const;
/** Appended to every price the app shows. Change here if the owner decides on GST-inclusive pricing. */
export const PRICE_GST_NOTE = 'NZD, excl. GST';
/** Self-service plans carry no per-booking commission. */
export const BOOKING_FEE_PERCENT = 0;

/** Monthly NZD price per self-service plan. */
export const PLAN_MONTHLY_NZD: Record<PaidPlanTier, number> = { starter: 29, pro: 59, business: 99 };

/** Optional managed services, sold by Aden directly (no in-app checkout). */
export const MANAGED_SERVICES_NZD = { setupOnce: 750, careMonthly: 129 } as const;

export const PAID_PLAN_TIERS: readonly PaidPlanTier[] = ['starter', 'pro', 'business'];

export function isPaidPlanTier(v: unknown): v is PaidPlanTier {
  return v === 'starter' || v === 'pro' || v === 'business';
}

/** "NZ$29" (no decimals for whole dollars). */
export function formatNzd(amount: number): string {
  return `NZ$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}
