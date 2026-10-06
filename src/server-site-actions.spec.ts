import type { HomepageHeadlineAction, PrepareHeadlineInput } from './app/site-action';
import { applyHeadlineAction, HEADLINE_PREPARATION_TTL_MS, listHeadlineActions, prepareHeadlineAction, undoHeadlineAction, type GeneratedHeadline } from './server-site-actions';
import { createSiteActionTestDb } from './testing/site-action-db';

const uid = 'owner';
const id = '8fd0b404-ab58-4a6c-9ae7-6d7a46b90cc7';
const otherId = '8fd0b404-ab58-4a6c-9ae7-6d7a46b90cc8';
const mainPath = `users/${uid}/businessData/main`;
const actionPath = `businessActions/${uid}/entries/${id}`;
const claimPath = `businessActions/${uid}/preparations/${id}`;
const now = new Date('2026-10-07T01:00:00.000Z');
const input: PrepareHeadlineInput = { id, request: 'Improve my homepage headline', expectedHeadline: 'Trusted local repairs' };
const generated: GeneratedHeadline = { headline: 'Careful repairs, lasting peace of mind.', reason: 'Focuses on the customer benefit.', source: 'template' };

function store() {
  return createSiteActionTestDb({ [mainPath]: {
    isSetupComplete: true,
    profile: { businessName: 'Acme', tagline: input.expectedHeadline, city: 'Auckland' },
    enquiries: [{ id: 'lead-1', status: 'New' }], activities: [{ id: 'old-activity' }],
    customization: { primaryColor: '#123456' }, services: [{ id: 'service-1' }],
  } });
}

