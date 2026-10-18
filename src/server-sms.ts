/**
 * Text alerts via a Twilio-compatible REST API. Completely inert unless the
 * env vars below are set (see docs/SMS_SETUP.md). Never throws to callers.
 *
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN                 required
 *   TWILIO_FROM_NUMBER  or  TWILIO_MESSAGING_SERVICE_SID   one required
 *   SMS_API_BASE_URL    optional, default https://api.twilio.com (for compatible providers)
 *   SMS_DAILY_LIMIT_PER_BUSINESS  optional, default 20 (cost guard)
 */
type Env = Record<string, string | undefined>;

export interface SmsProvider { send(to: string, body: string): Promise<boolean> }
export type SmsResult = { sent: true } | { sent: false; reason: 'not_configured' | 'invalid' | 'limited' | 'failed' };

export function smsConfigured(env: Env): boolean {
  return !!(env['TWILIO_ACCOUNT_SID'] && env['TWILIO_AUTH_TOKEN'] && (env['TWILIO_FROM_NUMBER'] || env['TWILIO_MESSAGING_SERVICE_SID']));
}

export function twilioProvider(env: Env, fetchImpl: typeof fetch = fetch): SmsProvider | null {
  if (!smsConfigured(env)) return null;
  const sid = env['TWILIO_ACCOUNT_SID']!;
  const base = (env['SMS_API_BASE_URL'] || 'https://api.twilio.com').replace(/\/+$/, '');
  const auth = 'Basic ' + Buffer.from(`${sid}:${env['TWILIO_AUTH_TOKEN']}`).toString('base64');
  return {
    async send(to, body) {
      const form = new URLSearchParams({ To: to, Body: body });
      if (env['TWILIO_MESSAGING_SERVICE_SID']) form.set('MessagingServiceSid', env['TWILIO_MESSAGING_SERVICE_SID']);
      else form.set('From', env['TWILIO_FROM_NUMBER']!);
      const res = await fetchImpl(`${base}/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
        method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString(),
      });
      if (!res.ok) console.warn(`SMS send failed: HTTP ${res.status}`);
      return res.ok;
    },
  };
}

/** Send one alert with a per-business daily cap. */
export async function sendSmsIfConfigured(env: Env, to: string, body: string, opts: { uid: string; isLimited: (k: string, max: number, ms: number) => boolean; provider?: SmsProvider | null }): Promise<SmsResult> {
  const provider = opts.provider === undefined ? twilioProvider(env) : opts.provider;
  if (!provider) return { sent: false, reason: 'not_configured' };
  if (!/^\+[1-9]\d{7,14}$/.test(to)) return { sent: false, reason: 'invalid' };
  const limit = Math.max(1, Number(env['SMS_DAILY_LIMIT_PER_BUSINESS']) || 20);
  if (opts.isLimited(`sms:${opts.uid}`, limit, 86400_000)) return { sent: false, reason: 'limited' };
  try {
    return (await provider.send(to, body)) ? { sent: true } : { sent: false, reason: 'failed' };
  } catch (e) {
    console.warn('SMS send error:', e);
    return { sent: false, reason: 'failed' };
  }
}

/** Owner's opted-in mobile, from the notifications doc the Settings page writes. */
export function ownerSmsTarget(prefs: Record<string, unknown> | undefined): string {
  if (!prefs || prefs['smsOptIn'] !== true) return '';
  const n = typeof prefs['smsNumber'] === 'string' ? prefs['smsNumber'] : '';
  return /^\+[1-9]\d{7,14}$/.test(n) ? n : '';
}
