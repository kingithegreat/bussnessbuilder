import { ChangeOutcome, SiteChange } from './app/site-change';
import { StatsDoc, lastNDays } from './app/stats-rules';
/** Equal seven-day windows, excluding the partial day of the change. Association, never causation. */
export function changeOutcome(action: SiteChange, stats: StatsDoc | undefined, enquiryDays: string[], bookingDays: string[], today: string): ChangeOutcome {
  if (action.status === 'undone') return { status: 'undone', message: 'This change was undone; results are not attributed to it.' };
  if (!action.appliedAt) return { status: 'waiting', message: 'Approve the change to start measuring.' };
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(action.appliedAt));
  const offset = (n: number) => new Date(Date.parse(day + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
  const beforeDays = lastNDays(offset(-1), 7), afterDays = lastNDays(offset(7), 7);
  if (today <= offset(7)) return { status: 'waiting', message: `Results will be available after seven full NZ days, from ${offset(8)}.` };
  const oldest = Object.keys(stats?.days || {}).sort()[0];
  if (!oldest || oldest > beforeDays[0] || today > offset(83)) return { status: 'insufficient_data', message: 'There is not enough retained visit history for equal seven-day comparisons.' };
  const sum = (days: string[]) => ({ views: days.reduce((n, d) => n + (stats?.days[d]?.views || 0), 0),
    enquiries: enquiryDays.filter(d => days.includes(d)).length, bookings: bookingDays.filter(d => days.includes(d)).length });
  return { status: 'available', before: sum(beforeDays), after: sum(afterDays), beforeStart: beforeDays[0], afterStart: afterDays[0],
    message: 'Observed results in seven full days before and after this change. Other edits, traffic and seasonality can affect results; this does not prove the change caused them.' };
}
