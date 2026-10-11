/**
 * Owner price display: currency + GST wording for the prices a business shows
 * on its own site. Has nothing to do with BusinessFlow's own subscription.
 */
export type SiteCurrency = 'NZD' | 'AUD' | 'USD' | 'GBP' | 'EUR';
export const SITE_CURRENCIES: { code: SiteCurrency; label: string; symbol: string }[] = [
  { code: 'NZD', label: 'NZ dollars (NZ$)', symbol: 'NZ$' },
  { code: 'AUD', label: 'Australian dollars (A$)', symbol: 'A$' },
  { code: 'USD', label: 'US dollars (US$)', symbol: 'US$' },
  { code: 'GBP', label: 'British pounds (£)', symbol: '£' },
  { code: 'EUR', label: 'Euros (€)', symbol: '€' },
];
export const NZ_GST_RATE = 0.15;

export interface PriceDisplaySettings { currency?: SiteCurrency | ''; pricesIncludeGst?: boolean }

/**
 * Format an owner's free-text price ("45", "$45", "from $35", "quoted").
 * Sites with no currency set (created before this feature) are shown exactly
 * as typed. A leading bare "$" is replaced by the currency symbol; text-only
 * prices ("POA") are left alone. NZD + GST-inclusive adds "incl. GST".
 */
export function displayPrice(raw: string | undefined | null, s: PriceDisplaySettings): string {
  const price = (raw || '').trim();
  if (!price || !s.currency) return price;
  const symbol = SITE_CURRENCIES.find(c => c.code === s.currency)?.symbol || '';
  if (!/\d/.test(price)) return price;
  let out = price;
  if (!/(NZ\$|A\$|US\$|£|€)/.test(out)) {
    out = /\$\s?\d/.test(out) ? out.replace(/\$\s?(\d)/, (_m, d: string) => symbol + d) : out.replace(/(\d[\d,.]*)/, (d: string) => symbol + d);
  }
  if (s.currency === 'NZD' && s.pricesIncludeGst !== false && !/gst/i.test(out)) out += ' incl. GST';
  if (s.currency === 'NZD' && s.pricesIncludeGst === false && !/gst/i.test(out)) out += ' + GST';
  return out;
}

export const roundCents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function formatMoney(amount: number, currency: SiteCurrency = 'NZD'): string {
  const symbol = SITE_CURRENCIES.find(c => c.code === currency)?.symbol || '';
  return `${amount < 0 ? '-' : ''}${symbol}${Math.abs(roundCents(amount)).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
