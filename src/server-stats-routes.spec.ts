import { statsRouter, visitorHash, statsDay } from './server-stats-routes';
import { startFeatureServer } from './testing/feature-harness';

describe('stats HTTP journey', () => {
  let h: Awaited<ReturnType<typeof startFeatureServer>>;
  const now = () => new Date('2026-10-11T22:00:00Z'); // 12 Oct in NZ
  beforeEach(async () => { h = await startFeatureServer(statsRouter, { 'users/owner/businessData/main': { enquiries: [{ date: '2026-10-11T20:00:00Z' }] } }, { now }); });
  afterEach(async () => { await h.close(); });

  const hit = (path: string, ua = 'Mozilla/5.0 (iPhone)') => fetch(h.base + '/api/site/owner-slug/hit', { method: 'POST', headers: { 'Content-Type': 'text/plain', 'User-Agent': ua }, body: JSON.stringify({ path }) });

  it('counts real visits without storing IPs, skips bots', async () => {
    expect((await hit('/s/owner-slug')).status).toBe(204);
    await hit('/s/owner-slug/pages/about');
    await hit('/', 'Googlebot/2.1');
    await new Promise(r => setTimeout(r, 50));
    const doc = h.store.documents.get('users/owner/businessData/stats') as { days: Record<string, { views: number; uniques: number }>; today: { visitors: string[] } };
    expect(doc.days['2026-10-12']).toMatchObject({ views: 2, uniques: 1 });
    expect(JSON.stringify(doc)).not.toContain('127.0.0.1');
    expect(doc.today.visitors[0]).toMatch(/^[0-9a-f]{12}$/);
    const s = await h.call('GET', '/api/stats?uid=owner&days=7', undefined, true);
    expect(s.body['totals']).toEqual({ views: 2, uniques: 1, enquiries: 1, bookings: 0 });
    expect((await h.call('GET', '/api/stats?uid=owner')).status).toBe(401);
  });

  it('rotates the visitor hash daily', () => {
    expect(visitorHash('s', '2026-10-11', 'u', 'ip', 'ua')).not.toBe(visitorHash('s', '2026-10-12', 'u', 'ip', 'ua'));
    expect(statsDay(now())).toBe('2026-10-12');
  });
});
