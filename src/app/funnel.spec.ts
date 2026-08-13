import { describe, it, expect } from 'vitest';
import {
  FUNNEL_STEPS,
  FUNNEL_FLAGS,
  AUTH_ERROR_CODES,
  FUNNEL_STEP_LABELS,
  FUNNEL_FLAG_LABELS,
  funnelRank,
  utcDay,
  newSession,
  parseSession,
  serializeSession,
  recordStep,
  recordFlag,
  hasAnalyticsConsent,
  buildBatch,
  isEmptyBatch,
  isFunnelStep,
  isFunnelFlag,
  isAuthErrorCode,
  FunnelSession,
} from './funnel';

const NOW = new Date('2026-08-14T09:30:00.000Z');

describe('vocabulary', () => {
  it('every step and flag has a label', () => {
    for (const s of FUNNEL_STEPS) expect(FUNNEL_STEP_LABELS[s].length).toBeGreaterThan(0);
    for (const f of FUNNEL_FLAGS) expect(FUNNEL_FLAG_LABELS[f].length).toBeGreaterThan(0);
  });

  it('step and flag namespaces do not overlap — seen[] holds both', () => {
    const overlap = FUNNEL_STEPS.filter(s => (FUNNEL_FLAGS as readonly string[]).includes(s));
    expect(overlap).toEqual([]);
  });

  it('guards reject unknown names', () => {
    expect(isFunnelStep('landing_viewed')).toBe(true);
    expect(isFunnelStep('landing_viewed_lol')).toBe(false);
    expect(isFunnelStep(42)).toBe(false);
    expect(isFunnelFlag('stash_lost')).toBe(true);
    expect(isFunnelFlag('steps.__proto__')).toBe(false);
    expect(isAuthErrorCode('auth/weak-password')).toBe(true);
    expect(isAuthErrorCode('auth/whatever')).toBe(false);
  });

  it('the auth-error dimension is bounded and includes a catch-all', () => {
    expect(AUTH_ERROR_CODES).toContain('other');
    expect(AUTH_ERROR_CODES.length).toBe(12);
  });
});

describe('funnelRank', () => {
  it('orders the funnel and treats null as before everything', () => {
    expect(funnelRank(null)).toBe(-1);
    expect(funnelRank('landing_viewed')).toBe(0);
    expect(funnelRank('link_shared')).toBe(FUNNEL_STEPS.length - 1);
    expect(funnelRank('account_created')).toBeGreaterThan(funnelRank('signup_shown'));
  });
});

describe('parseSession', () => {
  it('round-trips a session from the same day', () => {
    const s = { day: utcDay(NOW), furthest: 'wizard_started' as const, seen: ['landing_viewed', 'wizard_started'] };
    expect(parseSession(serializeSession(s), NOW)).toEqual(s);
  });

  it('discards junk', () => {
    expect(parseSession(null, NOW)).toBeNull();
    expect(parseSession('{oops', NOW)).toBeNull();
    expect(parseSession('null', NOW)).toBeNull();
  });

  it('discards a session from a previous day — a tab left open overnight starts fresh', () => {
    const yesterday = { day: '2026-08-13', furthest: 'publish_clicked' as const, seen: ['publish_clicked'] };
    expect(parseSession(JSON.stringify(yesterday), NOW)).toBeNull();
  });

  it('drops a furthest value that is not a known step', () => {
    const raw = JSON.stringify({ day: utcDay(NOW), furthest: 'made_up', seen: ['landing_viewed', 7] });
    expect(parseSession(raw, NOW)).toEqual({ day: utcDay(NOW), furthest: null, seen: ['landing_viewed'] });
  });
});

describe('recordStep', () => {
  const fresh = (): FunnelSession => newSession(NOW);

  it('counts a step once and moves the marker forward', () => {
    const r = recordStep(fresh(), 'landing_viewed');
    expect(r.batchPart).toEqual({ step: 'landing_viewed', from: null, to: 'landing_viewed' });
    expect(r.session.furthest).toBe('landing_viewed');
  });

  it('de-duplicates within a session — a reload must not inflate counts', () => {
    const first = recordStep(fresh(), 'landing_viewed');
    const second = recordStep(first.session, 'landing_viewed');
    expect(second.batchPart).toBeNull();
    expect(second.session.seen).toEqual(['landing_viewed']);
  });

  it('emits a marker move carrying the previous position, so furthest stays non-overlapping', () => {
    const a = recordStep(fresh(), 'landing_viewed');
    const b = recordStep(a.session, 'wizard_started');
    expect(b.batchPart).toEqual({ step: 'wizard_started', from: 'landing_viewed', to: 'wizard_started' });
  });

  it('never moves the marker backwards', () => {
    const a = recordStep(fresh(), 'publish_clicked');
    const b = recordStep(a.session, 'wizard_started');
    expect(b.batchPart).toEqual({ step: 'wizard_started', from: null, to: null });
    expect(b.session.furthest).toBe('publish_clicked');
  });

  it('marker is monotone across an out-of-order journey', () => {
    let s = fresh();
    for (const step of ['wizard_started', 'landing_viewed', 'site_live', 'cta_clicked'] as const) {
      s = recordStep(s, step).session;
    }
    expect(s.furthest).toBe('site_live');
  });
});

describe('recordFlag', () => {
  it('counts a flag once and leaves the marker alone', () => {
    const stepped = recordStep(newSession(NOW), 'wizard_started');
    const flagged = recordFlag(stepped.session, 'wizard_review_blocked');
    expect(flagged.flag).toBe('wizard_review_blocked');
    expect(flagged.session.furthest).toBe('wizard_started');

    const again = recordFlag(flagged.session, 'wizard_review_blocked');
    expect(again.flag).toBeNull();
  });
});

describe('hasAnalyticsConsent', () => {
  it('honours an explicit decline — previously declining did nothing at all', () => {
    expect(hasAnalyticsConsent('declined')).toBe(false);
  });

  it('allows accepted and not-yet-chosen', () => {
    expect(hasAnalyticsConsent('accepted')).toBe(true);
    expect(hasAnalyticsConsent(null)).toBe(true);
  });
});

describe('buildBatch / isEmptyBatch', () => {
  it('omits authError unless supplied', () => {
    expect(buildBatch('2026-08-14', [], [], null, null)).toEqual({
      day: '2026-08-14', steps: [], flags: [], from: null, to: null,
    });
    expect(buildBatch('2026-08-14', [], [], null, null, 'other').authError).toBe('other');
  });

  it('recognises a batch not worth sending', () => {
    expect(isEmptyBatch(buildBatch('2026-08-14', [], [], null, null))).toBe(true);
    expect(isEmptyBatch(buildBatch('2026-08-14', ['cta_clicked'], [], null, null))).toBe(false);
    expect(isEmptyBatch(buildBatch('2026-08-14', [], [], null, null, 'other'))).toBe(false);
  });

  it('carries no identifier of any kind', () => {
    const batch = buildBatch('2026-08-14', ['landing_viewed'], ['stash_lost'], null, 'landing_viewed');
    expect(Object.keys(batch).sort()).toEqual(['day', 'flags', 'from', 'steps', 'to']);
  });
});
