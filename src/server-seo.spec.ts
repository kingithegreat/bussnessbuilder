import {
  escapeXml,
  originFromRequest,
  buildSiteSitemap,
  buildRobotsTxt,
  SitemapPage,
} from './server-seo';

describe('escapeXml', () => {
  it('escapes the five XML-significant characters', () => {
    expect(escapeXml(`a<b>c&d'e"f`)).toBe('a&lt;b&gt;c&amp;d&apos;e&quot;f');
  });

  it('leaves safe text untouched', () => {
    expect(escapeXml('https://example.com/site/acme')).toBe('https://example.com/site/acme');
  });
});

describe('originFromRequest', () => {
  it('prefers forwarded proto + host (Cloud Run proxy)', () => {
    expect(originFromRequest({ forwardedProto: 'https', forwardedHost: 'app.example.com', host: 'internal' }))
      .toBe('https://app.example.com');
  });

  it('falls back to the Host header and defaults proto to https', () => {
    expect(originFromRequest({ host: 'example.com' })).toBe('https://example.com');
  });

  it('takes the first value when a header carries a comma list', () => {
    expect(originFromRequest({ forwardedProto: 'https, http', forwardedHost: 'a.com, b.com' }))
      .toBe('https://a.com');
  });

  it('returns empty string when no host is known', () => {
    expect(originFromRequest({})).toBe('');
  });
});

describe('buildSiteSitemap', () => {
  const pages: SitemapPage[] = [
    { slug: 'about', published: true, updatedAt: '2026-06-01T12:00:00.000Z' },
    { slug: 'draft', published: false },
    { slug: 'pricing', published: true },
  ];

  it('always includes the site home as the first url', () => {
    const xml = buildSiteSitemap('https://example.com', 'acme', []);
    expect(xml).toContain('<loc>https://example.com/site/acme</loc>');
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  });

  it('includes published pages and excludes unpublished ones', () => {
    const xml = buildSiteSitemap('https://example.com', 'acme', pages);
    expect(xml).toContain('<loc>https://example.com/site/acme/pages/about</loc>');
    expect(xml).toContain('<loc>https://example.com/site/acme/pages/pricing</loc>');
    expect(xml).not.toContain('draft');
  });

  it('emits a YYYY-MM-DD lastmod only when a timestamp is present', () => {
    const xml = buildSiteSitemap('https://example.com', 'acme', pages);
    expect(xml).toContain('<lastmod>2026-06-01</lastmod>');
    // 'pricing' has no updatedAt, so its url block carries no lastmod.
    const pricingBlock = xml.slice(xml.indexOf('/pages/pricing'));
    expect(pricingBlock.slice(0, pricingBlock.indexOf('</url>'))).not.toContain('<lastmod>');
  });

  it('url-encodes the identifier and slugs and strips a trailing slash on origin', () => {
    const xml = buildSiteSitemap('https://example.com/', 'a c', [{ slug: 'q&a', published: true }]);
    expect(xml).toContain('<loc>https://example.com/site/a%20c</loc>');
    expect(xml).toContain('/pages/q%26a</loc>');
    expect(xml).not.toContain('https://example.com//site');
  });
});

describe('buildRobotsTxt', () => {
  it('allows crawling but disallows app + api surfaces', () => {
    const txt = buildRobotsTxt('https://example.com');
    expect(txt).toContain('User-agent: *');
    expect(txt).toContain('Allow: /');
    expect(txt).toContain('Disallow: /admin');
    expect(txt).toContain('Disallow: /api/');
    expect(txt).toContain('Host: https://example.com');
    expect(txt.endsWith('\n')).toBe(true);
  });

  it('omits the Host line when origin is unknown', () => {
    expect(buildRobotsTxt('')).not.toContain('Host:');
  });
});
