/**
 * Custom-domain connection helpers for BusinessFlow.
 *
 * Pure, framework-free logic so it is fully unit-testable without Cloud Run,
 * Firebase, or a live network. The only impure function is `lookupDns`, a thin
 * wrapper over DNS-over-HTTPS (dns.google) that runs client-side — every
 * decision it feeds into is made by the pure functions below.
 */

export type DnsRecordType = 'A' | 'CNAME' | 'TXT';

export interface DnsRecord {
  /** Record type to create at the registrar. */
  type: DnsRecordType;
  /** Host/name field — '@' for the apex, or the subdomain label (e.g. 'www'). */
  host: string;
  /** Value the record should point to. */
  value: string;
  /** Suggested TTL in seconds. */
  ttl: number;
}

export type DomainKind = 'apex' | 'subdomain' | 'invalid';

export interface DomainValidation {
  valid: boolean;
  normalized: string;
  kind: DomainKind;
  error?: string;
}

export type VerificationState =
  | 'unconfigured'
  | 'pending'
  | 'verified'
  | 'misconfigured';

export interface RecordCheck {
  record: DnsRecord;
  /** Raw answer strings returned for this record's name+type. */
  found: string[];
  ok: boolean;
}

export interface VerificationResult {
  state: VerificationState;
  message: string;
  checked: RecordCheck[];
}

/** Cloud Run service hosting the public sites — the CNAME / A target. */
export const HOSTING_TARGET = 'businessflow-722923667291.us-central1.run.app';

/**
 * Google front-end anycast A records used when an apex (root) domain must be
 * pointed with A records because CNAME at the apex is not allowed by DNS.
 */
export const HOSTING_A_RECORDS = [
  '216.239.32.21',
  '216.239.34.21',
  '216.239.36.21',
  '216.239.38.21',
];

