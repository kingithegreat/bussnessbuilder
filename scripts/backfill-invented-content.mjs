#!/usr/bin/env node
/**
 * Remove content the PRODUCT invented from sites that are already published.
 *
 * The code fixes shipped this week stop new sites being seeded with fabricated
 * values, but they do not touch sites created before them. The one published
 * site still says, in the business's own voice:
 *
 *   openingHours  "Mon-Fri: 9am - 5pm"   — never asked for, asserted as fact
 *   description   "a top-tier other …"   — the raw type id in customer copy
 *   services      "Standard Service"     — a placeholder stub
 *
 * ## Why this is deliberately conservative
 *
 * This is somebody else's live business content. The script therefore only
 * touches values that EXACTLY match a string the product is known to have
 * generated. Anything the owner has since edited — even slightly — is left
 * alone and reported, because at that point it is their writing, not ours.
 *
 * Two things are reported but NEVER auto-changed, because they alter what the
 * public page shows and the owner should decide: a lone placeholder service,
 * and any testimonial that looks machine-generated.
 *
 * ## Usage
 *
 *   node scripts/backfill-invented-content.mjs            # dry run, changes nothing
 *   node scripts/backfill-invented-content.mjs --apply    # write the changes
 *
 * Auth: uses your existing gcloud login — no service-account key, no ADC setup.
 *   gcloud auth login          (once, if you are not already logged in)
 */

import { execFileSync } from 'node:child_process';

const APPLY = process.argv.includes('--apply');
const PROJECT = process.env.GCLOUD_PROJECT || 'sitebuilder-b2ee6';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

/** Exact strings the product generated. Anything else is the owner's writing. */
const INVENTED_HOURS = 'Mon-Fri: 9am - 5pm';
const STUB_SERVICE_NAME = 'Standard Service';
/** The old template shape: "…a top-tier <rawtype> dedicated to providing…" */
const INVENTED_DESCRIPTION = /top-tier\s+\S+\s+dedica\w*\s+to providing excellent service/i;

function token() {
  // Explicit token wins. This is the portable path and the one to use if the
  // spawn below cannot find gcloud (on Windows the Git Bash `gcloud` shim has
  // no extension, so Node cannot execute it directly):
  //   GCLOUD_ACCESS_TOKEN=$(gcloud auth print-access-token) node scripts/...
  const fromEnv = (process.env.GCLOUD_ACCESS_TOKEN || '').trim();
  if (fromEnv) return fromEnv;

  // Which name resolves depends on the shell: Git Bash finds the `gcloud`
  // script, cmd/PowerShell need `gcloud.cmd`. Try both rather than using
  // shell:true, which concatenates arguments instead of escaping them.
  const candidates = process.platform === 'win32' ? ['gcloud.cmd', 'gcloud'] : ['gcloud'];
  for (const bin of candidates) {
    try {
      const out = execFileSync(bin, ['auth', 'print-access-token'], {
        encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (out) return out;
    } catch { /* try the next name */ }
  }
  console.error('Could not get a gcloud access token. Either run `gcloud auth login`,');
  console.error('or pass one explicitly:');
  console.error('  GCLOUD_ACCESS_TOKEN=$(gcloud auth print-access-token) node scripts/backfill-invented-content.mjs');
  process.exit(1);
}

const TOKEN = token();
const headers = { Authorization: `Bearer ${TOKEN}`, 'x-goog-user-project': PROJECT };

async function api(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

/** Firestore REST value -> plain JS. Only the shapes this document uses. */
function decode(v) {
  if (v == null) return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
  if ('mapValue' in v) {
    return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, decode(x)]));
  }
  return undefined;
}

function rebuildDescription(profile) {
  const name = (profile.name || '').trim() || 'our business';
  const area = (profile.serviceArea || '').trim();
  const where = area ? ` in the ${area} area` : '';
  const tagline = (profile.tagline || '').trim().replace(/[.!?]+$/, '');
  const sentence = tagline ? ` ${tagline}.` : '';
  return `Welcome to ${name}! We are dedicated to providing excellent service${where}.${sentence}`
    + ` Our goal is to make your life easier through professional, reliable, and high-quality solutions.`;
}

async function main() {
  console.log(`\n${APPLY ? 'APPLYING CHANGES' : 'DRY RUN — nothing will be written'}  (project: ${PROJECT})\n`);

  const list = await api('/users?pageSize=500');
  const users = (list?.documents || []).map(d => d.name.split('/').pop());
  let scanned = 0, changed = 0, flagged = 0;

  for (const uid of users) {
    const doc = await api(`/users/${uid}/businessData/main`);
    if (!doc) continue;
    const data = Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, decode(v)]));
    if (!data.isSetupComplete) continue;
    scanned++;

    const profile = data.profile || {};
    const label = profile.name || uid;
    const notes = [];
    const writes = {};

    if ((profile.openingHours || '') === INVENTED_HOURS) {
      writes.openingHours = '';
      notes.push(`hours: clear the invented "${INVENTED_HOURS}"`);
    }
    if (INVENTED_DESCRIPTION.test(profile.description || '')) {
      writes.description = rebuildDescription(profile);
      notes.push('description: rewrite without the raw business-type id');
    }

    const services = Array.isArray(data.services) ? data.services : [];
    if (services.length === 1 && (services[0]?.name || '').trim() === STUB_SERVICE_NAME) {
      notes.push('ACTION NEEDED: only service is the placeholder "Standard Service" — ask the owner what they actually offer');
      flagged++;
    }

    const fabricated = (Array.isArray(data.testimonials) ? data.testimonials : []).filter(t =>
      /satisfied customer/i.test(t?.author || '') ||
      /provided excellent service\. highly recommended/i.test(t?.text || ''));
    if (fabricated.length) {
      notes.push(`ACTION NEEDED: ${fabricated.length} testimonial(s) look machine-generated — remove if not from a real customer`);
      flagged++;
    }

    if (!notes.length) continue;
    console.log(`• ${label}  (${uid})`);
    for (const n of notes) console.log(`    - ${n}`);

    if (Object.keys(writes).length) {
      changed++;
      if (APPLY) {
        // Patch only the profile subfields we are changing.
        const params = Object.keys(writes).map(k => `updateMask.fieldPaths=profile.${k}`).join('&');
        const fields = { profile: { mapValue: { fields: Object.fromEntries(
          Object.entries(writes).map(([k, v]) => [k, { stringValue: v }])) } } };
        await api(`/users/${uid}/businessData/main?${params}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields }),
        });
        console.log('    → written');
      }
    }
    console.log();
  }

  console.log(`Scanned ${scanned} published site(s). ${changed} would be updated, ${flagged} need a human decision.`);
  if (!APPLY && changed) console.log('Re-run with --apply to write these changes.');
}

main().catch(err => { console.error(err.message || err); process.exitCode = 1; });
