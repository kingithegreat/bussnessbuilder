import type express from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import type { OutboundEmail, EmailResult } from './server-email';

/** Dependencies shared by the feature routers (injected so tests use fakes). */
export interface FeatureDeps {
  getDb: () => Promise<Firestore>;
  verifyUser: (req: express.Request, uid: string) => Promise<boolean>;
  isLimited: (key: string, max: number, windowMs: number) => boolean;
  resolveUid: (db: Firestore, identifier: string) => Promise<string>;
  sendEmail: (msg: OutboundEmail) => Promise<EmailResult>;
  /** Optional text alert to the owner (no-op unless SMS is configured and they opted in). */
  notifyOwnerSms?: (uid: string, kind: 'booking' | 'enquiry', d: { business: string; name: string; service: string; when?: string }) => Promise<void>;
  env: Record<string, string | undefined>;
  now?: () => Date;
}

export function validUid(uid: unknown): uid is string {
  return typeof uid === 'string' && !!uid && uid.length <= 128 && !uid.includes('/');
}

/** Owner-only guard: uid from query (GET) or body, Firebase token must match. */
export async function authorizeOwner(deps: FeatureDeps, req: express.Request, res: express.Response): Promise<string | null> {
  const uid = req.method === 'GET' ? req.query['uid'] : req.body?.['uid'];
  if (!validUid(uid)) { res.status(400).json({ error: 'Invalid business account.' }); return null; }
  if (!await deps.verifyUser(req, uid)) { res.status(401).json({ error: 'Sign in to your business account.' }); return null; }
  if (deps.isLimited(`owner:${uid}`, 120, 60_000)) { res.status(429).json({ error: 'Too many requests. Please wait a minute.' }); return null; }
  return uid;
}

export function clientIp(req: express.Request): string {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const trimStr = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
