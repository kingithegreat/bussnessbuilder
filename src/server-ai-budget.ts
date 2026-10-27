import type { Firestore } from 'firebase-admin/firestore';
import type { EffectiveTier } from './app/effective-tier';
export { AI_GENERATION_LIMITS } from './app/ai-generation-limits';

// These caps bound every provider call, including its billed reasoning tokens.
export const AI_MAX_INPUT_CHARS = 16_000;
export type AiBudgetResult = 'allowed' | 'daily_exhausted' | 'monthly_exhausted' | 'platform_exhausted' | 'disabled' | 'unavailable';
export interface AiUsageLimits { daily: number; monthly: number }
export interface AiUsageCounter { day: string; count: number; month: string; monthlyCount: number }

function configuredLimit(tier: EffectiveTier, env: Record<string, string | undefined>, period: 'DAILY' | 'MONTHLY'): number {
  if (tier === 'free') return 0;
  const raw = env[`AI_${period}_LIMIT_${tier === 'business' ? 'BUSINESS' : 'PRO'}`];
  if (raw === undefined || raw.trim() === '') return (tier === 'business' ? 60 : 20) * (period === 'MONTHLY' ? 10 : 1);
  const limit = Number(raw);
  // Invalid configuration disables paid calls instead of silently raising spend.
  return Number.isSafeInteger(limit) && limit >= 0 && limit <= 10_000 ? limit : 0;
}

export function aiUsageLimits(tier: EffectiveTier, env: Record<string, string | undefined>): AiUsageLimits {
  return { daily: configuredLimit(tier, env, 'DAILY'), monthly: configuredLimit(tier, env, 'MONTHLY') };
}

export function validAiInput(prompt: unknown, systemPrompt?: unknown): prompt is string {
  return typeof prompt === 'string' && prompt.trim().length > 0
    && (systemPrompt === undefined || typeof systemPrompt === 'string')
    && prompt.length + (typeof systemPrompt === 'string' ? systemPrompt.length : 0) <= AI_MAX_INPUT_CHARS;
}

export function nextAiReservation(data: Record<string, unknown> | undefined, day: string, limits: AiUsageLimits): AiUsageCounter | Exclude<AiBudgetResult, 'allowed'> {
  if (limits.monthly <= 0) return 'monthly_exhausted';
  if (limits.daily <= 0) return 'daily_exhausted';
  const month = day.slice(0, 7);
  // Retries spanning midnight/month-end must never roll a newer counter back.
  if ((typeof data?.['day'] === 'string' && data['day'] > day)
    || (typeof data?.['month'] === 'string' && data['month'] > month)) return 'unavailable';
  const count = data?.['day'] === day ? data['count'] : 0;
  // When upgrading an older daily-only doc, carry its known daily usage into
  // the month. Earlier unrecorded days cannot be reconstructed.
  const monthlyCount = data?.['month'] === month ? data['monthlyCount']
    : data && data['month'] === undefined && typeof data['day'] === 'string' && data['day'].startsWith(month) ? data['count'] : 0;
  if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0
    || typeof monthlyCount !== 'number' || !Number.isSafeInteger(monthlyCount) || monthlyCount < count) return 'unavailable';
  // Monthly takes precedence: tomorrow cannot restore a consumed month.
  if (monthlyCount >= limits.monthly) return 'monthly_exhausted';
  if (count >= limits.daily) return 'daily_exhausted';
  return { day, count: count + 1, month, monthlyCount: monthlyCount + 1 };
}

/** One server-only rolling document per UID, shared by every endpoint/replica.
 * Reserve before calling Gemini; failed calls still consume a slot so retries
 * cannot bypass the ceiling. Transactions retry safely under contention.
 */
export async function reserveAiCall(db: Pick<Firestore, 'doc' | 'runTransaction'>, uid: string, limits: AiUsageLimits, now = new Date()): Promise<AiBudgetResult> {
  if (limits.monthly <= 0) return 'monthly_exhausted';
  if (limits.daily <= 0) return 'daily_exhausted';
  try {
    const ref = db.doc(`serverAiUsage/${uid}`);
    const day = now.toISOString().slice(0, 10);
    return await db.runTransaction<AiBudgetResult>(async transaction => {
      const snap = await transaction.get(ref);
      const next = nextAiReservation(snap.data(), day, limits);
      if (typeof next === 'string') return next;
      transaction.set(ref, next);
      return 'allowed';
    });
  } catch {
    return 'unavailable';
  }
}

