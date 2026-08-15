import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Capturing an enquiry is the one thing this product exists to do, and it was
 * silently losing them.
 *
 * The owner's admin loads business state ONCE per session (DataService.init
 * returns early when already initialised) and a debounced effect wrote the
 * whole in-memory state back with a full-document setDoc. So: a visitor's
 * enquiry lands server-side, the owner then changes anything at all, and 1.5s
 * later the client replaces the document with its stale snapshot. The lead is
 * destroyed with no error and no trace.
 *
 * These assertions are structural because the failure is a race no unit test
 * would reproduce reliably.
 */
describe('the owner autosave can never destroy a captured lead', () => {
  const fs = readFileSync(join(process.cwd(), 'src/app/firestore.service.ts'), 'utf8');
  const server = readFileSync(join(process.cwd(), 'src/server.ts'), 'utf8');

  const saveBusinessData = fs.slice(
    fs.indexOf('async saveBusinessData('),
    fs.indexOf('async updateEnquiryFields('),
  );

  it('saveBusinessData strips the server-owned collections', () => {
    expect(saveBusinessData).toContain("delete payload['enquiries']");
    expect(saveBusinessData).toContain("delete payload['activities']");
  });

  it('saveBusinessData merges rather than replacing the document', () => {
    expect(saveBusinessData).toContain('{ merge: true }');
    // A bare setDoc(ref, payload) would wipe whatever it omitted.
    expect(saveBusinessData).not.toMatch(/setDoc\(ref,\s*payload\)\s*;/);
  });

  it('owner edits to an enquiry go through a transaction', () => {
    const update = fs.slice(fs.indexOf('async updateEnquiryFields('));
    expect(update).toContain('runTransaction');
    // Applies fields to the server's copy rather than writing the stale array.
    expect(update).toContain("findIndex");
    expect(update).toContain('{ merge: true }');
  });

  it('a new enquiry notification defaults ON and falls back to the profile email', () => {
    // The gating document is only created if the owner visits Settings, so
    // requiring it meant no account ever got a notification.
    expect(server).toContain('const optedOut =');
    expect(server).toContain('|| ownerEmail');
    expect(server).not.toContain('if (!notifSnap.exists) return;');
  });
});
