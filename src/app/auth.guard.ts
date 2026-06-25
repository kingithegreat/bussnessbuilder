import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { DataService } from './data.service';
import { SubscriptionService } from './subscription.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const dataService = inject(DataService);
  const subService = inject(SubscriptionService);
  const router = inject(Router);

  if (authService.isLoading()) {
    await new Promise<void>(resolve => {
      const check = setInterval(() => {
        if (!authService.isLoading()) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    });
  }

  if (!authService.isLoggedIn()) {
    return router.parseUrl('/login');
  }

  const uid = authService.currentUser()!.uid;
  await dataService.init(uid);
  subService.loadSubscription(uid);

  if (!dataService.isSetupComplete()) {
    return router.parseUrl('/setup');
  }

  return true;
};

export const setupGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const dataService = inject(DataService);
  const router = inject(Router);

  if (authService.isLoading()) {
    await new Promise<void>(resolve => {
      const check = setInterval(() => {
        if (!authService.isLoading()) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    });
  }

  if (!authService.isLoggedIn()) {
    return router.parseUrl('/login');
  }

  const uid = authService.currentUser()!.uid;
  await dataService.init(uid);
  return true;
};

export const publicGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const dataService = inject(DataService);
  const router = inject(Router);

  if (authService.isLoading()) {
    await new Promise<void>(resolve => {
      const check = setInterval(() => {
        if (!authService.isLoading()) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    });
  }

  if (!authService.isLoggedIn()) {
    return router.parseUrl('/login');
  }

  const uid = authService.currentUser()!.uid;
  await dataService.init(uid);

  if (!dataService.isSetupComplete()) {
    return router.parseUrl('/setup');
  }
  return true;
};
