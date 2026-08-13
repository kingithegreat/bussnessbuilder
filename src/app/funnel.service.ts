import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  FUNNEL_SESSION_KEY,
  CONSENT_KEY,
  FunnelSession,
  FunnelStep,
  FunnelFlag,
  AuthErrorCode,
  newSession,
  parseSession,
  serializeSession,
  recordStep,
  recordFlag,
  hasAnalyticsConsent,
  buildBatch,
  isEmptyBatch,
  utcDay,
} from './funnel';

/**
 * Sends funnel counter deltas to `POST /api/funnel`.
 *
 * Design notes that matter if you touch this:
 *
 * - **Nothing identifying leaves the page.** De-duplication and the
 *   furthest-step marker live in `sessionStorage` and die with the tab; only
 *   counter names and a calendar day are transmitted. See `funnel.ts`.
 * - **`sendBeacon`, not `HttpClient`.** Most of these events fire immediately
 *   before a navigation, and an in-flight XHR does not survive one. The Blob's
 *   `type: 'application/json'` is load-bearing — a default `text/plain` beacon
 *   is skipped by `express.json()` and would arrive as `{}`.
 * - **Fire-and-forget.** The response is never read and failures are swallowed.
 *   Measurement must never be able to break the funnel it is measuring.
 * - **No localStorage queue.** It would be a durable on-device record of
 *   behaviour, which is worse for privacy than losing the odd event.
 */
@Injectable({ providedIn: 'root' })
export class FunnelService {
  private platformId = inject(PLATFORM_ID);

  private queuedSteps: FunnelStep[] = [];
  private queuedFlags: FunnelFlag[] = [];
  private queuedFrom: FunnelStep | null = null;
  private queuedTo: FunnelStep | null = null;
  private queuedAuthError: AuthErrorCode | undefined;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private hooksInstalled = false;

  /** Record reaching a funnel step. De-duplicated per tab. */
  step(step: FunnelStep) {
    this.withSession(session => {
      const { session: next, batchPart } = recordStep(session, step);
      if (batchPart) {
        this.queuedSteps.push(batchPart.step);
        // Keep the outermost `from` and the newest `to` when several steps are
        // recorded inside one debounce window, so the net marker move is right.
        if (batchPart.to) {
          if (!this.queuedTo) this.queuedFrom = batchPart.from;
          this.queuedTo = batchPart.to;
        }
        this.scheduleFlush();
      }
      return next;
    });
  }

  /** Record a friction flag. De-duplicated per tab; never moves the marker. */
  flag(flag: FunnelFlag) {
    this.withSession(session => {
      const { session: next, flag: fresh } = recordFlag(session, flag);
      if (fresh) {
        this.queuedFlags.push(fresh);
        this.scheduleFlush();
      }
      return next;
    });
  }

  /** Record which auth error blocked a sign-up. One per batch. */
  authError(code: AuthErrorCode) {
    if (!this.enabled()) return;
    this.queuedAuthError = code;
    this.scheduleFlush();
  }

  /**
   * Send immediately. Call before any navigation or popup that could unload the
   * page — the debounce would otherwise lose the event.
   */
  flushNow() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.send();
  }

  /**
   * Register page-lifecycle flush hooks once, from the app shell. `pagehide`
   * and `visibilitychange` are the only reliable "user is leaving" signals on
   * mobile Safari, where `beforeunload` often never fires.
   */
  installFlushHooks() {
    if (this.hooksInstalled || !isPlatformBrowser(this.platformId)) return;
    this.hooksInstalled = true;
    window.addEventListener('pagehide', () => this.flushNow());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flushNow();
    });
  }

  private enabled(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    try {
      return hasAnalyticsConsent(localStorage.getItem(CONSENT_KEY));
    } catch {
      // Storage walled off (private mode / blocked cookies) — treat as declined.
      return false;
    }
  }

  private loadSession(): FunnelSession {
    const now = new Date();
    try {
      return parseSession(sessionStorage.getItem(FUNNEL_SESSION_KEY), now) || newSession(now);
    } catch {
      return newSession(now);
    }
  }

  private saveSession(session: FunnelSession) {
    try {
      sessionStorage.setItem(FUNNEL_SESSION_KEY, serializeSession(session));
    } catch {
      /* no sessionStorage — events still send, they just aren't de-duplicated */
    }
  }

  private withSession(update: (session: FunnelSession) => FunnelSession) {
    if (!this.enabled()) return;
    this.saveSession(update(this.loadSession()));
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.send();
    }, 300);
  }

  private send() {
    if (!this.enabled()) return;

    const batch = buildBatch(
      utcDay(new Date()),
      this.queuedSteps,
      this.queuedFlags,
      this.queuedFrom,
      this.queuedTo,
      this.queuedAuthError
    );

    this.queuedSteps = [];
    this.queuedFlags = [];
    this.queuedFrom = null;
    this.queuedTo = null;
    this.queuedAuthError = undefined;

    if (isEmptyBatch(batch)) return;

    const json = JSON.stringify(batch);
    try {
      const blob = new Blob([json], { type: 'application/json' });
      if (navigator.sendBeacon?.('/api/funnel', blob)) return;
      void fetch('/api/funnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
        keepalive: true,
      }).catch(() => { /* measurement must never break the funnel */ });
    } catch {
      /* ignore */
    }
  }
}
