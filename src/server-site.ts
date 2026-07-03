// Pure assembly of the public site payload from Firestore doc data.
//
// Shared by two consumers in server.ts: the public `GET /api/site/:uid` JSON
// endpoint, and the `/site/:uid` SSR path that hands the same payload to
// Angular via request context so the site body server-renders with real
// content. Keeping the assembly pure (doc data in, payload out) makes the
// tier/branding/default rules unit-testable without Firestore.

export interface PublicSitePayload {
  profile: unknown;
  services: unknown[];
  testimonials: unknown[];
  faqs: unknown[];
  customization: unknown;
  paymentSettings: unknown;
  hideBranding: boolean;
}

/**
 * Build the public site payload from the three Firestore docs (business main
 * doc, payments doc, subscription doc). Returns null when the site doesn't
 * exist or hasn't completed setup — callers map that to a 404 (API) or fall
 * back to the plain SSR shell (site SSR).
 */
export function buildPublicSiteData(
  main: Record<string, unknown> | undefined,
  payments: Record<string, unknown> | null,
  subscription: Record<string, unknown> | null,
): PublicSitePayload | null {
  if (!main || !main['isSetupComplete']) return null;
  return {
    profile: main['profile'],
    services: (main['services'] as unknown[]) || [],
    testimonials: (main['testimonials'] as unknown[]) || [],
    faqs: (main['faqs'] as unknown[]) || [],
    customization: main['customization'],
    paymentSettings: payments ?? null,
    hideBranding: subscription?.['tier'] === 'business',
  };
}

export interface PublicPagePayload {
  slug: string;
  title: string;
  content: string;
}

/**
 * Build the public content-page payload from the business main doc and the
 * `pages` sub-doc. Returns null when setup isn't complete, there's no pages
 * doc, or no page matches `slug` and is published — callers fall back to the
 * plain client-rendered shell in that case.
 */
export function buildPublicPageData(
  main: Record<string, unknown> | undefined,
  pagesDoc: Record<string, unknown> | null,
  slug: string,
): PublicPagePayload | null {
  if (!main || !main['isSetupComplete']) return null;
  if (!pagesDoc) return null;
  const pages = (pagesDoc['pages'] as Record<string, unknown>[] | undefined) || [];
  const page = pages.find((p) => p && p['slug'] === slug && !!p['published']);
  if (!page) return null;
  return {
    slug: typeof page['slug'] === 'string' ? (page['slug'] as string) : slug,
    title: typeof page['title'] === 'string' ? (page['title'] as string) : '',
    content: typeof page['content'] === 'string' ? (page['content'] as string) : '',
  };
}
