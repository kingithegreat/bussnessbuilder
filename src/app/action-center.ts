import { Enquiry, ContentPage, SavedRecommendation } from './types';
import { isFollowUpDue } from './inbox-workflow';

export interface BusinessAction {
  id: 'setup' | 'new-leads' | 'followups' | 'draft-pages' | 'recommendations' | 'measure';
  title: string;
  reason: string;
  actionLabel: string;
  route: string;
  queryParams?: Record<string, string>;
  successMeasure: string;
}

export interface ActionCenterState {
  setupComplete: boolean;
  enquiries: readonly Enquiry[];
  pages: readonly ContentPage[];
  recommendations: readonly SavedRecommendation[];
}

/** Read-only next steps from saved business state. No AI call or automatic change. */
export function businessActions(state: ActionCenterState, today: string): BusinessAction[] {
  const actions: BusinessAction[] = [];
  if (!state.setupComplete) actions.push({ id: 'setup', title: 'Finish setting up your website',
    reason: 'Your initial website has not completed the setup and preview steps.',
    actionLabel: 'Continue setup', route: '/setup',
    successMeasure: 'Review the preview and complete your first publication.' });
  const fresh = state.enquiries.filter(enquiry => enquiry.status === 'New').length;
  if (fresh) actions.push({ id: 'new-leads', title: `${fresh} new ${fresh === 1 ? 'enquiry needs' : 'enquiries need'} a reply`,
    reason: 'These customers are still marked New. Opening a lead does not record a reply.',
    actionLabel: 'Review new enquiries', route: '/admin/inbox', queryParams: { filter: 'new' },
    successMeasure: 'Reply to each customer and record their next step.' });
  const due = state.enquiries.filter(enquiry => isFollowUpDue(enquiry, today)).length;
  if (due) actions.push({ id: 'followups', title: `${due} ${due === 1 ? 'lead needs' : 'leads need'} a next step`,
    reason: 'A follow-up date is due, or an open lead is waiting for its next action. New leads may also appear here.',
    actionLabel: 'Review due follow-ups', route: '/admin/inbox', queryParams: { filter: 'followup' },
    successMeasure: 'Record the outcome or set a future follow-up date.' });
  const drafts = state.pages.filter(page => !page.published).length;
  if (drafts) actions.push({ id: 'draft-pages', title: `${drafts} ${drafts === 1 ? 'page is' : 'pages are'} still in draft`,
    reason: 'Draft pages are saved but are not published for visitors.',
    actionLabel: 'Review draft pages', route: '/admin/pages',
    successMeasure: 'Check the content, then publish only the pages you approve.' });
  const recommendations = state.recommendations.filter(rec => rec.status === 'new' || rec.status === 'drafted');
  if (recommendations.length) {
    const prepared = recommendations.find(rec => rec.status === 'drafted' && !!rec.draftContent?.trim());
    actions.push({ id: 'recommendations', title: prepared ? 'A prepared improvement is ready to review' : `${recommendations.length} growth ${recommendations.length === 1 ? 'idea needs' : 'ideas need'} review`,
      reason: prepared?.reason || 'Review your saved recommendations before making changes to the website.',
      actionLabel: 'Open Growth', route: '/admin/growth',
      successMeasure: 'Approve a useful change, then compare enquiry results in Analytics.' });
  }
  if (!actions.length) actions.push({ id: 'measure', title: 'Review how your business is doing',
    reason: 'There are no new enquiries, due follow-ups, draft pages or saved recommendations awaiting action.',
    actionLabel: 'Open Analytics', route: '/admin/analytics',
    successMeasure: 'Compare visits and enquiry outcomes before choosing your next improvement.' });
  return actions;
}
