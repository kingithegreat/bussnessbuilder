import { prepareSiteChange, mutateSiteChange } from './server-site-changes';
import { createSiteActionTestDb } from './testing/site-action-db';
import { SiteChangeField } from './app/site-change';
import { startFeatureServer } from './testing/feature-harness';
import { siteChangesRouter } from './server-site-change-routes';
import { changeOutcome } from './server-change-outcomes';
const id = 'b4859cf8-4671-429b-a958-ec10648a1223';
const mainPath = 'users/owner/businessData/main';
const initial = () => ({ [mainPath]: { isSetupComplete: true, profile: { tagline: 'Old', description: 'Before', ctaText: 'Contact' }, services: [{ id: 'mow', name: 'Mowing', price: '$45' }], enquiries: [{ id: 'keep' }] } });
const fields: SiteChangeField[] = [{ target: 'profile', field: 'description', before: 'Before', after: 'After' }];
const input = () => ({ id, request: 'Refresh my About section', fields });
describe('Reviewed typed website changes', () => {
  it('prepares without publishing, applies once, preserves leads, and undoes once', async () => {
    const { db, documents } = createSiteActionTestDb(initial());
    const draft = await prepareSiteChange(db, 'owner', input());
    expect(draft.status).toBe('prepared'); expect(documents.get(mainPath)?.['profile']).toMatchObject({ description: 'Before' });
    expect(await prepareSiteChange(db, 'owner', input())).toEqual(draft);
    const applied = await mutateSiteChange(db, 'owner', id, 'approve');
    expect(await mutateSiteChange(db, 'owner', id, 'approve')).toEqual(applied);
    expect(documents.get(mainPath)?.['enquiries']).toEqual([{ id: 'keep' }]);
    expect(documents.get(mainPath)?.['profile']).toMatchObject({ description: 'After', tagline: 'Old' });
    const undone = await mutateSiteChange(db, 'owner', id, 'undo');
    expect(await mutateSiteChange(db, 'owner', id, 'undo')).toEqual(undone);
    expect(documents.get(mainPath)?.['profile']).toMatchObject({ description: 'Before' });
    await expect(mutateSiteChange(db, 'owner', id, 'approve')).rejects.toMatchObject({ status: 409 });
  });
  it('rejects stale approval and rollback instead of overwriting newer edits', async () => {
    const { db, documents } = createSiteActionTestDb(initial());
    await prepareSiteChange(db, 'owner', input());
    const main = documents.get(mainPath)!;
    (main['profile'] as Record<string, unknown>)['description'] = 'Someone else';
    await expect(mutateSiteChange(db, 'owner', id, 'approve')).rejects.toMatchObject({ status: 409 });
    (main['profile'] as Record<string, unknown>)['description'] = 'Before';
    await mutateSiteChange(db, 'owner', id, 'approve');
    (documents.get(mainPath)!['profile'] as Record<string, unknown>)['description'] = 'Newer';
    await expect(mutateSiteChange(db, 'owner', id, 'undo')).rejects.toMatchObject({ status: 409 });
    expect(documents.get(mainPath)?.['profile']).toMatchObject({ description: 'Newer' });
  });
  it('validates allowed fields and rejects reused ids or cross-account mutation', async () => {
    const { db } = createSiteActionTestDb(initial());
    await prepareSiteChange(db, 'owner', input());
    await expect(prepareSiteChange(db, 'owner', { ...input(), request: 'Different' })).rejects.toMatchObject({ status: 409 });
    await expect(mutateSiteChange(db, 'other', id, 'approve')).rejects.toMatchObject({ status: 404 });
    for (const field of ['email', '__proto__', 'subscription']) {
      await expect(prepareSiteChange(db, 'owner', { ...input(), fields: [{ ...fields[0], field } as SiteChangeField] })).rejects.toMatchObject({ status: 400 });
    }
    await expect(prepareSiteChange(db, 'owner', { ...input(), fields: [fields[0], fields[0]] })).rejects.toMatchObject({ status: 400 });
  });
  it('updates only selected service prices and refuses deleted services', async () => {
    const { db, documents } = createSiteActionTestDb(initial());
    await prepareSiteChange(db, 'owner', { ...input(), request: 'Raise prices by 10%', fields: [{ target: 'service', field: 'price', serviceId: 'mow', before: '$45', after: '$49.50' }] });
    await mutateSiteChange(db, 'owner', id, 'approve');
    expect(documents.get(mainPath)?.['services']).toEqual([{ id: 'mow', name: 'Mowing', price: '$49.50' }]);
    documents.get(mainPath)!['services'] = [];
    await expect(mutateSiteChange(db, 'owner', id, 'undo')).rejects.toMatchObject({ status: 409 });
  });
  it('uses authenticated HTTP preparation, approval, reload, outcome and undo', async () => {
    const h = await startFeatureServer(siteChangesRouter, initial());
    try {
      expect((await h.call('POST', '/api/changes/prepare', { uid: 'owner', ...input() })).status).toBe(401);
      expect((await h.call('POST', '/api/changes/prepare', { uid: 'owner', ...input() }, true)).status).toBe(200);
      expect((await h.call('POST', `/api/changes/${id}/approve`, { uid: 'owner' }, true)).body['action'].status).toBe('applied');
      const history = await h.call('GET', '/api/changes?uid=owner', undefined, true);
      expect(history.body['actions'][0].outcome.status).toBe('waiting');
      expect((await h.call('POST', `/api/changes/${id}/undo`, { uid: 'owner' }, true)).body['action'].status).toBe('undone');
      expect((await h.call('GET', '/api/changes?uid=other', undefined, true)).status).toBe(401);
    } finally { await h.close(); }
  });
  it('compares equal complete NZ days with honest waiting and missing-data states', async () => {
    const { db } = createSiteActionTestDb(initial());
    const action = { ...await prepareSiteChange(db, 'owner', input()), status: 'applied' as const, appliedAt: '2026-10-10T02:00:00Z' };
    const stats = { days: { '2026-10-01': { views: 1, uniques: 1, paths: {} }, '2026-10-09': { views: 10, uniques: 4, paths: {} }, '2026-10-11': { views: 20, uniques: 8, paths: {} } } };
    expect(changeOutcome(action, stats, [], [], '2026-10-17').status).toBe('waiting');
    const result = changeOutcome(action, stats, ['2026-10-09', '2026-10-11'], ['2026-10-11'], '2026-10-18');
    expect(result).toMatchObject({ status: 'available', before: { views: 10, enquiries: 1, bookings: 0 }, after: { views: 20, enquiries: 1, bookings: 1 } });
    expect(changeOutcome(action, undefined, [], [], '2026-10-18').status).toBe('insufficient_data');
    expect(changeOutcome({ ...action, status: 'undone' }, stats, [], [], '2026-10-18').status).toBe('undone');
  });
});
