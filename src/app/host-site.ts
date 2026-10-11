// Contract between server.ts and the router for custom domains.
//
// When a request arrives on a verified customer domain, server.ts renders '/'
// with `{ hostSiteUid, publicSite }` in the SSR request context. The router's
// canMatch guard below then picks SiteViewComponent instead of the landing
// page, and stashes the uid in TransferState so the browser makes the same
// choice on hydration. Anywhere else (no context, no state) the guard is false
// and '/' stays the BusinessFlow marketing page — fully backward compatible.

import { inject, makeStateKey, PLATFORM_ID, REQUEST_CONTEXT, TransferState } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanMatchFn } from '@angular/router';

export const HOST_SITE_STATE_KEY = makeStateKey<string>('bf-host-site-uid');

export function readHostSiteUid(ctx: unknown): string | null {
  if (!ctx || typeof ctx !== 'object') return null;
  const uid = (ctx as Record<string, unknown>)['hostSiteUid'];
  return typeof uid === 'string' && uid ? uid : null;
}

/** uid of the custom-domain site being served, or null on BusinessFlow's own domains. */
export function currentHostSiteUid(): string | null {
  const state = inject(TransferState);
  if (isPlatformBrowser(inject(PLATFORM_ID))) {
    return state.get(HOST_SITE_STATE_KEY, null);
  }
  const uid = readHostSiteUid(inject(REQUEST_CONTEXT, { optional: true }));
  if (uid) state.set(HOST_SITE_STATE_KEY, uid);
  return uid;
}

export const hostSiteMatch: CanMatchFn = () => !!currentHostSiteUid();
