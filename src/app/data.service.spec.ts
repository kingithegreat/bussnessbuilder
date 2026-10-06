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

describe('DataService server action save coordination', () => {
  let service: DataService;
  let stored: AppState;
  const db = {
    loadBusinessData: vi.fn(), saveBusinessData: vi.fn(),
    watchInbox: () => () => undefined,
    loadPages: async () => null, loadPaymentSettings: async () => null,
    loadTemplates: async () => null, loadNotificationPrefs: async () => null,
    loadRecommendations: async () => null, loadGrowthReport: async () => null,
  };
  const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  beforeEach(async () => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [DataService, { provide: FirestoreService, useValue: db }] });
    service = TestBed.inject(DataService);
    stored = JSON.parse(service.exportState());
    stored.profile.tagline = 'Original headline';
    db.loadBusinessData.mockResolvedValue(stored);
    db.saveBusinessData.mockResolvedValue(undefined);
    await service.init('owner-a');
    TestBed.tick();
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('flushes pending edits before proposal generation and cancels the captured debounce', async () => {
    service.updateProfile({ tagline: 'Manual headline', name: 'Saved business' });
    TestBed.tick();
    const task = vi.fn(async (headline: string) => {
      expect(db.saveBusinessData).toHaveBeenCalledTimes(1);
      expect(db.saveBusinessData.mock.calls[0][1].profile.name).toBe('Saved business');
      return headline;
    });
    expect(await service.runSiteAction('owner-a', task)).toBe('Manual headline');
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(2000);
    expect(task).toHaveBeenCalledWith('Manual headline');
    expect(db.saveBusinessData).toHaveBeenCalledTimes(1);
  });

  it('serializes in-flight autosaves before approval and never writes an old captured headline afterwards', async () => {
    let finishFirst!: () => void;
    let finishSecond!: () => void;
    db.saveBusinessData.mockImplementationOnce(() => new Promise<void>(resolve => { finishFirst = resolve; }));
    db.saveBusinessData.mockImplementationOnce(() => new Promise<void>(resolve => { finishSecond = resolve; }));
    service.updateProfile({ name: 'First edit' });
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(1600);
    service.updateProfile({ name: 'Second edit' });
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(1600);
    expect(db.saveBusinessData).toHaveBeenCalledTimes(1);
    const approve = vi.fn(async () => 'Approved headline');
    const action = service.runSiteAction('owner-a', approve, headline => headline, { mayChangeHeadline: true });
    await settle();
    expect(approve).not.toHaveBeenCalled();
    finishFirst();
    await settle();
    expect(db.saveBusinessData).toHaveBeenCalledTimes(2);
    expect(approve).not.toHaveBeenCalled();
    finishSecond();
    await action;
    expect(service.profile().name).toBe('Second edit');
    expect(service.profile().tagline).toBe('Approved headline');
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(2000);
    expect(db.saveBusinessData).toHaveBeenCalledTimes(2);
  });

  it('retries a failed queued write before an action instead of treating failed data as saved', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    db.saveBusinessData.mockRejectedValueOnce(new Error('offline'));
    service.updateProfile({ name: 'Unsaved business' });
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(1600);
    const task = vi.fn(async () => null);
    await service.runSiteAction('owner-a', task);
    expect(db.saveBusinessData).toHaveBeenCalledTimes(2);
    expect(db.saveBusinessData.mock.calls[1][1].profile.name).toBe('Unsaved business');
    expect(task).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });

  it('does not call the server when flushing owner edits fails', async () => {
    db.saveBusinessData.mockRejectedValueOnce(new Error('save denied'));
    service.updateProfile({ tagline: 'Local edit' });
    const task = vi.fn(async () => 'Generated');
    await expect(service.runSiteAction('owner-a', task)).rejects.toThrow('save denied');
    expect(task).not.toHaveBeenCalled();
    expect(service.profile().tagline).toBe('Local edit');
  });

  it('preserves unrelated edits made during approval and resumes their autosave with the committed headline', async () => {
    let finish!: (headline: string) => void;
    const task = vi.fn(() => new Promise<string>(resolve => { finish = resolve; }));
    const action = service.runSiteAction('owner-a', task, headline => headline, { mayChangeHeadline: true });
    await settle();
    service.updateProfile({ description: 'Edited while waiting' });
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(2000);
    expect(db.saveBusinessData).not.toHaveBeenCalled();
    finish('Approved headline');
    await action;
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(2000);
    expect(db.saveBusinessData.mock.calls[0][1].profile).toMatchObject({ tagline: 'Approved headline', description: 'Edited while waiting' });
  });

  it('reconciles the saved headline after a definite initial rejection before resuming local edits', async () => {
    const task = async () => {
      service.updateProfile({ description: 'Retained local edit' });
      db.loadBusinessData.mockResolvedValue({ ...stored, profile: { ...stored.profile, tagline: 'Already applied on server' } });
      throw new Error('confirmed conflict');
    };
    await expect(service.runSiteAction('owner-a', task, () => null, { mayChangeHeadline: true, isDefiniteRejection: () => true })).rejects.toThrow('confirmed conflict');
    expect(service.profile().tagline).toBe('Already applied on server');
    expect(service.profile().description).toBe('Retained local edit');
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(2000);
    expect(db.saveBusinessData.mock.calls[0][1].profile.tagline).toBe('Already applied on server');
  });

  it('holds autosave after a lost response even when history and an early saved-state read show the old headline', async () => {
    const options = { mayChangeHeadline: true, operationKey: 'action-1:approve' };
    await expect(service.runSiteAction('owner-a', async () => { throw new Error('response lost'); }, () => null, options)).rejects.toThrow('response lost');
    expect(db.loadBusinessData).toHaveBeenCalledTimes(1); // Only initialization; no racy recovery read.
    service.updateProfile({ description: 'Retained offline edit' });
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(3000);
    expect(db.saveBusinessData).not.toHaveBeenCalled();
    await service.runSiteAction('owner-a', async () => ['still prepared'], () => null, { readOnly: true });
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(3000);
    expect(db.saveBusinessData).not.toHaveBeenCalled();
    await expect(service.runSiteAction('owner-a', async () => null)).rejects.toThrow('Retry that same change');
    await service.runSiteAction('owner-a', async () => 'Committed remotely', headline => headline, options);
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(2000);
    expect(db.saveBusinessData.mock.calls[0][1].profile).toMatchObject({ tagline: 'Committed remotely', description: 'Retained offline edit' });
  });

  it('keeps the original uncertain request paused when a recovery retry is rejected before reaching its action', async () => {
    const options = { mayChangeHeadline: true, operationKey: 'action-1:undo', isDefiniteRejection: () => true };
    await expect(service.runSiteAction('owner-a', async () => { throw new Error('lost'); }, () => null, { ...options, isDefiniteRejection: () => false })).rejects.toThrow('lost');
    await expect(service.runSiteAction('owner-a', async () => { throw new Error('rate limited'); }, () => null, options)).rejects.toThrow('rate limited');
    service.updateProfile({ description: 'Keep this edit' });
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(3000);
    expect(db.saveBusinessData).not.toHaveBeenCalled();
    await expect(service.runSiteAction('owner-a', async () => 'wrong', headline => headline, { ...options, operationKey: 'action-2:approve' })).rejects.toThrow('Retry that same change');
    await service.runSiteAction('owner-a', async () => 'Original headline', headline => headline, options);
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(2000);
    expect(db.saveBusinessData.mock.calls[0][1].profile.description).toBe('Keep this edit');
  });

  it('retries a failed saved-headline reconciliation after a definite rejected mutation', async () => {
    db.loadBusinessData.mockRejectedValueOnce(new Error('read offline'));
    await expect(service.runSiteAction('owner-a', async () => { throw new Error('confirmed conflict'); }, () => null,
      { mayChangeHeadline: true, isDefiniteRejection: () => true })).rejects.toThrow('confirmed conflict');
    service.updateProfile({ description: 'Retained local edit' });
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(2000);
    expect(db.saveBusinessData).not.toHaveBeenCalled();
    db.loadBusinessData.mockResolvedValue({ ...stored, profile: { ...stored.profile, tagline: 'Server edit' } });
    await service.runSiteAction('owner-a', async () => null, () => null, { readOnly: true });
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(2000);
    expect(db.saveBusinessData.mock.calls[0][1].profile).toMatchObject({ tagline: 'Server edit', description: 'Retained local edit' });
  });

  it('ignores an action response belonging to a previous account', async () => {
    let finish!: (headline: string) => void;
    const oldAction = service.runSiteAction('owner-a', () => new Promise<string>(resolve => { finish = resolve; }), headline => headline);
    const rejection = expect(oldAction).rejects.toThrow('session changed');
    await settle();
    db.loadBusinessData.mockResolvedValue({ ...stored, profile: { ...stored.profile, name: 'Owner B', tagline: 'B headline' } });
    await service.init('owner-b');
    finish('Private A headline');
    await rejection;
    expect(service.profile()).toMatchObject({ name: 'Owner B', tagline: 'B headline' });
  });
});
