import { quotePdf } from './quote-pdf';
import { pdfSafe } from './pdf-lite';
import { Quote } from './quote-rules';

const q: Quote = { id: '1', number: 'Q-0001', kind: 'quote', status: 'draft', customerName: 'Kim (Pyes Pa)', customerEmail: 'kim@example.invalid',
  lines: [{ description: 'Lawn mow — front & back', quantity: 1, unitPrice: 50 }], gstMode: 'exclusive', currency: 'NZD', notes: 'Thanks!',
  issueDate: '2026-10-12', dueDate: '2026-11-11', createdAt: '', updatedAt: '' };

describe('quote PDF', () => {
  it('produces a well-formed one-page PDF with totals', () => {
    const pdf = quotePdf(q, { name: 'Pyes Pa Lawn Care', gstNumber: '123-456-789' });
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(pdf).toContain('(QUOTE)');
    expect(pdf).toContain('(NZ$57.50)');
    expect(pdf).toContain('Kim \\(Pyes Pa\\)');
    const xref = Number(pdf.match(/startxref\n(\d+)/)![1]);
    expect(pdf.slice(xref, xref + 4)).toBe('xref');
  });
  it('escapes and maps unsupported characters', () => {
    expect(pdfSafe('a—b (c) 😀')).toBe('a-b \\(c\\) ');
  });
});
