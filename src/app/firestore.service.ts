import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  runTransaction,
} from '@angular/fire/firestore';
import { AppState, ContentPage, GrowthReport, NotificationPreferences, PaymentSettings, SavedRecommendation, SiteTemplate } from './types';

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

  /**
   * Persist the owner-edited part of the site.
   *
   * `enquiries` and `activities` are deliberately EXCLUDED and the write is a
   * merge. Both are written server-side by POST /api/site/:uid/enquiry while
   * the owner may have the admin open, and DataService loads its state exactly
   * once per session (`initialized`). A full-document setDoc of the client's
   * snapshot therefore replaced the server's newly captured lead with a stale
   * array — an owner changing a colour 1.5s after an enquiry arrived destroyed
   * it, silently, with no error and no trace. Capturing enquiries is the one
   * thing this product exists to do.
   *
   * Owner-side changes to an enquiry go through `updateEnquiryFields`, which is
   * transactional.
   */
  async saveBusinessData(uid: string, state: AppState): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const ref = doc(this.firestore, 'users', uid, 'businessData', 'main');
      const payload = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
      delete payload['enquiries'];
      delete payload['activities'];
      await setDoc(ref, payload, { merge: true });
    } catch (e) {
      console.error('Failed to save business data', e);
    }
  }

  /**
   * Apply owner edits to a single enquiry (status, notes, draft reply) without
   * clobbering enquiries that arrived since the page loaded.
   *
   * Runs in a transaction and applies the changed FIELDS to whatever the server
   * currently holds, rather than writing the client's whole array back — so a
   * lead captured mid-edit survives.
   */
  async updateEnquiryFields(
    uid: string,
    enquiryId: string,
    updates: Record<string, unknown>,
    newActivity?: Record<string, unknown>,
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const ref = doc(this.firestore, 'users', uid, 'businessData', 'main');
      await runTransaction(this.firestore, async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists()) return;
        const data = snap.data() as Record<string, unknown>;
        const enquiries = Array.isArray(data['enquiries']) ? [...data['enquiries'] as Record<string, unknown>[]] : [];
        const i = enquiries.findIndex(e => e && e['id'] === enquiryId);
        // Gone from the server (deleted elsewhere) — do not resurrect it.
        if (i === -1) return;
        enquiries[i] = { ...enquiries[i], ...updates };
        const payload: Record<string, unknown> = { enquiries };
        if (newActivity) {
          const activities = Array.isArray(data['activities']) ? data['activities'] as Record<string, unknown>[] : [];
          payload['activities'] = [newActivity, ...activities].slice(0, 500);
        }
        tx.set(ref, payload, { merge: true });
      });
    } catch (e) {
      console.error('Failed to update enquiry', e);
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

  async loadRecommendations(uid: string): Promise<SavedRecommendation[] | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const ref = doc(this.firestore, 'users', uid, 'businessData', 'recommendations');
      const snap = await getDoc(ref);
      return snap.exists() ? (snap.data()['items'] as SavedRecommendation[]) : null;
    } catch (e) {
      console.error('Failed to load recommendations', e);
      return null;
    }
  }

  async saveRecommendations(uid: string, recommendations: SavedRecommendation[]): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const ref = doc(this.firestore, 'users', uid, 'businessData', 'recommendations');
      await setDoc(ref, { items: JSON.parse(JSON.stringify(recommendations)) });
    } catch (e) {
      console.error('Failed to save recommendations', e);
    }
  }

  async loadGrowthReport(uid: string): Promise<GrowthReport | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const ref = doc(this.firestore, 'users', uid, 'businessData', 'growthReport');
      const snap = await getDoc(ref);
      return snap.exists() ? (snap.data()['report'] as GrowthReport) : null;
    } catch (e) {
      console.error('Failed to load growth report', e);
      return null;
    }
  }

  async saveGrowthReport(uid: string, report: GrowthReport): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const ref = doc(this.firestore, 'users', uid, 'businessData', 'growthReport');
      await setDoc(ref, { report: JSON.parse(JSON.stringify(report)) });
    } catch (e) {
      console.error('Failed to save growth report', e);
    }
  }

  async loadTemplates(uid: string): Promise<{ templates: SiteTemplate[], activeTemplateId: string } | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const ref = doc(this.firestore, 'users', uid, 'businessData', 'templates');
      const snap = await getDoc(ref);
      return snap.exists() ? (snap.data() as { templates: SiteTemplate[], activeTemplateId: string }) : null;
    } catch (e) {
      console.error('Failed to load templates', e);
      return null;
    }
  }

  async saveTemplates(uid: string, data: { templates: SiteTemplate[], activeTemplateId: string }): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const ref = doc(this.firestore, 'users', uid, 'businessData', 'templates');
      await setDoc(ref, JSON.parse(JSON.stringify(data)));
    } catch (e) {
      console.error('Failed to save templates', e);
    }
  }
}