const DEFAULT_TTL = 3600;
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Strip protocol, path, casing, whitespace and a trailing dot from user input. */
export function normalizeDomain(input: string): string {
  return (input || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');
}

/**
 * Validate a domain and classify it. Heuristic: a two-label name (example.com)
 * is treated as an apex; three-or-more labels (www.example.com) as a subdomain.
 * Multi-part public suffixes (e.g. example.co.uk) are validated as syntactically
 * correct but classified as a subdomain — apex hosting on those should use the
 * registrar's ALIAS/ANAME flattening, which the instructions note.
 */
export function validateDomain(input: string): DomainValidation {
  const normalized = normalizeDomain(input);
  const invalid = (error: string): DomainValidation => ({
    valid: false,
    normalized,
    kind: 'invalid',
    error,
  });

  if (!normalized) return invalid('Enter a domain to connect.');
  if (/\s/.test(normalized)) return invalid('A domain cannot contain spaces.');
  if (normalized.length > 253) return invalid('That domain is too long.');

  const labels = normalized.split('.');
  if (labels.length < 2) {
    return invalid('Enter a full domain like example.com.');
  }
  for (const label of labels) {
    if (!LABEL.test(label)) {
      return invalid(`"${label}" is not a valid part of a domain.`);
    }
  }
  const tld = labels[labels.length - 1];
  if (!/^[a-z]{2,}$/.test(tld)) {
    return invalid('A domain must end in a valid extension like .com.');
  }

  const kind: DomainKind = labels.length > 2 ? 'subdomain' : 'apex';
  return { valid: true, normalized, kind };
}

/** The TXT ownership-verification record, scoped to the account uid. */
export function verificationTxtRecord(uid: string): DnsRecord {
  return {
    type: 'TXT',
    host: '_businessflow',
    value: `businessflow-site-verification=${uid}`,
    ttl: DEFAULT_TTL,
  };
}

/**
 * The exact DNS records the user must add. Apex domains get A records to the
 * Google front-ends; subdomains get a single CNAME to the hosting target.
 * Every domain also gets a TXT record proving ownership.
 */
export function requiredRecords(input: string, uid: string): DnsRecord[] {
  const v = validateDomain(input);
  if (!v.valid) return [];

  const records: DnsRecord[] = [];
  if (v.kind === 'apex') {
    for (const ip of HOSTING_A_RECORDS) {
      records.push({ type: 'A', host: '@', value: ip, ttl: DEFAULT_TTL });
    }
  } else {
    const host = v.normalized.split('.')[0];
    records.push({ type: 'CNAME', host, value: `${HOSTING_TARGET}.`, ttl: DEFAULT_TTL });
  }
  records.push(verificationTxtRecord(uid));
  return records;
}

/** Fully-qualified name to query for a given record at a domain. */
export function recordQueryName(record: DnsRecord, domain: string): string {
  if (record.host === '@') return domain;
  // Subdomain records (CNAME on 'www', TXT on '_businessflow') are queried at
  // host.<registrable-domain>. For a subdomain like www.example.com the
  // registrable domain is example.com (drop the leading label).
  const labels = domain.split('.');
  const base = labels.length > 2 ? labels.slice(1).join('.') : domain;
  return `${record.host}.${base}`;
}

function canonical(s: string): string {
  return s.trim().toLowerCase().replace(/^"|"$/g, '').replace(/\.$/, '');
}

/** Does at least one returned answer satisfy the required record? */
export function recordMatches(record: DnsRecord, answers: string[]): boolean {
  const want = canonical(record.value);
  return answers.map(canonical).some((a) => {
    if (record.type === 'TXT') return a.includes(want);
    return a === want;
  });
}

/**
 * Turn the raw per-record lookups into a single status.
 *  - verified:     at least one primary (A/CNAME) record matches AND the TXT
 *                  ownership record matches.
 *  - pending:      nothing has been found yet (records not added / propagating).
 *  - misconfigured: something is published but it doesn't match what we need.
 */
export function deriveStatus(
  checks: { record: DnsRecord; found: string[] }[],
): VerificationResult {
  const detailed: RecordCheck[] = checks.map((c) => ({
    record: c.record,
    found: c.found,
    ok: recordMatches(c.record, c.found),
  }));

  const primary = detailed.filter((d) => d.record.type !== 'TXT');
  const txt = detailed.filter((d) => d.record.type === 'TXT');
  const anyFound = detailed.some((d) => d.found.length > 0);

  const primaryOk = primary.length > 0 && primary.some((d) => d.ok);
  const txtOk = txt.length === 0 || txt.every((d) => d.ok);

  let state: VerificationState;
  let message: string;
  if (primaryOk && txtOk) {
    state = 'verified';
    message = 'Your domain is connected and verified. SSL is issued automatically.';
  } else if (!anyFound) {
    state = 'pending';
    message =
      'No matching DNS records found yet. After adding the records below, changes can take up to 48 hours to propagate.';
  } else {
    state = 'misconfigured';
    message =
      "Some DNS records were found but don't match the values below. Double-check each record at your registrar.";
  }
  return { state, message, checked: detailed };
}

/**
 * Thin DNS-over-HTTPS lookup (impure). Returns the list of answer data strings
 * for a name+type, or an empty array on any error/none. Kept tiny on purpose so
 * all decisions stay in the pure functions above.
 */
export async function lookupDns(
  name: string,
  type: DnsRecordType,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  try {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`;
    const res = await fetchImpl(url, { headers: { accept: 'application/dns-json' } });
    if (!res.ok) return [];
    const json = (await res.json()) as { Answer?: { data?: string }[] };
    if (!json.Answer) return [];
    return json.Answer.map((a) => a.data ?? '').filter((d) => d.length > 0);
  } catch {
    return [];
  }
}

/** Look up every required record for a domain and derive the overall status. */
export async function verifyDomain(
  domain: string,
  uid: string,
  fetchImpl: typeof fetch = fetch,
): Promise<VerificationResult> {
  const records = requiredRecords(domain, uid);
  if (records.length === 0) {
    return {
      state: 'unconfigured',
      message: 'Enter a valid domain first.',
      checked: [],
    };
  }
  const v = validateDomain(domain);
  const checks = await Promise.all(
    records.map(async (record) => ({
      record,
      found: await lookupDns(recordQueryName(record, v.normalized), record.type, fetchImpl),
    })),
  );
  return deriveStatus(checks);
}
