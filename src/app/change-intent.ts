export type ChangeIntent = { kind: 'prices' | 'about' | 'post' } | { kind: 'copy'; field: 'tagline' | 'ctaText'; value: string } | { kind: 'unsupported' };
/** Explicit finite intents; arbitrary prompts never turn into arbitrary executable actions. */
export function changeIntent(request: string): ChangeIntent {
  const text = request.trim();
  if (!text || text.length > 500) return { kind: 'unsupported' };
  const exact = text.match(/^(?:set|change|update)\s+(?:my\s+|the\s+)?(headline|tagline|button(?:\s+text)?|cta(?:\s+text)?)\s+(?:to|:)\s*["“]?(.+?)["”]?$/i);
  if (exact) return { kind: 'copy', field: /headline|tagline/i.test(exact[1]) ? 'tagline' : 'ctaText', value: exact[2].trim() };
  if (/\b(price|prices|pricing)\b/i.test(text)) return { kind: 'prices' };
  if (/\babout\b|\bdescription\b/i.test(text)) return { kind: 'about' };
  if (/\b(post|seasonal|special)\b/i.test(text)) return { kind: 'post' };
  return { kind: 'unsupported' };
}
