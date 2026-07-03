import { readPublicSiteContext, readPublicPageContext } from './public-site-context';

describe('readPublicSiteContext', () => {
  const data = { profile: { name: 'Biz', type: 'Cleaning', email: 'a@b.c' } };

  it('accepts a well-formed { publicSite: { uid, data } } context', () => {
    const ctx = readPublicSiteContext({ publicSite: { uid: 'user-1', data } });
    expect(ctx).toEqual({ uid: 'user-1', data });
  });

  it('rejects null, primitives and empty objects', () => {
    expect(readPublicSiteContext(null)).toBeNull();
    expect(readPublicSiteContext(undefined)).toBeNull();
    expect(readPublicSiteContext('nope')).toBeNull();
    expect(readPublicSiteContext({})).toBeNull();
  });

  it('rejects a publicSite entry with a missing or empty uid', () => {
    expect(readPublicSiteContext({ publicSite: { data } })).toBeNull();
    expect(readPublicSiteContext({ publicSite: { uid: '', data } })).toBeNull();
    expect(readPublicSiteContext({ publicSite: { uid: 42, data } })).toBeNull();
  });

  it('rejects a publicSite entry with missing or non-object data', () => {
    expect(readPublicSiteContext({ publicSite: { uid: 'user-1' } })).toBeNull();
    expect(readPublicSiteContext({ publicSite: { uid: 'user-1', data: 'x' } })).toBeNull();
  });
});

describe('readPublicPageContext', () => {
  const page = { slug: 'about', title: 'About', content: 'Body text' };

  it('accepts a well-formed { publicPage: { uid, page } } context', () => {
    expect(readPublicPageContext({ publicPage: { uid: 'user-1', page } })).toEqual({ uid: 'user-1', page });
  });

  it('rejects null, primitives and empty objects', () => {
    expect(readPublicPageContext(null)).toBeNull();
    expect(readPublicPageContext('nope')).toBeNull();
    expect(readPublicPageContext({})).toBeNull();
  });

  it('rejects a missing or empty uid', () => {
    expect(readPublicPageContext({ publicPage: { page } })).toBeNull();
    expect(readPublicPageContext({ publicPage: { uid: '', page } })).toBeNull();
    expect(readPublicPageContext({ publicPage: { uid: 7, page } })).toBeNull();
  });

  it('rejects a missing or malformed page', () => {
    expect(readPublicPageContext({ publicPage: { uid: 'u' } })).toBeNull();
    expect(readPublicPageContext({ publicPage: { uid: 'u', page: { title: 'A', content: 'B' } } })).toBeNull();
    expect(readPublicPageContext({ publicPage: { uid: 'u', page: { slug: 's', content: 'B' } } })).toBeNull();
    expect(readPublicPageContext({ publicPage: { uid: 'u', page: { slug: 's', title: 'A' } } })).toBeNull();
  });
});
