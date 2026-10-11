/**
 * Privacy-friendly first-party stats. No cookies, no third parties: the server
 * counts page views and a daily-rotating, truncated visitor hash (never the
 * IP). Only today's hashes are kept, so visitors can't be followed across days.
 */
export interface DayStats { views: number; uniques: number; paths: Record<string, number> }
export interface StatsDoc { days: Record<string, DayStats>; today?: { day: string; visitors: string[] } }

export const KEEP_DAYS = 90;
const MAX_VISITORS_PER_DAY = 5000;
const MAX_PATHS_PER_DAY = 50;

/** Store paths as short, safe Firestore map keys. */
export function normalizePath(raw: unknown): string {
  let p = typeof raw === 'string' ? raw : '/';
  p = p.split(/[?#]/)[0].slice(0, 120) || '/';
  if (!p.startsWith('/')) p = '/' + p;
  p = p.replace(/\/+$/, '') || '/';
  // Firestore map keys can't contain '.', '/' is awkward in field paths; encode.
  return p.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/\//g, '|') || '|';
}
export const displayPath = (key: string) => key.replace(/\|/g, '/') || '/';

export function isBot(ua: string): boolean {
  return !ua || /bot|crawl|spider|slurp|preview|monitor|headless|lighthouse|curl|wget|python|axios|node-fetch/i.test(ua);
}

export function applyHit(doc: StatsDoc | undefined, hit: { day: string; path: string; visitor: string }): StatsDoc {
  const days = { ...(doc?.days || {}) };
  const prev = days[hit.day];
  const d: DayStats = { views: prev?.views || 0, uniques: prev?.uniques || 0, paths: { ...(prev?.paths || {}) } };
  const today = doc?.today?.day === hit.day ? { day: hit.day, visitors: [...doc.today.visitors] } : { day: hit.day, visitors: [] as string[] };
  d.views += 1;
  if (!today.visitors.includes(hit.visitor)) {
    d.uniques += 1;
    if (today.visitors.length < MAX_VISITORS_PER_DAY) today.visitors.push(hit.visitor);
  }
  if (d.paths[hit.path] !== undefined || Object.keys(d.paths).length < MAX_PATHS_PER_DAY) d.paths[hit.path] = (d.paths[hit.path] || 0) + 1;
  days[hit.day] = d;
  const keep = Object.keys(days).sort().slice(-KEEP_DAYS);
  return { days: Object.fromEntries(keep.map(k => [k, days[k]])), today };
}

export interface StatsSummary {
  series: { day: string; views: number; uniques: number; enquiries: number; bookings: number }[];
  totals: { views: number; uniques: number; enquiries: number; bookings: number };
  topPages: { path: string; views: number }[];
}

export function lastNDays(endDay: string, n: number): string[] {
  const end = Date.parse(endDay + 'T00:00:00Z');
  return Array.from({ length: n }, (_, i) => new Date(end - (n - 1 - i) * 86400_000).toISOString().slice(0, 10));
}

export function summarizeStats(doc: StatsDoc | undefined, enquiryDates: string[], bookingDates: string[], endDay: string, n = 30): StatsSummary {
  const days = lastNDays(endDay, n);
  const count = (dates: string[], day: string) => dates.filter(d => typeof d === 'string' && d.slice(0, 10) === day).length;
  const series = days.map(day => ({
    day,
    views: doc?.days?.[day]?.views || 0,
    uniques: doc?.days?.[day]?.uniques || 0,
    enquiries: count(enquiryDates, day),
    bookings: count(bookingDates, day),
  }));
  const pages: Record<string, number> = {};
  for (const day of days) for (const [p, v] of Object.entries(doc?.days?.[day]?.paths || {})) pages[p] = (pages[p] || 0) + v;
  return {
    series,
    totals: series.reduce((t, s) => ({ views: t.views + s.views, uniques: t.uniques + s.uniques, enquiries: t.enquiries + s.enquiries, bookings: t.bookings + s.bookings }), { views: 0, uniques: 0, enquiries: 0, bookings: 0 }),
    topPages: Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([path, views]) => ({ path: displayPath(path), views })),
  };
}
