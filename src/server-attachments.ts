import express from 'express';
import { randomUUID } from 'node:crypto';
import { attachmentFileError, ATTACHMENT_MAX_FILES, EnquiryAttachment } from './app/enquiry-attachments';
import { FeatureDeps, authorizeOwner } from './server-owner';

export interface StoredAttachment extends EnquiryAttachment { base64: string; enquiryId: string }
export class AttachmentError extends Error {}
/** Private, bounded documents committed atomically with their enquiry. No public file URLs. */
export function parseAttachments(value: unknown, enquiryId: string): StoredAttachment[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > ATTACHMENT_MAX_FILES) throw new AttachmentError('Attach at most three files.');
  const fields = new Set<string>();
  return value.map(raw => {
    if (!raw || typeof raw !== 'object') throw new AttachmentError('Invalid attachment.');
    const { name, type, base64, fieldId } = raw;
    if (typeof name !== 'string' || !name.trim() || name.length > 200 || (/[\\/]/.test(name) || [...name].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127))
      || typeof type !== 'string' || typeof fieldId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(fieldId)
      || fields.has(fieldId) || typeof base64 !== 'string' || base64.length > 700000
      || (base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64))) throw new AttachmentError('Invalid attachment.');
    const bytes = Buffer.from(base64, 'base64');
    if (bytes.toString('base64') !== base64) throw new AttachmentError('Invalid attachment encoding.');
    const error = attachmentFileError({ type, size: bytes.length });
    if (error) throw new AttachmentError(error);
    const magic = type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : type === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : type === 'image/webp' ? bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
      : bytes.toString('ascii', 0, 5) === '%PDF-';
    if (!magic) throw new AttachmentError('The file contents do not match its type.');
    fields.add(fieldId);
    return { id: randomUUID(), name: name.trim(), type, size: bytes.length, fieldId, base64, enquiryId };
  });
}
export const attachmentMetadata = ({ id, name, type, size, fieldId }: EnquiryAttachment): EnquiryAttachment => ({ id, name, type, size, fieldId });
export function attachmentsRouter(deps: FeatureDeps): express.Router {
  const r = express.Router();
  r.get('/api/attachments/:id', async (req, res) => {
    try {
      const uid = await authorizeOwner(deps, req, res); if (!uid) return;
      const id = String(req.params['id']);
      if (!/^[0-9a-f-]{36}$/.test(id)) { res.status(400).json({ error: 'Invalid attachment.' }); return; }
      const db = await deps.getDb();
      const snap = await db.doc(`enquiryAttachments/${uid}/files/${id}`).get();
      if (!snap.exists) { res.status(404).json({ error: 'Attachment not found.' }); return; }
      const file = snap.data() as StoredAttachment;
      // Force download; user-supplied content is never served as an active document.
      res.set({ 'Content-Type': 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}` });
      res.send(Buffer.from(file.base64, 'base64'));
    } catch { res.status(500).json({ error: 'Could not download the attachment.' }); }
  });
  return r;
}
