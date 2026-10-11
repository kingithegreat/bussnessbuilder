import { vi } from 'vitest';
import { normalizeHost, isAppHost, hostCandidates, pickOwner, HostSiteResolver, DomainRecord } from './server-host-routing';

describe('normalizeHost', () => {
  it('lowercases and strips port / trailing dot', () => {
    expect(normalizeHost('WWW.Example.co.nz:443')).toBe('www.example.co.nz');
    expect(normalizeHost('example.com.')).toBe('example.com');
    expect(normalizeHost('a.com, b.com')).toBe('a.com');
  });
  it('rejects junk', () => {
    expect(normalizeHost('')).toBe('');
    expect(normalizeHost(undefined)).toBe('');
    expect(normalizeHost('bad host/../')).toBe('');
  });
});

describe('isAppHost', () => {
  it('treats our own domains, IPs and localhost as app hosts', () => {
    for (const h of ['businessflow-722923667291.us-central1.run.app', 'localhost', '127.0.0.1', 'businessflowstudio.co.nz', 'kingithegreat.github.io', '']) {
      expect(isAppHost(h)).toBe(true);
    }
  });
  it('treats customer domains as non-app hosts', () => {
    expect(isAppHost('www.pyespalawncare.co.nz')).toBe(false);
  });
  it('honours extra app hosts', () => {
    expect(isAppHost('staging.example.com', ['staging.example.com'])).toBe(true);
  });
});

describe('hostCandidates / pickOwner', () => {
  it('adds the www/apex twin', () => {
    expect(hostCandidates('www.a.com')).toEqual(['www.a.com', 'a.com']);
    expect(hostCandidates('a.com')).toEqual(['a.com', 'www.a.com']);
  });
  const recs: DomainRecord[] = [
    { uid: 'u1', domain: 'www.a.com', status: 'active' },
    { uid: 'u2', domain: 'b.com', status: 'site-verification-pending' },
  ];
  it('matches exact and twin hosts only for routable statuses', () => {
    expect(pickOwner('www.a.com', recs)).toBe('u1');
    expect(pickOwner('a.com', recs)).toBe('u1');
    expect(pickOwner('b.com', recs)).toBeNull();
    expect(pickOwner('c.com', recs)).toBeNull();
  });
});

describe('HostSiteResolver', () => {
  const make = (records: DomainRecord[], now = { t: 0 }) => {
    const lookup = vi.fn(async (d: string) => records.filter((r) => r.domain === d));
    return { lookup, r: new HostSiteResolver(lookup, { now: () => now.t }), now };
  };

  it('resolves a verified custom domain to its owner', async () => {
    const { r } = make([{ uid: 'u1', domain: 'www.a.com', status: 'active' }]);
    expect(await r.resolve('www.a.com')).toBe('u1');
    expect(await r.resolve('A.com:443')).toBe('u1');
  });

  it('falls back (null) for unknown hosts and never looks up app hosts', async () => {
    const { r, lookup } = make([]);
    expect(await r.resolve('unknown.com')).toBeNull();
    expect(await r.resolve('businessflow-722923667291.us-central1.run.app')).toBeNull();
    expect(lookup).toHaveBeenCalledTimes(2); // unknown.com + www twin only
  });

  it('caches results until the TTL expires', async () => {
    const { r, lookup, now } = make([{ uid: 'u1', domain: 'a.com', status: 'active' }]);
    await r.resolve('a.com');
    await r.resolve('a.com');
    expect(lookup).toHaveBeenCalledTimes(2);
    now.t = 10 * 60_000;
    await r.resolve('a.com');
    expect(lookup).toHaveBeenCalledTimes(4);
  });

  it('returns null instead of throwing when the lookup fails', async () => {
    const r = new HostSiteResolver(async () => { throw new Error('boom'); });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await r.resolve('a.com')).toBeNull();
    warn.mockRestore();
  });
});
