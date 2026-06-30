/**
 * Weekly growth-report auto-generation policy.
 *
 * Growth reports were previously on-demand only. To keep owners' insights fresh
 * without manual effort, the Growth Coach page auto-generates a new report when
 * the last one is at least a week old. The decision is a pure function so it can
 * be unit-tested without Angular / Firestore.
 */

/** How old (in days) the latest report may be before it is auto-regenerated. */
export const GROWTH_REPORT_INTERVAL_DAYS = 7;

const MS_PER_DAY = 86_400_000;

/**
 * Decide whether a fresh growth report should be auto-generated on page open.
 *
 * Returns true when there is no prior report, the stored timestamp is unparseable,
 * or the prior report is at least `intervalDays` old. `nowMs` and `lastCreatedAt`
 * are passed in (rather than read from the clock) so callers can test the policy
 * deterministically.
 *
 * @param lastCreatedAt ISO timestamp of the most recent report, or null/undefined if none.
 * @param nowMs Current time in epoch milliseconds.
 * @param intervalDays Minimum age before regeneration (defaults to a week).
 */
export function shouldAutoGenerateReport(
  lastCreatedAt: string | null | undefined,
  nowMs: number,
  intervalDays: number = GROWTH_REPORT_INTERVAL_DAYS,
): boolean {
  if (!lastCreatedAt) return true;
  const last = new Date(lastCreatedAt).getTime();
  if (Number.isNaN(last)) return true;
  const elapsedDays = (nowMs - last) / MS_PER_DAY;
  return elapsedDays >= intervalDays;
}
