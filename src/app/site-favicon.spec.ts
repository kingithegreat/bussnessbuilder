import { describe, it, expect, beforeEach } from 'vitest';
import { resolveFaviconHref, applyFavicon } from './site-favicon';

describe('resolveFaviconHref', () => {
  it('uses the uploaded logo', () => {
    expect(resolveFaviconHref({ logoUrl: 'https://cdn.example/logo.png' })).toBe('https://cdn.example/logo.png');
    expect(resolveFaviconHref({ logoUrl: 'http://example/logo.png' })).toBe('http://example/logo.png');
  });

  it('accepts inline images and root-relative paths', () => {
    expect(resolveFaviconHref({ logoUrl: 'data:image/png;base64,AAA' })).toBe('data:image/png;base64,AAA');
    expect(resolveFaviconHref({ logoUrl: '/assets/logo.png' })).toBe('/assets/logo.png');
  });

  it("returns '' when there is no logo, so the platform default survives", () => {
    expect(resolveFaviconHref({ logoUrl: '' })).toBe('');
    expect(resolveFaviconHref({ logoUrl: '   ' })).toBe('');
    expect(resolveFaviconHref({})).toBe('');
    expect(resolveFaviconHref(null)).toBe('');
    expect(resolveFaviconHref(undefined)).toBe('');
  });

  it('refuses schemes that have no business in a document', () => {
    // logoUrl is user-supplied.
    expect(resolveFaviconHref({ logoUrl: 'javascript:alert(1)' })).toBe('');
    expect(resolveFaviconHref({ logoUrl: 'data:text/html,<script>' })).toBe('');
    expect(resolveFaviconHref({ logoUrl: 'file:///etc/passwd' })).toBe('');
    expect(resolveFaviconHref({ logoUrl: '  javascript:alert(1)' })).toBe('');
  });
});

describe('applyFavicon', () => {
  let doc: Document;

  beforeEach(() => {
    doc = document.implementation.createHTMLDocument('t');
  });

  it('replaces the href on an existing icon link', () => {
    const existing = doc.createElement('link');
    existing.rel = 'icon';
    existing.setAttribute('type', 'image/x-icon');
    existing.setAttribute('href', 'favicon.ico');
    doc.head.appendChild(existing);

    applyFavicon(doc, 'https://cdn.example/logo.png');

    const links = doc.querySelectorAll('link[rel~="icon"]');
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toBe('https://cdn.example/logo.png');
    // the .ico type hint must not survive onto a PNG
    expect(links[0].hasAttribute('type')).toBe(false);
  });

  it('creates the link when the document has none', () => {
    applyFavicon(doc, 'https://cdn.example/logo.png');
    expect(doc.querySelector('link[rel~="icon"]')?.getAttribute('href')).toBe('https://cdn.example/logo.png');
  });

  it('leaves the document alone for an empty href', () => {
    const existing = doc.createElement('link');
    existing.rel = 'icon';
    existing.setAttribute('href', 'favicon.ico');
    doc.head.appendChild(existing);

    applyFavicon(doc, '');

    expect(doc.querySelector('link[rel~="icon"]')?.getAttribute('href')).toBe('favicon.ico');
  });

  it('matches a multi-value rel like "shortcut icon"', () => {
    const existing = doc.createElement('link');
    existing.setAttribute('rel', 'shortcut icon');
    existing.setAttribute('href', 'favicon.ico');
    doc.head.appendChild(existing);

    applyFavicon(doc, '/logo.png');

    expect(doc.querySelectorAll('link[rel~="icon"]').length).toBe(1);
    expect(doc.querySelector('link[rel~="icon"]')?.getAttribute('href')).toBe('/logo.png');
  });
});
