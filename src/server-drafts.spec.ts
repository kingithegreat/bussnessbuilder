import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The Growth Coach must never author a customer's words.
 *
 * A previous fix claimed in its commit message that the fabricated review had
 * been replaced, while the string was still in the file — the edit silently did
 * not apply and nobody looked again. This test reads the source so the claim
 * cannot drift from the code.
 *
 * Fake reviews are unlawful in NZ/AU/US (FTC 16 CFR 465 explicitly covers
 * AI-generated testimonials) and the liability lands on the business owner.
 */
describe('growth drafts never fabricate a customer review', () => {
  const server = readFileSync(join(process.cwd(), 'src/server.ts'), 'utf8');
  const growth = readFileSync(join(process.cwd(), 'src/app/admin-growth.component.ts'), 'utf8');

  it('no invented review text is generated anywhere on the server', () => {
    expect(server).not.toContain('provided excellent service');
    expect(server).not.toContain('Highly recommended!');
    expect(server).not.toContain('Satisfied customer');
  });

  it("the 'trust' draft asks the customer for a review rather than writing one", () => {
    const trust = server.match(/case 'trust': return `([^`]*)`/);
    expect(trust).not.toBeNull();
    const draft = trust![1];
    // Addressed TO a customer, not quoting one.
    expect(draft).toContain('[Customer Name]');
    expect(draft.toLowerCase()).toContain('leaving us a short review');
    // A quoted sentence is the shape of a fabricated testimonial.
    expect(draft).not.toContain('"');
  });

  it('nothing can publish a draft into testimonials', () => {
    expect(growth).not.toContain('addAsTestimonial');
    expect(growth).not.toContain('setTestimonials');
    expect(growth).not.toContain('rating: 5');
  });
});
