import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { LandingComponent } from './landing.component';
import { AuthService } from './auth.service';
import { FunnelService } from './funnel.service';
import { CORE_FEATURES, MORE_FEATURES } from './landing-features';

/** UX audit F11: six core features up front, the rest behind "See all features". */
describe('Landing feature grid (F11)', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    TestBed.configureTestingModule({ imports: [LandingComponent], providers: [provideRouter([]),
      { provide: AuthService, useValue: { currentUser: signal(null), isLoggedIn: () => false } },
      { provide: FunnelService, useValue: { step: () => undefined, flushNow: () => undefined, flag: () => undefined } },
    ] });
  });
  afterEach(() => { globalThis.fetch = realFetch; });

  const titles = (root: Element | null) => Array.from(root?.querySelectorAll('h3') ?? []).map(h => h.textContent?.trim());

  it('keeps all nine features, six core with enquiries, bookings and quotes first', () => {
    expect(CORE_FEATURES.length).toBe(6);
    expect(CORE_FEATURES.slice(0, 3).map(f => f.title)).toEqual(['Enquiry Inbox', 'Online Bookings', 'Quotes & Invoices']);
    const all = [...CORE_FEATURES, ...MORE_FEATURES].map(f => f.title);
    expect(new Set(all).size).toBe(9);
  });

  it('shows six cards at first and reveals the rest on "See all features"', () => {
    const fixture = TestBed.createComponent(LandingComponent); fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(titles(el.querySelector('[data-testid="core-features"]'))).toEqual(CORE_FEATURES.map(f => f.title));
    expect(el.querySelector('[data-testid="more-features"]')).toBeNull();
    const btn = el.querySelector('[data-testid="see-all-features"]') as HTMLButtonElement;
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(btn.textContent).toContain('See all features');
    btn.click(); fixture.detectChanges();
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(titles(el.querySelector('#more-features'))).toEqual(MORE_FEATURES.map(f => f.title));
    expect(btn.textContent).toContain('Show fewer features');
    btn.click(); fixture.detectChanges();
    expect(el.querySelector('[data-testid="more-features"]')).toBeNull();
  });

  it('keeps each card icon tone alongside its layout classes', () => {
    const fixture = TestBed.createComponent(LandingComponent); fixture.detectChanges();
    const icon = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="core-features"] .w-12');
    expect(icon?.className).toContain('rounded-xl');
    expect(icon?.className).toContain('bg-green-50');
  });

  it('mentions NZD pricing from NZ$29 with 0% booking fee and GST wording (F13)', () => {
    const fixture = TestBed.createComponent(LandingComponent); fixture.detectChanges();
    const t = ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');
    expect(t).toContain('Paid plans from NZ$29/month (NZD, excl. GST) with a 0% booking fee');
    expect(t).not.toMatch(/US\$|USD/);
  });
});
