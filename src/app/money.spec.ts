import { displayPrice, formatMoney } from './money';

describe('displayPrice', () => {
  it('leaves legacy sites (no currency) untouched', () => {
    expect(displayPrice('$45', {})).toBe('$45');
  });
  it('adds NZ$ and GST wording', () => {
    expect(displayPrice('$45', { currency: 'NZD' })).toBe('NZ$45 incl. GST');
    expect(displayPrice('from $35', { currency: 'NZD', pricesIncludeGst: true })).toBe('from NZ$35 incl. GST');
    expect(displayPrice('45', { currency: 'NZD', pricesIncludeGst: false })).toBe('NZ$45 + GST');
    expect(displayPrice('NZ$50 incl GST', { currency: 'NZD' })).toBe('NZ$50 incl GST');
  });
  it('keeps text-only prices and other currencies', () => {
    expect(displayPrice('Quoted', { currency: 'NZD' })).toBe('Quoted');
    expect(displayPrice('$20', { currency: 'AUD' })).toBe('A$20');
  });
});

describe('formatMoney', () => {
  it('formats with symbol and cents', () => {
    expect(formatMoney(1234.5, 'NZD')).toBe('NZ$1,234.50');
  });
});
