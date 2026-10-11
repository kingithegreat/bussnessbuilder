/**
 * Shared outbound email path. Sends via SMTP only when every SMTP_* var is
 * set; otherwise it no-ops (with a warning) so features degrade gracefully.
 */
export const SMTP_VARS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'] as const;

export function missingSmtpVars(env: Record<string, string | undefined>): string[] {
  return SMTP_VARS.filter((name) => !env[name]);
}

export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  attachments?: { filename: string; content: string | Buffer; contentType?: string }[];
}

export type EmailResult = { sent: true } | { sent: false; reason: 'not_configured' | 'invalid' | 'failed' };

export async function sendEmailIfConfigured(env: Record<string, string | undefined>, msg: OutboundEmail): Promise<EmailResult> {
  if (!msg.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(msg.to)) return { sent: false, reason: 'invalid' };
  const missing = missingSmtpVars(env);
  if (missing.length) {
    console.warn(`Email "${msg.subject.slice(0, 60)}" not sent: SMTP is not configured (missing ${missing.join(', ')}).`);
    return { sent: false, reason: 'not_configured' };
  }
  try {
    const nodemailer = await import('nodemailer');
    const port = Number(env['SMTP_PORT']);
    const transporter = nodemailer.default.createTransport({
      host: env['SMTP_HOST'], port, secure: port === 465,
      auth: { user: env['SMTP_USER'], pass: env['SMTP_PASS'] },
    });
    await transporter.sendMail({ from: env['SMTP_FROM'], to: msg.to, replyTo: msg.replyTo, subject: msg.subject, text: msg.text, attachments: msg.attachments });
    return { sent: true };
  } catch (e) {
    console.warn('Email send failed:', e);
    return { sent: false, reason: 'failed' };
  }
}
