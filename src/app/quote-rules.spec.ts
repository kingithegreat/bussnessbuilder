import { quoteTotals, sanitizeQuote, nextQuoteNumber } from './quote-rules';

describe('quote totals (NZ GST 15%)', () => {
  const lines = [{ description: 'Mow', quantity: 2, unitPrice: 50 }, { description: 'Edges', quantity: 1, unitPrice: 15 }];
  it('adds GST to exclusive prices', () => {
    expect(quoteTotals({ lines, gstMode: 'exclusive' })).toEqual({ subtotal: 115, gst: 17.25, total: 132.25 });
  });
  it('extracts GST (3/23) from inclusive prices', () => {
    expect(quoteTotals({ lines, gstMode: 'inclusive' })).toEqual({ subtotal: 100, gst: 15, total: 115 });
  });
  it('no GST when not registered', () => {
    expect(quoteTotals({ lines, gstMode: 'none' })).toEqual({ subtotal: 115, gst: 0, total: 115 });
  });
});

describe('sanitizeQuote / numbering', () => {
  it('cleans input and keeps server-owned fields', () => {
    const q = sanitizeQuote({ kind: 'invoice', status: 'accepted', lines: [{ description: 'A', quantity: '3', unitPrice: '9.999' }, {}], gstMode: 'weird', currency: 'XXX' },
      { id: 'x', number: 'INV-0001', status: 'draft', createdAt: '2026-10-01T00:00:00Z' }, '2026-10-02T00:00:00Z');
    expect(q.status).toBe('draft');
    expect(q.lines).toEqual([{ description: 'A', quantity: 3, unitPrice: 10 }]);
    expect(q.gstMode).toBe('exclusive');
    expect(q.currency).toBe('NZD');
    expect(q.dueDate).toBe('2026-11-01');
  });
  it('caps lines at what the PDF can itemise', () => {
    const q = sanitizeQuote({ lines: Array.from({ length: 40 }, (_, i) => ({ description: 'L' + i, quantity: 1, unitPrice: 1 })) },
      { id: 'x', number: 'Q-0001', status: 'draft', createdAt: '' }, '2026-10-02T00:00:00Z');
    expect(q.lines).toHaveLength(25);
  });
  it('numbers sequentially per kind', () => {
    expect(nextQuoteNumber([], 'quote')).toBe('Q-0001');
    expect(nextQuoteNumber([{ kind: 'quote', number: 'Q-0007' }, { kind: 'invoice', number: 'INV-0002' }], 'invoice')).toBe('INV-0003');
  });
});
