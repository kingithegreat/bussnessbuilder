import { CONSENT_KEY, hasAnalyticsConsent } from './funnel';

const sent = new Set<string>();

/**
 * Count one page view for a published site. First-party only, no cookies,
 * no identifiers stored in the browser. Respects the cookie banner: an
 * explicit "Decline" sends nothing (same rule as the funnel counters).
 */
export function sendSiteHit(siteId: string, path: string): void {
  try {
    if (!siteId || typeof window === 'undefined' || typeof navigator === 'undefined') return;
    if (!hasAnalyticsConsent(window.localStorage?.getItem(CONSENT_KEY) ?? null)) return;
    const key = `${siteId}|${path}`;
    if (sent.has(key)) return; // once per page per load
    sent.add(key);
    const url = `/api/site/${encodeURIComponent(siteId)}/hit`;
    const body = JSON.stringify({ path });
    if (typeof navigator.sendBeacon === 'function') navigator.sendBeacon(url, body);
    else void fetch(url, { method: 'POST', body, keepalive: true }).catch(() => undefined);
  } catch { /* stats must never break the page */ }
}
