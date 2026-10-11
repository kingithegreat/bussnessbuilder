import { validateSlug, avoidReserved } from './slug-rules';

describe('validateSlug', () => {
  it('accepts simple slugs and normalises case', () => {
    expect(validateSlug('Pyespa-Lawn')).toEqual({ ok: true, slug: 'pyespa-lawn' });
    expect(validateSlug('abc123')).toEqual({ ok: true, slug: 'abc123' });
  });
  it('rejects bad shapes', () => {
    for (const s of ['', 'ab', 'a'.repeat(41), 'has space', 'under_score', '-lead', 'trail-', 'dou--ble', 'émoji', 5, null]) {
      expect(validateSlug(s).ok).toBe(false);
    }
  });
  it('blocks reserved words', () => {
    for (const s of ['admin', 'api', 'login', 'pricing', 'site', 'www', 'setup']) {
      expect(validateSlug(s)).toEqual({ ok: false, error: 'That address is reserved — try another' });
    }
  });
});

describe('avoidReserved', () => {
  it('suffixes reserved words only', () => {
    expect(avoidReserved('admin')).toBe('admin-site');
    expect(avoidReserved('joes-plumbing')).toBe('joes-plumbing');
  });
});
