import { vi } from 'vitest';
import { smsConfigured, twilioProvider, sendSmsIfConfigured, ownerSmsTarget } from './server-sms';

const env = { TWILIO_ACCOUNT_SID: 'ACtest', TWILIO_AUTH_TOKEN: 'tok', TWILIO_FROM_NUMBER: '+15005550006' };

describe('server sms', () => {
  it('is off unless fully configured', async () => {
    expect(smsConfigured({})).toBe(false);
    expect(smsConfigured({ TWILIO_ACCOUNT_SID: 'a', TWILIO_AUTH_TOKEN: 'b' })).toBe(false);
    expect(smsConfigured(env)).toBe(true);
    expect(await sendSmsIfConfigured({}, '+64211234567', 'hi', { uid: 'u', isLimited: () => false })).toEqual({ sent: false, reason: 'not_configured' });
  });
  it('posts a Twilio-compatible request', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 201 }));
    const p = twilioProvider({ ...env, SMS_API_BASE_URL: 'https://sms.example.invalid/' }, fetchImpl as unknown as typeof fetch)!;
    expect(await p.send('+64211234567', 'Hello')).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://sms.example.invalid/2010-04-01/Accounts/ACtest/Messages.json');
    expect(String(init.body)).toBe('To=%2B64211234567&Body=Hello&From=%2B15005550006');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Basic ' + Buffer.from('ACtest:tok').toString('base64'));
  });
  it('applies the daily cap and validates numbers', async () => {
    const provider = { send: vi.fn(async () => true) };
    expect(await sendSmsIfConfigured(env, '021', 'x', { uid: 'u', isLimited: () => false, provider })).toEqual({ sent: false, reason: 'invalid' });
    expect(await sendSmsIfConfigured(env, '+64211234567', 'x', { uid: 'u', isLimited: () => true, provider })).toEqual({ sent: false, reason: 'limited' });
    expect(await sendSmsIfConfigured(env, '+64211234567', 'x', { uid: 'u', isLimited: () => false, provider })).toEqual({ sent: true });
  });
  it('only targets opted-in owners', () => {
    expect(ownerSmsTarget({ smsOptIn: true, smsNumber: '+64211234567' })).toBe('+64211234567');
    expect(ownerSmsTarget({ smsOptIn: false, smsNumber: '+64211234567' })).toBe('');
    expect(ownerSmsTarget(undefined)).toBe('');
  });
});
