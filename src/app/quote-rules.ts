import { NZ_GST_RATE, roundCents, SiteCurrency } from './money';

/** Must match what fits on the one-page PDF, so every charge is itemised. */
export const MAX_QUOTE_LINES = 25;

export type QuoteKind = 'quote' | 'invoice';
export type QuoteStatus = 'draft' | 'sent' | 'accepted';
export interface QuoteLine { description: string; quantity: number; unitPrice: number }
export interface Quote {
  id: string;
  number: string;
  kind: QuoteKind;
  status: QuoteStatus;
  customerName: string;
  customerEmail: string;
  lines: QuoteLine[];
  /** 'exclusive': unit prices exclude GST (15% added). 'inclusive': prices already include GST. 'none': not GST-registered. */
  gstMode: 'exclusive' | 'inclusive' | 'none';
  currency: SiteCurrency;
  notes: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD (valid-until for quotes)
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  acceptedAt?: string;
}

export interface QuoteTotals { subtotal: number; gst: number; total: number }

export function quoteTotals(q: Pick<Quote, 'lines' | 'gstMode'>): QuoteTotals {
  const gross = roundCents(q.lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0));
  if (q.gstMode === 'exclusive') {
    const gst = roundCents(gross * NZ_GST_RATE);
    return { subtotal: gross, gst, total: roundCents(gross + gst) };
  }
  if (q.gstMode === 'inclusive') {
    const gst = roundCents(gross * NZ_GST_RATE / (1 + NZ_GST_RATE)); // = 3/23 of the total
    return { subtotal: roundCents(gross - gst), gst, total: gross };
  }
  return { subtotal: gross, gst: 0, total: gross };
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown, min: number, max: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 0; };
const date = (v: unknown, fallback: string) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : fallback);

/** Coerce untrusted input into a valid quote. Status/timestamps are server-controlled. */
export function sanitizeQuote(raw: unknown, base: Pick<Quote, 'id' | 'number' | 'status' | 'createdAt'> & Partial<Quote>, nowIso: string): Quote {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const today = nowIso.slice(0, 10);
  const in30 = new Date(Date.parse(today) + 30 * 86400_000).toISOString().slice(0, 10);
  const lines = (Array.isArray(r['lines']) ? r['lines'] : []).slice(0, MAX_QUOTE_LINES).map(l => {
    const o = (l || {}) as Record<string, unknown>;
    return { description: str(o['description'], 300), quantity: num(o['quantity'], 0, 100000), unitPrice: roundCents(num(o['unitPrice'], -1e7, 1e7)) };
  }).filter(l => l.description || l.unitPrice);
  const gstMode = r['gstMode'] === 'inclusive' || r['gstMode'] === 'none' ? r['gstMode'] : 'exclusive';
  const currency = (['NZD', 'AUD', 'USD', 'GBP', 'EUR'].includes(String(r['currency'])) ? r['currency'] : 'NZD') as SiteCurrency;
  return {
    ...base,
    kind: r['kind'] === 'invoice' ? 'invoice' : 'quote',
    customerName: str(r['customerName'], 120),
    customerEmail: str(r['customerEmail'], 200),
    lines,
    gstMode,
    currency,
    notes: str(r['notes'], 2000),
    issueDate: date(r['issueDate'], base.issueDate || today),
    dueDate: date(r['dueDate'], base.dueDate || in30),
    createdAt: base.createdAt,
    updatedAt: nowIso,
  } as Quote;
}

/** Next sequential number, e.g. Q-0003 / INV-0012, based on existing ones of that kind. */
export function nextQuoteNumber(existing: readonly Pick<Quote, 'kind' | 'number'>[], kind: QuoteKind): string {
  const prefix = kind === 'invoice' ? 'INV-' : 'Q-';
  const max = existing.filter(q => q.kind === kind && q.number.startsWith(prefix))
    .map(q => parseInt(q.number.slice(prefix.length), 10)).filter(Number.isFinite).reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}
