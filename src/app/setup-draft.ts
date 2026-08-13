/**
 * Setup-wizard draft: the answers a visitor gives before they have an account.
 *
 * Two funnel jobs:
 *  1. **Survive a drop-out.** The wizard persists every keystroke, so closing
 *     the tab / refreshing / bouncing to the Terms page no longer wipes the
 *     answers.
 *  2. **Carry an anonymous visitor into an account.** A logged-out visitor can
 *     fill in the whole wizard; only *publishing* needs an account. The draft is
 *     what survives the trip through sign-up.
 *
 * Everything here is pure (no browser APIs) so it can be unit-tested; the
 * component owns the `localStorage` read/write.
 */

export interface SetupDraft {
  name: string;
  type: string;
  tagline: string;
  email: string;
  phone: string;
  serviceArea: string;
}

/** localStorage key holding the in-progress wizard answers. */
export const SETUP_DRAFT_KEY = 'bf_setup_draft';

/**
 * localStorage flag set when a logged-out visitor finished the wizard and was
 * sent to sign-up to publish. Read after auth to (a) frame the sign-up screen
 * and (b) route them to the "your site is live" moment instead of a cold
 * dashboard.
 */
export const PENDING_PUBLISH_KEY = 'bf_pending_publish';

/** Required fields, with the labels used in the "please fill in" message. */
export const REQUIRED_FIELDS: readonly (keyof SetupDraft)[] = ['name', 'type', 'email'];
const OPTIONAL_FIELDS: readonly (keyof SetupDraft)[] = ['tagline', 'phone', 'serviceArea'];

const FIELD_LABELS: Record<keyof SetupDraft, string> = {
  name: 'Business Name',
  type: 'Business Type',
  tagline: 'Tagline',
  email: 'a valid Email',
  phone: 'Phone Number',
  serviceArea: 'Service Area',
};

export function emptyDraft(): SetupDraft {
  return { name: '', type: '', tagline: '', email: '', phone: '', serviceArea: '' };
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Coerce anything read out of storage into a well-formed draft. Returns null
 * for junk so a corrupt entry can be dropped rather than crashing the wizard.
 */
export function parseDraft(raw: string | null): SetupDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      name: str(parsed['name']),
      type: str(parsed['type']),
      tagline: str(parsed['tagline']),
      email: str(parsed['email']),
      phone: str(parsed['phone']),
      serviceArea: str(parsed['serviceArea']),
    };
  } catch {
    return null;
  }
}

export function serializeDraft(draft: SetupDraft): string {
  return JSON.stringify(draft);
}

/** True when the visitor has typed anything worth restoring. */
export function hasContent(draft: SetupDraft): boolean {
  return [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].some(f => str(draft[f]).trim().length > 0);
}

/**
 * Honest completion percentage for the progress bar — required fields count
 * double, because they're what actually gates publishing.
 *
 * The old bar was hard-coded to "Step 1: Profile — 100%" on an empty form,
 * which both misinforms and throws away the completion pull that makes people
 * finish a form.
 */
export function draftProgress(draft: SetupDraft): number {
  const filled = (f: keyof SetupDraft) => (str(draft[f]).trim().length > 0 ? 1 : 0);
  const required = REQUIRED_FIELDS.reduce((sum, f) => sum + filled(f) * 2, 0);
  const optional = OPTIONAL_FIELDS.reduce((sum, f) => sum + filled(f), 0);
  const total = REQUIRED_FIELDS.length * 2 + OPTIONAL_FIELDS.length;
  return Math.round(((required + optional) / total) * 100);
}

/** Human labels for the required fields still missing, for the error line. */
export function missingRequiredLabels(draft: SetupDraft): string[] {
  return REQUIRED_FIELDS.filter(f => str(draft[f]).trim().length === 0).map(f => FIELD_LABELS[f]);
}
