import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Firestore, doc, getDoc, setDoc, increment } from '@angular/fire/firestore';
import { SiteAnalytics } from './types';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private platformId = inject(PLATFORM_ID);
  private firestore = inject(Firestore);

  private analytics = signal<SiteAnalytics>({ totalViews: 0, viewsByDate: {} });
  readonly data = this.analytics.asReadonly();

  async trackPageView(uid: string) {
    if (!isPlatformBrowser(this.platformId)) return;
    const today = new Date().toISOString().slice(0, 10);
    try {
      const ref = doc(this.firestore, 'analytics', uid);
      await setDoc(ref, {
        totalViews: increment(1),
        [`viewsByDate.${today}`]: increment(1),
      }, { merge: true });
    } catch (e) {
      console.error('Failed to track page view', e);
    }
  }

  async loadAnalytics(uid: string) {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const ref = doc(this.firestore, 'analytics', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        this.analytics.set({
          totalViews: data['totalViews'] || 0,
          viewsByDate: data['viewsByDate'] || {},
        });
      }
    } catch (e) {
      console.error('Failed to load analytics', e);
    }
  }

  viewsToday(): number {
    const today = new Date().toISOString().slice(0, 10);
    return this.analytics().viewsByDate[today] || 0;
  }

  viewsLast7Days(): number {
    const views = this.analytics().viewsByDate;
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      total += views[key] || 0;
    }
    return total;
  }

  viewsLast30Days(): number {
    const views = this.analytics().viewsByDate;
    let total = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      total += views[key] || 0;
    }
    return total;
  }

  dailyViewsChart(): { date: string; views: number }[] {
    const result: { date: string; views: number }[] = [];
    const viewsByDate = this.analytics().viewsByDate;
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, views: viewsByDate[key] || 0 });
    }
    return result;
  }
}
