import { buildPdf, PdfLine, PdfText } from './pdf-lite';
import { Quote, quoteTotals, MAX_QUOTE_LINES } from './quote-rules';
import { formatMoney } from './money';

export interface QuoteBusiness { name: string; email?: string; phone?: string; address?: string; gstNumber?: string }

/** Lay out a quote/invoice as a one-page A4 PDF. */
export function quotePdf(q: Quote, biz: QuoteBusiness): string {
  const T: PdfText[] = [];
  const L: PdfLine[] = [];
  const money = (n: number) => formatMoney(n, q.currency);
  T.push({ x: 50, y: 790, text: biz.name || 'Business', size: 18, bold: true });
  let y = 772;
  for (const line of [biz.address, biz.phone, biz.email, biz.gstNumber ? `GST number: ${biz.gstNumber}` : ''].filter(Boolean) as string[]) { T.push({ x: 50, y, text: line, size: 9 }); y -= 12; }
  const title = q.kind === 'invoice' ? (q.gstMode === 'none' ? 'INVOICE' : 'TAX INVOICE') : 'QUOTE';
  T.push({ x: 420, y: 790, text: title, size: 16, bold: true });
  T.push({ x: 420, y: 772, text: `No. ${q.number}`, size: 10 });
  T.push({ x: 420, y: 758, text: `Date: ${q.issueDate}`, size: 10 });
  T.push({ x: 420, y: 744, text: `${q.kind === 'invoice' ? 'Due' : 'Valid until'}: ${q.dueDate}`, size: 10 });
  T.push({ x: 50, y: 700, text: q.kind === 'invoice' ? 'Bill to' : 'Prepared for', size: 9, bold: true });
  T.push({ x: 50, y: 686, text: q.customerName || '-', size: 11 });
  if (q.customerEmail) T.push({ x: 50, y: 672, text: q.customerEmail, size: 9 });
  y = 640;
  T.push({ x: 50, y, text: 'Description', size: 9, bold: true });
  T.push({ x: 340, y, text: 'Qty', size: 9, bold: true });
  T.push({ x: 390, y, text: 'Unit price', size: 9, bold: true });
  T.push({ x: 480, y, text: 'Amount', size: 9, bold: true });
  L.push({ x1: 50, y1: y - 6, x2: 545, y2: y - 6 });
  y -= 22;
  for (const l of q.lines.slice(0, MAX_QUOTE_LINES)) {
    T.push({ x: 50, y, text: l.description.slice(0, 55), size: 10 });
    T.push({ x: 340, y, text: String(l.quantity), size: 10 });
    T.push({ x: 390, y, text: money(l.unitPrice), size: 10 });
    T.push({ x: 480, y, text: money(l.quantity * l.unitPrice), size: 10 });
    y -= 18;
  }
  L.push({ x1: 330, y1: y + 6, x2: 545, y2: y + 6 });
  const t = quoteTotals(q);
  const gstLabel = q.gstMode === 'inclusive' ? 'GST included (15%)' : 'GST (15%)';
  const rows: [string, string, boolean][] = q.gstMode === 'none'
    ? [['Total', money(t.total), true]]
    : [['Subtotal (excl. GST)', money(t.subtotal), false], [gstLabel, money(t.gst), false], ['Total (incl. GST)', money(t.total), true]];
  y -= 10;
  for (const [label, value, bold] of rows) { T.push({ x: 340, y, text: label, size: 10, bold }); T.push({ x: 480, y, text: value, size: 10, bold }); y -= 16; }
  if (q.notes) {
    y -= 16;
    T.push({ x: 50, y, text: 'Notes', size: 9, bold: true }); y -= 14;
    for (const chunk of wrap(q.notes, 95).slice(0, 12)) { T.push({ x: 50, y, text: chunk, size: 9 }); y -= 12; }
  }
  T.push({ x: 50, y: 40, text: 'Made with BusinessFlow Studio', size: 7 });
  return buildPdf(T, L);
}

function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      if ((line + ' ' + word).trim().length > width) { out.push(line.trim()); line = word; } else line += ' ' + word;
    }
    out.push(line.trim());
  }
  return out;
}
