/**
 * One-click AI updates: prompts, safe parsers, deterministic fallbacks and
 * diffs. Pure: the component shows a preview and saves only on approval.
 */
import { BusinessProfile, Service } from './types';

export type NzSeason = 'summer' | 'autumn' | 'winter' | 'spring';

/** Southern-hemisphere season for a date (NZ). */
export function nzSeason(d: Date): NzSeason {
  const m = Number(new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', month: 'numeric' }).format(d));
  return m === 12 || m <= 2 ? 'summer' : m <= 5 ? 'autumn' : m <= 8 ? 'winter' : 'spring';
}

export interface PostDraft { title: string; content: string }

export function seasonalPostPrompt(p: Partial<BusinessProfile>, services: Service[], season: NzSeason): { prompt: string; system: string } {
  return {
    system: 'You write short, warm website posts for New Zealand small businesses. NZ English spelling. No made-up facts, prices, discounts or dates unless given. Return ONLY JSON: {"title": string, "content": string} where content is markdown with a ## heading, 2-3 short paragraphs and a clear call to action.',
    prompt: `Business: ${p.name || 'our business'} (${p.type || 'local service'}) in ${p.serviceArea || 'New Zealand'}.\nServices: ${services.map(s => `${s.name}${s.price ? ` (${s.price})` : ''}`).join('; ') || 'not listed'}.\nWrite a ${season} special post (it is ${season} in NZ now). Under 220 words. Mention a seasonal reason to book. If you suggest an offer, write it as "[your offer here]" for the owner to fill in.`,
  };
}

/** Accept JSON (optionally fenced) or fall back to "first line = title". */
export function parsePostResponse(text: string | null | undefined): PostDraft | null {
  if (!text || !text.trim()) return null;
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try {
    const j = JSON.parse(cleaned) as { title?: unknown; content?: unknown };
    if (typeof j.title === 'string' && typeof j.content === 'string' && j.title.trim() && j.content.trim()) {
      return { title: j.title.trim().slice(0, 120), content: j.content.trim().slice(0, 6000) };
    }
  } catch { /* not JSON */ }
  const [first, ...rest] = cleaned.split('\n');
  const title = first.replace(/^#+\s*/, '').trim();
  const content = rest.join('\n').trim();
  return title && content ? { title: title.slice(0, 120), content: content.slice(0, 6000) } : null;
}

const SEASON_LINES: Record<NzSeason, string> = {
  spring: 'Spring is here: longer days and everything starting to grow. It is the perfect time to get sorted before the summer rush.',
  summer: 'Summer is here. Get in touch to discuss what you need and check our availability.',
  autumn: "Autumn is a great time to tidy up and get ready for the cooler months before winter sets in.",
  winter: 'Winter is here. Get in touch to discuss your plans for the cooler months.',
};

export function templateSeasonalPost(p: Partial<BusinessProfile>, services: Service[], season: NzSeason): PostDraft {
  const name = p.name || 'us';
  const cap = season[0].toUpperCase() + season.slice(1);
  const list = services.slice(0, 3).map(s => `- **${s.name}**${s.price ? ` from ${s.price}` : ''}`).join('\n');
  return {
    title: `${cap} special at ${name}`,
    content: `## ${cap} is here\n\n${SEASON_LINES[season]}\n\n${list ? `Our services this ${season}:\n\n${list}\n\n` : ''}**[your offer here]**: get in touch${p.serviceArea ? ` if you're in ${p.serviceArea}` : ''} and we'll make it happen.\n\nSend us an enquiry or call${p.phone ? ` ${p.phone}` : ''} to book.`,
  };
}

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 60) || 'post';
}

// ---------- prices ----------

export interface PriceChange { serviceId: string; name: string; oldPrice: string; newPrice: string }

/** Change the first number in a free-text price by a percentage, keeping its format ("from $45" → "from $47.25"). */
export function adjustPrice(price: string, pct: number, roundTo = 0): string {
  return price.replace(/(\d[\d,]*(?:\.\d+)?)/, (m) => {
    const n = Number(m.replace(/,/g, ''));
    let next = n * (1 + pct / 100);
    next = roundTo > 0 ? Math.round(next / roundTo) * roundTo : Math.round(next * 100) / 100;
    const hadCents = /\.\d/.test(m) || !Number.isInteger(next);
    return hadCents ? next.toFixed(2) : String(Math.round(next));
  });
}

/**
 * Handle the common instructions without AI: "raise/increase/up all prices by 5%",
 * "lower/reduce/drop by 10%", optionally "round to the nearest dollar/$5".
 * Returns null when the instruction isn't one of these (then AI is used).
 */
export function deterministicPriceChanges(instruction: string, services: Service[]): PriceChange[] | null {
  const t = instruction.toLowerCase();
  const m = t.match(/(raise|increase|up|put up|lift|lower|reduce|drop|decrease|cut)\b[^%\d]*(\d+(?:\.\d+)?)\s*%/);
  if (!m) return null;
  const pct = Number(m[2]) * (/(lower|reduce|drop|decrease|cut)/.test(m[1]) ? -1 : 1);
  if (!Number.isFinite(pct) || Math.abs(pct) > 90) return null;
  const roundTo = /nearest\s*\$?\s*5\b/.test(t) ? 5 : /nearest\s*(dollar|\$1\b)/.test(t) ? 1 : 0;
  return services.filter(s => s.price && /\d/.test(s.price)).map(s => ({ serviceId: s.id, name: s.name, oldPrice: s.price!, newPrice: adjustPrice(s.price!, pct, roundTo) }))
    .filter(c => c.newPrice !== c.oldPrice);
}

export function priceUpdatePrompt(instruction: string, services: Service[]): { prompt: string; system: string } {
  return {
    system: 'You update price strings for a small business. Return ONLY JSON: an array of {"id": string, "newPrice": string}. Include only services whose price should change. Keep each price in the same style as the original (e.g. "from $45", "$60/hr"). Never invent services.',
    prompt: `Instruction from the owner: "${instruction.slice(0, 300)}"\nCurrent services (id | name | price):\n${services.map(s => `${s.id} | ${s.name} | ${s.price || '(no price)'}`).join('\n')}`,
  };
}

/** Validate AI output: known ids only, short non-empty prices, real changes only. */
export function parsePriceChanges(text: string | null | undefined, services: Service[]): PriceChange[] {
  if (!text) return [];
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  let arr: unknown;
  try { arr = JSON.parse(cleaned); } catch { return []; }
  if (!Array.isArray(arr)) return [];
  const out: PriceChange[] = [];
  for (const item of arr.slice(0, 50)) {
    const o = (item || {}) as { id?: unknown; newPrice?: unknown };
    const svc = services.find(s => s.id === o.id);
    const newPrice = typeof o.newPrice === 'string' ? o.newPrice.trim().slice(0, 40) : '';
    if (svc && newPrice && newPrice !== (svc.price || '') && !out.some(c => c.serviceId === svc.id)) {
      out.push({ serviceId: svc.id, name: svc.name, oldPrice: svc.price || '', newPrice });
    }
  }
  return out;
}

/** Apply only the approved changes. */
export function applyPriceChanges(services: Service[], changes: PriceChange[]): Service[] {
  const map = new Map(changes.map(c => [c.serviceId, c.newPrice]));
  return services.map(s => (map.has(s.id) ? { ...s, price: map.get(s.id)! } : s));
}

// ---------- about ----------

export function aboutPrompt(p: Partial<BusinessProfile>, services: Service[]): { prompt: string; system: string } {
  return {
    system: 'You rewrite the About text on a small business website. NZ English. Friendly, specific, no clichés, no made-up facts (years, awards, numbers) beyond what is given. 2 short paragraphs, 80-140 words, plain text (no markdown, no headings). Return ONLY the text.',
    prompt: `Business: ${p.name || ''}\nType: ${p.type || ''}\nArea: ${p.serviceArea || ''}\nTone: ${p.toneOfVoice || 'friendly and professional'}\nServices: ${services.map(s => s.name).join(', ')}\nCurrent About text:\n${(p.description || '').slice(0, 1500)}`,
  };
}

export function cleanAbout(text: string | null | undefined): string {
  return (text || '').replace(/^```\w*\s*|```$/g, '').replace(/^#+\s.*$/gm, '').replace(/\*\*/g, '').trim().slice(0, 2000);
}

export function templateAbout(p: Partial<BusinessProfile>, services: Service[]): string {
  const name = p.name || 'We';
  const area = p.serviceArea ? ` across ${p.serviceArea}` : '';
  const svc = services.slice(0, 3).map(s => s.name.toLowerCase()).join(', ');
  return `${name} is a local, owner-operated business${area}. ${svc ? `We specialise in ${svc}, ` : 'We '}and we take pride in turning up on time, doing the job properly and leaving things tidy.\n\nWe keep things simple: clear prices, friendly communication and work we're happy to put our name to. Get in touch for a free, no-pressure quote.`;
}
