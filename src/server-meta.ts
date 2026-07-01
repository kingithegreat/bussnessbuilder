/**
 * Crawler-facing metadata: server-rendered <title> + Open Graph / Twitter Card
 * tags for a generated public site (`/site/<id>` and `/site/<id>/pages/<slug>`).
 *
 * WHY: the `/site/:uid` body is client-rendered — the Angular route ships a
 * loading shell and then hydrates by fetching `/api/site/:uid` in the browser.
 * Crawlers and social-unfurl bots (Googlebot, facebookexternalhit, Twitterbot,
 * Slackbot, LinkedInBot, WhatsApp…) don't run that JS, so every generated site
 * unfurled as the generic app shell title "BusinessFlow Studio" with no
 * description or image. This module lets the server hand those bots a shell
 * with the site's real title/description/image injected into <head>, without
 * changing the code path for real browsers (they keep full Angular SSR).
 *
 * Every export is a pure function so it can be unit-tested without booting
 * Express or Firestore — the Express wiring in `server.ts` stays thin.
 */

/** The minimal profile fields needed to describe a site to a crawler. */
export interface SiteMetaInput {
  /** Business display name (profile.name). */
  name?: string;
  /** Business type/category (profile.type), used as a fallback descriptor. */
  type?: string;
  /** Short marketing line (profile.tagline). */
  tagline?: string;
  /** Longer description (profile.description). */
  description?: string;
  /** Absolute logo URL (customization.branding.logoUrl), used as OG image. */
  logoUrl?: string;
}

/** A fully-resolved set of tags ready to render into <head>. */
export interface SiteMeta {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  siteName: string;
}

/** Max length for a meta description before it gets trimmed (search/unfurl norm). */
const MAX_DESCRIPTION = 200;

/**
 * Known crawler / social-unfurl user agents. Matching is case-insensitive and
 * substring-based. Kept deliberately broad but conservative: a false negative
 * just means a bot gets the normal SSR shell (today's behaviour); a false
 * positive means a human gets a valid, hydratable shell — both are safe.
 */
const CRAWLER_UA = [
  'googlebot',
  'bingbot',
  'slurp', // Yahoo
  'duckduckbot',
  'baiduspider',
  'yandex',
  'sogou',
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'linkedinbot',
  'slackbot',
  'slack-imgproxy',
  'telegrambot',
  'whatsapp',
  'discordbot',
  'pinterest',
  'redditbot',
  'applebot',
  'embedly',
  'quora link preview',
  'skypeuripreview',
  'nuzzel',
  'vkshare',
  'w3c_validator',
  'google-inspectiontool',
  'mastodon',
];

/** True when the user-agent looks like a crawler or link-unfurl bot. */
export function isCrawler(userAgent?: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return CRAWLER_UA.some((bot) => ua.includes(bot));
}

/** Escape the five HTML-significant characters for safe attribute/text output. */
export function escapeHtml(value: string): string {
  return value.replace(/[<>&'"]/g, (ch) => {
    switch (ch) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&#39;';
      case '"': return '&quot;';
      default: return ch;
    }
  });
}

/** Collapse whitespace and trim to a sane length for a meta description. */
export function truncate(value: string, max: number = MAX_DESCRIPTION): string {
  const clean = (value || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  // Cut at the last word boundary within the limit, then add an ellipsis.
  const slice = clean.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trimEnd() + '…';
}

/**
 * Resolve the raw site fields into a display-ready {@link SiteMeta}. Falls back
 * gracefully so a half-configured site still unfurls with something meaningful
 * rather than the generic app shell.
 *
 * @param input   The site's profile/branding fields.
 * @param canonicalUrl  The public URL of the page being described.
 * @param pageTitle  Optional content-page title; when present the tab title
 *                   becomes "Page Title – Business Name".
 */
export function resolveSiteMeta(
  input: SiteMetaInput,
  canonicalUrl: string,
  pageTitle?: string,
): SiteMeta {
  const name = (input.name || '').trim();
  const siteName = name || 'BusinessFlow site';

  const baseTitle = name || 'A BusinessFlow site';
  const title = pageTitle && pageTitle.trim()
    ? `${pageTitle.trim()} – ${siteName}`
    : baseTitle;

  const descSource =
    (input.tagline && input.tagline.trim()) ||
    (input.description && input.description.trim()) ||
    (name && input.type ? `${name} — ${input.type}` : '') ||
    (name ? `Welcome to ${name}.` : 'A website built with BusinessFlow.');

  return {
    title,
    description: truncate(descSource),
    url: canonicalUrl,
    imageUrl: (input.logoUrl || '').trim(),
    siteName,
  };
}

/**
 * Render the <head> tag block for a resolved {@link SiteMeta}: a <title>,
 * standard description, canonical link, Open Graph, and Twitter Card tags.
 * Image tags are omitted when no logo URL is set. Returns an HTML fragment.
 */
export function renderMetaTags(meta: SiteMeta): string {
  const t = escapeHtml(meta.title);
  const d = escapeHtml(meta.description);
  const url = escapeHtml(meta.url);
  const site = escapeHtml(meta.siteName);
  const img = meta.imageUrl ? escapeHtml(meta.imageUrl) : '';

  const lines = [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
  ];
  if (url) lines.push(`<link rel="canonical" href="${url}" />`);
  lines.push(
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${site}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
  );
  if (url) lines.push(`<meta property="og:url" content="${url}" />`);
  if (img) lines.push(`<meta property="og:image" content="${img}" />`);
  lines.push(
    `<meta name="twitter:card" content="${img ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
  );
  if (img) lines.push(`<meta name="twitter:image" content="${img}" />`);

  return lines.join('\n    ');
}

/**
 * Inject crawler meta into an app-shell HTML document: replace the existing
 * <title> and drop the OG/Twitter block in just before </head>. If the
 * document has no </head> the original html is returned unchanged, so a
 * malformed shell can never break the response.
 */
export function injectMetaTags(html: string, meta: SiteMeta): string {
  const block = renderMetaTags(meta);
  const closeHead = html.indexOf('</head>');
  if (closeHead === -1) return html;

  // Strip the shell's generic <title>…</title> (the block re-adds a real one).
  let head = html.slice(0, closeHead);
  const rest = html.slice(closeHead);
  head = head.replace(/\s*<title>[\s\S]*?<\/title>/i, '');

  return `${head}    ${block}\n  ${rest}`;
}
