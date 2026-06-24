import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { SubscriptionTier, SubscriptionData } from './types';

const TIER_LIMITS = {
  free:     { services: 3,  enquiries: 10, ai: false, exportImport: false },
  pro:      { services: -1, enquiries: -1, ai: true,  exportImport: true  },
  business: { services: -1, enquiries: -1, ai: true,  exportImport: true  },
} as const;

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private platformId = inject(PLATFORM_ID);
  private firestore = inject(Firestore);

  private sub = signal<SubscriptionData>({
    tier: 'free',
    status: 'active',
  });

  readonly subscription = this.sub.asReadonly();
  readonly tier = computed<SubscriptionTier>(() => this.sub().tier);
  readonly isActive = computed(() => this.sub().status === 'active' || this.sub().status === 'trialing');
  readonly isPro = computed(() => this.tier() === 'pro' || this.tier() === 'business');
  readonly isBusiness = computed(() => this.tier() === 'business');

  limits(feature: keyof typeof TIER_LIMITS['free']) {
    return TIER_LIMITS[this.tier()][feature];
  }

  canAddService(currentCount: number): boolean {
    const limit = TIER_LIMITS[this.tier()].services;
    return limit === -1 || currentCount < limit;
  }

  canReceiveEnquiry(currentCount: number): boolean {
    const limit = TIER_LIMITS[this.tier()].enquiries;
    return limit === -1 || currentCount < limit;
  }

  canUseAi(): boolean {
    return TIER_LIMITS[this.tier()].ai;
  }

  canExport(): boolean {
    return TIER_LIMITS[this.tier()].exportImport;
  }

  tierLabel(): string {
    return this.tier() === 'free' ? 'Free' : this.tier() === 'pro' ? 'Pro' : 'Business';
  }

  tierColor(): string {
    return this.tier() === 'free' ? 'gray' : this.tier() === 'pro' ? 'blue' : 'purple';
  }

  async loadSubscription(uid: string) {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const ref = doc(this.firestore, 'subscriptions', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        this.sub.set(snap.data() as SubscriptionData);
      }
    } catch (e) {
      console.error('Failed to load subscription', e);
    }
  }

  async createCheckoutSession(uid: string, tier: 'pro' | 'business', discountCode?: string): Promise<string | null> {
    try {
      const resp = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, tier, discountCode }),
      });
      const data = await resp.json();
      return data.url || null;
    } catch {
      return null;
    }
  }

  async openCustomerPortal(uid: string): Promise<string | null> {
    try {
      const resp = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });
      const data = await resp.json();
      return data.url || null;
    } catch {
      return null;
    }
  }
}
