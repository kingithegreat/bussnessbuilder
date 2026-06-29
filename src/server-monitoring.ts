/**
 * Server-side error monitoring (Sentry).
 *
 * Opt-in: does nothing unless SENTRY_DSN is set, so local/dev and any
 * deployment without the env var behave exactly as before. @sentry/node is
 * loaded lazily via dynamic import (like firebase-admin/stripe/nodemailer in
 * server.ts) to avoid pulling a CommonJS-ish dependency into Angular's ESM
 * build graph.
 */

type SentryNode = typeof import('@sentry/node');

let sentry: SentryNode | null = null;
let initPromise: Promise<boolean> | null = null;

/**
 * Initialise Sentry once, if SENTRY_DSN is configured. Safe to call repeatedly;
 * resolves to whether monitoring is active. Errors during init are swallowed so
 * monitoring can never take the server down.
 */
export function initServerMonitoring(): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const dsn = process.env['SENTRY_DSN'];
    if (!dsn) return false;
    try {
      const Sentry = await import('@sentry/node');
      Sentry.init({
        dsn,
        environment: process.env['SENTRY_ENVIRONMENT'] || 'production',
        tracesSampleRate: Number(process.env['SENTRY_TRACES_SAMPLE_RATE'] ?? '0') || 0,
      });
      sentry = Sentry;
      return true;
    } catch (e) {
      console.warn('Sentry init failed; continuing without monitoring:', e);
      return false;
    }
  })();
  return initPromise;
}

/** Whether monitoring has been initialised and is active. */
export function isMonitoringActive(): boolean {
  return sentry !== null;
}

/**
 * Report a server error to Sentry if active; otherwise a no-op. Never throws —
 * callers use this alongside their existing console.error.
 */
export function captureServerError(error: unknown, context?: Record<string, unknown>): void {
  if (!sentry) return;
  try {
    sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    /* never let monitoring break a request */
  }
}
