/**
 * Funnel measurement — shared vocabulary and pure session logic.
 *
 * Angular-free and browser-free on purpose: `src/server-funnel.ts` imports the
 * same allowlists, so the client and the server can never drift into disagreeing
 * about what a step is called (the pattern `src/app/domain-verification.ts`
 * already established for `/api/domain/*`).
 *
 * ## Why this shape
 *
 * The people worth measuring are the ones who leave. They never authenticate,
 * so anything recorded only after login measures survivors and is blind to the
 * drop-out it is supposed to explain. Events therefore go to a public endpoint.
 *
 * That makes privacy the binding constraint, and it is met structurally rather
 * than by policy: **no identifier is ever transmitted or stored** — no visitor
 * id, no UUID, no session id, no uid, no IP, no user agent, no referrer, no
 * timestamp finer than the calendar day. Per-session de-duplication happens in
 * the browser, in `sessionStorage`, and dies with the tab; only counter deltas
 * leave the page. The published privacy policy says the app uses no tracking
 * cookies, and this keeps that literally true.
 *
 * Two counter families are kept per day:
 *  - `steps`    — sessions that REACHED each step (gives step-to-step conversion)
 *  - `furthest` — sessions whose furthest step was EXACTLY this one (gives a
 *                 non-overlapping abandon histogram, so a landing bounce is
 *                 distinguishable from a wizard abandon from a signup abandon)
 *
 * Because every counter is de-duplicated to "sessions that did X", every number
 * shares one unit and ratios between them are honest. `sum(furthest)` equals the
 * total number of sessions, which is a free integrity check on the whole table.
 */

/**
 * The funnel, in order. Rank is position in this array, and the furthest-step
 * marker only ever moves forward through it.
 */
export const FUNNEL_STEPS = [
  'landing_viewed',
  'cta_clicked',
  'wizard_started',
  'wizard_engaged',
  'wizard_review_opened',
  'publish_clicked',
  'signup_shown',
  'account_created',
  'site_live',
  'link_shared',
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

/** Human labels for the admin surface. */
export const FUNNEL_STEP_LABELS: Record<FunnelStep, string> = {
  landing_viewed: 'Visited the site',
  cta_clicked: 'Clicked a build CTA',
  wizard_started: 'Opened the wizard',
  wizard_engaged: 'Typed something',
  wizard_review_opened: 'Reached review',
  publish_clicked: 'Hit publish',
  signup_shown: 'Saw sign-up',
  account_created: 'Created an account',
  site_live: 'Site went live',
  link_shared: 'Shared their link',
};

/**
 * Friction signals. Counted like steps (de-duplicated per session) but they
 * never move the furthest marker — they annotate a journey rather than advance
 * it.
 */
export const FUNNEL_FLAGS = [
  'wizard_resumed',
  'wizard_review_blocked',
  'publish_failed',
  'signup_blocked_terms',
  'signup_blocked_email',
  'signup_blocked_password',
  'signup_blocked_other',
  'signup_auth_failed',
  'google_popup_closed',
  /**
   * Signed up but arrived with setup incomplete — the logged-out publish
   * hand-off through localStorage died somewhere. Currently 100% invisible and
   * the single most valuable thing here: it means someone did all the work and
   * lost it.
   */
  'stash_lost',
  'welcome_dismissed',
  'first_enquiry',
] as const;

export type FunnelFlag = (typeof FUNNEL_FLAGS)[number];

export const FUNNEL_FLAG_LABELS: Record<FunnelFlag, string> = {
  wizard_resumed: 'Resumed a saved draft',
  wizard_review_blocked: 'Blocked at review (missing fields)',
  publish_failed: 'Publish threw an error',
  signup_blocked_terms: "Didn't accept the terms",
  signup_blocked_email: 'Invalid email at sign-up',
  signup_blocked_password: 'Password too short',
  signup_blocked_other: 'Sign-up form incomplete',
  signup_auth_failed: 'Auth rejected the sign-up',
  google_popup_closed: 'Closed the Google popup',
  stash_lost: 'Signed up but their site was lost',
  welcome_dismissed: 'Dismissed the live-site banner',
  first_enquiry: 'Received a first enquiry',
};

/**
 * Bounded dimension for auth failures — exactly the codes `LoginComponent`
 * already maps, plus `other`. Fixed at 12 keys forever, so the document can
 * never grow a key per unique error string.
 */
export const AUTH_ERROR_CODES = [
  'auth/user-not-found',
  'auth/wrong-password',
  'auth/invalid-credential',
  'auth/email-already-in-use',
  'auth/weak-password',
  'auth/too-many-requests',
  'auth/invalid-email',
  'auth/network-request-failed',
  'auth/unauthorized-domain',
  'auth/operation-not-allowed',
  'auth/invalid-api-key',
  'other',
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

/** Per-tab session state. Lives in sessionStorage; never transmitted. */
export const FUNNEL_SESSION_KEY = 'bf_funnel_session';

/** The consent key the cookie banner already writes. */
export const CONSENT_KEY = 'cookie-consent';

export interface FunnelSession {
  /** UTC calendar day the session started, `YYYY-MM-DD`. */
  day: string;
  /** Furthest step reached so far, or null before the first step. */
  furthest: FunnelStep | null;
  /** Steps and flags already counted, so nothing is double-counted. */
  seen: string[];
}

/** One batch of deltas, the entire wire format. Note: no identifier of any kind. */
export interface FunnelBatch {
  day: string;
  steps: FunnelStep[];
  flags: FunnelFlag[];
  /** Furthest-marker move, so the abandon histogram stays non-overlapping. */
  from: FunnelStep | null;
  to: FunnelStep | null;
  authError?: AuthErrorCode;
}

const STEP_SET: ReadonlySet<string> = new Set(FUNNEL_STEPS);
const FLAG_SET: ReadonlySet<string> = new Set(FUNNEL_FLAGS);
const AUTH_ERROR_SET: ReadonlySet<string> = new Set(AUTH_ERROR_CODES);

export function isFunnelStep(value: unknown): value is FunnelStep {
  return typeof value === 'string' && STEP_SET.has(value);
}

export function isFunnelFlag(value: unknown): value is FunnelFlag {
  return typeof value === 'string' && FLAG_SET.has(value);
}

export function isAuthErrorCode(value: unknown): value is AuthErrorCode {
  return typeof value === 'string' && AUTH_ERROR_SET.has(value);
}

/** Position in the funnel; -1 for anything unknown. */
export function funnelRank(step: FunnelStep | null): number {
  if (!step) return -1;
  return FUNNEL_STEPS.indexOf(step);
}

/** UTC calendar day, `YYYY-MM-DD`. UTC everywhere so buckets never shift. */
export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function newSession(now: Date): FunnelSession {
  return { day: utcDay(now), furthest: null, seen: [] };
}

/**
 * Coerce whatever is in sessionStorage into a session, or null if it is junk or
 * belongs to a previous day (a tab left open overnight starts a fresh day
 * rather than writing counters into yesterday's document).
 */
export function parseSession(raw: string | null, now: Date): FunnelSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    const day = typeof parsed['day'] === 'string' ? parsed['day'] : '';
    if (day !== utcDay(now)) return null;
    const furthestRaw = parsed['furthest'];
    const seenRaw = parsed['seen'];
    return {
      day,
      furthest: isFunnelStep(furthestRaw) ? furthestRaw : null,
      seen: Array.isArray(seenRaw) ? seenRaw.filter((s): s is string => typeof s === 'string') : [],
    };
  } catch {
    return null;
  }
}

