import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AdminLayoutComponent } from './admin-layout.component';
import { DataService } from './data.service';
import { AuthService } from './auth.service';
import { SubscriptionService } from './subscription.service';
import { ToastService } from './toast.service';
import { routes } from './app.routes';

describe('Outcome navigation and session exit', () => {
  let calls: string[];
  let finishLogout: () => void;
  beforeEach(() => {
    TestBed.resetTestingModule(); calls = [];
    const logout = new Promise<void>(resolve => { finishLogout = resolve; });
    TestBed.configureTestingModule({ imports: [AdminLayoutComponent], providers: [provideRouter([]),
      { provide: DataService, useValue: { profile: signal({ name: 'Apex' }), enquiries: signal([]), siteSlug: signal('apex'), resetSession: () => calls.push('reset') } },
      { provide: AuthService, useValue: { isLoading: () => false, getIdToken: async () => null, currentUser: () => null, logout: () => { calls.push('auth'); return logout; } } },
      { provide: SubscriptionService, useValue: { tier: () => 'free', tierLabel: () => 'Free', canExport: () => false } },
      { provide: ToastService, useValue: { info: () => undefined } },
      { provide: HttpClient, useValue: { get: () => { throw new Error('Unexpected admin API request'); } } },
    ] });
  });
  it('renders all seven persistent outcome destinations as real links', () => {
    const fixture = TestBed.createComponent(AdminLayoutComponent); fixture.detectChanges();
    const nav: HTMLElement = fixture.nativeElement.querySelector('nav[aria-label="Workspace"]');
    expect(Array.from(nav.querySelectorAll('a')).map(link => link.getAttribute('aria-label'))).toEqual(['Home', 'Website', 'Leads', 'Marketing', 'Growth', 'Analytics', 'Settings']);
    expect(nav.querySelector('a[aria-label="Website"]')?.getAttribute('href')).toBe('/admin/website');
    expect(nav.querySelector('a[aria-label="Analytics"]')?.getAttribute('href')).toBe('/admin/analytics');
  });
  it('clears business state before starting or waiting for authentication logout', async () => {
    const fixture = TestBed.createComponent(AdminLayoutComponent);
    const pending = fixture.componentInstance.logout();
    expect(calls).toEqual(['reset', 'auth']);
    finishLogout(); await pending;
  });
  it('preserves all old admin routes while adding Website and Analytics', () => {
    const children = routes.find(route => route.path === 'admin')!.children!;
    const names = children.map(route => route.path);
    ['dashboard', 'inbox', 'content', 'ai', 'customisation', 'builder', 'form-builder', 'pages', 'payments', 'growth', 'settings', 'website', 'analytics'].forEach(name => expect(names).toContain(name));
    expect(children.find(route => route.path === 'analytics')?.data).toEqual({ view: 'analytics' });
    expect(children.find(route => route.path === '')?.redirectTo).toBe('dashboard');
  });
});
