import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import {
  provideClientHydration,
  withEventReplay,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { environment } from '../environments/environment';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' })),
    provideHttpClient(withFetch()),
    // Hydrate the server-rendered DOM instead of destroying and re-rendering it
    // (SSR pattern landed with home + content-page SSR; see app.routes.server.ts).
    // Event replay captures user interactions that happen before hydration completes.
    // Transfer-cache reuses HTTP GETs made during SSR on the client instead of
    // re-firing them right after hydration — without this, every public content
    // page fetches /api/site/:uid/pages/:slug twice (once on the server, once
    // again on the client) for identical data.
    provideClientHydration(withEventReplay(), withHttpTransferCacheOptions({})),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
  ],
};
