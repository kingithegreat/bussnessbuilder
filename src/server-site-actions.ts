import { randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import {
  isHomepageHeadlineAction,
  isHomepageHeadlineRequest,
  validActionId,
  validActionReason,
  validHeadline,
  type HomepageHeadlineAction,
  type PrepareHeadlineInput,
} from './app/site-action';

export const HEADLINE_PREPARATION_TTL_MS = 120_000;
type ActionDatabase = Pick<Firestore, 'doc' | 'runTransaction'>;
export interface HeadlineGenerationContext {
  request: string;
  profile: Record<string, unknown>;
  before: { tagline: string };
}
export interface GeneratedHeadline { headline: string; reason: string; source: 'ai' | 'template' }
export type HeadlineGenerator = (context: HeadlineGenerationContext) => Promise<GeneratedHeadline>;

export class SiteActionError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = 'SiteActionError';
  }
}

function assertOwner(uid: string): void {
  if (typeof uid !== 'string' || !uid || uid.length > 128 || uid.includes('/') || uid.includes('\\')
    || [...uid].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) {
    throw new SiteActionError(400, 'invalid_owner', 'A valid signed-in owner is required.');
  }
}

function assertId(id: unknown): asserts id is string {
  if (!validActionId(id)) throw new SiteActionError(400, 'invalid_action_id', 'The action needs a valid unique ID.');
}

function profileFromMain(main: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!main) throw new SiteActionError(404, 'site_not_found', 'Set up your website before changing its headline.');
  if (main['isSetupComplete'] !== true) {
    throw new SiteActionError(409, 'site_not_ready', 'Finish setting up your website before preparing or applying headline changes.');
  }
  const profile = main['profile'];
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw new SiteActionError(409, 'profile_unavailable', 'Your saved business profile could not be loaded.');
  }
  return profile as Record<string, unknown>;
}

function rawHeadline(profile: Record<string, unknown>): string {
  if (profile['tagline'] === undefined || profile['tagline'] === null) return '';
  if (typeof profile['tagline'] !== 'string') throw new SiteActionError(409, 'profile_unavailable', 'Your saved headline could not be loaded.');
  return profile['tagline'];
}

function actionFromData(data: unknown, uid: string, id: string): HomepageHeadlineAction {
  if (!data) throw new SiteActionError(404, 'action_not_found', 'This headline proposal could not be found.');
  if (!isHomepageHeadlineAction(data) || data.actorUid !== uid || data.id !== id) {
    throw new SiteActionError(409, 'invalid_action', 'This headline proposal cannot be used.');
  }
  return data;
}

function assertSameRequest(action: HomepageHeadlineAction, input: PrepareHeadlineInput): void {
  if (action.request !== input.request || action.before.tagline !== input.expectedHeadline) {
    throw new SiteActionError(409, 'action_id_reused', 'This action ID already belongs to a different request.');
  }
}

/** Reserve once before generation; SDK calls and paid generation never run in a retried transaction. */
export async function prepareHeadlineAction(
  db: ActionDatabase,
  uid: string,
  input: PrepareHeadlineInput,
  generate: HeadlineGenerator,
  now = new Date(),
): Promise<HomepageHeadlineAction> {
  assertOwner(uid);
  assertId(input?.id);
  if (!isHomepageHeadlineRequest(input.request)) {
    throw new SiteActionError(400, 'unsupported_request', 'Ask for a homepage headline or tagline change. Other chat actions are not available yet.');
  }
  if (typeof input.expectedHeadline !== 'string' || input.expectedHeadline.length > 10_000) {
    throw new SiteActionError(400, 'invalid_expected_headline', 'The current headline is required to prepare a safe change.');
  }
  const actionRef = db.doc(`businessActions/${uid}/entries/${input.id}`);
  const claimRef = db.doc(`businessActions/${uid}/preparations/${input.id}`);
  const mainRef = db.doc(`users/${uid}/businessData/main`);
  const claimToken = randomUUID();
  const timestamp = now.toISOString();
  const reserved = await db.runTransaction(async transaction => {
    const actionSnap = await transaction.get(actionRef);
    if (actionSnap.exists) {
      const action = actionFromData(actionSnap.data(), uid, input.id);
      assertSameRequest(action, input);
      return { action };
    }
    const claimSnap = await transaction.get(claimRef);
    const claim = claimSnap.data();
    if (claimSnap.exists) {
      if (claim?.['actorUid'] !== uid || claim['request'] !== input.request || claim['expectedHeadline'] !== input.expectedHeadline) {
        throw new SiteActionError(409, 'action_id_reused', 'This action ID already belongs to a different request.');
      }
      const started = typeof claim['startedAt'] === 'string' ? Date.parse(claim['startedAt']) : Number.NaN;
      if (!Number.isFinite(started) || now.getTime() - started < HEADLINE_PREPARATION_TTL_MS) {
        throw new SiteActionError(409, 'action_preparing', 'This proposal is still being prepared. Wait a moment before retrying the same request.');
      }
    }
    const mainSnap = await transaction.get(mainRef);
    const profile = profileFromMain(mainSnap.data());
    const before = { tagline: rawHeadline(profile) };
    if (before.tagline !== input.expectedHeadline) {
      throw new SiteActionError(409, 'headline_conflict', 'The saved headline changed. Refresh your website before preparing another proposal.');
    }
    transaction.set(claimRef, {
      id: input.id, actorUid: uid, request: input.request,
      expectedHeadline: input.expectedHeadline, startedAt: timestamp, claimToken,
    });
    return { profile, before };
  });
  if ('action' in reserved && reserved.action) return reserved.action;
  if (!('profile' in reserved) || !reserved.profile || !reserved.before) {
    throw new SiteActionError(409, 'preparation_unavailable', 'This headline request could not be prepared.');
  }
  try {
    const result = await generate({ request: input.request, profile: reserved.profile, before: reserved.before });
    if (!validHeadline(result.headline) || !validActionReason(result.reason) || !['ai', 'template'].includes(result.source)) {
      throw new SiteActionError(502, 'invalid_proposal', 'The proposed headline was not valid plain text. Try preparing another proposal.');
    }
    const after = { tagline: result.headline.trim() };
    if (after.tagline === reserved.before.tagline) {
      throw new SiteActionError(422, 'unchanged_headline', 'The proposed headline matches your current headline. Try a more specific request.');
    }
    const action: HomepageHeadlineAction = {
      id: input.id, type: 'homepage.headline', status: 'prepared',
      before: reserved.before, after, request: input.request, reason: result.reason.trim(),
      source: result.source, actorUid: uid, createdAt: timestamp,
    };
    return await db.runTransaction(async transaction => {
      const claimSnap = await transaction.get(claimRef);
      if (claimSnap.data()?.['claimToken'] !== claimToken) {
        throw new SiteActionError(409, 'preparation_expired', 'A newer preparation replaced this request. Refresh the proposal history.');
      }
      transaction.set(actionRef, action);
      transaction.delete(claimRef);
      return action;
    });
  } catch (error) {
    // Never clear a replacement's claim when an older timed-out callback returns.
    await db.runTransaction(async transaction => {
      const claimSnap = await transaction.get(claimRef);
      if (claimSnap.data()?.['claimToken'] === claimToken) transaction.delete(claimRef);
    }).catch(() => undefined);
    throw error;
  }
}

