/**
 * Cloud Run custom-domain mapping automation.
 *
 * The DNS-ownership flow in `src/app/domain-verification.ts` only proves the
 * *user* controls their domain's DNS. Actually attaching that domain to this
 * Cloud Run service requires a second, separate step: Google's Domain
 * Mappings API refuses to map a domain unless the *calling identity* is
 * already a verified owner in Google's Site Verification system. That's
 * scoped per-identity, not per-project — so the server's own runtime service
 * account has to complete Site Verification's DNS-TXT challenge for a domain
 * before it can create a mapping for it. This module drives that two-stage
 * flow: Site Verification first, then Domain Mappings.
 *
 * Every builder/parser below is pure and unit-tested against hand-built
 * mock payloads. `getAccessToken` and the four `fetch`-calling functions are
 * the only impure pieces, kept thin so the decision logic stays testable.
 *
 * NOTE ON UNTESTED SURFACE: the exact Domain Mappings request/response shape
 * below follows Google's documented `DomainMapping` (Knative-style) resource,
 * but this integration has not been exercised against a live GCP project (no
 * production credentials were available while writing it). Re-confirm the
 * wire format against current Cloud Run API docs before the first live use.
 */

export type GcpDnsRecordType = 'TXT' | 'CNAME' | 'A' | 'AAAA';

export interface GcpDnsRecord {
  type: GcpDnsRecordType;
  host: string;
  value: string;
  ttl: number;
}

export type MappingStatus =
  | 'none'
  | 'site-verification-pending'
  | 'site-verified'
  | 'mapping-pending'
  | 'cert-provisioning'
  | 'active'
  | 'error';

export type GcpErrorCode =
  | 'SITE_VERIFICATION_API_DISABLED'
  | 'RUN_API_DISABLED'
  | 'PERMISSION_DENIED'
  | 'DOMAIN_ALREADY_MAPPED'
  | 'MAPPING_QUOTA_EXCEEDED'
  | 'NOT_YET_VERIFIED'
  | 'UNKNOWN';

export interface DomainMappingState {
  status: MappingStatus;
  domain: string;
  ownershipTxtRecord?: GcpDnsRecord;
  cloudRunDnsRecords?: GcpDnsRecord[];
  certMessage?: string;
  errorCode?: GcpErrorCode;
  errorMessage?: string;
  updatedAt: string;
}

const DEFAULT_TTL = 3600;
const SITE_VERIFICATION_API = 'https://www.googleapis.com/siteVerification/v1';
const DOMAINS_API = 'https://domains.cloudrun.com/v1';

export const GCP_PROJECT_ID = process.env['GCP_PROJECT_ID'] || 'sitebuilder-b2ee6';
export const GCP_REGION = process.env['GCP_REGION'] || 'us-central1';
export const CLOUD_RUN_SERVICE = process.env['CLOUD_RUN_SERVICE'] || 'businessflow';

// ---- Site Verification: pure builders/parsers ----

export function buildSiteVerificationTokenRequest(domain: string): { url: string; body: unknown } {
  return {
    url: `${SITE_VERIFICATION_API}/token`,
    body: {
      site: { type: 'INET_DOMAIN', identifier: domain },
      verificationMethod: 'DNS_TXT',
    },
  };
}

export function parseSiteVerificationTokenResponse(json: unknown): { token: string } | null {
  const token = (json as { token?: unknown } | null)?.token;
  return typeof token === 'string' && token.length > 0 ? { token } : null;
}

/** The DNS-TXT record Google's Site Verification service needs at the domain apex. */
export function buildOwnershipTxtRecord(token: string): GcpDnsRecord {
  return { type: 'TXT', host: '@', value: token, ttl: DEFAULT_TTL };
}

export function buildSiteVerificationConfirmRequest(domain: string): { url: string; body: unknown } {
  return {
    url: `${SITE_VERIFICATION_API}/webResource?verificationMethod=DNS_TXT`,
    body: { site: { type: 'INET_DOMAIN', identifier: domain } },
  };
}

// ---- Cloud Run Domain Mappings: pure builders/parsers ----

export function buildDomainMappingCreateRequest(
  projectId: string,
  region: string,
  service: string,
  domain: string,
): { url: string; body: unknown } {
  return {
    url: `${DOMAINS_API}/namespaces/${projectId}/domainmappings`,
    body: {
      apiVersion: 'domains.cloudrun.com/v1',
      kind: 'DomainMapping',
      metadata: { name: domain, namespace: projectId },
      spec: { routeName: service, certificateMode: 'AUTOMATIC' },
      // region is carried for documentation/future use; the domains.cloudrun.com
      // v1 API infers the target region from the route/service, not this field.
      _region: region,
    },
  };
}

export function buildDomainMappingGetRequest(projectId: string, domain: string): { url: string } {
  return { url: `${DOMAINS_API}/namespaces/${projectId}/domainmappings/${domain}` };
}

interface DomainMappingCondition {
  type?: string;
  status?: string;
  message?: string;
}

interface DomainMappingResourceRecord {
  name?: string;
  type?: string;
  rrdata?: string;
}