export function aiFallbackMessage(reason: Exclude<AiBudgetResult, 'allowed'> | 'input_limit'): string {
  if (reason === 'daily_exhausted') return 'Daily AI allowance reached. Template content is shown; the daily allowance resets at midnight UTC.';
  if (reason === 'monthly_exhausted') return 'Monthly AI allowance reached. Template content is shown; the monthly allowance resets on the first day of next month at midnight UTC.';
  if (reason === 'disabled') return 'Platform AI is paused. Template content is shown.';
  if (reason === 'platform_exhausted') return 'The shared AI budget has been reached. Template content is shown.';
  if (reason === 'input_limit') return 'This request exceeds the AI input limit. Template content is shown.';
  return 'AI usage could not be checked. Template content is shown; please try again later.';
}

export interface PlatformAiBudget { enabled: boolean; dailyMicros: number; monthlyMicros: number; reservationMicros: number }
/** USD reservations, NOT a claim to read the provider's actual bill. Defaults bound account-wide exposure. */
export function platformAiBudget(env: Record<string, string | undefined>): PlatformAiBudget {
  const money = (key: string, fallback: number, minimum = 0): number => {
    const raw = env[key];
    const value = raw === undefined || raw.trim() === '' ? fallback : Number(raw);
    return Number.isFinite(value) && value >= minimum && value <= 100000 ? Math.round(value * 1_000_000) : 0;
  };
  return { enabled: env['AI_PLATFORM_ENABLED'] !== 'false',
    dailyMicros: money('AI_PLATFORM_DAILY_USD', 5), monthlyMicros: money('AI_PLATFORM_MONTHLY_USD', 25),
    reservationMicros: money('AI_RESERVATION_USD', 0.10, 0.10) };
}

/** Atomically reserve both the user's allowance and the platform's shared USD envelope. */
export async function reserveManagedAiCall(db: Pick<Firestore, 'doc' | 'runTransaction'>, uid: string,
  limits: AiUsageLimits, env: Record<string, string | undefined>, now = new Date()): Promise<AiBudgetResult> {
  const budget = platformAiBudget(env);
  if (!budget.enabled) return 'disabled';
  if (!budget.reservationMicros || !budget.dailyMicros || !budget.monthlyMicros) return 'platform_exhausted';
  try {
    const ownerRef = db.doc(`serverAiUsage/${uid}`);
    const globalRef = db.doc('serverAiPlatform/usage');
    const day = now.toISOString().slice(0, 10), month = day.slice(0, 7);
    return await db.runTransaction<AiBudgetResult>(async tx => {
      const owner = await tx.get(ownerRef);
      const global = (await tx.get(globalRef)).data();
      const nextOwner = nextAiReservation(owner.data(), day, limits);
      if (typeof nextOwner === 'string') return nextOwner;
      if (global?.['disabled'] === true) return 'disabled';
      if (typeof global?.['day'] === 'string' && global['day'] > day || typeof global?.['month'] === 'string' && global['month'] > month) return 'unavailable';
      const daily = global?.['day'] === day ? global['dailyMicros'] : 0;
      const monthly = global?.['month'] === month ? global['monthlyMicros'] : 0;
      if (![daily, monthly].every(x => Number.isSafeInteger(x) && x >= 0) || monthly < daily) return 'unavailable';
      if (daily + budget.reservationMicros > budget.dailyMicros || monthly + budget.reservationMicros > budget.monthlyMicros) return 'platform_exhausted';
      tx.set(ownerRef, nextOwner);
      tx.set(globalRef, { day, month, dailyMicros: daily + budget.reservationMicros, monthlyMicros: monthly + budget.reservationMicros, disabled: false });
      return 'allowed';
    });
  } catch { return 'unavailable'; }
}
