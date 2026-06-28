import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot, CanActivateFn } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { authGuard, setupGuard, publicGuard, appAdminGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { DataService } from './data.service';
import { SubscriptionService } from './subscription.service';

describe('route guards', () => {
  let loggedIn: boolean;
  let setupComplete: boolean;
  let token: string | null;
  let verifyFails: boolean;

  const authStub = {
    isLoading: () => false,
    isLoggedIn: () => loggedIn,
    currentUser: () => ({ uid: 'u1' }),
    getIdToken: async () => token,
  };
  const dataStub = {
    init: async () => { /* noop */ },
    isSetupComplete: () => setupComplete,
  };
  const subStub = { loadSubscription: () => { /* noop */ } };
  const routerStub = {
    parseUrl: (u: string) => ({ __url: u }) as unknown as UrlTree,
  };
  const httpStub = {
    get: () => (verifyFails ? throwError(() => new Error('403')) : of({ admin: true })),
  };

  beforeEach(() => {
    loggedIn = true;
    setupComplete = true;
    token = 'tok';
    verifyFails = false;
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: DataService, useValue: dataStub },
        { provide: SubscriptionService, useValue: subStub },
        { provide: Router, useValue: routerStub },
        { provide: HttpClient, useValue: httpStub },
      ],
    });
  });

  const run = (guard: CanActivateFn) =>
    TestBed.runInInjectionContext(() =>
      guard(null as unknown as ActivatedRouteSnapshot, null as unknown as RouterStateSnapshot),
    );
  const urlOf = (result: unknown) => (result as { __url?: string }).__url;

  describe('authGuard', () => {
    it('allows a logged-in, set-up user', async () => {
      expect(await run(authGuard)).toBe(true);
    });
    it('redirects to /login when not logged in', async () => {
      loggedIn = false;
      expect(urlOf(await run(authGuard))).toBe('/login');
    });
    it('redirects to /setup when setup is incomplete', async () => {
      setupComplete = false;
      expect(urlOf(await run(authGuard))).toBe('/setup');
    });
  });

  describe('setupGuard', () => {
    it('allows a logged-in user regardless of setup state', async () => {
      setupComplete = false;
      expect(await run(setupGuard)).toBe(true);
    });
    it('redirects to /login when not logged in', async () => {
      loggedIn = false;
      expect(urlOf(await run(setupGuard))).toBe('/login');
    });
  });

  describe('publicGuard', () => {
    it('allows a logged-in, set-up user', async () => {
      expect(await run(publicGuard)).toBe(true);
    });
    it('redirects to /setup when setup is incomplete', async () => {
      setupComplete = false;
      expect(urlOf(await run(publicGuard))).toBe('/setup');
    });
  });

  describe('appAdminGuard', () => {
    it('allows access when /api/admin/verify succeeds', async () => {
      expect(await run(appAdminGuard)).toBe(true);
    });
    it('redirects to / when there is no token', async () => {
      token = null;
      expect(urlOf(await run(appAdminGuard))).toBe('/');
    });
    it('redirects to / when verify fails', async () => {
      verifyFails = true;
      expect(urlOf(await run(appAdminGuard))).toBe('/');
    });
    it('redirects to /login when not logged in', async () => {
      loggedIn = false;
      expect(urlOf(await run(appAdminGuard))).toBe('/login');
    });
  });
});
