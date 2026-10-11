/** Text-alert helpers (pure): NZ-friendly number normalising and short messages. */

/** Normalise to E.164. NZ local numbers (021…, 027…, 09…) become +64…; returns '' if invalid. */
export function normalizeMobile(raw: string, defaultCountry = '64'): string {
  const s = (raw || '').replace(/[\s()-]/g, '');
  let digits: string;
  if (s.startsWith('+')) digits = s.slice(1);
  else if (s.startsWith('00')) digits = s.slice(2);
  else if (s.startsWith('0')) digits = defaultCountry + s.slice(1);
  else digits = s;
  return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : '';
}

/** Keep alerts to a single 160-char GSM segment (cheapest) by stripping fancy characters. */
export function smsText(parts: string[]): string {
  const text = parts.filter(Boolean).join(' ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...')
    .replace(/[^\x20-\x7E\n£€]/g, '').replace(/\s+/g, ' ').trim();
  return text.length <= 160 ? text : text.slice(0, 157).trimEnd() + '...';
}

export function enquiryAlert(businessName: string, name: string, service: string): string {
  return smsText([`New enquiry for ${businessName}: ${name || 'Someone'}${service && service !== 'Other' ? ` (${service})` : ''}.`, 'Open BusinessFlow to reply.']);
}

export function bookingAlert(businessName: string, name: string, service: string, when: string): string {
  return smsText([`New booking request for ${businessName}: ${name}, ${service}, ${when}.`, 'Accept or decline in BusinessFlow.']);
}
