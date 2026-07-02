// Contract between server.ts and SiteViewComponent for server-rendering the
// public site body.
//
// server.ts loads the site from Firestore and passes it to Angular SSR as
// `angularApp.handle(req, { publicSite: { uid, data } })`; SiteViewComponent
// reads it back on the server via the REQUEST_CONTEXT injection token and
// stashes it in TransferState (serialized into the HTML as the `ng-state`
// script) so the browser's first load skips the /api/site re-fetch.

import { makeStateKey } from '@angular/core';
import { PublicSiteData } from './types';

export interface PublicSiteContext {
  uid: string;
  data: PublicSiteData;
}

export const PUBLIC_SITE_STATE_KEY = makeStateKey<PublicSiteContext>('bf-public-site');

/**
 * Validate the untyped SSR request context. Returns null for anything that
 * isn't a `{ publicSite: { uid, data } }` payload — the component then falls
 * back to the loading shell exactly as before.
 */
export function readPublicSiteContext(ctx: unknown): PublicSiteContext | null {
  if (!ctx || typeof ctx !== 'object') return null;
  const site = (ctx as Record<string, unknown>)['publicSite'];
  if (!site || typeof site !== 'object') return null;
  const { uid, data } = site as Record<string, unknown>;
  if (typeof uid !== 'string' || !uid || !data || typeof data !== 'object') return null;
  return { uid, data: data as PublicSiteData };
}
