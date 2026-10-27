import { reserveManagedAiCall, platformAiBudget } from './server-ai-budget';
import { createSiteActionTestDb } from './testing/site-action-db';
const now = new Date('2026-10-18T02:00:00Z'), limits = { daily: 100, monthly: 1000 };
describe('Platform-wide AI envelope', () => {
  it('reserves the last shared slot across concurrent accounts atomically', async () => {
    const { db, documents } = createSiteActionTestDb();
    const env = { AI_PLATFORM_DAILY_USD: '0.10', AI_PLATFORM_MONTHLY_USD: '0.10' };
    expect(await Promise.all(['a','b','c'].map(uid => reserveManagedAiCall(db, uid, limits, env, now)))).toEqual(['allowed', 'platform_exhausted', 'platform_exhausted']);
    expect(documents.size).toBe(2); expect(documents.get('serverAiPlatform/usage')).toMatchObject({ monthlyMicros: 100000 });
  });
  it('honours environment and stored kill switches without consuming user allowance', async () => {
    const { db, documents } = createSiteActionTestDb({ 'serverAiPlatform/usage': { disabled: true } });
    expect(await reserveManagedAiCall(db, 'a', limits, {}, now)).toBe('disabled');
    expect(await reserveManagedAiCall(db, 'a', limits, { AI_PLATFORM_ENABLED: 'false' }, now)).toBe('disabled');
    expect(documents.has('serverAiUsage/a')).toBe(false);
  });
  it('resets the daily envelope while keeping monthly reservations', async () => {
    const { db, documents } = createSiteActionTestDb({ 'serverAiPlatform/usage': { day: '2026-10-17', month: '2026-10', dailyMicros: 5000000, monthlyMicros: 6000000 } });
    expect(await reserveManagedAiCall(db, 'a', limits, {}, now)).toBe('allowed');
    expect(documents.get('serverAiPlatform/usage')).toMatchObject({ dailyMicros: 100000, monthlyMicros: 6100000 });
  });
  it('fails closed on malformed budgets/counters and protects lower-cost estimates', async () => {
    expect(platformAiBudget({ AI_RESERVATION_USD: '0.001' }).reservationMicros).toBe(0);
    const { db } = createSiteActionTestDb({ 'serverAiPlatform/usage': { day: '2026-10-18', month: '2026-10', dailyMicros: 'bad', monthlyMicros: 5 } });
    expect(await reserveManagedAiCall(db, 'a', limits, {}, now)).toBe('unavailable');
    expect(await reserveManagedAiCall(db, 'a', limits, { AI_PLATFORM_MONTHLY_USD: 'bad' }, now)).toBe('platform_exhausted');
  });
});
