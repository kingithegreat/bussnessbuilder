/**
 * The rules for writing copy *about* a business into text a human will read.
 *
 * Three production bugs came from templates interpolating whatever field was
 * nearest: `profile.type` rendered as "a top-tier other" and "OTHER •
 * QLD/BRISBANE", a cleaning-flavoured default outlived the wizard, and a
 * tagline that already ended in '.' got another one appended ("…happier
 * home.. Our goal is…").
 *
 * The shared shape is that a template asserted something it did not know. So
 * the rules here are:
 *
 *  1. Never interpolate a raw type id. Use {@link businessTypeNoun}, which
 *     returns '' for 'other', unset, and the six types with no preset.
 *  2. When a value is missing, DROP the clause. Do not substitute a filler
 *     like 'service business' — that is the same mistake wearing a nicer word.
 *  3. Build hashtags with {@link hashtagLine}; labels contain '/', '&' and
 *     spaces, and a service area can contain '/', all of which end a hashtag.
 *
 * Pure module — no Angular, no browser APIs. Imported by both the client
 * (`ai.service.ts`, `setup.component.ts`) and the Express server
 * (`server.ts` via `growth-drafts.ts`), so the two can never drift.
 */

import { BusinessType } from './types';
import { getPreset } from './presets';

/**
 * Lowercase trade noun for mid-sentence use — "a trusted cleaning service in
 * Tauranga", "your local barbershop" — or '' when the type has no human name.
 *
 * '' is the answer for 'other', for an unset type, and for the five declared
 * BusinessTypes with no preset (mechanic, rental, cafe, consultant, shop).
 * Callers must omit the phrase entirely in that case; there is no default.
 */
export function businessTypeNoun(type: string | null | undefined): string {
  if (!type) return '';
  return getPreset(type as BusinessType)?.tradeNoun || '';
}

/**
 * A single hashtag built from free text, or '' when nothing usable survives.
 *
 * Everything that is not a letter or digit is stripped, because a hashtag ends
 * at the first one: "QLD/Brisbane" would have posted as "#QLD", and
 * "Lawn Care & Landscaping" as "#Lawn".
 */
export function hashtag(text: string | null | undefined): string {
  const cleaned = (text || '').replace(/[^A-Za-z0-9]/g, '');
  return cleaned ? `#${cleaned}` : '';
}

/**
 * A hashtag line for a social post: each part becomes a hashtag, blanks are
 * dropped rather than rendered as a bare '#', and duplicates are removed.
 */
export function hashtagLine(parts: readonly (string | null | undefined)[]): string {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of parts) {
    const tag = hashtag(part);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags.join(' ');
}

/** A trailing sentence built from owner-written text, with no double '.'. */
export function asSentence(text: string | null | undefined): string {
  const trimmed = (text || '').trim().replace(/[.!?]+$/, '').trim();
  return trimmed ? `${trimmed}.` : '';
}

export interface AboutInput {
  name: string;
  tagline?: string;
  serviceArea?: string;
}

/**
 * The "About Us" paragraph used whenever the AI returns nothing — which today
 * is every site, because no GEMINI_API_KEY is configured in production.
 *
 * It deliberately says nothing about the business type. The previous version
 * pasted in `BusinessPreset.description`, which is the catalogue blurb
 * describing the *category* ("Residential and commercial cleaning
 * businesses."), and appended a full stop to a tagline that already had one.
 */
export function aboutDescription(input: AboutInput): string {
  const name = (input.name || '').trim() || 'our business';
  const area = (input.serviceArea || '').trim();
  const where = area ? ` in the ${area} area` : '';
  const tagline = asSentence(input.tagline);
  return `Welcome to ${name}! We are dedicated to providing excellent service${where}.`
    + `${tagline ? ` ${tagline}` : ''}`
    + ` Our goal is to make your life easier through professional, reliable, and high-quality solutions.`;
}