async function changeHeadline(
  db: ActionDatabase, uid: string, id: string, operation: 'approve' | 'undo', now: Date,
): Promise<HomepageHeadlineAction> {
  assertOwner(uid);
  assertId(id);
  const actionRef = db.doc(`businessActions/${uid}/entries/${id}`);
  const mainRef = db.doc(`users/${uid}/businessData/main`);
  return db.runTransaction(async transaction => {
    const actionSnap = await transaction.get(actionRef);
    const action = actionFromData(actionSnap.data(), uid, id);
    if (operation === 'approve') {
      if (action.status === 'applied') return action;
      if (action.status === 'undone') throw new SiteActionError(409, 'action_undone', 'An undone proposal cannot be applied again. Prepare a new proposal.');
    } else {
      if (action.status === 'undone') return action;
      if (action.status !== 'applied') throw new SiteActionError(409, 'action_not_applied', 'Only an approved headline can be undone.');
    }
    const mainSnap = await transaction.get(mainRef);
    const main = mainSnap.data();
    const profile = profileFromMain(main);
    const expected = operation === 'approve' ? action.before.tagline : action.after.tagline;
    if (rawHeadline(profile) !== expected) {
      throw new SiteActionError(409, 'headline_conflict', 'Your headline has changed since this proposal. Refresh before making another change.');
    }
    const tagline = operation === 'approve' ? action.after.tagline : action.before.tagline;
    const date = now.toISOString();
    const changed: HomepageHeadlineAction = operation === 'approve'
      ? { ...action, status: 'applied', appliedAt: date }
      : { ...action, status: 'undone', undoneAt: date };
    const activity = {
      id: `${id}-${operation}`, type: 'note_added',
      title: operation === 'approve' ? 'Homepage headline updated' : 'Homepage headline restored',
      description: operation === 'approve'
        ? `Approved headline proposal ${id}: ${action.before.tagline || '(blank)'} → ${action.after.tagline}`
        : `Undid headline proposal ${id}: ${action.after.tagline} → ${action.before.tagline || '(blank)'}`,
      date,
    };
    const previousActivities = main?.['activities'];
    transaction.update(mainRef, {
      'profile.tagline': tagline,
      activities: [activity, ...(Array.isArray(previousActivities) ? previousActivities : [])].slice(0, 500),
    });
    transaction.set(actionRef, changed);
    return changed;
  });
}

export function applyHeadlineAction(db: ActionDatabase, uid: string, id: string, now = new Date()): Promise<HomepageHeadlineAction> {
  return changeHeadline(db, uid, id, 'approve', now);
}

export function undoHeadlineAction(db: ActionDatabase, uid: string, id: string, now = new Date()): Promise<HomepageHeadlineAction> {
  return changeHeadline(db, uid, id, 'undo', now);
}

export async function listHeadlineActions(db: Pick<Firestore, 'collection'>, uid: string): Promise<HomepageHeadlineAction[]> {
  assertOwner(uid);
  const snapshot = await db.collection(`businessActions/${uid}/entries`).orderBy('createdAt', 'desc').limit(20).get();
  return snapshot.docs.flatMap(doc => {
    const action = doc.data();
    return isHomepageHeadlineAction(action) && action.actorUid === uid && action.id === doc.id ? [action] : [];
  });
}
