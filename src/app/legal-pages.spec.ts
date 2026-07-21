import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// These two pages are the only place a customer can find out WHO they are
// contracting with and who controls their data. "BusinessFlow Studio" on its
// own is a trading name, not a legal person — naming only the brand is the
// exact gap this suite exists to stop from coming back. Asserted against the
// source text rather than a rendered component so the check can never be
// silently skipped by a template refactor.
const read = (f: string) => readFileSync(join(process.cwd(), 'src/app', f), 'utf8');

const PAGES = [
  { file: 'terms.component.ts', label: 'Terms of Service' },
  { file: 'privacy-policy.component.ts', label: 'Privacy Policy' },
];

describe('legal pages name a real legal entity', () => {
  for (const { file, label } of PAGES) {
    describe(label, () => {
      const src = read(file);

      it('identifies the operator as a named sole trader, not just the brand', () => {
        expect(src).toContain('Aden Kingi');
        expect(src).toMatch(/sole trader/i);
        expect(src).toMatch(/trading as BusinessFlow Studio/i);
      });

      it('states the jurisdiction the operator is based in', () => {
        expect(src).toMatch(/New Zealand/);
      });

      it('gives a contact email', () => {
        // &#64; is the HTML entity Angular templates use for @
        expect(src).toMatch(/[\w.]+(@|&#64;)[\w.]+/);
      });

      it('carries no unfilled bracket placeholders', () => {
        const placeholders = src.match(/\[[A-Z][A-Z _]{3,}\]/g) ?? [];
        expect(placeholders).toEqual([]);
      });

      it('shows a last-updated date', () => {
        expect(src).toMatch(/Last updated: \d{1,2} \w+ \d{4}/);
      });
    });
  }

  it('privacy policy names who the data controller is', () => {
    expect(read('privacy-policy.component.ts')).toMatch(/data controller/i);
  });
});
