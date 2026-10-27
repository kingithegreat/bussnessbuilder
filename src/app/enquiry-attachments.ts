export const ATTACHMENT_MAX_BYTES = 512 * 1024;
export const ATTACHMENT_MAX_FILES = 3;
export const ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export interface EnquiryAttachment { id: string; name: string; type: string; size: number; fieldId: string }
export interface AttachmentInput { name: string; type: string; base64: string; fieldId: string }
export function attachmentFileError(file: { size: number; type: string }): string | null {
  if (!(ATTACHMENT_TYPES as readonly string[]).includes(file.type)) return 'Choose a JPEG, PNG, WebP image or PDF.';
  if (file.size <= 0 || file.size > ATTACHMENT_MAX_BYTES) return 'Each file must be between 1 byte and 512 KB.';
  return null;
}
