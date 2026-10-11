import { readHostSiteUid } from './host-site';

describe('readHostSiteUid', () => {
  it('reads a uid from the SSR request context', () => {
    expect(readHostSiteUid({ hostSiteUid: 'abc' })).toBe('abc');
  });
  it('returns null for anything else', () => {
    expect(readHostSiteUid(null)).toBeNull();
    expect(readHostSiteUid({})).toBeNull();
    expect(readHostSiteUid({ hostSiteUid: 5 })).toBeNull();
    expect(readHostSiteUid({ hostSiteUid: '' })).toBeNull();
  });
});
