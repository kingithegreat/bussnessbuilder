import { parseAttachments, attachmentMetadata, attachmentsRouter } from './server-attachments';
import { attachmentFileError } from './app/enquiry-attachments';
import { startFeatureServer } from './testing/feature-harness';
const pdf = { fieldId: 'plan', name: 'plan.pdf', type: 'application/pdf', base64: Buffer.from('%PDF-1.7\nExample').toString('base64') };
describe('Private enquiry attachments', () => {
  it('validates actual bytes, not only the browser MIME type', () => {
    const [file] = parseAttachments([pdf], 'enquiry');
    expect(file.size).toBe(16); expect(attachmentMetadata(file)).not.toHaveProperty('base64');
    expect(parseAttachments(undefined, 'enquiry')).toEqual([]);
    for (const value of [[{ ...pdf, base64: Buffer.from('<script>').toString('base64') }], [{ ...pdf, name: '../x.pdf' }], [pdf,pdf], [{ ...pdf, base64: 'invalid' }], [{ ...pdf, type: 'text/html' }], [{ ...pdf, base64: Buffer.alloc(512 * 1024 + 1).toString('base64') }]]) {
      expect(() => parseAttachments(value, 'enquiry')).toThrow();
    }
    expect(attachmentFileError({ type: 'image/svg+xml', size: 10 })).toContain('Choose');
  });
  it('accepts the largest allowed file without a regular-expression stack overflow', () => {
    const bytes = Buffer.alloc(512 * 1024); bytes.write('%PDF-1.7');
    expect(parseAttachments([{ ...pdf, base64: bytes.toString('base64') }], 'enquiry')[0].size).toBe(bytes.length);
  });
  it('only lets the owner download, with forced-download and no-cache headers', async () => {
    const [file] = parseAttachments([pdf], 'enquiry');
    const h = await startFeatureServer(attachmentsRouter, { [`enquiryAttachments/owner/files/${file.id}`]: { ...file } });
    try {
      expect((await h.call('GET', `/api/attachments/${file.id}?uid=owner`)).status).toBe(401);
      expect((await h.call('GET', `/api/attachments/${file.id}?uid=other`, undefined, true)).status).toBe(401);
      const res = await fetch(`${h.base}/api/attachments/${file.id}?uid=owner`, { headers: { Authorization: 'Bearer verified' } });
      expect(res.status).toBe(200); expect(await res.text()).toContain('%PDF-');
      expect(res.headers.get('content-type')).toContain('application/octet-stream');
      expect(res.headers.get('content-disposition')).toContain('attachment;'); expect(res.headers.get('cache-control')).toContain('no-store');
    } finally { await h.close(); }
  });
});