export function parseDomainMappingResponse(json: unknown): {
  cloudRunDnsRecords: GcpDnsRecord[];
  ready: boolean;
  certMessage?: string;
} {
  const status = (json as { status?: unknown } | null)?.status as
    | { resourceRecords?: DomainMappingResourceRecord[]; conditions?: DomainMappingCondition[] }
    | undefined;

  const cloudRunDnsRecords: GcpDnsRecord[] = (status?.resourceRecords || [])
    .filter((r): r is Required<DomainMappingResourceRecord> => r.name !== undefined && !!r.type && !!r.rrdata)
    .map((r) => ({
      type: (r.type.toUpperCase() as GcpDnsRecordType) || 'CNAME',
      host: r.name === '' ? '@' : r.name,
      value: r.rrdata,
      ttl: DEFAULT_TTL,
    }));

  const readyCondition = (status?.conditions || []).find((c) => c.type === 'Ready');
  const ready = readyCondition?.status === 'True';
  const certMessage = readyCondition?.message;

  return { cloudRunDnsRecords, ready, certMessage };
}

// ---- Error classification (pure) ----

interface GoogleApiErrorBody {
  error?: { code?: number; status?: string; message?: string };
}

export function classifyGcpError(httpStatus: number, body: unknown): GcpErrorCode {
  const err = (body as GoogleApiErrorBody | null)?.error;
  const status = err?.status || '';
  const message = (err?.message || '').toLowerCase();

  if (httpStatus === 403 && (message.includes('has not been used') || message.includes('is disabled') || message.includes('accessnotconfigured'))) {
    return message.includes('site verification') || message.includes('siteverification')
      ? 'SITE_VERIFICATION_API_DISABLED'
      : 'RUN_API_DISABLED';
  }
  if (status === 'PERMISSION_DENIED' || httpStatus === 403) return 'PERMISSION_DENIED';
  if (status === 'ALREADY_EXISTS' || httpStatus === 409) return 'DOMAIN_ALREADY_MAPPED';
  if (status === 'RESOURCE_EXHAUSTED' || httpStatus === 429) return 'MAPPING_QUOTA_EXCEEDED';
  if (httpStatus === 400 && message.includes('verif')) return 'NOT_YET_VERIFIED';
  return 'UNKNOWN';
}

// ---- Impure: credentials + network (thin; all decisions live above) ----

let _auth: import('google-auth-library').GoogleAuth | null = null;
async function getAuthClient() {
  if (!_auth) {
    const { GoogleAuth } = await import('google-auth-library');
    _auth = new GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/siteverification',
      ],
    });
  }
  return _auth;
}

export async function getAccessToken(): Promise<string> {
  const auth = await getAuthClient();
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) throw new Error('Failed to obtain GCP access token');
  return token;
}

async function gcpFetch(
  url: string,
  init: { method: 'GET' | 'POST'; body?: unknown },
  fetchImpl: typeof fetch,
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const token = await getAccessToken();
  const res = await fetchImpl(url, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

export async function startSiteVerification(
  domain: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ownershipTxtRecord: GcpDnsRecord } | { errorCode: GcpErrorCode; errorMessage: string }> {
  const { url, body } = buildSiteVerificationTokenRequest(domain);
  const res = await gcpFetch(url, { method: 'POST', body }, fetchImpl);
  if (!res.ok) {
    return { errorCode: classifyGcpError(res.status, res.json), errorMessage: 'Failed to start domain verification.' };
  }
  const parsed = parseSiteVerificationTokenResponse(res.json);
  if (!parsed) return { errorCode: 'UNKNOWN', errorMessage: 'Unexpected response starting domain verification.' };
  return { ownershipTxtRecord: buildOwnershipTxtRecord(parsed.token) };
}

export async function confirmSiteVerification(
  domain: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ verified: true } | { verified: false; errorCode: GcpErrorCode; errorMessage: string }> {
  const { url, body } = buildSiteVerificationConfirmRequest(domain);
  const res = await gcpFetch(url, { method: 'POST', body }, fetchImpl);
  if (!res.ok) {
    return {
      verified: false,
      errorCode: classifyGcpError(res.status, res.json),
      errorMessage: 'DNS record not visible yet — this can take up to 48 hours to propagate.',
    };
  }
  return { verified: true };
}

export async function createDomainMapping(
  domain: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ cloudRunDnsRecords: GcpDnsRecord[] } | { errorCode: GcpErrorCode; errorMessage: string }> {
  const { url, body } = buildDomainMappingCreateRequest(GCP_PROJECT_ID, GCP_REGION, CLOUD_RUN_SERVICE, domain);
  const res = await gcpFetch(url, { method: 'POST', body }, fetchImpl);
  if (!res.ok) {
    return { errorCode: classifyGcpError(res.status, res.json), errorMessage: 'Failed to create the domain mapping.' };
  }
  const parsed = parseDomainMappingResponse(res.json);
  return { cloudRunDnsRecords: parsed.cloudRunDnsRecords };
}

export async function getDomainMappingStatus(
  domain: string,
  fetchImpl: typeof fetch = fetch,
): Promise<
  | { ready: boolean; certMessage?: string; cloudRunDnsRecords: GcpDnsRecord[] }
  | { errorCode: GcpErrorCode; errorMessage: string }
> {
  const { url } = buildDomainMappingGetRequest(GCP_PROJECT_ID, domain);
  const res = await gcpFetch(url, { method: 'GET' }, fetchImpl);
  if (!res.ok) {
    return { errorCode: classifyGcpError(res.status, res.json), errorMessage: 'Failed to fetch mapping status.' };
  }
  return parseDomainMappingResponse(res.json);
}
