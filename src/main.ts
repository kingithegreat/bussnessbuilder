import {bootstrapApplication} from '@angular/platform-browser';
import {ErrorHandler, mergeApplicationConfig} from '@angular/core';
import {App} from './app/app';
import {appConfig} from './app/app.config';
import {environment} from './environments/environment';

// Browser-only error monitoring. This file is the browser bootstrap entry
// (server uses main.server.ts). Sentry is loaded lazily and only when a DSN is
// configured, so the default bundle carries no Sentry weight.
async function bootstrap() {
  let config = appConfig;
  if (environment.sentryDsn) {
    const Sentry = await import('@sentry/angular');
    Sentry.init({
      dsn: environment.sentryDsn,
      environment: environment.production ? 'production' : 'development',
      tracesSampleRate: 0,
    });
    config = mergeApplicationConfig(appConfig, {
      providers: [{ provide: ErrorHandler, useValue: Sentry.createErrorHandler() }],
    });
  }
  await bootstrapApplication(App, config);
}

bootstrap().catch((err) => console.error(err));
