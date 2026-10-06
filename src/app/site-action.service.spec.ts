import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { AuthService, AppUser } from './auth.service';
import { DataService } from './data.service';
import { SiteAction } from './site-action';
import { SiteActionService } from './site-action.service';

describe('SiteActionService', () => {
  let service: SiteActionService;
  let http: HttpTestingController;
  let currentUser: ReturnType<typeof signal<AppUser | null>>;
  let committedHeadline: string | null;
  const user = (uid: string): AppUser => ({ uid, email: `${uid}@example.com`, displayName: uid, photoURL: '' });
  const proposal = (overrides: Partial<SiteAction> = {}): SiteAction => ({
    id: '3fb809d7-6ad7-4b57-bc3c-409a38bdfec4', type: 'homepage.headline', status: 'prepared',
    before: { tagline: 'Saved headline' }, after: { tagline: 'Better local service' },
    request: 'Improve my homepage headline', reason: 'Specific benefit', source: 'template',
    actorUid: 'owner-a', createdAt: '2026-10-07T00:00:00.000Z', ...overrides,
  });
  const token = vi.fn();
  const coordinate = vi.fn(async (...args: Parameters<DataService['runSiteAction']>) => {
    const [, task, headlineOf] = args;
    const response = await task('Saved headline');
    if (headlineOf) committedHeadline = headlineOf(response);
    return response;
  });
  const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = signal<AppUser | null>(user('owner-a'));
    token.mockResolvedValue('test-token');
    committedHeadline = null;
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), SiteActionService,
      { provide: AuthService, useValue: { currentUser, getIdToken: token } },
      { provide: DataService, useValue: { runSiteAction: coordinate } },
    ] });
    service = TestBed.inject(SiteActionService);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
  });
  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('sends a saved-headline guarded, authenticated proposal without applying it', async () => {
    const pending = service.prepare(' Improve my homepage headline ');
    await settle();
    const req = http.expectOne('/api/actions/headline/prepare');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(req.request.body).toMatchObject({ uid: 'owner-a', request: 'Improve my homepage headline', expectedHeadline: 'Saved headline' });
    expect(req.request.body.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(service.busy()).toBe(true);
    const action = proposal({ id: req.request.body.id });
    req.flush({ action });
    expect(await pending).toEqual(action);
    expect(service.draft()).toEqual(action);
    expect(service.history()).toEqual([action]);
    expect(committedHeadline).toBeNull();
    expect(service.busy()).toBe(false);
  });

  it('retains the original preparation id and expected headline after a lost response', async () => {
    const first = service.prepare('Improve my homepage headline');
    await settle();
    const lost = http.expectOne('/api/actions/headline/prepare');
    const original = { ...lost.request.body };
    lost.error(new ProgressEvent('error'));
    expect(await first).toBeNull();
    expect(service.errorCode()).toBe('network');
    const retry = service.prepare('Improve my homepage headline');
    await settle();
    const req = http.expectOne('/api/actions/headline/prepare');
    expect(req.request.body).toEqual(original);
    req.flush({ action: proposal({ id: original.id }) });
    await retry;
    expect(service.error()).toBeNull();
  });

  it('uses a new preparation after an explicit stale-headline rejection', async () => {
    const first = service.prepare('Improve my homepage headline');
    await settle();
    const stale = http.expectOne('/api/actions/headline/prepare');
    const originalId = stale.request.body.id;
    stale.flush({ error: 'Saved headline changed', code: 'headline_conflict' }, { status: 409, statusText: 'Conflict' });
    await first;
    const retry = service.prepare('Improve my homepage headline');
    await settle();
    const req = http.expectOne('/api/actions/headline/prepare');
    expect(req.request.body.id).not.toBe(originalId);
    req.flush({ action: proposal({ id: req.request.body.id }) });
    await retry;
  });

  it('preserves the preparation id while the server confirms generation is still pending', async () => {
    const pending = service.prepare('Improve my homepage headline');
    await settle();
    const req = http.expectOne('/api/actions/headline/prepare');
    const attempt = { ...req.request.body };
    req.flush({ code: 'action_preparing', error: 'Generation pending' }, { status: 409, statusText: 'Conflict' });
    await pending;
    expect(service.error()).toContain('still being prepared');
    const retry = service.prepare('Improve my homepage headline');
    await settle();
    const again = http.expectOne('/api/actions/headline/prepare');
    expect(again.request.body).toEqual(attempt);
    again.flush({ action: proposal({ id: attempt.id }) });
    await retry;
  });

  it('recovers persisted prepared and applied history, and allows reopening a prepared item', async () => {
    const prepared = proposal();
    const applied = proposal({ id: '685fb6e5-bf25-49d5-9fc3-fce08db00a65', status: 'applied', appliedAt: '2026-10-07T01:00:00.000Z' });
    const pending = service.loadHistory();
    await settle();
    const req = http.expectOne('/api/actions?uid=owner-a');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush({ actions: [applied, prepared] });
    await pending;
    expect(service.history()).toEqual([applied, prepared]);
    expect(service.draft()).toEqual(prepared);
    service.clearDraft();
    expect(service.draft()).toBeNull();
    service.review(prepared);
    expect(service.draft()).toEqual(prepared);
    service.review(applied);
    expect(service.draft()).toEqual(prepared);
  });

  it('approves and undoes through coordination while reflecting server action status', async () => {
    const prepared = proposal();
    service.review(prepared);
    const approve = service.approve(prepared.id);
    await settle();
    const req = http.expectOne(`/api/actions/${prepared.id}/approve`);
    expect(req.request.body).toEqual({ uid: 'owner-a' });
    const applied = { ...prepared, status: 'applied' as const, appliedAt: '2026-10-07T01:00:00.000Z' };
    req.flush({ action: applied, headline: applied.after.tagline });
    expect(await approve).toBe(true);
    expect(committedHeadline).toBe('Better local service');
    expect(service.draft()).toBeNull();
    expect(coordinate.mock.calls[0][3]).toMatchObject({ mayChangeHeadline: true, operationKey: `${prepared.id}:approve` });
    const undo = service.undo(prepared.id);
    await settle();
    const undone = { ...applied, status: 'undone' as const, undoneAt: '2026-10-07T02:00:00.000Z' };
    http.expectOne(`/api/actions/${prepared.id}/undo`).flush({ action: undone, headline: undone.before.tagline });
    expect(await undo).toBe(true);
    expect(committedHeadline).toBe('Saved headline');
    expect(service.history()).toEqual([undone]);
  });

  it('keeps a proposal visible and gives useful guidance when approval conflicts', async () => {
    const action = proposal();
    service.review(action);
    const pending = service.approve(action.id);
    await settle();
    http.expectOne(`/api/actions/${action.id}/approve`).flush({ error: 'Headline changed', code: 'headline_conflict' }, { status: 409, statusText: 'Conflict' });
    expect(await pending).toBe(false);
    expect(service.draft()).toEqual(action);
    expect(service.error()).toContain('request a new proposal');
    expect(service.errorCode()).toBe('headline_conflict');
    expect(service.recoveryPending()).toBe(false);
  });

  it('retains the exact unconfirmed operation across history reload and failed retry until success', async () => {
    const action = proposal();
    service.review(action);
    const pending = service.approve(action.id);
    await settle();
    http.expectOne(`/api/actions/${action.id}/approve`).error(new ProgressEvent('error'));
    expect(await pending).toBe(false);
    expect(service.recoveryPending()).toBe(true);
    expect(service.error()).toContain('Retry unconfirmed change');
    const history = service.loadHistory();
    await settle();
    http.expectOne('/api/actions?uid=owner-a').flush({ actions: [] });
    await history;
    expect(service.recoveryPending()).toBe(true);
    expect(coordinate.mock.calls[1][3]).toEqual({ readOnly: true });
    const failedRetry = service.retryUnconfirmedChange();
    await settle();
    http.expectOne(`/api/actions/${action.id}/approve`).flush({ error: 'Too many requests', code: 'rate_limited' }, { status: 429, statusText: 'Too many requests' });
    expect(await failedRetry).toBe(false);
    expect(service.recoveryPending()).toBe(true);
    const retry = service.retryUnconfirmedChange();
    await settle();
    const confirmed = { ...action, status: 'applied' as const };
    http.expectOne(`/api/actions/${action.id}/approve`).flush({ action: confirmed, headline: action.after.tagline });
    expect(await retry).toBe(true);
    expect(service.recoveryPending()).toBe(false);
    expect(service.history()).toEqual([confirmed]);
  });

  it('explains a template proposal that matches the existing headline without promising regeneration changes it', async () => {
    const pending = service.prepare('Improve my homepage headline');
    await settle();
    http.expectOne('/api/actions/headline/prepare').flush({ error: 'Same headline', code: 'unchanged_headline' }, { status: 422, statusText: 'Unprocessable content' });
    expect(await pending).toBeNull();
    expect(service.error()).toContain('matches your current headline');
    expect(service.error()).toContain('homepage editor');
  });

  it('does not issue duplicate requests while an operation is pending', async () => {
    const pending = service.prepare('Improve my homepage headline');
    await settle();
    expect(await service.prepare('Improve my homepage headline')).toBeNull();
    http.expectOne('/api/actions/headline/prepare').flush({ action: proposal() });
    await pending;
    expect(coordinate).toHaveBeenCalledTimes(1);
  });

  it('clears prior account state and ignores its late response', async () => {
    service.review(proposal());
    const pending = service.prepare('Improve my homepage headline');
    await settle();
    const old = http.expectOne('/api/actions/headline/prepare');
    currentUser.set(user('owner-b'));
    TestBed.tick();
    expect(service.draft()).toBeNull();
    expect(service.history()).toEqual([]);
    expect(service.busy()).toBe(false);
    old.flush({ action: proposal() });
    expect(await pending).toBeNull();
    expect(service.draft()).toBeNull();
    expect(service.error()).toBeNull();
  });

  it('never sends a signed-out operation or an empty request', async () => {
    expect(await service.prepare('  ')).toBeNull();
    expect(service.errorCode()).toBe('invalid_request');
    currentUser.set(null);
    TestBed.tick();
    expect(await service.approve(proposal().id)).toBe(false);
    expect(service.errorCode()).toBe('unauthenticated');
    expect(token).not.toHaveBeenCalled();
    expect(coordinate).not.toHaveBeenCalled();
  });
});