describe('server-owned homepage headline actions', () => {
  it('prepares a proposal without changing the live website and reuses its ID without another generation', async () => {
    const { db, documents, writes } = store();
    const before = structuredClone(documents.get(mainPath));
    const generate = vi.fn(async () => generated);
    const action = await prepareHeadlineAction(db, uid, input, generate, now);
    expect(action).toMatchObject({ id, status: 'prepared', actorUid: uid, before: { tagline: input.expectedHeadline }, after: { tagline: generated.headline } });
    expect(documents.get(mainPath)).toEqual(before);
    expect(writes.some(write => write.path === mainPath)).toBe(false);
    expect(documents.has(claimPath)).toBe(false);
    expect(await prepareHeadlineAction(db, uid, input, generate, now)).toEqual(action);
    expect(generate).toHaveBeenCalledTimes(1);
    await expect(prepareHeadlineAction(db, uid, { ...input, request: 'Use a shorter headline' }, generate, now)).rejects.toMatchObject({ code: 'action_id_reused', status: 409 });
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('checks the saved headline and narrow intent before reserving or generating', async () => {
    const { db, documents, writes } = store();
    const generate = vi.fn(async () => generated);
    await expect(prepareHeadlineAction(db, uid, { ...input, expectedHeadline: 'Stale browser headline' }, generate, now)).rejects.toMatchObject({ code: 'headline_conflict' });
    await expect(prepareHeadlineAction(db, uid, { ...input, request: 'Delete my account' }, generate, now)).rejects.toMatchObject({ code: 'unsupported_request' });
    await expect(prepareHeadlineAction(db, '../someone', input, generate, now)).rejects.toMatchObject({ code: 'invalid_owner' });
    await expect(prepareHeadlineAction(db, uid, { ...input, id: '../../another' }, generate, now)).rejects.toMatchObject({ code: 'invalid_action_id' });
    expect(generate).not.toHaveBeenCalled();
    expect(writes).toHaveLength(0);
    expect(documents.has(claimPath)).toBe(false);
  });

  it('requires a completed website for preparation and first approval', async () => {
    const { db, documents } = store();
    const generate = vi.fn(async () => generated);
    documents.get(mainPath)!['isSetupComplete'] = false;
    await expect(prepareHeadlineAction(db, uid, input, generate, now)).rejects.toMatchObject({ code: 'site_not_ready' });
    expect(generate).not.toHaveBeenCalled();
    documents.get(mainPath)!['isSetupComplete'] = true;
    await prepareHeadlineAction(db, uid, input, generate, now);
    documents.get(mainPath)!['isSetupComplete'] = false;
    await expect(applyHeadlineAction(db, uid, id, now)).rejects.toMatchObject({ code: 'site_not_ready' });
    expect(documents.get(actionPath)?.['status']).toBe('prepared');
  });

  it('rejects simultaneous duplicate preparation without another generation', async () => {
    const { db } = store();
    let release!: (headline: GeneratedHeadline) => void;
    let announce!: () => void;
    const started = new Promise<void>(resolve => { announce = resolve; });
    const generate = vi.fn(() => {
      announce();
      return new Promise<GeneratedHeadline>(resolve => { release = resolve; });
    });
    const first = prepareHeadlineAction(db, uid, input, generate, now);
    await started;
    await expect(prepareHeadlineAction(db, uid, input, generate, now)).rejects.toMatchObject({ code: 'action_preparing', status: 409 });
    expect(generate).toHaveBeenCalledTimes(1);
    release(generated);
    expect((await first).status).toBe('prepared');
  });

  it('recovers abandoned claims after a bounded TTL and clears ordinary failed generation claims', async () => {
    const { db, documents } = store();
    documents.set(claimPath, { actorUid: uid, request: input.request, expectedHeadline: input.expectedHeadline, startedAt: now.toISOString(), claimToken: 'crashed-process' });
    const generate = vi.fn(async () => generated);
    await expect(prepareHeadlineAction(db, uid, input, generate, new Date(now.getTime() + HEADLINE_PREPARATION_TTL_MS - 1))).rejects.toMatchObject({ code: 'action_preparing' });
    expect(generate).not.toHaveBeenCalled();
    expect((await prepareHeadlineAction(db, uid, input, generate, new Date(now.getTime() + HEADLINE_PREPARATION_TTL_MS))).status).toBe('prepared');
    const otherClaim = `businessActions/${uid}/preparations/${otherId}`;
    await expect(prepareHeadlineAction(db, uid, { ...input, id: otherId }, async () => { throw new Error('provider unavailable'); }, now)).rejects.toThrow('provider unavailable');
    expect(documents.has(otherClaim)).toBe(false);
  });

  it('does not let an expired callback overwrite or clear a replacement preparation', async () => {
    const { db, documents } = store();
    let oldRelease!: (headline: GeneratedHeadline) => void;
    let newRelease!: (headline: GeneratedHeadline) => void;
    let oldAnnounce!: () => void;
    let newAnnounce!: () => void;
    const oldStarted = new Promise<void>(resolve => { oldAnnounce = resolve; });
    const newStarted = new Promise<void>(resolve => { newAnnounce = resolve; });
    const oldPreparation = prepareHeadlineAction(db, uid, input, () => {
      oldAnnounce();
      return new Promise<GeneratedHeadline>(resolve => { oldRelease = resolve; });
    }, now);
    await oldStarted;
    const newPreparation = prepareHeadlineAction(db, uid, input, () => {
      newAnnounce();
      return new Promise<GeneratedHeadline>(resolve => { newRelease = resolve; });
    }, new Date(now.getTime() + HEADLINE_PREPARATION_TTL_MS));
    await newStarted;
    oldRelease(generated);
    await expect(oldPreparation).rejects.toMatchObject({ code: 'preparation_expired' });
    expect(documents.has(actionPath)).toBe(false);
    expect(documents.has(claimPath)).toBe(true);
    newRelease({ ...generated, headline: 'A newer proposal made with care.' });
    expect((await newPreparation).after.tagline).toBe('A newer proposal made with care.');
    expect(documents.has(claimPath)).toBe(false);
  });

  it('rejects unsafe or unchanged generated text without publishing or retaining the claim', async () => {
    const { db, documents } = store();
    for (const headline of ['<b>New headline</b>', 'a'.repeat(161), input.expectedHeadline]) {
      await expect(prepareHeadlineAction(db, uid, input, async () => ({ ...generated, headline }), now)).rejects.toBeInstanceOf(Error);
      expect(documents.has(actionPath)).toBe(false);
      expect(documents.has(claimPath)).toBe(false);
      expect((documents.get(mainPath)?.['profile'] as Record<string, unknown>)['tagline']).toBe(input.expectedHeadline);
    }
  });

  it('approves only the headline while preserving fresh leads and unrelated edits, with one audit entry', async () => {
    const { db, documents, writes } = store();
    await prepareHeadlineAction(db, uid, input, async () => generated, now);
    const fresh = documents.get(mainPath)!;
    (fresh['profile'] as Record<string, unknown>)['city'] = 'Wellington';
    fresh['enquiries'] = [{ id: 'lead-2', status: 'New' }, ...(fresh['enquiries'] as unknown[])];
    const liveBefore = structuredClone(fresh);
    const action = await applyHeadlineAction(db, uid, id, now);
    expect(action.status).toBe('applied');
    const liveAfter = documents.get(mainPath)!;
    expect(liveAfter).toEqual({
      ...liveBefore,
      profile: { ...(liveBefore['profile'] as Record<string, unknown>), tagline: generated.headline },
      activities: [expect.objectContaining({ type: 'note_added', title: 'Homepage headline updated' }), ...(liveBefore['activities'] as unknown[])],
    });
    expect(writes.find(write => write.path === mainPath)?.data && Object.keys(writes.find(write => write.path === mainPath)!.data!)).toEqual(['profile.tagline', 'activities']);
    const count = writes.length;
    expect(await applyHeadlineAction(db, uid, id, now)).toEqual(action);
    expect(writes).toHaveLength(count);
  });

  it('refuses stale approval without changing the website or marking the action applied', async () => {
    const { db, documents, writes } = store();
    await prepareHeadlineAction(db, uid, input, async () => generated, now);
    (documents.get(mainPath)!['profile'] as Record<string, unknown>)['tagline'] = 'Edited in another tab';
    const count = writes.length;
    await expect(applyHeadlineAction(db, uid, id, now)).rejects.toMatchObject({ code: 'headline_conflict', status: 409 });
    expect(writes).toHaveLength(count);
    expect(documents.get(actionPath)?.['status']).toBe('prepared');
    expect((documents.get(mainPath)?.['profile'] as Record<string, unknown>)['tagline']).toBe('Edited in another tab');
  });

  it('undoes exactly once and never reapplies an undone proposal', async () => {
    const { db, documents, writes } = store();
    await prepareHeadlineAction(db, uid, input, async () => generated, now);
    await expect(undoHeadlineAction(db, uid, id, now)).rejects.toMatchObject({ code: 'action_not_applied' });
    await applyHeadlineAction(db, uid, id, now);
    const undone = await undoHeadlineAction(db, uid, id, now);
    expect(undone.status).toBe('undone');
    expect((documents.get(mainPath)?.['profile'] as Record<string, unknown>)['tagline']).toBe(input.expectedHeadline);
    expect(documents.get(mainPath)?.['activities']).toHaveLength(3);
    const count = writes.length;
    expect(await undoHeadlineAction(db, uid, id, now)).toEqual(undone);
    await expect(applyHeadlineAction(db, uid, id, now)).rejects.toMatchObject({ code: 'action_undone' });
    expect(writes).toHaveLength(count);
  });

  it('refuses undo after a later manual edit and isolates action ownership', async () => {
    const { db, documents } = store();
    await prepareHeadlineAction(db, uid, input, async () => generated, now);
    await applyHeadlineAction(db, uid, id, now);
    (documents.get(mainPath)!['profile'] as Record<string, unknown>)['tagline'] = 'Newer manual headline';
    await expect(undoHeadlineAction(db, uid, id, now)).rejects.toMatchObject({ code: 'headline_conflict' });
    expect(documents.get(actionPath)?.['status']).toBe('applied');
    await expect(applyHeadlineAction(db, 'someone-else', id, now)).rejects.toMatchObject({ code: 'action_not_found', status: 404 });
    documents.set(`businessActions/someone-else/entries/${id}`, documents.get(actionPath)!);
    await expect(undoHeadlineAction(db, 'someone-else', id, now)).rejects.toMatchObject({ code: 'invalid_action' });
    expect((documents.get(mainPath)?.['profile'] as Record<string, unknown>)['tagline']).toBe('Newer manual headline');
  });

  it('returns the most recent 20 owner actions and excludes internal claims and malformed data', async () => {
    const { db, documents, queryCalls } = store();
    const action = await prepareHeadlineAction(db, uid, input, async () => generated, now);
    for (let index = 0; index < 25; index++) {
      const entryId = `8fd0b404-ab58-4a6c-9ae7-${String(index).padStart(12, '0')}`;
      documents.set(`businessActions/${uid}/entries/${entryId}`, { ...action, id: entryId, createdAt: new Date(now.getTime() + index * 1000).toISOString() });
    }
    documents.set(`businessActions/${uid}/preparations/${otherId}`, { startedAt: now.toISOString() });
    const actions = await listHeadlineActions(db, uid);
    expect(actions).toHaveLength(20);
    expect(actions[0].createdAt).toBe(new Date(now.getTime() + 24_000).toISOString());
    expect(actions.every(entry => entry.actorUid === uid)).toBe(true);
    expect(queryCalls).toEqual([{ path: `businessActions/${uid}/entries`, field: 'createdAt', direction: 'desc', limit: 20 }]);
    documents.set(`businessActions/${uid}/entries/${otherId}`, { ...(action as HomepageHeadlineAction), actorUid: 'another-owner', createdAt: new Date(now.getTime() + 100_000).toISOString() });
    expect((await listHeadlineActions(db, uid)).some(entry => entry.actorUid !== uid)).toBe(false);
  });
});
