import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { SubscriptionService } from './subscription.service';
import { SubscriptionData } from './types';

describe('SubscriptionService tier gating', () => {
  let service: SubscriptionService;

  // The service injects Auth/Firestore but only touches them on async network
  // calls, so empty stubs are enough to construct it for pure-logic tests.
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: {} },
        { provide: Firestore, useValue: {} },
      ],
    });
    service = TestBed.inject(SubscriptionService);
  });

  const setTier = (tier: SubscriptionData['tier']) =>
    (service as unknown as { sub: { set(v: SubscriptionData): void } }).sub.set({
      tier,
      status: 'active',
    });

  it('defaults to the free tier', () => {
    expect(service.tier()).toBe('free');
    expect(service.isPro()).toBe(false);
    expect(service.isBusiness()).toBe(false);
  });

  describe('free tier', () => {
    beforeEach(() => setTier('free'));

    it('caps services at 3', () => {
      expect(service.canAddService(2)).toBe(true);
      expect(service.canAddService(3)).toBe(false);
      expect(service.canAddService(10)).toBe(false);
    });

    it('caps enquiries at 10', () => {
      expect(service.canReceiveEnquiry(9)).toBe(true);
      expect(service.canReceiveEnquiry(10)).toBe(false);
    });

    it('blocks AI and export/import', () => {
      expect(service.canUseAi()).toBe(false);
      expect(service.canExport()).toBe(false);
    });
  });

  describe('pro tier', () => {
    beforeEach(() => setTier('pro'));

    it('treats pro as a paid tier', () => {
      expect(service.isPro()).toBe(true);
      expect(service.isBusiness()).toBe(false);
    });

    it('allows unlimited services and enquiries', () => {
      expect(service.canAddService(9999)).toBe(true);
      expect(service.canReceiveEnquiry(9999)).toBe(true);
    });

    it('unlocks AI and export/import', () => {
      expect(service.canUseAi()).toBe(true);
      expect(service.canExport()).toBe(true);
    });
  });

  describe('business tier', () => {
    beforeEach(() => setTier('business'));

    it('is both pro and business', () => {
      expect(service.isPro()).toBe(true);
      expect(service.isBusiness()).toBe(true);
    });

    it('keeps everything unlocked', () => {
      expect(service.canAddService(9999)).toBe(true);
      expect(service.canReceiveEnquiry(9999)).toBe(true);
      expect(service.canUseAi()).toBe(true);
      expect(service.canExport()).toBe(true);
    });
  });

  describe('display helpers', () => {
    it('reports the correct label and colour per tier', () => {
      setTier('free');
      expect(service.tierLabel()).toBe('Free');
      expect(service.tierColor()).toBe('gray');

      setTier('pro');
      expect(service.tierLabel()).toBe('Pro');
      expect(service.tierColor()).toBe('blue');

      setTier('business');
      expect(service.tierLabel()).toBe('Business');
      expect(service.tierColor()).toBe('purple');
    });
  });

  describe('active status', () => {
    it('treats active and trialing as active', () => {
      const sub = (service as unknown as { sub: { set(v: SubscriptionData): void } }).sub;
      sub.set({ tier: 'pro', status: 'active' });
      expect(service.isActive()).toBe(true);
      sub.set({ tier: 'pro', status: 'trialing' });
      expect(service.isActive()).toBe(true);
      sub.set({ tier: 'pro', status: 'canceled' });
      expect(service.isActive()).toBe(false);
    });
  });
});
