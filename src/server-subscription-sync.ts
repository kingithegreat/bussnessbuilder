import type { DocumentReference, Firestore } from 'firebase-admin/firestore';

type SubscriptionDb = Pick<Firestore, 'doc' | 'runTransaction'>;

/** Different subscriptions are ordered by Stripe's authoritative creation time.
 * An equal-time tie preserves the current binding instead of flipping on replay.
 */
export function shouldApplyCheckout(currentId: unknown, currentCreated: unknown, incomingId: string, incomingCreated: number): boolean {
  if (!Number.isSafeInteger(incomingCreated) || incomingCreated < 0) throw new Error('Invalid Stripe subscription creation time');
  if (!currentId || currentId === incomingId) return true;
  if (typeof currentCreated !== 'number' || !Number.isSafeInteger(currentCreated) || currentCreated < 0) {
    throw new Error('Existing subscription creation time is unavailable');
  }
  return incomingCreated > currentCreated;
}

/** Resolve legacy timestamps through Stripe, and re-check inside the write
 * transaction. A concurrent checkout cannot be overwritten using a stale read.
 */
export async function persistCheckoutSubscription(
  db: SubscriptionDb, uid: string, incomingId: string, incomingCreated: number,
  data: Record<string, unknown>, lookupCreated: (id: string) => Promise<number>,
): Promise<boolean> {
  const ref = db.doc(`subscriptions/${uid}`);
  const lookups = new Map<string, Promise<number>>();
  return db.runTransaction(async transaction => {
    const current = (await transaction.get(ref)).data();
    const currentId = current?.['stripeSubscriptionId'];
    let currentCreated = current?.['stripeSubscriptionCreated'];
    if (typeof currentId === 'string' && currentId !== incomingId && currentCreated === undefined) {
      let lookup = lookups.get(currentId);
      if (!lookup) { lookup = lookupCreated(currentId); lookups.set(currentId, lookup); }
      currentCreated = await lookup;
    }
    if (!shouldApplyCheckout(currentId, currentCreated, incomingId, incomingCreated)) return false;
    transaction.set(ref, { ...data, stripeSubscriptionId: incomingId, stripeSubscriptionCreated: incomingCreated });
    return true;
  });
}

/** Update/delete events may only change the subscription still bound at commit. */
export async function updateCurrentSubscription(
  db: Pick<Firestore, 'runTransaction'>, ref: DocumentReference, subscriptionId: string, data: Record<string, unknown>,
): Promise<boolean> {
  return db.runTransaction(async transaction => {
    const current = await transaction.get(ref);
    if (current.data()?.['stripeSubscriptionId'] !== subscriptionId) return false;
    transaction.update(ref, data);
    return true;
  });
}
