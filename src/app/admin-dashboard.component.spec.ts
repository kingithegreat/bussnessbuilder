import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { DataService } from './data.service';
import { AnalyticsService } from './analytics.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { FunnelService } from './funnel.service';
import { Enquiry } from './types';
import { SiteActionService } from './site-action.service';

const enquiry = (status: string): Enquiry => ({ id: 'one', date: '2026-10-05', name: 'Customer', email: '', phone: '', serviceInterest: 'Cleaning', message: '', preferredDateTime: '', urgency: '', status });
describe('Home action center in the real dashboard', () => {
  const enquiries = signal<Enquiry[]>([]);
  const complete = signal(true);
  beforeEach(() => {
    TestBed.resetTestingModule(); enquiries.set([]); complete.set(true);
    localStorage.setItem('bf_onboarding_dismissed', '1');
    TestBed.configureTestingModule({ imports: [AdminDashboardComponent], providers: [provideRouter([]),
      { provide: DataService, useValue: { enquiries, activities: signal([]), profile: signal({ name: 'Apex' }), siteSlug: signal('apex'), isSetupComplete: complete, getPages: () => [], savedRecommendations: signal([]) } },
      { provide: AnalyticsService, useValue: { data: signal({ totalViews: 0 }), loadAnalytics: () => undefined, viewsLast7Days: () => 0, viewsLast30Days: () => 0, dailyViewsChart: () => [] } },
      { provide: AuthService, useValue: { currentUser: () => null } },
      { provide: ToastService, useValue: { success: () => undefined, error: () => undefined } },
      { provide: FunnelService, useValue: { flag: () => undefined, step: () => undefined } },
      { provide: SiteActionService, useValue: { busy: signal(false), error: signal(null), errorCode: signal(null), recoveryPending: signal(false), retryUnconfirmedChange: async () => false, draft: signal(null), history: signal([]), loadHistory: async () => undefined } },
    ] });
  });
  afterEach(() => localStorage.removeItem('bf_onboarding_dismissed'));
  it('puts actionable real enquiry state before metrics and renders a filtered deep link', () => {
    enquiries.set([enquiry('New')]); const fixture = TestBed.createComponent(AdminDashboardComponent); fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const action = element.querySelector('[data-testid="next-business-action"]');
    expect(action?.textContent).toContain('1 new enquiry needs a reply');
    expect(action?.textContent).toContain('Success looks like:');
    expect(action?.querySelector('a')?.getAttribute('href')).toBe('/admin/inbox?filter=new');
    expect(element.textContent!.indexOf('1 new enquiry needs a reply')).toBeLessThan(element.textContent!.indexOf('Total Enquiries'));
    expect(element.querySelector('app-headline-chat')).not.toBeNull();
    expect(element.textContent!.indexOf('Improve your homepage headline')).toBeLessThan(element.textContent!.indexOf('1 new enquiry needs a reply'));
    enquiries.set([enquiry('Won')]); fixture.detectChanges();
    expect(element.querySelector('[data-testid="next-business-action"]')?.textContent).toContain('Review how your business is doing');
  });
  it('prioritizes real incomplete setup instead of promising a live site', () => {
    complete.set(false); const fixture = TestBed.createComponent(AdminDashboardComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="next-business-action"] a').getAttribute('href')).toBe('/setup');
  });
  it('keeps the existing metrics on the Analytics route without duplicating Home actions', () => {
    TestBed.inject(ActivatedRoute).snapshot.data = { view: 'analytics' };
    const fixture = TestBed.createComponent(AdminDashboardComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Home action center"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-headline-chat')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Analytics');
    expect(fixture.nativeElement.textContent).toContain('Total Enquiries');
  });
});
