/**
 * Server side of funnel measurement: validating what an untrusted public client
 * sends, and assembling the admin report.
 *
 * Pure — no Express, no firebase-admin, no I/O — so every rule here is
 * unit-testable. `src/server.ts` is thin wiring around it, matching the pattern
 * used by `server-seo.ts`, `server-site.ts` and `server-meta.ts`.
 *
 * The allowlists come from `src/app/funnel.ts` so client and server cannot
 * disagree about the vocabulary.
 */

import {
  FUNNEL_STEPS,
  FUNNEL_FLAGS,
  AUTH_ERROR_CODES,
  FUNNEL_STEP_LABELS,
  FunnelStep,
  FunnelFlag,
  AuthErrorCode,
  isFunnelStep,
  isFunnelFlag,
  isAuthErrorCode,
  funnelRank,
  utcDay,
} from './app/funnel';

/** Most steps/flags accepted in one request. A real journey sends far fewer. */
const MAX_NAMES_PER_BATCH = 12;

/**
 * How many days back a client may write. The client supplies the day, so
 * without a window a hostile caller could mint unlimited documents; with it, at
 * most three document ids are writable at any moment. Two days of slack covers
 * a tab open across a UTC midnight and clock skew.
 */
const MAX_DAY_LAG = 2;

export type CounterGroup = 'steps' | 'furthest' | 'flags' | 'authErrors';

export interface FunnelDeltaPlan {
  day: string;
  deltas: Record<CounterGroup, Record<string, number>>;
}

function shiftUtcDay(now: Date, deltaDays: number): string {
  const d = new Date(now.getTime());
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return utcDay(d);
}

/**
 * Accept a client-supplied day only if it is well-formed and inside
 * `[today - MAX_DAY_LAG, today]` in UTC. Returns null otherwise.
 */
export function normalizeFunnelDay(raw: unknown, now: Date): string | null {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  for (let back = 0; back <= MAX_DAY_LAG; back++) {
    if (raw === shiftUtcDay(now, -back)) return raw;
  }
  return null;
}

function uniqueAllowed<T extends string>(raw: unknown, guard: (v: unknown) => v is T): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  for (const item of raw.slice(0, MAX_NAMES_PER_BATCH)) {
    // Unknown names are dropped silently rather than 400'd, so an older client
    // hitting a newer server degrades instead of erroring.
    if (guard(item) && !out.includes(item)) out.push(item);
  }
  return out;
}

function bump(target: Record<string, number>, key: string, by: number) {
  target[key] = (target[key] || 0) + by;
}

/**
 * Turn an untrusted request body into the exact set of counter increments to
 * apply, or null if there is nothing valid to record.
 *
 * The furthest-marker move is what keeps the abandon histogram non-overlapping:
 * a session leaving step A for step B decrements `furthest.A` and increments
 * `furthest.B`, so at any time exactly one `furthest` bucket holds each session.
 * The move is only honoured when it goes forward, so the marker is monotone and
 * ordinary use cannot drive a bucket negative.
 */
export function buildFunnelDeltas(body: unknown, now: Date): FunnelDeltaPlan | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;

  const day = normalizeFunnelDay(b['day'], now);
  if (!day) return null;

  const steps = uniqueAllowed<FunnelStep>(b['steps'], isFunnelStep);
  const flags = uniqueAllowed<FunnelFlag>(b['flags'], isFunnelFlag);
  const authError = isAuthErrorCode(b['authError']) ? (b['authError'] as AuthErrorCode) : null;

  const from = isFunnelStep(b['from']) ? (b['from'] as FunnelStep) : null;
  const to = isFunnelStep(b['to']) ? (b['to'] as FunnelStep) : null;

  const deltas: Record<CounterGroup, Record<string, number>> = {
    steps: {}, furthest: {}, flags: {}, authErrors: {},
  };

  for (const s of steps) bump(deltas.steps, s, 1);
  for (const f of flags) bump(deltas.flags, f, 1);
  if (authError) bump(deltas.authErrors, authError, 1);

  if (to && funnelRank(to) > funnelRank(from)) {
    bump(deltas.furthest, to, 1);
    if (from) bump(deltas.furthest, from, -1);
  }

  const empty = (Object.keys(deltas) as CounterGroup[]).every(g => Object.keys(deltas[g]).length === 0);
  return empty ? null : { day, deltas };
}

