import {
  normalizeDomain,
  validateDomain,
  requiredRecords,
  verificationTxtRecord,
  recordQueryName,
  recordMatches,
  deriveStatus,
  verifyDomain,
  HOSTING_TARGET,
  HOSTING_A_RECORDS,
  DnsRecord,
} from './domain-verification';

describe('domain-verification', () => {
  const UID = 'user-abc123';

  describe('normalizeDomain', () => {
    it('strips protocol, path, casing and trailing dot', () => {
      expect(normalizeDomain('https://WWW.Example.com/path?q=1')).toBe('www.example.com');
      expect(normalizeDomain('  Example.COM.  ')).toBe('example.com');
      expect(normalizeDomain('http://shop.example.org/')).toBe('shop.example.org');
    });
    it('handles empty / nullish input', () => {
      expect(normalizeDomain('')).toBe('');
      expect(normalizeDomain(undefined as unknown as string)).toBe('');
    });
  });

  describe('validateDomain', () => {
    it('accepts an apex domain', () => {
      const v = validateDomain('example.com');
      expect(v.valid).toBe(true);
      expect(v.kind).toBe('apex');
      expect(v.normalized).toBe('example.com');
    });
    it('accepts a subdomain', () => {
      const v = validateDomain('www.example.com');
      expect(v.valid).toBe(true);
      expect(v.kind).toBe('subdomain');
    });
    it('rejects a bare label', () => {
      const v = validateDomain('localhost');
      expect(v.valid).toBe(false);
      expect(v.kind).toBe('invalid');
      expect(v.error).toContain('full domain');
    });
    it('rejects empty input', () => {
      expect(validateDomain('').valid).toBe(false);
      expect(validateDomain('   ').error).toContain('Enter a domain');
    });
    it('rejects spaces and bad characters', () => {
      expect(validateDomain('exa mple.com').valid).toBe(false);
      expect(validateDomain('exa_mple.com').valid).toBe(false);
      expect(validateDomain('-bad.com').valid).toBe(false);
    });
    it('rejects a numeric / too-short tld', () => {
      expect(validateDomain('example.c').valid).toBe(false);
      expect(validateDomain('example.123').valid).toBe(false);
    });
  });

  describe('requiredRecords', () => {
    it('returns A records + TXT for an apex domain', () => {
      const recs = requiredRecords('example.com', UID);
      const aRecords = recs.filter((r) => r.type === 'A');
      expect(aRecords.length).toBe(HOSTING_A_RECORDS.length);
      expect(aRecords.every((r) => r.host === '@')).toBe(true);
      expect(aRecords.map((r) => r.value).sort()).toEqual([...HOSTING_A_RECORDS].sort());
      expect(recs.some((r) => r.type === 'TXT')).toBe(true);
      expect(recs.some((r) => r.type === 'CNAME')).toBe(false);
    });
    it('returns a CNAME + TXT for a subdomain', () => {
      const recs = requiredRecords('www.example.com', UID);
      const cname = recs.find((r) => r.type === 'CNAME');
      expect(cname).toBeTruthy();
      expect(cname!.host).toBe('www');
      expect(cname!.value).toBe(`${HOSTING_TARGET}.`);
      expect(recs.some((r) => r.type === 'A')).toBe(false);
      expect(recs.some((r) => r.type === 'TXT')).toBe(true);
    });
    it('returns nothing for an invalid domain', () => {
      expect(requiredRecords('not a domain', UID)).toEqual([]);
    });
    it('scopes the TXT token to the uid', () => {
      expect(verificationTxtRecord(UID).value).toBe(`businessflow-site-verification=${UID}`);
    });
  });

  describe('recordQueryName', () => {
    it('queries the apex at the bare domain', () => {
      const a: DnsRecord = { type: 'A', host: '@', value: 'x', ttl: 1 };
      expect(recordQueryName(a, 'example.com')).toBe('example.com');
    });
    it('queries a subdomain CNAME at host.registrable-domain', () => {
      const c: DnsRecord = { type: 'CNAME', host: 'www', value: 'x', ttl: 1 };
      expect(recordQueryName(c, 'www.example.com')).toBe('www.example.com');
    });
    it('queries the TXT record at _businessflow.<domain>', () => {
      const t = verificationTxtRecord(UID);
      expect(recordQueryName(t, 'example.com')).toBe('_businessflow.example.com');
    });
  });

  describe('recordMatches', () => {
    it('matches an A record ignoring trailing dots / case', () => {
      const a: DnsRecord = { type: 'A', host: '@', value: '216.239.32.21', ttl: 1 };
      expect(recordMatches(a, ['216.239.32.21'])).toBe(true);
      expect(recordMatches(a, ['1.2.3.4'])).toBe(false);
    });
    it('matches a CNAME ignoring trailing dot', () => {
      const c: DnsRecord = { type: 'CNAME', host: 'www', value: `${HOSTING_TARGET}.`, ttl: 1 };
      expect(recordMatches(c, [HOSTING_TARGET])).toBe(true);
    });
    it('matches a TXT record by substring (handles surrounding quotes)', () => {
      const t = verificationTxtRecord(UID);
      expect(recordMatches(t, [`"businessflow-site-verification=${UID}"`])).toBe(true);
      expect(recordMatches(t, ['some-other-txt'])).toBe(false);
    });
  });

  describe('deriveStatus', () => {
    const recs = requiredRecords('www.example.com', UID);
    const cname = recs.find((r) => r.type === 'CNAME')!;
    const txt = recs.find((r) => r.type === 'TXT')!;

    it('is pending when nothing is found', () => {
      const res = deriveStatus(recs.map((r) => ({ record: r, found: [] })));
      expect(res.state).toBe('pending');
    });
    it('is verified when primary + TXT both match', () => {
      const res = deriveStatus([
        { record: cname, found: [HOSTING_TARGET] },
        { record: txt, found: [`businessflow-site-verification=${UID}`] },
      ]);
      expect(res.state).toBe('verified');
    });
    it('is misconfigured when something wrong is published', () => {
      const res = deriveStatus([
        { record: cname, found: ['wrong-target.example.net'] },
        { record: txt, found: [] },
      ]);
      expect(res.state).toBe('misconfigured');
    });
    it('is not verified when TXT is missing even if CNAME matches', () => {
      const res = deriveStatus([
        { record: cname, found: [HOSTING_TARGET] },
        { record: txt, found: [] },
      ]);
      expect(res.state).not.toBe('verified');
    });
  });

  describe('verifyDomain (with injected fetch)', () => {
    function fakeFetch(map: Record<string, string[]>): typeof fetch {
      return (async (url: string) => {
        const u = new URL(url);
        const name = u.searchParams.get('name')!.replace(/\.$/, '');
        const answers = (map[name] || []).map((data) => ({ data }));
        return {
          ok: true,
          json: async () => ({ Answer: answers.length ? answers : undefined }),
        };
      }) as unknown as typeof fetch;
    }

    it('reports verified when DNS returns the right values', async () => {
      const fetchImpl = fakeFetch({
        'www.example.com': [HOSTING_TARGET + '.'],
        '_businessflow.example.com': [`"businessflow-site-verification=${UID}"`],
      });
      const res = await verifyDomain('www.example.com', UID, fetchImpl);
      expect(res.state).toBe('verified');
    });

    it('reports pending when DNS returns nothing', async () => {
      const res = await verifyDomain('www.example.com', UID, fakeFetch({}));
      expect(res.state).toBe('pending');
    });

    it('reports unconfigured for an invalid domain', async () => {
      const res = await verifyDomain('nope', UID, fakeFetch({}));
      expect(res.state).toBe('unconfigured');
    });
  });
});
