/** Entitlements come from a recognized plan AND a currently usable subscription. */
export type EffectiveTier = 'free' | 'pro' | 'business';

export function effectiveTier(subscription: { tier?: unknown; status?: unknown } | null | undefined): EffectiveTier {
  if (subscription?.status !== 'active' && subscription?.status !== 'trialing') return 'free';
  return subscription.tier === 'pro' || subscription.tier === 'business' ? subscription.tier : 'free';
}

/** Never infer a paid plan from customer-controlled metadata or an unknown price. */
export function tierForPrices(priceIds: string[], prices: { pro: string; business: string }): EffectiveTier {
  if (priceIds.length !== 1) return 'free';
  const id = priceIds[0];
  if (prices.pro && prices.business && prices.pro === prices.business) return 'free';
  if (prices.business && id === prices.business) return 'business';
  if (prices.pro && id === prices.pro) return 'pro';
  return 'free';
}

export function checkoutSubscriptionStatus(paymentStatus: unknown, subscriptionStatus: string): string {
  return paymentStatus === 'paid' || paymentStatus === 'no_payment_required' ? subscriptionStatus : 'incomplete';
}