/** A day's stored counters, as read back from Firestore. */
export interface FunnelDayDoc {
  date: string;
  steps?: Record<string, number>;
  furthest?: Record<string, number>;
  flags?: Record<string, number>;
  authErrors?: Record<string, number>;
}

export interface FunnelStepRow {
  step: FunnelStep;
  label: string;
  reached: number;
  /** % of the previous step that got here. */
  conversionFromPrev: number;
  /** % of all sessions that got here. */
  conversionFromTop: number;
  /** Sessions whose journey ended exactly here. */
  exitedHere: number;
}

export interface FunnelReport {
  days: number;
  from: string;
  to: string;
  sessions: number;
  totals: Record<CounterGroup, Record<string, number>>;
  funnel: FunnelStepRow[];
  abandon: { landing: number; wizard: number; publish: number; signup: number; afterSignup: number };
  completed: number;
  daily: { date: string; steps: Record<string, number>; flags: Record<string, number> }[];
}

/** The UTC day keys covered by a report, oldest first. */
export function funnelDayKeys(days: number, now: Date): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) keys.push(shiftUtcDay(now, -i));
  return keys;
}

/** Only 7, 30 or 90 — keeps the read bounded and the cache key small. */
export function clampFunnelDays(raw: unknown): number {
  const n = Number(raw);
  if (n === 7 || n === 90) return n;
  return 30;
}

function readGroup(doc: FunnelDayDoc | null, group: CounterGroup, allowed: readonly string[]): Record<string, number> {
  const src = (doc ? (doc as unknown as Record<string, unknown>)[group] : null) as Record<string, unknown> | null;
  const out: Record<string, number> = {};
  if (!src || typeof src !== 'object') return out;
  for (const key of allowed) {
    const value = Number(src[key]);
    // Clamped at zero: a decrement that outlives its matching increment (a
    // session spanning a UTC midnight) must never render a negative bar.
    if (Number.isFinite(value) && value > 0) out[key] = Math.round(value);
  }
  return out;
}

function sumInto(target: Record<string, number>, source: Record<string, number>) {
  for (const [k, v] of Object.entries(source)) target[k] = (target[k] || 0) + v;
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

/**
 * Assemble the admin report. `docs` is aligned with `funnelDayKeys(days, now)`;
 * a missing day is null and is zero-filled so the trend series has no gaps.
 */
export function buildFunnelReport(docs: (FunnelDayDoc | null)[], days: number, now: Date): FunnelReport {
  const keys = funnelDayKeys(days, now);

  const totals: Record<CounterGroup, Record<string, number>> = {
    steps: {}, furthest: {}, flags: {}, authErrors: {},
  };
  const daily: FunnelReport['daily'] = [];

  keys.forEach((date, i) => {
    const doc = docs[i] || null;
    const steps = readGroup(doc, 'steps', FUNNEL_STEPS);
    const flags = readGroup(doc, 'flags', FUNNEL_FLAGS);
    sumInto(totals.steps, steps);
    sumInto(totals.flags, flags);
    sumInto(totals.furthest, readGroup(doc, 'furthest', FUNNEL_STEPS));
    sumInto(totals.authErrors, readGroup(doc, 'authErrors', AUTH_ERROR_CODES));
    daily.push({ date, steps, flags });
  });

  // sum(furthest) is the true session count: every session sits in exactly one
  // furthest bucket, so this is the one honest denominator.
  const sessions = Object.values(totals.furthest).reduce((a, b) => a + b, 0);

  const funnel: FunnelStepRow[] = FUNNEL_STEPS.map((step, i) => {
    const reached = totals.steps[step] || 0;
    const prev = i === 0 ? sessions : totals.steps[FUNNEL_STEPS[i - 1]] || 0;
    return {
      step,
      label: FUNNEL_STEP_LABELS[step],
      reached,
      conversionFromPrev: pct(reached, prev),
      conversionFromTop: pct(reached, sessions),
      exitedHere: totals.furthest[step] || 0,
    };
  });

  const ex = (step: FunnelStep) => totals.furthest[step] || 0;

  return {
    days,
    from: keys[0],
    to: keys[keys.length - 1],
    sessions,
    totals,
    funnel,
    abandon: {
      landing: ex('landing_viewed') + ex('cta_clicked'),
      wizard: ex('wizard_started') + ex('wizard_engaged') + ex('wizard_review_opened'),
      publish: ex('publish_clicked'),
      signup: ex('signup_shown'),
      afterSignup: ex('account_created') + ex('site_live'),
    },
    completed: ex('link_shared'),
    daily,
  };
}
