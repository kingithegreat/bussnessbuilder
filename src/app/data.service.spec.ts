import { TestBed } from '@angular/core/testing';
import { DataService } from './data.service';
import { FirestoreService } from './firestore.service';

describe('DataService', () => {
  let service: DataService;

  // DataService's save effect is a no-op until a uid is set (which only init()
  // does), so a stub FirestoreService is enough for these pure-logic tests.
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DataService,
        { provide: FirestoreService, useValue: { saveBusinessData() { /* noop */ }, loadBusinessData: async () => null } },
      ],
    });
    service = TestBed.inject(DataService);
  });

  const baseEnquiry = (urgency: string) => ({
    name: 'Jane',
    email: 'jane@example.com',
    phone: '555',
    serviceInterest: 'Deep Clean',
    message: 'hi',
    preferredDateTime: 'tomorrow',
    urgency,
  });

  describe('addEnquiry lead scoring', () => {
    it('scores High urgency as Hot', () => {
      service.addEnquiry(baseEnquiry('High'));
      expect(service.enquiries()[0].leadScore).toBe('Hot');
    });

    it('scores Medium urgency as Warm', () => {
      service.addEnquiry(baseEnquiry('Medium'));
      expect(service.enquiries()[0].leadScore).toBe('Warm');
    });

    it('scores Low/other urgency as Cold', () => {
      service.addEnquiry(baseEnquiry('Low'));
      expect(service.enquiries()[0].leadScore).toBe('Cold');
    });

    it('prepends new enquiries and sets defaults', () => {
      service.addEnquiry(baseEnquiry('High'));
      service.addEnquiry({ ...baseEnquiry('Low'), name: 'Bob' });
      const list = service.enquiries();
      expect(list[0].name).toBe('Bob'); // newest first
      expect(list[0].status).toBe('New');
      expect(list[0].nextAction).toBe('Review and reply');
      expect(list[0].id).toBeTruthy();
    });

    it('logs an activity for each enquiry', () => {
      const before = service.activities().length;
      service.addEnquiry(baseEnquiry('High'));
      const activity = service.activities()[0];
      expect(service.activities().length).toBe(before + 1);
      expect(activity.type).toBe('enquiry_received');
      expect(activity.description).toContain('Deep Clean');
    });
  });

  describe('export/import state', () => {
    it('round-trips state through export then import', () => {
      service.addEnquiry(baseEnquiry('High'));
      const json = service.exportState();
      expect(service.importState(json)).toBe(true);
      expect(service.enquiries()[0].leadScore).toBe('Hot');
    });

    it('rejects invalid JSON', () => {
      expect(service.importState('{not valid')).toBe(false);
    });

    it('rejects JSON without a profile', () => {
      expect(service.importState(JSON.stringify({ services: [] }))).toBe(false);
    });
  });
});
