import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AdminQuotesComponent } from './admin-quotes.component';
import { DataService } from './data.service';
import { OwnerApiService } from './owner-api.service';
import { Enquiry } from './types';

describe('Quotes: start from an enquiry (F8)', () => {
  const lead = { id: 'lead-1', name: 'Jane Smith', email: 'jane@example.co.nz', serviceInterest: 'Full interior detail', status: 'New' } as Enquiry;
  const enquiries = signal<Enquiry[]>([]);
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let component: AdminQuotesComponent;

  function create(query: Record<string, string>) {
    params = new BehaviorSubject(convertToParamMap(query));
    TestBed.configureTestingModule({ providers: [
      { provide: ActivatedRoute, useValue: { queryParamMap: params } },
      { provide: DataService, useValue: { enquiries, profile: signal({ currency: 'NZD', pricesIncludeGst: true }) } },
      { provide: OwnerApiService, useValue: { get: async () => ({ quotes: [] }), send: async () => ({}) } },
    ] });
    component = TestBed.runInInjectionContext(() => new AdminQuotesComponent());
    TestBed.tick();
  }

  beforeEach(() => enquiries.set([lead]));

  it('opens a new quote with the customer and service carried across, price left blank', () => {
    create({ lead: 'lead-1' });
    const d = component.draft();
    expect(d?.kind).toBe('quote');
    expect(d?.customerName).toBe('Jane Smith');
    expect(d?.customerEmail).toBe('jane@example.co.nz');
    expect(d?.lines).toEqual([{ description: 'Full interior detail', quantity: 1, unitPrice: 0 }]);
    expect(d?.gstMode).toBe('inclusive');
    expect(component.message()).toContain('Jane Smith');
  });

  it('waits for the enquiry to load, then prefills once', () => {
    enquiries.set([]);
    create({ lead: 'lead-1' });
    expect(component.draft()).toBeNull();
    enquiries.set([lead]);
    TestBed.tick();
    expect(component.draft()?.customerName).toBe('Jane Smith');
    component.draft.update(d => d ? { ...d, customerName: 'Edited' } : d);
    enquiries.set([lead, { ...lead, id: 'other' }]);
    TestBed.tick();
    expect(component.draft()?.customerName).toBe('Edited');
  });

  it('does nothing without a lead or for an unknown lead', () => {
    create({});
    expect(component.draft()).toBeNull();
    params.next(convertToParamMap({ lead: 'missing' }));
    TestBed.tick();
    expect(component.draft()).toBeNull();
  });
});
