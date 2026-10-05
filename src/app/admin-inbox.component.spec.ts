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
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let component: AdminInboxComponent;
  beforeEach(() => {
    enquiries.set([lead]);
    updateEnquiry.mockClear();
    params = new BehaviorSubject(convertToParamMap({ filter: 'new', lead: 'lead-1' }));
    TestBed.configureTestingModule({ providers: [
      { provide: ActivatedRoute, useValue: { queryParamMap: params } },
      { provide: DataService, useValue: { enquiries, updateEnquiry, customization: signal({}) } },
      { provide: AiService, useValue: {} },
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
});
