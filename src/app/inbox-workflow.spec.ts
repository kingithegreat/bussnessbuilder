import { inboxFilter, isFollowUpDue, localDateKey, matchesInboxFilter } from './inbox-workflow';
import { Enquiry } from './types';

const lead = (status: string, followUpDate?: string) => ({ status, followUpDate } as Enquiry);

describe('inbox attention and deep links', () => {
  it('keeps unread and legacy viewed leads actionable until explicitly handled', () => {
    for (const status of ['New', 'Contacted', 'In Progress']) {
      expect(isFollowUpDue(lead(status), '2026-10-05')).toBe(true);
    }
  });
  it('does not flag closed or booked leads as due, even with an old date', () => {
    for (const status of ['Won', 'Lost', 'Booked']) {
      expect(isFollowUpDue(lead(status, '2026-10-01'), '2026-10-05')).toBe(false);
    }
  });
  it('compares follow-up dates against the local calendar day, including today', () => {
    expect(localDateKey(new Date(2026, 9, 5, 0, 1))).toBe('2026-10-05');
    expect(isFollowUpDue(lead('Quoted', '2026-10-05'), '2026-10-05')).toBe(true);
    expect(isFollowUpDue(lead('Quoted', '2026-10-06'), '2026-10-05')).toBe(false);
  });
  it('accepts Home filter links and safely falls back for unknown filters', () => {
    expect(inboxFilter('new')).toBe('new');
    expect(inboxFilter('followup')).toBe('followup');
    expect(inboxFilter('anything')).toBe('all');
    expect(matchesInboxFilter(lead('New'), inboxFilter('new'), '2026-10-05')).toBe(true);
    expect(matchesInboxFilter(lead('Booked'), 'won', '2026-10-05')).toBe(true);
  });
});
