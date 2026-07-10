import { resolvePublicSiteUrl, qrFilenameFor } from './qr-code';
import type { DomainMappingState } from './types';

function mapping(overrides: Partial<DomainMappingState> = {}): DomainMappingState {
  return {
    status: 'none',
    domain: '',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('qr-code', () => {
  describe('resolvePublicSiteUrl', () => {
    it('prefers the active custom domain over friendly/site URLs', () => {
      const url = resolvePublicSiteUrl({
        mappingState: mapping({ status: 'active', domain: 'www.apexcleaners.co.nz' }),
        friendlyUrl: 'https://businessflow.example/site/apex-cleaners',
        siteUrl: 'https://businessflow.example/site/uid123',
      });
      expect(url).toBe('https://www.apexcleaners.co.nz');
    });

    it('falls back to the friendly URL when the domain mapping is not active', () => {
      const url = resolvePublicSiteUrl({
        mappingState: mapping({ status: 'mapping-pending', domain: 'www.apexcleaners.co.nz' }),
        friendlyUrl: 'https://businessflow.example/site/apex-cleaners',
        siteUrl: 'https://businessflow.example/site/uid123',
      });
      expect(url).toBe('https://businessflow.example/site/apex-cleaners');
    });

    it('falls back to the friendly URL when there is no mapping state at all', () => {
      const url = resolvePublicSiteUrl({
        mappingState: null,
        friendlyUrl: 'https://businessflow.example/site/apex-cleaners',
        siteUrl: 'https://businessflow.example/site/uid123',
      });
      expect(url).toBe('https://businessflow.example/site/apex-cleaners');
    });

    it('falls back to the raw site URL when there is no friendly URL', () => {
      const url = resolvePublicSiteUrl({
        mappingState: undefined,
        friendlyUrl: '',
        siteUrl: 'https://businessflow.example/site/uid123',
      });
      expect(url).toBe('https://businessflow.example/site/uid123');
    });

    it('does not use the domain if status is active but the domain string is empty', () => {
      const url = resolvePublicSiteUrl({
        mappingState: mapping({ status: 'active', domain: '' }),
        friendlyUrl: 'https://businessflow.example/site/apex-cleaners',
        siteUrl: 'https://businessflow.example/site/uid123',
      });
      expect(url).toBe('https://businessflow.example/site/apex-cleaners');
    });
  });

  describe('qrFilenameFor', () => {
    it('derives a clean filename from a plain https URL', () => {
      expect(qrFilenameFor('https://businessflow.example/site/apex-cleaners')).toBe(
        'businessflow.example-site-apex-cleaners-qr-code.png'
      );
    });

    it('derives a clean filename from a custom domain', () => {
      expect(qrFilenameFor('https://www.apexcleaners.co.nz')).toBe('www.apexcleaners.co.nz-qr-code.png');
    });

    it('strips http (not just https) and trims stray punctuation', () => {
      expect(qrFilenameFor('http://example.com/')).toBe('example.com-qr-code.png');
    });

    it('falls back to a generic name for empty or unusable input', () => {
      expect(qrFilenameFor('')).toBe('site-qr-code.png');
      expect(qrFilenameFor('https://')).toBe('site-qr-code.png');
    });
  });
});
