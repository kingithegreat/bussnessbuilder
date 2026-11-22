import { OwnerApiService } from './owner-api.service';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { AdminInboxComponent } from './admin-inbox.component';
import { AiService } from './ai.service';
import { DataService } from './data.service';
import { SubscriptionService } from './subscription.service';
import { ToastService } from './toast.service';
import { Enquiry } from './types';

describe('Inbox navigation and attention', () => {
  const lead = { id: 'lead-1', name: 'Jane', status: 'New' } as Enquiry;
  const enquiries = signal<Enquiry[]>([]);
  const updateEnquiry = vi.fn();
  const bookingsGet = vi.fn(async () => ({ settings: { enabled: false } }));
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let component: AdminInboxComponent;
  beforeEach(() => {
    enquiries.set([lead]);
    updateEnquiry.mockClear();
    params = new BehaviorSubject(convertToParamMap({ filter: 'new', lead: 'lead-1' }));
    TestBed.configureTestingModule({ providers: [
      { provide: ActivatedRoute, useValue: { queryParamMap: params } },
      { provide: DataService, useValue: { enquiries, updateEnquiry, customization: signal({}), siteSlug: signal('kowhai'), profile: signal({ name: 'Kōwhai Coast' }) } },
      { provide: AiService, useValue: {} },
      { provide: OwnerApiService, useValue: { download: async () => undefined, uid: () => 'u1', get: bookingsGet } },
      { provide: SubscriptionService, useValue: {} },
      { provide: ToastService, useValue: {} },
    ] });
    component = TestBed.runInInjectionContext(() => new AdminInboxComponent());
    TestBed.tick();
  });
  it('opens the Home deep link without marking the enquiry as contacted', () => {
    expect(component.activeFilter()).toBe('new');
    expect(component.selectedEnquiry()?.id).toBe('lead-1');
    component.selectEnquiry(lead);
    expect(component.selectedEnquiry()?.status).toBe('New');
    expect(updateEnquiry).not.toHaveBeenCalled();
  });
  it('updates filters when navigating to another Home action in the same component', () => {
    params.next(convertToParamMap({ filter: 'followup' }));
    expect(component.activeFilter()).toBe('followup');
    expect(component.filteredEnquiries).toEqual([lead]);
  });
  it('resolves a linked lead arriving later through the live inbox', () => {
    params.next(convertToParamMap({ lead: 'lead-2' }));
    enquiries.set([lead, { ...lead, id: 'lead-2', name: 'Sam' }]);
    TestBed.tick();
    expect(component.selectedEnquiry()?.name).toBe('Sam');
  });
  it('offers "Offer booking" only once bookings are on, with the site booking link', () => {
    const full = { ...lead, email: 'jane@example.co.nz', serviceInterest: 'Wash' } as Enquiry;
    component.bookingsEnabled.set(false);
    expect(component.bookingOfferHref(full)).toBe('');
    component.bookingsEnabled.set(true);
    const href = component.bookingOfferHref(full);
    expect(href.startsWith('mailto:jane@example.co.nz?')).toBe(true);
    const body = new URLSearchParams(href.split('?')[1]).get('body') || '';
    expect(body).toContain('/s/kowhai#book');
    expect(body).toContain('Kōwhai Coast');
  });
  it('asks the server whether bookings are on', async () => {
    expect(bookingsGet).toHaveBeenCalledWith('/api/bookings');
    await Promise.resolve(); await Promise.resolve();
    expect(component.bookingsEnabled()).toBe(false);
  });
});
