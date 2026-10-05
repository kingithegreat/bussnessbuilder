import { TestBed } from '@angular/core/testing';
import { DataService } from './data.service';
import { FirestoreService } from './firestore.service';
import { AppState, Activity, Enquiry } from './types';
import { vi } from 'vitest';

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

    it('exportAll bundles sub-doc sections alongside the business data', () => {
      const bundle = JSON.parse(service.exportAll());
      expect(bundle.businessData.profile).toBeDefined();
      expect(bundle).toHaveProperty('contentPages');
      expect(bundle).toHaveProperty('recommendations');
      expect(bundle).toHaveProperty('paymentSettings');
      expect(bundle).toHaveProperty('templates');
      expect(typeof bundle.exportedAt).toBe('string');
    });

    it('importState restores the profile from a full exportAll bundle', () => {
      service.addEnquiry(baseEnquiry('High'));
      const bundle = service.exportAll();
      expect(service.importState(bundle)).toBe(true);
      expect(service.enquiries()[0].leadScore).toBe('Hot');
    });
  });
});

describe('DataService account loading and live inbox', () => {
  let service: DataService;
  let stored: AppState;
  let receive: (data: { enquiries: Enquiry[]; activities: Activity[] }) => void;
  const stop = vi.fn();
  const db = {
    loadBusinessData: vi.fn(), saveBusinessData: vi.fn(async () => undefined),
    watchInbox: vi.fn((_uid: string, callback: typeof receive) => { receive = callback; return stop; }),
    loadPages: async () => null, loadPaymentSettings: async () => null,
    loadTemplates: async () => null, loadNotificationPrefs: async () => null,
    loadRecommendations: async () => null, loadGrowthReport: async () => null,
  };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [DataService, { provide: FirestoreService, useValue: db }] });
    service = TestBed.inject(DataService);
    stored = JSON.parse(service.exportState());
    stored.profile.name = 'Owner A';
    db.loadBusinessData.mockResolvedValue(stored);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('loads a new saved site with absent server-owned arrays safely', async () => {
    const document = { ...stored } as Partial<AppState>;
    delete document.enquiries;
    delete document.activities;
    db.loadBusinessData.mockResolvedValue(document);
    await service.init('owner-a');
    expect(service.enquiries()).toEqual([]);
    expect(service.activities()).toEqual([]);
    expect(service.profile().name).toBe('Owner A');
  });

  it('does not autosave while the first read is pending, and shares concurrent init', async () => {
    let resolve!: (value: AppState) => void;
    db.loadBusinessData.mockReturnValue(new Promise<AppState>(r => { resolve = r; }));
    const first = service.init('owner-a');
    const second = service.init('owner-a');
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(2000);
    expect(db.saveBusinessData).not.toHaveBeenCalled();
    expect(db.loadBusinessData).toHaveBeenCalledTimes(1);
    resolve(stored);
    await Promise.all([first, second]);
    expect(service.profile().name).toBe('Owner A');
  });

  it('keeps a failed read retryable and never treats it as an empty site', async () => {
    db.loadBusinessData.mockRejectedValueOnce(new Error('offline'));
    await expect(service.init('owner-a')).rejects.toThrow('offline');
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(2000);
    expect(db.saveBusinessData).not.toHaveBeenCalled();
    await service.init('owner-a');
    expect(service.profile().name).toBe('Owner A');
    expect(db.loadBusinessData).toHaveBeenCalledTimes(2);
  });

  it('receives enquiries without replacing unsaved site edits or causing a save loop', async () => {
    await service.init('owner-a');
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(2000);
    db.saveBusinessData.mockClear();
    receive({ enquiries: [{ id: 'lead-1', status: 'New' } as Enquiry], activities: [] });
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(2000);
    expect(service.enquiries()[0].id).toBe('lead-1');
    expect(db.saveBusinessData).not.toHaveBeenCalled();
    service.updateProfile({ name: 'Unsaved edit' });
    receive({ enquiries: [{ id: 'lead-2', status: 'New' } as Enquiry], activities: [] });
    expect(service.profile().name).toBe('Unsaved edit');
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(2000);
    expect(db.saveBusinessData).toHaveBeenCalledTimes(1);
  });

  it('ignores a previous account read that finishes after an account switch', async () => {
    let resolve!: (value: AppState) => void;
    db.loadBusinessData.mockReturnValueOnce(new Promise<AppState>(r => { resolve = r; }));
    const first = service.init('owner-a');
    db.loadBusinessData.mockResolvedValue({ ...stored, profile: { ...stored.profile, name: 'Owner B' } });
    await service.init('owner-b');
    resolve(stored);
    await first;
    expect(service.profile().name).toBe('Owner B');
    expect(db.watchInbox).toHaveBeenCalledTimes(1);
    expect(db.watchInbox.mock.calls[0][0]).toBe('owner-b');
  });

  it('stops listening and cancels a pending save before displaying a public site', async () => {
    await service.init('owner-a');
    const oldListener = receive;
    service.updateProfile({ name: 'Owner edit' });
    TestBed.tick();
    service.loadPublicSite('public-b', { profile: { ...stored.profile, name: 'Public B' } });
    oldListener({ enquiries: [{ id: 'private-lead' } as Enquiry], activities: [] });
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(2000);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(db.saveBusinessData).not.toHaveBeenCalled();
    expect(service.profile().name).toBe('Public B');
    expect(service.enquiries()).toEqual([]);
    await service.init('owner-a');
    expect(service.profile().name).toBe('Owner A');
  });

  it('tears down the listener on service destruction', async () => {
    await service.init('owner-a');
    TestBed.resetTestingModule();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('keeps the wizard handoff recoverable when its initial save fails', async () => {
    db.loadBusinessData.mockResolvedValue(null);
    db.saveBusinessData.mockRejectedValueOnce(new Error('offline'));
    localStorage.setItem('businessflow_state', JSON.stringify(stored));
    await expect(service.init('new-owner')).rejects.toThrow('offline');
    expect(localStorage.getItem('businessflow_state')).not.toBeNull();
    await service.init('new-owner');
    expect(service.profile().name).toBe('Owner A');
    expect(localStorage.getItem('businessflow_state')).toBeNull();
  });

  it('recovers from malformed browser drafts and retains the legacy local key', async () => {
    db.loadBusinessData.mockResolvedValue(null);
    localStorage.setItem('businessflow_state', '{broken');
    localStorage.setItem('businessflow_gemini_key', 'test-only-key');
    localStorage.setItem('bf_pending_publish', '1');
    await service.init('new-owner');
    expect(service.isSetupComplete()).toBe(false);
    expect(service.geminiApiKey()).toBe('test-only-key');
    expect(db.saveBusinessData).not.toHaveBeenCalled();
    expect(localStorage.getItem('businessflow_state')).toBeNull();
    expect(localStorage.getItem('bf_pending_publish')).toBe('1');
  });
});
