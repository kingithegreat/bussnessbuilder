import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { PricingComponent } from './pricing.component';
import { AuthService } from './auth.service';
import { SubscriptionService } from './subscription.service';
import { ToastService } from './toast.service';

/** F13: self-service pricing is NZD native: NZ$29 / NZ$59 / NZ$99, 0% booking fee, NZ$750 setup, NZ$129/mo care. */
describe('Pricing page (F13 NZD)', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    TestBed.configureTestingModule({ imports: [PricingComponent], providers: [provideRouter([]),
      { provide: AuthService, useValue: { currentUser: signal(null), isLoggedIn: () => false } },
      { provide: SubscriptionService, useValue: { tier: () => 'free', createCheckoutSession: async () => null } },
      { provide: ToastService, useValue: { show: () => undefined } },
    ] });
  });
  afterEach(() => { globalThis.fetch = realFetch; });

  const text = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();

  it('shows NZD prices with GST wording and no USD anywhere', () => {
    const fixture = TestBed.createComponent(PricingComponent); fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(text(el.querySelector('[data-testid="plan-starter"]'))).toContain('NZ$29/monthNZD, excl. GST');
    expect(text(el.querySelector('[data-testid="plan-pro"]'))).toContain('NZ$59/monthNZD, excl. GST');
    expect(text(el.querySelector('[data-testid="plan-business"]'))).toContain('NZ$99/monthNZD, excl. GST');
    expect(text(el.querySelector('[data-testid="plan-starter"]'))).toContain('0% booking fee');
    const managed = text(el.querySelector('[data-testid="managed-services"]'));
    expect(managed).toContain('Done-for-you setup: NZ$750 one-time (NZD, excl. GST)');
    expect(managed).toContain('Managed care: NZ$129/month (NZD, excl. GST)');
    expect(text(el.querySelector('[data-testid="pricing-footnote"]'))).toContain('New Zealand dollars (NZD, excl. GST)');
    expect(text(el.querySelector('main'))).not.toMatch(/US\$|USD|US dollars|\$14|\$22/);
  });

  it('offers Free, Starter, Pro and Business in that order', () => {
    const fixture = TestBed.createComponent(PricingComponent); fixture.detectChanges();
    const names = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="plan-grid"] h3')).map(h => text(h));
    expect(names).toEqual(['Free', 'Starter', 'Pro', 'Business']);
  });
});
