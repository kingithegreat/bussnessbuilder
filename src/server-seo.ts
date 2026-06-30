/**
 * SEO helpers: per-site sitemap.xml and a global robots.txt.
 *
 * A generated public site lives at `/site/<id>` (where `<id>` is the site's
 * claimed slug or raw uid) and its published content pages at
 * `/site/<id>/pages/<slug>`. Search engines and the owner's Search Console need
 * a sitemap to discover those pages, and a robots.txt to know which paths are
 * crawlable. Neither existed before, so generated sites were effectively
 * invisible to crawlers.
 *
 * This logic is extracted into its own module so it can be unit-tested without
 * booting Express or Firestore — every export below is a pure function.
 */

/** Minimal shape of a content page needed to build a sitemap entry. */
export interface SitemapPage {
  slug: string;
  published: boolean;
  /** Optional ISO timestamp of the last edit, surfaced as <lastmod>. */
  updatedAt?: string;
}

/** Escape the five XML-significant characters for safe interpolation. */
export function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (ch) => {
    switch (ch) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return ch;
    }
  });
}

/**
 * Derive the public origin (`https://host`) from a request. Cloud Run sits
 * behind a reverse proxy, so prefer the forwarded headers it sets and fall back
 * to the Host header. Defaults to https because the deployment is TLS-only.
 */
export function originFromRequest(headers: {
  forwardedProto?: string | undefined;
  forwardedHost?: string | undefined;
  host?: string | undefined;
}): string {
  const proto = (headers.forwardedProto || 'https').split(',')[0].trim() || 'https';
  const host = (headers.forwardedHost || headers.host || '').split(',')[0].trim();
  return host ? `${proto}://${host}` : '';
}

/** Build a sitemap URL for a site path, joining origin + path safely. */
function siteUrl(origin: string, path: string): string {
  return `${origin.replace(/\/$/, '')}${path}`;
}

/**
 * Build a sitemap.xml document for a single site: its home page plus every
 * published content page. `identifier` is the public-facing slug or uid used in
 * the URL. Unpublished pages are excluded. Returns a complete XML string.
 */
export function buildSiteSitemap(
  origin: string,
  identifier: string,
  pages: SitemapPage[],
  homeLastmod?: string,
): string {
  const id = encodeURIComponent(identifier);
  const entries: string[] = [];

  const home = siteUrl(origin, `/site/${id}`);
  entries.push(urlEntry(home, homeLastmod));

  for (const page of pages) {
    if (!page || !page.published || !page.slug) continue;
    const loc = siteUrl(origin, `/site/${id}/pages/${encodeURIComponent(page.slug)}`);
    entries.push(urlEntry(loc, page.updatedAt));
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}

function urlEntry(loc: string, lastmod?: string): string {
  const day = isoDay(lastmod);
  const mod = day ? `\n    <lastmod>${day}</lastmod>` : '';
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>${mod}\n  </url>`;
}

/** Normalise a timestamp to a YYYY-MM-DD <lastmod> value, or '' if invalid. */
function isoDay(value?: string): string {
  if (!value || typeof value !== 'string') return '';
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
}

/**
 * Build a global robots.txt. Public site pages and the marketing pages are
 * crawlable; the authenticated app surfaces and raw API are disallowed so they
 * stay out of search results. When an origin is known we advertise it as the
 * Host so canonicalisation is unambiguous.
 */
export function buildRobotsTxt(origin: string): string {
  const lines = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /app-admin',
    'Disallow: /api/',
    'Disallow: /login',
    'Disallow: /signup',
    'Disallow: /setup',
  ];
  if (origin) {
    lines.push(`Host: ${origin}`);
  }
  return lines.join('\n') + '\n';
}
