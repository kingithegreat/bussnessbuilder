/** Entitlements come from a recognized plan AND a currently usable subscription. */
export type EffectiveTier = 'free' | 'starter' | 'pro' | 'business';

export function effectiveTier(subscription: { tier?: unknown; status?: unknown } | null | undefined): EffectiveTier {
  if (subscription?.status !== 'active' && subscription?.status !== 'trialing') return 'free';
  const t = subscription.tier;
  return t === 'starter' || t === 'pro' || t === 'business' ? t : 'free';
}

/** Managed (platform-funded) AI is a Pro and Business entitlement; Starter gets templates only. */
export function hasManagedAi(tier: EffectiveTier): boolean {
  return tier === 'pro' || tier === 'business';
}

export interface TierPriceIds { starter?: string; pro: string; business: string }

/**
 * Never infer a paid plan from customer-controlled metadata or an unknown price.
 * An id that is configured for two different tiers is ambiguous and grants nothing.
 */
export function tierForPrices(priceIds: string[], prices: TierPriceIds): EffectiveTier {
  if (priceIds.length !== 1) return 'free';
  const id = priceIds[0];
  if (!id) return 'free';
  const matches = (['starter', 'pro', 'business'] as const).filter(t => !!prices[t] && prices[t] === id);
  return matches.length === 1 ? matches[0] : 'free';
}

export function checkoutSubscriptionStatus(paymentStatus: unknown, subscriptionStatus: string): string {
  return paymentStatus === 'paid' || paymentStatus === 'no_payment_required' ? subscriptionStatus : 'incomplete';
}