export function serializeSession(session: FunnelSession): string {
  return JSON.stringify(session);
}

export interface StepResult {
  session: FunnelSession;
  /** Null when the step was already counted this session — nothing to send. */
  batchPart: { step: FunnelStep; from: FunnelStep | null; to: FunnelStep | null } | null;
}

/**
 * Record reaching a step. De-duplicates within the session and moves the
 * furthest marker forward only — a backwards or equal move is dropped, so the
 * marker is monotone by construction and `furthest` can never go negative from
 * ordinary use.
 */
export function recordStep(session: FunnelSession, step: FunnelStep): StepResult {
  if (session.seen.includes(step)) {
    return { session, batchPart: null };
  }
  const seen = [...session.seen, step];
  const movesForward = funnelRank(step) > funnelRank(session.furthest);
  const from = session.furthest;
  const to = movesForward ? step : null;
  return {
    session: { ...session, seen, furthest: movesForward ? step : session.furthest },
    batchPart: { step, from: movesForward ? from : null, to },
  };
}

export interface FlagResult {
  session: FunnelSession;
  /** Null when this flag was already counted this session. */
  flag: FunnelFlag | null;
}

/** Record a friction flag. De-duplicated; never moves the marker. */
export function recordFlag(session: FunnelSession, flag: FunnelFlag): FlagResult {
  if (session.seen.includes(flag)) {
    return { session, flag: null };
  }
  return { session: { ...session, seen: [...session.seen, flag] }, flag };
}

/**
 * Analytics consent.
 *
 * The banner writes `'accepted'` / `'declined'` and, until now, nothing read it
 * — declining was identical to accepting. This makes the choice mean something.
 *
 * An explicit decline suppresses everything. No choice yet still counts, on the
 * grounds that these are anonymous aggregate counters carrying no identifier and
 * no persistent storage, which is what the banner already describes as
 * essential-only use. If that judgement is ever revisited, this one function is
 * the only thing to change.
 */
export function hasAnalyticsConsent(raw: string | null): boolean {
  return raw !== 'declined';
}

/** Merge queued parts into the single batch that goes over the wire. */
export function buildBatch(
  day: string,
  steps: FunnelStep[],
  flags: FunnelFlag[],
  from: FunnelStep | null,
  to: FunnelStep | null,
  authError?: AuthErrorCode
): FunnelBatch {
  const batch: FunnelBatch = { day, steps, flags, from, to };
  if (authError) batch.authError = authError;
  return batch;
}

/** True when a batch carries nothing worth a network round-trip. */
export function isEmptyBatch(batch: FunnelBatch): boolean {
  return batch.steps.length === 0 && batch.flags.length === 0 && !batch.to && !batch.authError;
}
