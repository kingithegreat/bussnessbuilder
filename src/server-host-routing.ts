/**
 * Custom-domain routing: map an incoming Host header to the owner whose
 * verified custom domain it is, so `https://www.theirbusiness.co.nz/` serves
 * that owner's public site instead of the BusinessFlow marketing page.
 *
 * Pure logic + a small TTL cache; the Firestore lookup is injected so this is
 * unit-testable. Schema: `domainMappings/{uid}` docs written by the domain
 * feature in server.ts ({ status, domain, ... }).
 */

/** Mapping states in which Cloud Run is (or is about to be) routing the domain here. */
export const ROUTABLE_DOMAIN_STATUSES = new Set(['active', 'cert-provisioning', 'mapping-pending']);

/** BusinessFlow's own hosts: always the marketing site / app, never a customer site. */
const APP_HOST_SUFFIXES = ['.run.app', '.web.app', '.firebaseapp.com', '.github.io'];
const APP_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'businessflowstudio.co.nz',
  'www.businessflowstudio.co.nz',
]);

/** Lowercase, strip port and trailing dot. Returns '' for anything unusable. */
export function normalizeHost(raw: string | undefined | null): string {
  if (!raw || typeof raw !== 'string') return '';
  let host = raw.split(',')[0].trim().toLowerCase();
  if (host.startsWith('[')) return host.slice(0, host.indexOf(']') + 1); // IPv6 literal
  host = host.replace(/:\d+$/, '').replace(/\.$/, '');
  if (!/^[a-z0-9.-]{1,253}$/.test(host)) return '';
  return host;
}

export function isAppHost(host: string, extraAppHosts: string[] = []): boolean {
  if (!host) return true;
  if (APP_HOSTS.has(host) || extraAppHosts.includes(host)) return true;
  if (host.startsWith('[') || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (!host.includes('.')) return true;
  return APP_HOST_SUFFIXES.some((s) => host.endsWith(s));
}

/** Host plus its www/apex twin, so either form of a verified domain works. */
export function hostCandidates(host: string): string[] {
  if (!host) return [];
  const twin = host.startsWith('www.') ? host.slice(4) : `www.${host}`;
  return [host, twin];
}

export interface DomainRecord {
  uid: string;
  domain: string;
  status: string;
}

export type DomainLookup = (domain: string) => Promise<DomainRecord[]>;

/** Pick the owner for a host from candidate mapping records (exact match first). */
export function pickOwner(host: string, records: DomainRecord[]): string | null {
  const routable = records.filter((r) => r && r.uid && ROUTABLE_DOMAIN_STATUSES.has(r.status));
  const exact = routable.find((r) => normalizeHost(r.domain) === host);
  if (exact) return exact.uid;
  const twin = routable.find((r) => hostCandidates(normalizeHost(r.domain)).includes(host));
  return twin ? twin.uid : null;
}

export class HostSiteResolver {
  private cache = new Map<string, { uid: string | null; expiresAt: number }>();

  constructor(
    private lookup: DomainLookup,
    private opts: { positiveTtlMs?: number; negativeTtlMs?: number; maxEntries?: number; extraAppHosts?: string[]; now?: () => number } = {},
  ) {}

  /** uid that owns this host, or null (unknown host or one of our own domains). Never throws. */
  async resolve(rawHost: string | undefined | null): Promise<string | null> {
    const host = normalizeHost(rawHost);
    if (isAppHost(host, this.opts.extraAppHosts)) return null;
    const now = (this.opts.now ?? Date.now)();
    const hit = this.cache.get(host);
    if (hit && hit.expiresAt > now) return hit.uid;

    let uid: string | null = null;
    let ttl = this.opts.negativeTtlMs ?? 60_000;
    try {
      const records = (await Promise.all(hostCandidates(host).map((h) => this.lookup(h)))).flat();
      uid = pickOwner(host, records);
      if (uid) ttl = this.opts.positiveTtlMs ?? 5 * 60_000;
    } catch (e) {
      console.warn('Custom-domain lookup failed for', host, e);
      ttl = 10_000; // retry soon, serve marketing meanwhile
    }
    const max = this.opts.maxEntries ?? 1000;
    if (this.cache.size >= max) this.cache.delete(this.cache.keys().next().value as string);
    this.cache.set(host, { uid, expiresAt: now + ttl });
    return uid;
  }

  clear() {
    this.cache.clear();
  }
}
