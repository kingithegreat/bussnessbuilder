import { reviewsRouter } from './server-reviews-routes';
import { startFeatureServer } from './testing/feature-harness';

const docs = { 'users/owner/businessData/main': { isSetupComplete: true, profile: { name: 'Biz', email: 'o@example.invalid' }, testimonials: [{ id: 't0', author: 'Old', rating: 5, text: 'Kept' }] } };

describe('reviews moderation journey', () => {
  let h: Awaited<ReturnType<typeof startFeatureServer>>;
  beforeEach(async () => { h = await startFeatureServer(reviewsRouter, docs); });
  afterEach(async () => { await h.close(); });

  it('queues public reviews and publishes only approved ones', async () => {
    expect((await h.call('POST', '/api/site/owner-slug/review', { author: 'Kim', rating: 7, text: 'hi' })).status).toBe(400);
    expect((await h.call('POST', '/api/site/owner-slug/review', { author: 'Kim', rating: 5, text: 'Brilliant mow' })).status).toBe(200);
    expect((await h.call('POST', '/api/site/owner/review', { author: 'Spam', rating: 1, text: 'buy stuff', website: 'x' })).status).toBe(200);
    expect(h.store.documents.get('users/owner/businessData/main')?.['testimonials']).toHaveLength(1);
    expect(h.emails[0].subject).toContain('5-star review');
    expect((await h.call('GET', '/api/reviews?uid=owner')).status).toBe(401);
    const list = await h.call('GET', '/api/reviews?uid=owner', undefined, true);
    expect(list.body['pending']).toHaveLength(1); // honeypot dropped
    const id = list.body['pending'][0].id;
    const ok = await h.call('POST', `/api/reviews/${id}/approve`, { uid: 'owner' }, true);
    expect(ok.body['testimonial'].author).toBe('Kim');
    const t = h.store.documents.get('users/owner/businessData/main')?.['testimonials'] as { author: string }[];
    expect(t.map(x => x.author)).toEqual(['Old', 'Kim']);
    expect((await h.call('POST', `/api/reviews/${id}/reject`, { uid: 'owner' }, true)).status).toBe(404);
  });

  it('404s for unknown sites', async () => {
    expect((await h.call('POST', '/api/site/nobody/review', { author: 'A', rating: 4, text: 'Nice work' })).status).toBe(404);
  });
});
