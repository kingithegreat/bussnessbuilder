/**
 * Minimal dependency-free PDF writer (single A4 page, Helvetica, text + lines).
 * Enough for a clear quote/invoice; runs in the browser and on the server.
 */
export interface PdfText { x: number; y: number; text: string; size?: number; bold?: boolean }
export interface PdfLine { x1: number; y1: number; x2: number; y2: number }

/** Helvetica (WinAnsi) can't show every Unicode char; map common ones, drop the rest. */
export function pdfSafe(s: string): string {
  return s.replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function buildPdf(texts: PdfText[], lines: PdfLine[] = []): string {
  const ops: string[] = [];
  for (const l of lines) ops.push(`0.6 w ${l.x1} ${l.y1} m ${l.x2} ${l.y2} l S`);
  for (const t of texts) ops.push(`BT /${t.bold ? 'F2' : 'F1'} ${t.size || 10} Tf ${t.x} ${t.y} Td (${pdfSafe(t.text)}) Tj ET`);
  const content = ops.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${latin1Length(content)} >>\nstream\n${content}\nendstream`,
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((o, i) => { offsets.push(latin1Length(out)); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = latin1Length(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return out;
}

function latin1Length(s: string): number { return s.length; } // every char is one byte in latin1

/** Bytes for download/attachment (latin1). */
export function pdfBytes(pdf: string): Uint8Array {
  const b = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) b[i] = pdf.charCodeAt(i) & 0xff;
  return b;
}
