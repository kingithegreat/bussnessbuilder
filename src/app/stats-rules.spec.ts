import { applyHit, summarizeStats, normalizePath, displayPath, isBot, lastNDays } from './stats-rules';

describe('stats rules', () => {
  it('counts views and daily uniques, forgetting yesterday\'s visitors', () => {
    let d = applyHit(undefined, { day: '2026-10-11', path: '|', visitor: 'a' });
    d = applyHit(d, { day: '2026-10-11', path: '|', visitor: 'a' });
    d = applyHit(d, { day: '2026-10-11', path: '|pages|about', visitor: 'b' });
    expect(d.days['2026-10-11']).toEqual({ views: 3, uniques: 2, paths: { '|': 2, '|pages|about': 1 } });
    d = applyHit(d, { day: '2026-10-12', path: '|', visitor: 'a' });
    expect(d.today).toEqual({ day: '2026-10-12', visitors: ['a'] });
    expect(d.days['2026-10-12'].uniques).toBe(1);
  });
  it('keeps at most 90 days', () => {
    let d = undefined as ReturnType<typeof applyHit> | undefined;
    for (const day of lastNDays('2026-10-11', 100)) d = applyHit(d, { day, path: '|', visitor: 'x' });
    expect(Object.keys(d!.days)).toHaveLength(90);
    expect(Object.keys(d!.days)[0]).toBe('2026-07-14');
  });
  it('normalises paths into safe keys', () => {
    expect(normalizePath('/s/pyespa/pages/about-us/?utm=1#x')).toBe('|s|pyespa|pages|about-us');
    expect(displayPath(normalizePath('/'))).toBe('/');
    expect(normalizePath('/a.b')).toBe('|ab');
  });
  it('filters bots', () => {
    expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
    expect(isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(false);
  });
  it('summarises with enquiries, bookings and top pages', () => {
    const d = applyHit(applyHit(undefined, { day: '2026-10-10', path: '|', visitor: 'a' }), { day: '2026-10-11', path: '|pages|x', visitor: 'b' });
    const s = summarizeStats(d, ['2026-10-11T03:00:00Z', '2026-01-01'], ['2026-10-10T01:00:00Z'], '2026-10-11', 7);
    expect(s.series).toHaveLength(7);
    expect(s.totals).toEqual({ views: 2, uniques: 2, enquiries: 1, bookings: 1 });
    expect(s.topPages.map(p => p.path).sort()).toEqual(['/', '/pages/x']);
  });
});
