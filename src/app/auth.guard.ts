import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DataService } from './data.service';

export const authGuard: CanActivateFn = () => {
  const dataService = inject(DataService);
  const router = inject(Router);

  if (dataService.isSetupComplete()) {
    return true;
  }

  return router.parseUrl('/setup');
};

export const publicGuard: CanActivateFn = () => {
  const dataService = inject(DataService);
  const router = inject(Router);

  if (!dataService.isSetupComplete()) {
     return router.parseUrl('/setup');
  }
  return true;
};
