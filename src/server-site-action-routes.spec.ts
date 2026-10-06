import express from 'express';
import { createServer, type Server } from 'node:http';
import { vi } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { siteActionRouter } from './server-site-action-routes';
import { createSiteActionTestDb } from './testing/site-action-db';
import type { HomepageHeadlineAction } from './app/site-action';

const id = '11111111-1111-4111-8111-111111111111';
const mainPath = 'users/owner/businessData/main';

describe('Authenticated homepage action HTTP journey', () => {
  let server: Server;
  let base: string;
  let store: ReturnType<typeof createSiteActionTestDb>;
  let getDb: ReturnType<typeof vi.fn<() => Promise<Firestore>>>;
  beforeEach(async () => {
    store = createSiteActionTestDb({ [mainPath]: { isSetupComplete: true,
      profile: { name: 'Apex', type: 'cleaner', serviceArea: 'Auckland', tagline: 'Reliable local service', email: 'owner@example.invalid' },
      enquiries: [{ id: 'fresh-lead', status: 'New' }], activities: [], services: [{ name: 'Actual service' }],
    } });
    getDb = vi.fn<() => Promise<Firestore>>().mockResolvedValue(store.db);
    const app = express();
    app.use('/api/actions', siteActionRouter({ getDb,
      verifyUser: async (req, uid) => req.header('authorization') === 'Bearer verified' && uid === 'owner',
      isLimited: () => false, env: {}, // Templates only: never a real provider key or call.
    }));
    server = createServer(app);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not listen');
    base = `http://127.0.0.1:${address.port}/api/actions`;
  });
  afterEach(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
  async function post(path: string, body: Record<string, unknown>, authenticated = true) {
    const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json',
      ...(authenticated ? { Authorization: 'Bearer verified' } : {}),
    }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() as { action: HomepageHeadlineAction; headline: string; error: string; code: string } };
  }
  const prepare = () => post('/headline/prepare', { uid: 'owner', id, request: 'Improve my homepage headline', expectedHeadline: 'Reliable local service' });

  it('prepares without publishing, survives history reload, explicitly approves and undoes', async () => {
    const prepared = await prepare(); expect(prepared.status).toBe(200);
    expect(prepared.body.action.source).toBe('template'); expect(prepared.body.action.status).toBe('prepared');
    expect((store.documents.get(mainPath)?.['profile'] as Record<string, unknown>)['tagline']).toBe('Reliable local service');
    const history = await fetch(base + '?uid=owner', { headers: { Authorization: 'Bearer verified' } });
    expect((await history.json()).actions).toEqual([prepared.body.action]);
    const applied = await post(`/${id}/approve`, { uid: 'owner' });
    expect(applied.status).toBe(200); expect(applied.body.headline).toBe(prepared.body.action.after.tagline);
    expect(store.documents.get(mainPath)?.['enquiries']).toEqual([{ id: 'fresh-lead', status: 'New' }]);
    expect((store.documents.get(mainPath)?.['profile'] as Record<string, unknown>)['email']).toBe('owner@example.invalid');
    const repeated = await post(`/${id}/approve`, { uid: 'owner' });
    expect(repeated.body.action).toEqual(applied.body.action);
    expect(store.documents.get(mainPath)?.['activities']).toHaveLength(1);
    const undone = await post(`/${id}/undo`, { uid: 'owner' });
    expect(undone.status).toBe(200); expect(undone.body.headline).toBe('Reliable local service');
    expect(undone.body.action.status).toBe('undone'); expect(store.documents.get(mainPath)?.['activities']).toHaveLength(2);
  });
  it('refuses undo over a newer manual edit and returns the current value on repeated approval', async () => {
    await prepare(); await post(`/${id}/approve`, { uid: 'owner' });
    (store.documents.get(mainPath)?.['profile'] as Record<string, unknown>)['tagline'] = 'Newer manual edit';
    const repeated = await post(`/${id}/approve`, { uid: 'owner' });
    expect(repeated.status).toBe(200); expect(repeated.body.headline).toBe('Newer manual edit');
    const undo = await post(`/${id}/undo`, { uid: 'owner' });
    expect(undo.status).toBe(409);
    expect((store.documents.get(mainPath)?.['profile'] as Record<string, unknown>)['tagline']).toBe('Newer manual edit');
  });
  it('requires an owner token before any read or generation, including history', async () => {
    const response = await post('/headline/prepare', { uid: 'owner', id, request: 'Improve headline', expectedHeadline: '' }, false);
    expect(response.status).toBe(401);
    expect((await fetch(base + '?uid=owner')).status).toBe(401);
    expect((await post(`/${id}/approve`, { uid: 'different-owner' })).status).toBe(401);
    expect(getDb).not.toHaveBeenCalled(); expect(store.writes).toHaveLength(0);
  });
  it('rejects unrelated requests and invalid action identities before database access', async () => {
    expect((await post('/headline/prepare', { uid: 'owner', id, request: 'Send an email to all leads', expectedHeadline: '' })).body.code).toBe('unsupported_intent');
    expect((await post('/not-a-valid-id/approve', { uid: 'owner' })).status).toBe(400);
    expect(getDb).not.toHaveBeenCalled();
  });
});
