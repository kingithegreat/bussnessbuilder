import { vi } from 'vitest';
import { missingSmtpVars, sendEmailIfConfigured } from './server-email';

describe('server-email', () => {
  it('lists missing SMTP vars', () => {
    expect(missingSmtpVars({ SMTP_HOST: 'h' })).toEqual(['SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']);
  });
  it('no-ops gracefully when SMTP is off', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await sendEmailIfConfigured({}, { to: 'a@b.co', subject: 's', text: 't' })).toEqual({ sent: false, reason: 'not_configured' });
    warn.mockRestore();
  });
  it('rejects invalid recipients', async () => {
    expect(await sendEmailIfConfigured({}, { to: 'nope', subject: 's', text: 't' })).toEqual({ sent: false, reason: 'invalid' });
  });
});
