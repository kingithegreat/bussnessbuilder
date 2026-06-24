import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
} from '@angular/fire/firestore';
import { AppState, ContentPage, NotificationPreferences, PaymentSettings } from './types';

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

  async loadPages(uid: string): Promise<ContentPage[] | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const ref = doc(this.firestore, 'users', uid, 'businessData', 'pages');
      const snap = await getDoc(ref);
      return snap.exists() ? (snap.data()['items'] as ContentPage[]) : null;
    } catch (e) {
      console.error('Failed to load pages', e);
      return null;
    }
  }

  async savePages(uid: string, pages: ContentPage[]): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const ref = doc(this.firestore, 'users', uid, 'businessData', 'pages');
      await setDoc(ref, { items: JSON.parse(JSON.stringify(pages)) });
    } catch (e) {
      console.error('Failed to save pages', e);
    }
  }

  async loadNotificationPrefs(uid: string): Promise<NotificationPreferences | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const ref = doc(this.firestore, 'users', uid, 'businessData', 'notifications');
      const snap = await getDoc(ref);
      return snap.exists() ? (snap.data() as NotificationPreferences) : null;
    } catch (e) {
      console.error('Failed to load notification prefs', e);
      return null;
    }
  }

  async saveNotificationPrefs(uid: string, prefs: NotificationPreferences): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const ref = doc(this.firestore, 'users', uid, 'businessData', 'notifications');
      await setDoc(ref, JSON.parse(JSON.stringify(prefs)));
    } catch (e) {
      console.error('Failed to save notification prefs', e);
    }
  }

  async loadPaymentSettings(uid: string): Promise<PaymentSettings | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const ref = doc(this.firestore, 'users', uid, 'businessData', 'payments');
      const snap = await getDoc(ref);
      return snap.exists() ? (snap.data() as PaymentSettings) : null;
    } catch (e) {
      console.error('Failed to load payment settings', e);
      return null;
    }
  }

  async savePaymentSettings(uid: string, settings: PaymentSettings): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const ref = doc(this.firestore, 'users', uid, 'businessData', 'payments');
      await setDoc(ref, JSON.parse(JSON.stringify(settings)));
    } catch (e) {
      console.error('Failed to save payment settings', e);
    }
  }
}
