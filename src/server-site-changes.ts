import type { Firestore } from 'firebase-admin/firestore';
import { SiteChange, SiteChangeField, validChangeFields } from './app/site-change';
import { validActionId, validSiteActionRequest } from './app/site-action';
import { SiteActionError } from './server-site-actions';

type Db = Pick<Firestore, 'doc' | 'runTransaction'>;
function mainProfile(main: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!main || main['isSetupComplete'] !== true || !main['profile']) throw new SiteActionError(409, 'site_not_ready', 'Finish website setup first.');
  return main['profile'] as Record<string, unknown>;
}
function current(main: Record<string, unknown>, f: SiteChangeField): string {
  const source = f.target === 'profile' ? mainProfile(main) : (main['services'] as Record<string, unknown>[] || []).find(s => s['id'] === f.serviceId);
  if (!source) throw new SiteActionError(409, 'change_conflict', 'A service in this proposal no longer exists. Prepare a new proposal.');
  const v = source[f.field];
  if (v !== undefined && typeof v !== 'string') throw new SiteActionError(409, 'change_conflict', 'The saved value is unavailable.');
  return (v as string) || '';
}
function owner(uid: string, id: string): void {
  if (!uid || uid.length > 128 || (/[/\\]/.test(uid) || [...uid].some(c => c.charCodeAt(0) < 32)) || !validActionId(id)) throw new SiteActionError(400, 'invalid_request', 'Invalid change request.');
}
export async function prepareSiteChange(db: Db, uid: string, input: { id: string; request: string; fields: SiteChangeField[] }, now = new Date()): Promise<SiteChange> {
  owner(uid, input.id);
  if (!validSiteActionRequest(input.request) || !validChangeFields(input.fields)) throw new SiteActionError(400, 'invalid_request', 'Review a valid description, headline, button text or service price change.');
  input = { ...input, fields: input.fields.map(f => ({ target: f.target, field: f.field, before: f.before, after: f.after, ...(f.target === 'service' ? { serviceId: f.serviceId } : {}) })) };
  const type = input.fields.every(f => f.target === 'service') ? 'service.prices' : 'profile.copy';
  if (type === 'profile.copy' && input.fields.some(f => f.target !== 'profile')) throw new SiteActionError(400, 'invalid_request', 'Prepare profile and price changes separately.');
  return db.runTransaction(async tx => {
    const ref = db.doc(`businessActions/${uid}/changes/${input.id}`);
    const old = await tx.get(ref);
    if (old.exists) {
      const saved = old.data() as SiteChange;
      if (saved.actorUid !== uid || saved.request !== input.request || JSON.stringify(saved.fields) !== JSON.stringify(input.fields)) throw new SiteActionError(409, 'action_id_reused', 'This ID belongs to another proposal.');
      return saved;
    }
    const main = (await tx.get(db.doc(`users/${uid}/businessData/main`))).data(); mainProfile(main);
    if (input.fields.some(f => current(main!, f) !== f.before)) throw new SiteActionError(409, 'change_conflict', 'The saved values changed. Prepare a fresh preview.');
    const change: SiteChange = { id: input.id, type, request: input.request, fields: input.fields, status: 'prepared', actorUid: uid, createdAt: now.toISOString() };
    tx.set(ref, change); return change;
  });
}
export async function mutateSiteChange(db: Db, uid: string, id: string, operation: 'approve' | 'undo', now = new Date()): Promise<{ action: SiteChange; fields: SiteChangeField[] }> {
  owner(uid, id);
  return db.runTransaction(async tx => {
    const ref = db.doc(`businessActions/${uid}/changes/${id}`), mainRef = db.doc(`users/${uid}/businessData/main`);
    const action = (await tx.get(ref)).data() as SiteChange | undefined;
    if (!action || action.actorUid !== uid || action.id !== id || !validChangeFields(action.fields)) throw new SiteActionError(404, 'action_not_found', 'Proposal not found.');
    const main = (await tx.get(mainRef)).data(); mainProfile(main);
    const done = operation === 'approve' ? 'applied' : 'undone';
    if (action.status === done) return { action, fields: action.fields.map(f => f.target === 'service' && !(main!['services'] as Record<string, unknown>[] || []).some(s => s['id'] === f.serviceId)
      ? { ...f, after: '', removed: true } : { ...f, after: current(main!, f) }) };
    if (operation === 'approve' && action.status !== 'prepared' || operation === 'undo' && action.status !== 'applied') throw new SiteActionError(409, 'change_conflict', 'This proposal cannot be changed again.');
    if (action.fields.some(f => current(main!, f) !== (operation === 'approve' ? f.before : f.after))) throw new SiteActionError(409, 'change_conflict', 'A value changed since this proposal. No edits were made.');
    const fields = action.fields.map(f => ({ ...f, after: operation === 'approve' ? f.after : f.before }));
    const profile = { ...mainProfile(main) }, services = (main!['services'] as Record<string, unknown>[] || []).map(s => ({ ...s }));
    for (const f of fields) {
      if (f.target === 'profile') profile[f.field] = f.after;
      else services.find(s => s['id'] === f.serviceId)![f.field] = f.after;
    }
    const timestamp = now.toISOString();
    const updated: SiteChange = { ...action, status: done, ...(operation === 'approve' ? { appliedAt: timestamp } : { undoneAt: timestamp }) };
    const activities = Array.isArray(main!['activities']) ? main!['activities'] : [];
    tx.update(mainRef, { profile, services, activities: [{ id: `${id}-${operation}`, type: 'note_added', title: operation === 'approve' ? 'Website change approved' : 'Website change undone', description: action.request, date: timestamp }, ...activities].slice(0, 500) });
    tx.set(ref, updated); return { action: updated, fields };
  });
}
