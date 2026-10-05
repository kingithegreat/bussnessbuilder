import { Enquiry } from './types';

export type InboxFilter = 'all' | 'new' | 'hot' | 'followup' | 'won' | 'lost';

export function inboxFilter(value: string | null): InboxFilter {
  return value === 'new' || value === 'hot' || value === 'followup' || value === 'won' || value === 'lost' ? value : 'all';
}

/** Date inputs represent the owner's calendar day, not a UTC timestamp. */
export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isFollowUpDue(enquiry: Enquiry, today: string): boolean {
  if (['Won', 'Lost', 'Booked'].includes(enquiry.status)) return false;
  if (enquiry.followUpDate) return enquiry.followUpDate <= today;
  // Include legacy "In Progress" leads created merely by opening their detail.
  return ['New', 'Contacted', 'In Progress'].includes(enquiry.status);
}

export function matchesInboxFilter(enquiry: Enquiry, filter: InboxFilter, today: string): boolean {
  switch (filter) {
    case 'new': return enquiry.status === 'New';
    case 'hot': return enquiry.leadScore === 'Hot';
    case 'followup': return isFollowUpDue(enquiry, today);
    case 'won': return enquiry.status === 'Won' || enquiry.status === 'Booked';
    case 'lost': return enquiry.status === 'Lost';
    default: return true;
  }
}
