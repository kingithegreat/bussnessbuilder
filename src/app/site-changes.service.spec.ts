import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { vi } from 'vitest';
import { SiteChangesService } from './site-changes.service';
import { OwnerApiService } from './owner-api.service';
import { AuthService } from './auth.service';
import { DataService } from './data.service';
import { SiteChange, SiteChangeField } from './site-change';
const fields: SiteChangeField[] = [{ target: 'profile', field: 'description', before: 'Old', after: 'New' }];
const proposal = (id: string): SiteChange => ({ id, type: 'profile.copy', status: 'prepared', fields, actorUid: 'owner', request: 'Refresh About', createdAt: '2026-10-18T01:00:00Z' });
describe('Saved website change recovery', () => {
  const currentUser = signal<{ uid: string } | null>({ uid: 'owner' });
  const send = vi.fn(), coordinate = vi.fn();
  let service: SiteChangesService;
  beforeEach(() => {
    vi.resetAllMocks(); currentUser.set({ uid: 'owner' });
    coordinate.mockImplementation(async (_uid, task) => task(''));
    TestBed.configureTestingModule({ providers: [SiteChangesService,
      { provide: AuthService, useValue: { currentUser } },
      { provide: OwnerApiService, useValue: { uid: () => currentUser()?.uid || '', send } },
      { provide: DataService, useValue: { runSiteAction: coordinate } },
    ] });
    service = TestBed.inject(SiteChangesService); TestBed.tick();
  });
  it('reuses the complete preparation after a lost response', async () => {
    send.mockRejectedValueOnce(new HttpErrorResponse({ status: 0 }));
    expect(await service.prepare('Refresh About', fields)).toBe(false);
    const first = send.mock.calls[0][2];
    send.mockResolvedValueOnce({ action: proposal(first.id) });
    expect(await service.prepare('Refresh About', fields)).toBe(true);
    expect(send.mock.calls[1][2]).toEqual(first);
    expect(service.draft()?.status).toBe('prepared');
  });
  it('keeps an uncertain mutation retryable with its original operation', async () => {
    const action = proposal('b4859cf8-4671-429b-a958-ec10648a1223');
    send.mockRejectedValueOnce(new HttpErrorResponse({ status: 0 }));
    expect(await service.mutate(action, 'approve')).toBe(false);
    expect(service.pending()?.operation).toBe('approve');
    send.mockResolvedValueOnce({ action: { ...action, status: 'applied' }, fields });
    expect(await service.retry()).toBe(true);
    expect(send.mock.calls[1][1]).toBe(`/api/changes/${action.id}/approve`);
    expect(service.pending()).toBeNull();
    expect(coordinate.mock.calls[1][3].siteFieldsOf({ fields })).toEqual(fields);
  });
  it('ignores previous-account results and clears history on account change', async () => {
    let resolve!: (r: unknown) => void;
    send.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const result = service.prepare('Refresh About', fields);
    currentUser.set({ uid: 'other' }); TestBed.tick();
    resolve({ action: proposal('b4859cf8-4671-429b-a958-ec10648a1223') });
    expect(await result).toBe(false); expect(service.draft()).toBeNull(); expect(service.history()).toEqual([]);
  });
});
