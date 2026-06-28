import { EncodeUriComponentPipe } from './encode-uri.pipe';

describe('EncodeUriComponentPipe', () => {
  const pipe = new EncodeUriComponentPipe();

  it('returns an empty string for falsy input', () => {
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('encodes URL-unsafe characters', () => {
    expect(pipe.transform('a b&c')).toBe('a%20b%26c');
    expect(pipe.transform('hello@example.com')).toBe('hello%40example.com');
  });

  it('leaves already-safe strings unchanged', () => {
    expect(pipe.transform('plain-text_123')).toBe('plain-text_123');
  });
});
