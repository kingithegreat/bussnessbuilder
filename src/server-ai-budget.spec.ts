import type { Firestore } from 'firebase-admin/firestore';
import { aiUsageLimits, aiFallbackMessage, nextAiReservation, reserveAiCall, validAiInput, AI_MAX_INPUT_CHARS, AiUsageCounter } from './server-ai-budget';

describe('AI spend boundaries', () => {
  const limits = { daily: 20, monthly: 200 };
  const usage = { day: '2026-10-05', count: 19, month: '2026-10', monthlyCount: 70 };

  it('reserves the final daily slot and resets only the daily count at midnight', () => {
    const last = nextAiReservation(usage, '2026-10-05', limits) as AiUsageCounter;
    expect(last).toEqual({ ...usage, count: 20, monthlyCount: 71 });
    expect(nextAiReservation({ ...last }, '2026-10-05', limits)).toBe('daily_exhausted');
    expect(nextAiReservation({ ...last }, '2026-10-06', limits)).toEqual({ ...last, day: '2026-10-06', count: 1, monthlyCount: 72 });
  });

  it('keeps the monthly ceiling across days and resets both counters at month-end', () => {
    const full = { day: '2026-10-30', count: 20, month: '2026-10', monthlyCount: 200 };
    expect(nextAiReservation(full, '2026-10-30', limits)).toBe('monthly_exhausted');
    expect(nextAiReservation(full, '2026-10-31', limits)).toBe('monthly_exhausted');
    expect(nextAiReservation(full, '2026-11-01', limits)).toEqual({ day: '2026-11-01', count: 1, month: '2026-11', monthlyCount: 1 });
    expect(nextAiReservation({ ...full, day: '2026-12-31', month: '2026-12' }, '2027-01-01', limits)).toEqual({ day: '2027-01-01', count: 1, month: '2027-01', monthlyCount: 1 });
  });

  it('fails closed on malformed current counters and stale day/month retries', () => {
    for (const count of ['bad', -1, 1.5]) {
      expect(nextAiReservation({ ...usage, count }, '2026-10-05', limits)).toBe('unavailable');
      expect(nextAiReservation({ ...usage, monthlyCount: count }, '2026-10-05', limits)).toBe('unavailable');
    }
    expect(nextAiReservation({ ...usage, monthlyCount: 1 }, '2026-10-05', limits)).toBe('unavailable');
    expect(nextAiReservation(usage, '2026-10-04', limits)).toBe('unavailable');
    expect(nextAiReservation(usage, '2026-09-30', limits)).toBe('unavailable');
    expect(nextAiReservation({ ...usage, day: '2026-09-01' }, '2026-09-30', limits)).toBe('unavailable');
  });

  it('initializes missing docs and conservatively carries known daily-only usage into the month', () => {
    expect(nextAiReservation(undefined, '2026-10-05', limits)).toEqual({ day: '2026-10-05', count: 1, month: '2026-10', monthlyCount: 1 });
    expect(nextAiReservation({ day: '2026-10-04', count: 10 }, '2026-10-05', limits)).toEqual({ day: '2026-10-05', count: 1, month: '2026-10', monthlyCount: 11 });
  });

  it('uses modest paid defaults and fails closed on zero/invalid settings for either period', () => {
    expect(aiUsageLimits('free', {})).toEqual({ daily: 0, monthly: 0 });
    expect(aiUsageLimits('pro', {})).toEqual({ daily: 20, monthly: 200 });
    expect(aiUsageLimits('business', {})).toEqual({ daily: 60, monthly: 600 });
    expect(aiUsageLimits('pro', { AI_DAILY_LIMIT_PRO: '5', AI_MONTHLY_LIMIT_PRO: '50' })).toEqual({ daily: 5, monthly: 50 });
    for (const raw of ['0', '-1', 'oops', '1.5', '10001']) {
      expect(aiUsageLimits('pro', { AI_DAILY_LIMIT_PRO: raw }).daily).toBe(0);
      expect(aiUsageLimits('pro', { AI_MONTHLY_LIMIT_PRO: raw }).monthly).toBe(0);
    }
    expect(nextAiReservation(undefined, '2026-10-05', { daily: 0, monthly: 200 })).toBe('daily_exhausted');
    expect(nextAiReservation(undefined, '2026-10-05', { daily: 20, monthly: 0 })).toBe('monthly_exhausted');
  });

  it('tells the user the applicable reset period', () => {
    expect(aiFallbackMessage('daily_exhausted')).toContain('daily allowance resets at midnight UTC');
    expect(aiFallbackMessage('monthly_exhausted')).toContain('first day of next month at midnight UTC');
    expect(aiFallbackMessage('unavailable')).toContain('could not be checked');
  });

  it('bounds the combined prompt and instruction and rejects invalid payloads', () => {
    expect(validAiInput('a'.repeat(AI_MAX_INPUT_CHARS))).toBe(true);
    expect(validAiInput('a'.repeat(AI_MAX_INPUT_CHARS), 'x')).toBe(false);
    expect(validAiInput('  ')).toBe(false);
    expect(validAiInput('hello', {})).toBe(false);
    expect(validAiInput(5)).toBe(false);
  });

  it('reserves both counters transactionally before allowing a call and fails closed on storage failure', async () => {
    const writes: unknown[] = [];
    const paths: string[] = [];
    const db = {
      doc: (path: string) => { paths.push(path); return {}; },
      runTransaction: async (work: (transaction: unknown) => Promise<unknown>) => work({
        get: async () => ({ data: () => usage }),
        set: (_ref: unknown, data: unknown) => writes.push(data),
      }),
    } as unknown as Pick<Firestore, 'doc' | 'runTransaction'>;
    expect(await reserveAiCall(db, 'owner', limits, new Date('2026-10-05T12:00:00Z'))).toBe('allowed');
    expect(paths).toEqual(['serverAiUsage/owner']);
    expect(writes).toEqual([{ ...usage, count: 20, monthlyCount: 71 }]);
    expect(await reserveAiCall(db, 'owner', { daily: 19, monthly: 200 }, new Date('2026-10-05T12:00:00Z'))).toBe('daily_exhausted');
    expect(writes).toHaveLength(1);
    const broken = { ...db, runTransaction: async () => { throw new Error('offline'); } } as unknown as typeof db;
    expect(await reserveAiCall(broken, 'owner', limits)).toBe('unavailable');
  });

  it('shares the last monthly slot across concurrent callers and isolates other users', async () => {
    const documents = new Map<string, Record<string, unknown>>();
    documents.set('serverAiUsage/owner', { day: '2026-10-04', count: 1, month: '2026-10', monthlyCount: 199 });
    let pending: Promise<unknown> = Promise.resolve();
    const db = {
      doc: (path: string) => path,
      runTransaction: (work: (transaction: unknown) => Promise<unknown>) => {
        const result = pending.then(() => work({
          get: async (path: string) => ({ data: () => documents.get(path) }),
          set: (path: string, data: Record<string, unknown>) => documents.set(path, data),
        }));
        pending = result;
        return result;
      },
    } as unknown as Pick<Firestore, 'doc' | 'runTransaction'>;
    const day = new Date('2026-10-05T12:00:00Z');
    expect(await Promise.all([
      reserveAiCall(db, 'owner', limits, day),
      reserveAiCall(db, 'owner', limits, day),
      reserveAiCall(db, 'other', limits, day),
    ])).toEqual(['allowed', 'monthly_exhausted', 'allowed']);
    expect(documents.get('serverAiUsage/owner')).toEqual({ day: '2026-10-05', count: 1, month: '2026-10', monthlyCount: 200 });
    expect(documents.size).toBe(2);
  });
});
