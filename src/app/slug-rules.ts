/**
 * Owner-chosen short site addresses (`/s/<slug>`). Pure validation so the
 * server and the settings UI agree, and it's unit-testable.
 */

/** Words that would collide with app routes or look official/misleading. */
export const RESERVED_SLUGS = new Set([
  'admin', 'app-admin', 'api', 'app', 'assets', 'auth', 'billing', 'blog', 'businessflow', 'checkout',
  'dashboard', 'docs', 'help', 'healthz', 'home', 'index', 'login', 'logout', 'mail', 'new', 'null',
  'pages', 'pay', 'payments', 'preview', 'preview-frame', 'pricing', 'privacy', 'public', 'robots',
  'root', 's', 'settings', 'setup', 'signin', 'signup', 'site', 'sitemap', 'static', 'status', 'stripe',
  'support', 'terms', 'test', 'undefined', 'www',
]);

export const SLUG_MIN = 3;
export const SLUG_MAX = 40;

export type SlugCheck = { ok: true; slug: string } | { ok: false; error: string };

export function validateSlug(raw: unknown): SlugCheck {
  if (typeof raw !== 'string') return { ok: false, error: 'Enter an address' };
  const slug = raw.trim().toLowerCase();
  if (slug.length < SLUG_MIN) return { ok: false, error: `Use at least ${SLUG_MIN} characters` };
  if (slug.length > SLUG_MAX) return { ok: false, error: `Use ${SLUG_MAX} characters or fewer` };
  if (!/^[a-z0-9-]+$/.test(slug)) return { ok: false, error: 'Use only lowercase letters, numbers and hyphens' };
  if (slug.startsWith('-') || slug.endsWith('-') || slug.includes('--')) {
    return { ok: false, error: "Hyphens can't be at the start or end, or doubled" };
  }
  if (RESERVED_SLUGS.has(slug)) return { ok: false, error: 'That address is reserved — try another' };
  return { ok: true, slug };
}

/** Keep auto-generated slugs (from the business name) off the reserved list. */
export function avoidReserved(slug: string): string {
  return RESERVED_SLUGS.has(slug) ? `${slug}-site` : slug;
}
