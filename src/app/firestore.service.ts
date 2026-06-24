import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
} from '@angular/fire/firestore';
import { AppState } from './types';

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private firestore = inject(Firestore);
  private platformId = inject(PLATFORM_ID);

  async loadBusinessData(uid: string): Promise<AppState | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const ref = doc(this.firestore, 'users', uid, 'businessData', 'main');
      const snap = await getDoc(ref);
      return snap.exists() ? (snap.data() as AppState) : null;
    } catch (e) {
      console.error('Failed to load business data', e);
      return null;
    }
  }

  async saveBusinessData(uid: string, state: AppState): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const ref = doc(this.firestore, 'users', uid, 'businessData', 'main');
      await setDoc(ref, JSON.parse(JSON.stringify(state)));
    } catch (e) {
      console.error('Failed to save business data', e);
    }
  }
}
