import { describe, it, expect } from 'vitest';
import { businessActions, ActionCenterState } from './action-center';
import { Enquiry, ContentPage, SavedRecommendation } from './types';

const lead = (patch: Partial<Enquiry>): Enquiry => ({ id: 'lead', date: '2026-10-05', name: 'Customer', email: '', phone: '', serviceInterest: '', message: '', preferredDateTime: '', urgency: '', status: 'New', ...patch });
const page = (published: boolean): ContentPage => ({ id: 'p', title: 'Services', slug: 'services', content: 'Content', published, createdAt: '', updatedAt: '' });
const recommendation = (patch: Partial<SavedRecommendation>): SavedRecommendation => ({ id: 'r', title: 'Improve headline', reason: 'Visitors need to understand the offer.', suggestion: 'Be specific.', priority: 'high', type: 'hero', status: 'new', source: 'template', createdAt: '', updatedAt: '', ...patch });
const state = (patch: Partial<ActionCenterState> = {}): ActionCenterState => ({ setupComplete: true, enquiries: [], pages: [], recommendations: [], ...patch });
const today = '2026-10-05';

describe('businessActions', () => {
  it('puts incomplete setup before lead and page work, with explanation and success measure', () => {
    const actions = businessActions(state({ setupComplete: false, enquiries: [lead({})], pages: [page(false)] }), today);
    expect(actions[0].id).toBe('setup'); expect(actions[0].route).toBe('/setup');
    actions.forEach(action => { expect(action.reason.length).toBeGreaterThan(0); expect(action.actionLabel.length).toBeGreaterThan(0); expect(action.successMeasure.length).toBeGreaterThan(0); });
  });
  it('counts only genuinely New enquiries and deep-links to the matching inbox filter', () => {
    const actions = businessActions(state({ enquiries: [lead({}), lead({ id: '2', status: 'Won' })] }), today);
    expect(actions[0].title).toBe('1 new enquiry needs a reply');
    expect(actions[0].queryParams).toEqual({ filter: 'new' });
  });
  it('uses the shared due-date contract and excludes terminal/future leads', () => {
    const actions = businessActions(state({ enquiries: [lead({ status: 'Contacted', followUpDate: today }), lead({ id: 'future', status: 'Contacted', followUpDate: '2026-10-06' }), lead({ id: 'won', status: 'Won', followUpDate: '2026-10-01' }), lead({ id: 'booked', status: 'Booked', followUpDate: today })] }), today);
    expect(actions.map(action => action.id)).toEqual(['followups']);
    expect(actions[0].title).toBe('1 lead needs a next step'); expect(actions[0].queryParams).toEqual({ filter: 'followup' });
  });
  it('keeps legacy pending leads actionable without inventing a due date', () => {
    expect(businessActions(state({ enquiries: [lead({ status: 'In Progress' })] }), today)[0].id).toBe('followups');
  });
  it('counts saved unpublished pages without calling a published page a draft', () => {
    const actions = businessActions(state({ pages: [page(false), { ...page(true), id: 'live' }] }), today);
    expect(actions[0].title).toBe('1 page is still in draft'); expect(actions[0].route).toBe('/admin/pages');
  });
  it('uses a real prepared draft and excludes applied/dismissed recommendations', () => {
    const actions = businessActions(state({ recommendations: [recommendation({ status: 'applied' }), recommendation({ id: 'ready', status: 'drafted', draftContent: 'A real draft', reason: 'Real saved evidence.' }), recommendation({ id: 'gone', status: 'dismissed' })] }), today);
    expect(actions[0].title).toBe('A prepared improvement is ready to review'); expect(actions[0].reason).toBe('Real saved evidence.');
  });
  it('does not claim a prepared change when draft content is missing', () => {
    expect(businessActions(state({ recommendations: [recommendation({ status: 'drafted', draftContent: '' })] }), today)[0].title).toBe('1 growth idea needs review');
  });
  it('offers measurement when real state has no pending work and preserves inputs', () => {
    const source = state({ pages: [page(true)], recommendations: [recommendation({ status: 'applied' })] });
    const before = JSON.stringify(source); expect(businessActions(source, today)[0].route).toBe('/admin/analytics'); expect(JSON.stringify(source)).toBe(before);
  });
});
