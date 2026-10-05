import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { vi } from 'vitest';
import { FIRESTORE_BUSINESS_DATA_SDK, FirestoreService } from './firestore.service';
import { AppState } from './types';

const firebase = {
  doc: vi.fn(() => 'main-document'),
  getDoc: vi.fn(), setDoc: vi.fn(), onSnapshot: vi.fn(),
};

describe('Firestore business data persistence', () => {
  let service: FirestoreService;
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [
      FirestoreService,
      { provide: Firestore, useValue: {} },
      { provide: FIRESTORE_BUSINESS_DATA_SDK, useValue: firebase },
    ] });
    service = TestBed.inject(FirestoreService);
  });
  it('represents a genuinely absent document as null', async () => {
    firebase.getDoc.mockResolvedValue({ exists: () => false });
    expect(await service.loadBusinessData('owner')).toBeNull();
  });
  it('supplies empty server-owned arrays on a newly created site', async () => {
    firebase.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ profile: { name: 'New owner' } }) });
    const state = await service.loadBusinessData('owner');
    expect(state?.enquiries).toEqual([]);
    expect(state?.activities).toEqual([]);
  });
  it('does not misreport a failed read as a missing site', async () => {
    firebase.getDoc.mockRejectedValue(new Error('permission-denied'));
    await expect(service.loadBusinessData('owner')).rejects.toThrow('permission-denied');
  });
  it('preserves server-captured leads when autosaving owner site edits', async () => {
    firebase.setDoc.mockResolvedValue(undefined);
    const state = { profile: { name: 'Edited owner' }, enquiries: [], activities: [] } as unknown as AppState;
    await service.saveBusinessData('owner', state);
    expect(firebase.setDoc).toHaveBeenCalledWith('main-document', { profile: { name: 'Edited owner' } }, { merge: true });
  });
  it('propagates a failed save so a valid wizard handoff is not cleared', async () => {
    firebase.setDoc.mockRejectedValueOnce(new Error('offline'));
    await expect(service.saveBusinessData('owner', { profile: { name: 'New owner' } } as AppState)).rejects.toThrow('offline');
  });
});
