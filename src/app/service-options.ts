/**
 * Options for the enquiry form's "Service Interest" dropdown.
 *
 * The seeded form field ships with a hardcoded cleaning list
 * (`Standard Clean,Deep Clean,Other`) and the setup wizard never rewrites it —
 * it sets `services` from the business-type preset and leaves `formFields`
 * alone. So every site, whatever the trade, asked its customers to choose
 * between two kinds of house clean on the one form that produces leads. A live
 * golf-tour site was doing exactly that.
 *
 * Rather than copy the service names into the field at setup time — which goes
 * stale the moment the owner edits their services — the seeded field resolves
 * its options from the business's actual services at render time. Editing
 * Services in Content now keeps the enquiry form correct by construction, and
 * existing sites repair themselves on next load with no migration.
 *
 * An owner who has typed their own options into the Form Builder keeps them.
 */

/** The id of the seeded "Service Interest" field in `defaultState`. */
export const SERVICE_FIELD_ID = 'service';

/** The options that field ships with, i.e. "the owner has never touched this". */
export const SEEDED_SERVICE_OPTIONS = 'Standard Clean,Deep Clean,Other';

/** Appended so a visitor is never forced into a category that doesn't fit. */
export const OTHER_OPTION = 'Other';

function splitOptions(raw: string | null | undefined): string[] {
  return (raw || '').split(',').map(o => o.trim()).filter(Boolean);
}

/**
 * True when this field's options are still the shipped cleaning defaults, i.e.
 * nobody has deliberately chosen them.
 *
 * Compared as a set so re-ordering in the Form Builder — which is not a
 * meaningful edit to the *content* — still counts as untouched.
 */
export function hasSeededServiceOptions(options: string | null | undefined): boolean {
  const current = splitOptions(options);
  if (current.length === 0) return true;
  const seeded = splitOptions(SEEDED_SERVICE_OPTIONS);
  if (current.length !== seeded.length) return false;
  const norm = (list: string[]) => list.map(o => o.toLowerCase()).sort();
  return JSON.stringify(norm(current)) === JSON.stringify(norm(seeded));
}

/**
 * The options to render for a form field.
 *
 * Only the seeded service dropdown is derived; every other field, and any
 * service dropdown whose options an owner has edited, is returned untouched.
 *
 * @param field    the configured form field
 * @param services the business's services, in display order
 */
export function resolveFieldOptions(
  field: { id: string; type: string; options?: string },
  services: readonly { name?: string }[] | null | undefined
): string[] {
  const own = splitOptions(field.options);

  const isSeededServiceField =
    field.id === SERVICE_FIELD_ID &&
    field.type === 'dropdown' &&
    hasSeededServiceOptions(field.options);

  if (!isSeededServiceField) return own;

  const names: string[] = [];
  for (const service of services || []) {
    const name = (service?.name || '').trim();
    // De-duplicate case-insensitively: two identically-named services would
    // otherwise render two identical <option> values.
    if (name && !names.some(n => n.toLowerCase() === name.toLowerCase())) {
      names.push(name);
    }
  }

  // No services to derive from — mid-setup, a business type with no preset, or
  // the owner cleared them. Offer only the catch-all rather than falling back
  // to `own`, which is the seeded cleaning list: a golf tour operator must
  // never ask visitors to choose between Standard Clean and Deep Clean. A
  // one-option dropdown is still satisfiable, so the required field is fine.
  if (names.length === 0) return [OTHER_OPTION];

  if (!names.some(n => n.toLowerCase() === OTHER_OPTION.toLowerCase())) {
    names.push(OTHER_OPTION);
  }
  return names;
}
