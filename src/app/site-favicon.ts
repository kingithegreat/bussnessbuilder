/**
 * Per-site browser-tab icon.
 *
 * Every generated site served BusinessFlow's own `favicon.ico`, hard-coded in
 * `src/index.html`. So a customer's site showed someone else's mark in the tab,
 * in bookmarks and in history — including on the Business tier, which is the one
 * that pays specifically to remove BusinessFlow branding.
 *
 * There is no new field to fill in: a site that has uploaded a logo gets that
 * logo as its icon. The decision is pure and tested here; the DOM write is a
 * thin call the components make in the browser only.
 */

/** Schemes safe to place in a `<link rel="icon" href>`. */
const SAFE_HREF = /^(https?:\/\/|data:image\/|\/)/i;

/**
 * The icon URL for a site, or '' to leave the default in place.
 *
 * `logoUrl` is user-supplied, so anything that isn't plainly an http(s), data:
 * image, or root-relative URL is refused rather than written into the document.
 */
export function resolveFaviconHref(branding: { logoUrl?: string } | null | undefined): string {
  const url = (branding?.logoUrl || '').trim();
  if (!url) return '';
  if (!SAFE_HREF.test(url)) return '';
  return url;
}

/**
 * Point the document's icon at `href`. No-op for an empty href, so a site
 * without a logo simply keeps the platform default rather than losing its icon.
 */
export function applyFavicon(doc: Document, href: string): void {
  if (!href) return;
  let link = doc.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (!link) {
    link = doc.createElement('link');
    link.rel = 'icon';
    doc.head.appendChild(link);
  }
  // Drop any type hint from the platform's .ico — the logo is usually a PNG.
  link.removeAttribute('type');
  link.href = href;
}
