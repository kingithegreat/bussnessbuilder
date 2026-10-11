import express from 'express';
import { createServer, type Server } from 'node:http';
import type { Firestore } from 'firebase-admin/firestore';
import { createSiteActionTestDb } from './site-action-db';
import type { FeatureDeps } from '../server-owner';
import type { OutboundEmail } from '../server-email';

/** Spins a real HTTP server around a feature router with in-memory Firestore. Tests only. */
export async function startFeatureServer(
  mount: (deps: FeatureDeps) => express.Router,
  docs: Record<string, Record<string, unknown>> = {},
  opts: { now?: () => Date; env?: Record<string, string | undefined> } = {},
) {
  const store = createSiteActionTestDb(docs);
  const emails: OutboundEmail[] = [];
  const deps: FeatureDeps = {
    getDb: async () => store.db as Firestore,
    verifyUser: async (req, uid) => req.header('authorization') === 'Bearer verified' && uid === 'owner',
    isLimited: () => false,
    resolveUid: async (_db, id) => (id === 'owner-slug' ? 'owner' : id),
    sendEmail: async (msg) => { emails.push(msg); return { sent: false, reason: 'not_configured' }; },
    env: opts.env || {},
    now: opts.now,
  };
  const app = express();
  app.use(mount(deps));
  const server: Server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  const base = `http://127.0.0.1:${address.port}`;
  const call = async (method: string, path: string, body?: unknown, auth = false) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer verified' } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try { json = JSON.parse(text); } catch { json = { text }; }
    return { status: res.status, body: json as Record<string, any>, text }; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
  const close = () => new Promise<void>((resolve, reject) => server.close(e => (e ? reject(e) : resolve())));
  return { store, emails, call, close, base };
}
