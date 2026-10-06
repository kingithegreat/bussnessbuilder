import type { Firestore } from 'firebase-admin/firestore';
import { vi } from 'vitest';
import { generateHomepageHeadline } from './server-headline-generation';

function database(tier = 'pro', status = 'active', count = 0) {
  const day = new Date().toISOString().slice(0, 10);
  let counter = { day, count, month: day.slice(0, 7), monthlyCount: count };
  const writes = vi.fn();
  const db = {
    doc: (path: string) => ({ path, get: async () => ({ data: () => ({ tier, status }) }) }),
    runTransaction: async (work: (tx: unknown) => Promise<unknown>) => work({
      get: async () => ({ data: () => counter }),
      set: (_ref: unknown, value: typeof counter) => { counter = value; writes(value); },
    }),
  } as unknown as Pick<Firestore, 'doc' | 'runTransaction'>;
  return { db, writes };
}
const context = { request: 'Improve my homepage headline', profile: { name: 'Apex', type: 'cleaner', serviceArea: 'Auckland' }, before: { tagline: 'Old headline' } };

describe('Headline generation uses existing platform allowance', () => {
  it('uses a labelled factual template without a provider key or counter write', async () => {
    const { db, writes } = database(); const provider = vi.fn();
    const result = await generateHomepageHeadline(db, 'owner', context, {}, provider);
    expect(result.source).toBe('template'); expect(result.headline).toContain('Apex');
    expect(result.headline).toContain('Auckland'); expect(provider).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
  });
  it('does not spend provider calls for unpaid subscriptions', async () => {
    const { db, writes } = database('business', 'past_due'); const provider = vi.fn();
    expect((await generateHomepageHeadline(db, 'owner', context, { GEMINI_API_KEY: 'fake-test-key' }, provider)).source).toBe('template');
    expect(provider).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
  });
  it('shares the daily counter with other AI tools and labels exhausted fallback', async () => {
    const { db, writes } = database('pro', 'active', 20); const provider = vi.fn();
    const result = await generateHomepageHeadline(db, 'owner', context, { GEMINI_API_KEY: 'fake-test-key' }, provider);
    expect(result.source).toBe('template'); expect(result.reason).toContain('Daily AI allowance reached');
    expect(provider).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
  });
  it('reserves once, sends saved facts and returns a valid AI headline', async () => {
    const { db, writes } = database(); const provider = vi.fn().mockResolvedValue('Headline: "A cleaner home in Auckland"');
    const result = await generateHomepageHeadline(db, 'owner', context, { GEMINI_API_KEY: 'fake-test-key' }, provider);
    expect(result).toMatchObject({ source: 'ai', headline: 'A cleaner home in Auckland' });
    expect(provider).toHaveBeenCalledTimes(1); expect(provider.mock.calls[0][1]).toContain('Apex');
    expect(writes).toHaveBeenCalledWith(expect.objectContaining({ count: 1, monthlyCount: 1 }));
  });
  it('keeps a failed attempt counted and returns a template without retrying', async () => {
    const { db, writes } = database(); const provider = vi.fn().mockRejectedValue(new Error('provider unavailable'));
    const result = await generateHomepageHeadline(db, 'owner', context, { GEMINI_API_KEY: 'fake-test-key' }, provider);
    expect(result.source).toBe('template'); expect(provider).toHaveBeenCalledTimes(1); expect(writes).toHaveBeenCalledTimes(1);
  });
  it('rejects provider markup rather than proposing it for publication', async () => {
    const { db } = database(); const provider = vi.fn().mockResolvedValue('<script>bad</script>');
    const result = await generateHomepageHeadline(db, 'owner', context, { GEMINI_API_KEY: 'fake-test-key' }, provider);
    expect(result.source).toBe('template'); expect(result.headline).not.toContain('<');
  });
});
