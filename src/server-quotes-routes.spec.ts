import { quotesRouter } from './server-quotes-routes';
import { startFeatureServer } from './testing/feature-harness';

describe('quotes HTTP journey', () => {
  let h: Awaited<ReturnType<typeof startFeatureServer>>;
  beforeEach(async () => { h = await startFeatureServer(quotesRouter, { 'users/owner/businessData/main': { profile: { name: 'Biz', email: 'o@example.invalid' } } }, { now: () => new Date('2026-10-12T00:00:00Z') }); });
  afterEach(async () => { await h.close(); });

  it('creates, numbers, emails (PDF) and accepts a quote', async () => {
    expect((await h.call('GET', '/api/quotes?uid=owner')).status).toBe(401);
    const created = await h.call('POST', '/api/quotes/save', { uid: 'owner', quote: { customerName: 'Kim', customerEmail: 'kim@example.invalid', lines: [{ description: 'Mow', quantity: 1, unitPrice: 100 }] } }, true);
    expect(created.body['quote'].number).toBe('Q-0001');
    expect(created.body['quote'].status).toBe('draft');
    const second = await h.call('POST', '/api/quotes/save', { uid: 'owner', quote: { kind: 'invoice', lines: [] } }, true);
    expect(second.body['quote'].number).toBe('INV-0001');
    const id = created.body['quote'].id;
    const mail = await h.call('POST', `/api/quotes/${id}/email`, { uid: 'owner' }, true);
    expect(mail.body).toEqual({ sent: false, reason: 'not_configured' });
    expect(h.emails[0].attachments?.[0].filename).toBe('Q-0001.pdf');
    expect(String(h.emails[0].text)).toContain('NZ$115.00');
    const sent = await h.call('POST', `/api/quotes/${id}/status`, { uid: 'owner', status: 'sent' }, true);
    expect(sent.body['quote'].sentAt).toBeTruthy();
    const acc = await h.call('POST', `/api/quotes/${id}/status`, { uid: 'owner', status: 'accepted' }, true);
    expect(acc.body['quote'].status).toBe('accepted');
    expect((await h.call('POST', `/api/quotes/${id}/status`, { uid: 'owner', status: 'paid' }, true)).status).toBe(400);
    expect((await h.call('POST', `/api/quotes/${id}/delete`, { uid: 'owner' }, true)).status).toBe(200);
    expect((await h.call('GET', '/api/quotes?uid=owner', undefined, true)).body['quotes']).toHaveLength(1);
    const after = await h.call('POST', '/api/quotes/save', { uid: 'owner', quote: { lines: [] } }, true);
    expect(after.body['quote'].number).toBe('Q-0002'); // Q-0001 was deleted but is never reused
  });
});
