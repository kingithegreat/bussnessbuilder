import type { DomainMappingState } from './types';

/**
 * Resolve the single canonical public URL that should be encoded in a
 * customer-facing QR code for this business's site.
 *
 * Preference order:
 *   1. A fully-active custom domain (mappingState.status === 'active') —
 *      this is the URL the business actually wants printed once it's live,
 *      not the Cloud Run fallback.
 *   2. The claimed friendly `/site/:slug` URL.
 *   3. The raw `/site/:uid` URL (always present once the profile loads).
 *
 * Mirrors the same "friendlyUrl || siteUrl" fallback already used for the
 * "Your Public Site" link/copy button, plus the custom-domain preference
 * used by the domain-mapping status card.
 */
export function resolvePublicSiteUrl(input: {
  mappingState: DomainMappingState | null | undefined;
  friendlyUrl: string;
  siteUrl: string;
}): string {
  const { mappingState, friendlyUrl, siteUrl } = input;
  if (mappingState?.status === 'active' && mappingState.domain) {
    return `https://${mappingState.domain}`;
  }
  return friendlyUrl || siteUrl;
}

/**
 * Build a safe, human-readable filename for a downloaded QR code PNG,
 * derived from the URL it encodes (e.g. "apex-cleaners.co.nz-qr-code.png").
 * Falls back to a generic name if the URL doesn't yield any usable
 * characters (empty input, protocol-only, etc.).
 */
export function qrFilenameFor(url: string): string {
  const cleaned = (url || '')
    .replace(/^https?:\/\//i, '')
    .replace(/[^a-z0-9.-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${cleaned || 'site'}-qr-code.png`;
}
