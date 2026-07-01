import {
  isCrawler,
  escapeHtml,
  truncate,
  resolveSiteMeta,
  renderMetaTags,
  injectMetaTags,
  SiteMeta,
} from './server-meta';

describe('isCrawler', () => {
  it('matches common crawlers and unfurl bots (case-insensitive)', () => {
    for (const ua of [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Twitterbot/1.0',
      'LinkedInBot/1.0 (compatible; Mozilla/5.0)',
      'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
      'WhatsApp/2.23',
      'Mozilla/5.0 (compatible; bingbot/2.0)',
      'Discordbot/2.0',
    ]) {
      expect(isCrawler(ua)).toBe(true);
    }
  });

  it('does not match a normal browser', () => {
    expect(
      isCrawler('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'),
    ).toBe(false);
  });

  it('returns false for empty/undefined/null user agents', () => {
    expect(isCrawler(undefined)).toBe(false);
    expect(isCrawler(null)).toBe(false);
    expect(isCrawler('')).toBe(false);
  });
});

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`a<b>c&d'e"f`)).toBe('a&lt;b&gt;c&amp;d&#39;e&quot;f');
  });
  it('leaves safe text untouched', () => {
    expect(escapeHtml('Acme Plumbing — Fast & reliable')).toBe('Acme Plumbing — Fast &amp; reliable');
  });
});

describe('truncate', () => {
  it('collapses whitespace and leaves short text intact', () => {
    expect(truncate('  hello   world  ')).toBe('hello world');
  });
  it('trims to a word boundary and appends an ellipsis', () => {
    const long = 'word '.repeat(60).trim(); // 300 chars
    const out = truncate(long, 50);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toContain('  ');
  });
  it('handles empty input', () => {
    expect(truncate('')).toBe('');
  });
});

describe('resolveSiteMeta', () => {
  const url = 'https://businessflow.app/site/acme';

  it('uses name for the title and tagline for the description', () => {
    const m = resolveSiteMeta(
      { name: 'Acme Plumbing', tagline: 'Fast, friendly plumbers', type: 'Plumbing', logoUrl: 'https://cdn/x.png' },
      url,
    );
    expect(m.title).toBe('Acme Plumbing');
    expect(m.description).toBe('Fast, friendly plumbers');
    expect(m.siteName).toBe('Acme Plumbing');
    expect(m.imageUrl).toBe('https://cdn/x.png');
    expect(m.url).toBe(url);
  });

  it('falls back tagline -> description -> "name — type" -> generic', () => {
    expect(resolveSiteMeta({ name: 'Acme', description: 'We fix pipes' }, url).description).toBe('We fix pipes');
    expect(resolveSiteMeta({ name: 'Acme', type: 'Plumbing' }, url).description).toBe('Acme — Plumbing');
    expect(resolveSiteMeta({ name: 'Acme' }, url).description).toBe('Welcome to Acme.');
    expect(resolveSiteMeta({}, url).description).toBe('A website built with BusinessFlow.');
  });

  it('degrades to safe defaults when the profile is empty', () => {
    const m = resolveSiteMeta({}, url);
    expect(m.title).toBe('A BusinessFlow site');
    expect(m.siteName).toBe('BusinessFlow site');
    expect(m.imageUrl).toBe('');
  });

  it('prefixes a content-page title before the business name', () => {
    const m = resolveSiteMeta({ name: 'Acme' }, url + '/pages/about', 'About Us');
    expect(m.title).toBe('About Us – Acme');
  });
});

describe('renderMetaTags', () => {
  const base: SiteMeta = {
    title: 'Acme Plumbing',
    description: 'Fast & friendly',
    url: 'https://businessflow.app/site/acme',
    imageUrl: 'https://cdn/logo.png',
    siteName: 'Acme Plumbing',
  };

  it('renders title, description, canonical, OG and Twitter tags', () => {
    const html = renderMetaTags(base);
    expect(html).toContain('<title>Acme Plumbing</title>');
    expect(html).toContain('<meta name="description" content="Fast &amp; friendly" />');
    expect(html).toContain('<link rel="canonical" href="https://businessflow.app/site/acme" />');
    expect(html).toContain('<meta property="og:title" content="Acme Plumbing" />');
    expect(html).toContain('<meta property="og:url" content="https://businessflow.app/site/acme" />');
    expect(html).toContain('<meta property="og:image" content="https://cdn/logo.png" />');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).toContain('<meta name="twitter:image" content="https://cdn/logo.png" />');
  });

  it('omits image tags and uses summary card when no logo is set', () => {
    const html = renderMetaTags({ ...base, imageUrl: '' });
    expect(html).not.toContain('og:image');
    expect(html).not.toContain('twitter:image');
    expect(html).toContain('<meta name="twitter:card" content="summary" />');
  });

  it('escapes hostile values so tags cannot break out', () => {
    const html = renderMetaTags({ ...base, title: 'Ev"il</title><script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('Ev&quot;il&lt;/title&gt;&lt;script&gt;');
  });
});

describe('injectMetaTags', () => {
  const shell =
    '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <title>BusinessFlow Studio</title>\n    <base href="/" />\n  </head>\n  <body><app-root></app-root></body>\n</html>\n';
  const meta: SiteMeta = {
    title: 'Acme Plumbing',
    description: 'Fast, friendly plumbers',
    url: 'https://businessflow.app/site/acme',
    imageUrl: '',
    siteName: 'Acme Plumbing',
  };

  it('replaces the generic shell title with the site title', () => {
    const out = injectMetaTags(shell, meta);
    expect(out).not.toContain('BusinessFlow Studio');
    expect(out).toContain('<title>Acme Plumbing</title>');
  });

  it('injects the OG block before </head> and preserves the body', () => {
    const out = injectMetaTags(shell, meta);
    expect(out.indexOf('og:title')).toBeLessThan(out.indexOf('</head>'));
    expect(out).toContain('<app-root></app-root>');
    expect(out).toContain('<base href="/" />');
  });

  it('produces exactly one <title> element', () => {
    const out = injectMetaTags(shell, meta);
    expect(out.match(/<title>/g)?.length).toBe(1);
  });

  it('returns the document unchanged when there is no </head>', () => {
    const broken = '<html><body>no head here</body></html>';
    expect(injectMetaTags(broken, meta)).toBe(broken);
  });
});
