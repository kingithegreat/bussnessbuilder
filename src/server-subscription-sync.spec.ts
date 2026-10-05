import type { DocumentReference, Firestore } from 'firebase-admin/firestore';
import { vi } from 'vitest';
import { persistCheckoutSubscription, shouldApplyCheckout, updateCurrentSubscription } from './server-subscription-sync';

function store(initial?: Record<string, unknown>) {
  const state = { current: initial, writes: 0 };
  const ref = {} as DocumentReference;
  const db = {
    doc: () => ref,
    runTransaction: async (work: (transaction: unknown) => Promise<unknown>) => work({
      get: async () => ({ data: () => state.current }),
      set: (_ref: unknown, value: Record<string, unknown>) => { state.current = value; state.writes++; },
      update: (_ref: unknown, value: Record<string, unknown>) => { state.current = { ...state.current, ...value }; state.writes++; },
    }),
  } as unknown as Pick<Firestore, 'doc' | 'runTransaction'>;
  return { state, ref, db };
}

describe('Stripe subscription binding order', () => {
  it('accepts first/current/newer subscriptions but rejects old or tied competing checkouts', () => {
    expect(shouldApplyCheckout(undefined, undefined, 'first', 10)).toBe(true);
    expect(shouldApplyCheckout('same', undefined, 'same', 10)).toBe(true);
    expect(shouldApplyCheckout('old', 10, 'new', 20)).toBe(true);
    expect(shouldApplyCheckout('new', 20, 'old', 10)).toBe(false);
    expect(shouldApplyCheckout('current', 20, 'other', 20)).toBe(false);
    expect(() => shouldApplyCheckout('current', undefined, 'other', 20)).toThrow();
  });

  it('persists a legitimate newer checkout and prevents an older replay reverting it', async () => {
    const { db, state } = store({ stripeSubscriptionId: 'old', stripeSubscriptionCreated: 10, tier: 'pro' });
    const lookup = vi.fn();
    expect(await persistCheckoutSubscription(db, 'owner', 'new', 20, { tier: 'business', status: 'active' }, lookup)).toBe(true);
    expect(await persistCheckoutSubscription(db, 'owner', 'old', 10, { tier: 'pro', status: 'canceled' }, lookup)).toBe(false);
    expect(state.current).toEqual({ stripeSubscriptionId: 'new', stripeSubscriptionCreated: 20, tier: 'business', status: 'active' });
    expect(state.writes).toBe(1);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('looks up legacy creation time without rejecting valid replacement subscriptions', async () => {
    const { db, state } = store({ stripeSubscriptionId: 'legacy', tier: 'pro' });
    const lookup = vi.fn().mockResolvedValue(10);
    expect(await persistCheckoutSubscription(db, 'owner', 'new', 20, { tier: 'business' }, lookup)).toBe(true);
    expect(lookup).toHaveBeenCalledWith('legacy');
    expect(state.current?.['stripeSubscriptionId']).toBe('new');
    expect(state.current?.['stripeSubscriptionCreated']).toBe(20);
  });

  it('fails without writes when legacy lookup is unavailable', async () => {
    const { db, state } = store({ stripeSubscriptionId: 'legacy', tier: 'pro' });
    await expect(persistCheckoutSubscription(db, 'owner', 'new', 20, {}, async () => { throw new Error('offline'); })).rejects.toThrow('offline');
    expect(state.writes).toBe(0);
    expect(state.current?.['stripeSubscriptionId']).toBe('legacy');
  });

  it('rechecks the binding at transaction time after an update/delete query races a new checkout', async () => {
    const { db, ref, state } = store({ stripeSubscriptionId: 'new', tier: 'business', status: 'active' });
    expect(await updateCurrentSubscription(db, ref, 'old', { tier: 'free', status: 'canceled' })).toBe(false);
    expect(state.writes).toBe(0);
    expect(state.current?.['tier']).toBe('business');
    expect(await updateCurrentSubscription(db, ref, 'new', { tier: 'free', status: 'canceled' })).toBe(true);
    expect(state.current?.['tier']).toBe('free');
  });
});
