import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { Firestore } from '@angular/fire/firestore';
import { vi } from 'vitest';
import { AdminSettingsComponent } from './admin-settings.component';
import { AuthService } from './auth.service';
import { DataService } from './data.service';
import { FunnelService } from './funnel.service';
import { SETTINGS_TABS, settingsTab } from './settings-tabs';
import { SlugService } from './slug.service';
import { SubscriptionService } from './subscription.service';
import { ToastService } from './toast.service';

describe('settingsTab (F10)', () => {
  it('opens a valid ?tab=, Plan after a Stripe return, else Profile', () => {
    expect(settingsTab('domain')).toBe('domain');
    expect(settingsTab('notifications', true)).toBe('notifications');
    expect(settingsTab(null, true)).toBe('plan');
    expect(settingsTab('nonsense')).toBe('profile');
    expect(settingsTab(null)).toBe('profile');
  });
  it('lists the six sections in the audit order', () => {
    expect(SETTINGS_TABS.map(t => t.label)).toEqual(['Profile', 'Site link', 'Plan', 'Domain', 'Notifications', 'Advanced']);
  });
});

describe('Settings page tabs (F10)', () => {
  function render(query: Record<string, string> = {}) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [AdminSettingsComponent], providers: [provideRouter([]), provideHttpClient(),
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
      { provide: DataService, useValue: { profile: signal({ name: 'Apex', currency: 'NZD' }), getNotificationPrefs: () => null, siteSlug: signal(''),
        templates: signal([]), activeTemplateId: signal(null), setNotificationPrefs: async () => true, updateProfile: () => undefined } },
      { provide: SubscriptionService, useValue: { tier: signal('free'), tierLabel: signal('Free') } },
      { provide: AuthService, useValue: { currentUser: () => null } },
      { provide: ToastService, useValue: { success: () => undefined, error: () => undefined } },
      { provide: FunnelService, useValue: { flag: () => undefined, step: () => undefined } },
      { provide: Firestore, useValue: {} },
      { provide: SlugService, useValue: {} },
    ] });
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AdminSettingsComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, nav };
  }
  const visiblePanels = (el: HTMLElement) =>
    Array.from(el.querySelectorAll<HTMLElement>('[role="tabpanel"]')).filter(p => !p.hidden).map(p => p.id);

  it('shows only the Profile section at first, with a proper tablist', () => {
    const { el } = render();
    const tabs = el.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(6);
    expect(el.querySelector('#settings-tab-profile')?.getAttribute('aria-selected')).toBe('true');
    expect(visiblePanels(el)).toEqual(['settings-panel-profile']);
    expect(el.querySelector('[data-testid="save-settings"]')).toBeNull();
  });

  it('switches sections on click, keeps the URL in step, and shows Save on Notifications', () => {
    const { fixture, el, nav } = render();
    (el.querySelector('#settings-tab-notifications') as HTMLButtonElement).click(); fixture.detectChanges();
    expect(visiblePanels(el)).toEqual(['settings-panel-notifications', 'settings-panel-notifications-sms']);
    expect(el.querySelector('[data-testid="save-settings"]')).not.toBeNull();
    expect(nav).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { tab: 'notifications' }, replaceUrl: true }));
    (el.querySelector('#settings-tab-advanced') as HTMLButtonElement).click(); fixture.detectChanges();
    expect(visiblePanels(el)).toEqual(['settings-panel-advanced', 'settings-panel-advanced-danger']);
    expect(el.textContent).toContain('Danger Zone');
  });

  it('opens the tab named in ?tab= and supports arrow keys', () => {
    const { fixture, el } = render({ tab: 'domain' });
    expect(visiblePanels(el)).toEqual(['settings-panel-domain']);
    const domain = el.querySelector('#settings-tab-domain') as HTMLButtonElement;
    domain.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); fixture.detectChanges();
    expect(fixture.componentInstance.tab()).toBe('notifications');
    domain.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' })); fixture.detectChanges();
    expect(fixture.componentInstance.tab()).toBe('profile');
  });

  it('opens Plan when returning from Stripe checkout', () => {
    const { el } = render({ session_id: 'cs_test' });
    expect(visiblePanels(el)).toEqual(['settings-panel-plan']);
  });
});
