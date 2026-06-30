import { shouldAutoGenerateReport, GROWTH_REPORT_INTERVAL_DAYS } from './growth-schedule';

describe('shouldAutoGenerateReport', () => {
  const now = Date.parse('2026-06-30T12:00:00.000Z');
  const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();

  it('regenerates when there is no prior report', () => {
    expect(shouldAutoGenerateReport(null, now)).toBe(true);
    expect(shouldAutoGenerateReport(undefined, now)).toBe(true);
    expect(shouldAutoGenerateReport('', now)).toBe(true);
  });

  it('regenerates when the prior report is unparseable', () => {
    expect(shouldAutoGenerateReport('not-a-date', now)).toBe(true);
  });

  it('does not regenerate a report from today', () => {
    expect(shouldAutoGenerateReport(daysAgo(0), now)).toBe(false);
  });

  it('does not regenerate a report that is younger than the interval', () => {
    expect(shouldAutoGenerateReport(daysAgo(6), now)).toBe(false);
  });

  it('regenerates exactly at the interval boundary', () => {
    expect(shouldAutoGenerateReport(daysAgo(GROWTH_REPORT_INTERVAL_DAYS), now)).toBe(true);
  });

  it('regenerates a report older than the interval', () => {
    expect(shouldAutoGenerateReport(daysAgo(10), now)).toBe(true);
  });

  it('honours a custom interval', () => {
    expect(shouldAutoGenerateReport(daysAgo(2), now, 1)).toBe(true);
    expect(shouldAutoGenerateReport(daysAgo(2), now, 3)).toBe(false);
  });

  it('defaults the interval to one week', () => {
    expect(GROWTH_REPORT_INTERVAL_DAYS).toBe(7);
  });
});
