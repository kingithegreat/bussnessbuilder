import {
  buildSiteVerificationTokenRequest,
  parseSiteVerificationTokenResponse,
  buildOwnershipTxtRecord,
  buildSiteVerificationConfirmRequest,
  buildDomainMappingCreateRequest,
  buildDomainMappingGetRequest,
  parseDomainMappingResponse,
  classifyGcpError,
} from './server-domain-mapping';

describe('buildSiteVerificationTokenRequest', () => {
  it('requests a DNS_TXT token for the domain', () => {
    const { url, body } = buildSiteVerificationTokenRequest('example.com');
    expect(url).toContain('siteVerification');
    expect(body).toEqual({
      site: { type: 'INET_DOMAIN', identifier: 'example.com' },
      verificationMethod: 'DNS_TXT',
    });
  });
});

describe('parseSiteVerificationTokenResponse', () => {
  it('extracts the token string', () => {
    expect(parseSiteVerificationTokenResponse({ token: 'abc123' })).toEqual({ token: 'abc123' });
  });

  it('returns null when the token is missing or malformed', () => {
    expect(parseSiteVerificationTokenResponse({})).toBeNull();
    expect(parseSiteVerificationTokenResponse(null)).toBeNull();
    expect(parseSiteVerificationTokenResponse({ token: 42 })).toBeNull();
  });
});

describe('buildOwnershipTxtRecord', () => {
  it('builds an apex TXT record with the raw token as the value', () => {
    expect(buildOwnershipTxtRecord('tok')).toEqual({ type: 'TXT', host: '@', value: 'tok', ttl: 3600 });
  });
});

describe('buildSiteVerificationConfirmRequest', () => {
  it('posts a webResource confirmation for the domain', () => {
    const { url, body } = buildSiteVerificationConfirmRequest('example.com');
    expect(url).toContain('verificationMethod=DNS_TXT');
    expect(body).toEqual({ site: { type: 'INET_DOMAIN', identifier: 'example.com' } });
  });
});

describe('buildDomainMappingCreateRequest', () => {
  it('builds a DomainMapping resource pointed at the service', () => {
    const { url, body } = buildDomainMappingCreateRequest('proj', 'us-central1', 'businessflow', 'example.com') as {
      url: string;
      body: { metadata: { name: string; namespace: string }; spec: { routeName: string } };
    };
    expect(url).toBe('https://domains.cloudrun.com/v1/namespaces/proj/domainmappings');
    expect(body.metadata).toEqual({ name: 'example.com', namespace: 'proj' });
    expect(body.spec.routeName).toBe('businessflow');
  });
});

describe('buildDomainMappingGetRequest', () => {
  it('builds the get URL for a specific domain', () => {
    expect(buildDomainMappingGetRequest('proj', 'example.com')).toEqual({
      url: 'https://domains.cloudrun.com/v1/namespaces/proj/domainmappings/example.com',
    });
  });
});

describe('parseDomainMappingResponse', () => {
  it('extracts resource records and the Ready condition when active', () => {
    const result = parseDomainMappingResponse({
      status: {
        resourceRecords: [
          { name: '', type: 'CNAME', rrdata: 'ghs.googlehosted.com' },
          { name: '', type: 'AAAA', rrdata: '2001:db8::1' },
        ],
        conditions: [{ type: 'Ready', status: 'True', message: 'Certificate provisioned' }],
      },
    });
    expect(result.ready).toBe(true);
    expect(result.certMessage).toBe('Certificate provisioned');
    expect(result.cloudRunDnsRecords).toEqual([
      { type: 'CNAME', host: '@', value: 'ghs.googlehosted.com', ttl: 3600 },
      { type: 'AAAA', host: '@', value: '2001:db8::1', ttl: 3600 },
    ]);
  });

  it('reports not-ready while certificate provisioning is pending', () => {
    const result = parseDomainMappingResponse({
      status: { conditions: [{ type: 'Ready', status: 'Unknown', message: 'Provisioning certificate' }] },
    });
    expect(result.ready).toBe(false);
    expect(result.certMessage).toBe('Provisioning certificate');
    expect(result.cloudRunDnsRecords).toEqual([]);
  });

  it('handles a response with no status at all', () => {
    expect(parseDomainMappingResponse({})).toEqual({ cloudRunDnsRecords: [], ready: false, certMessage: undefined });
  });

  it('drops resource records missing required fields', () => {
    const result = parseDomainMappingResponse({
      status: { resourceRecords: [{ name: '', type: 'CNAME' }, { type: 'A', rrdata: '1.2.3.4' }] },
    });
    expect(result.cloudRunDnsRecords).toEqual([]);
  });
});

describe('classifyGcpError', () => {
  it('flags a disabled Site Verification API', () => {
    const body = { error: { code: 403, status: 'PERMISSION_DENIED', message: 'Site Verification API has not been used in project 123 before or it is disabled.' } };
    expect(classifyGcpError(403, body)).toBe('SITE_VERIFICATION_API_DISABLED');
  });

  it('flags a disabled Run API distinctly from Site Verification', () => {
    const body = { error: { code: 403, message: 'Cloud Run Admin API has not been used in project 123 before or it is disabled.' } };
    expect(classifyGcpError(403, body)).toBe('RUN_API_DISABLED');
  });

  it('classifies a generic permission error', () => {
    expect(classifyGcpError(403, { error: { status: 'PERMISSION_DENIED', message: 'denied' } })).toBe('PERMISSION_DENIED');
  });

  it('classifies a 409 as domain already mapped', () => {
    expect(classifyGcpError(409, { error: { status: 'ALREADY_EXISTS', message: 'domain already mapped' } })).toBe('DOMAIN_ALREADY_MAPPED');
  });

  it('classifies a 429 as quota exceeded', () => {
    expect(classifyGcpError(429, { error: { status: 'RESOURCE_EXHAUSTED', message: 'quota' } })).toBe('MAPPING_QUOTA_EXCEEDED');
  });

  it('classifies a 400 verification error as not-yet-verified', () => {
    expect(classifyGcpError(400, { error: { message: 'Domain is not verified for this account' } })).toBe('NOT_YET_VERIFIED');
  });

  it('falls back to unknown for anything else', () => {
    expect(classifyGcpError(500, { error: { message: 'boom' } })).toBe('UNKNOWN');
    expect(classifyGcpError(500, null)).toBe('UNKNOWN');
  });
});
