import { describe, it, expect } from 'vitest';
import {
  normalizeFunnelDay,
  buildFunnelDeltas,
  buildFunnelReport,
  funnelDayKeys,
  clampFunnelDays,
  FunnelDayDoc,
} from './server-funnel';

const NOW = new Date('2026-08-14T09:30:00.000Z');

describe('normalizeFunnelDay', () => {
  it('accepts today and the two previous UTC days', () => {
    expect(normalizeFunnelDay('2026-08-14', NOW)).toBe('2026-08-14');
    expect(normalizeFunnelDay('2026-08-13', NOW)).toBe('2026-08-13');
    expect(normalizeFunnelDay('2026-08-12', NOW)).toBe('2026-08-12');
  });

  it('rejects anything older, the future, or malformed input — caps document cardinality', () => {
    expect(normalizeFunnelDay('2026-08-11', NOW)).toBeNull();
    expect(normalizeFunnelDay('2026-08-15', NOW)).toBeNull();
    expect(normalizeFunnelDay('2026-8-14', NOW)).toBeNull();
    expect(normalizeFunnelDay('../../etc/passwd', NOW)).toBeNull();
    expect(normalizeFunnelDay(20260814, NOW)).toBeNull();
    expect(normalizeFunnelDay(undefined, NOW)).toBeNull();
  });

  it('crosses a month boundary correctly', () => {
    const firstOfMonth = new Date('2026-09-01T00:10:00.000Z');
    expect(normalizeFunnelDay('2026-08-31', firstOfMonth)).toBe('2026-08-31');
    expect(normalizeFunnelDay('2026-08-30', firstOfMonth)).toBe('2026-08-30');
    expect(normalizeFunnelDay('2026-08-29', firstOfMonth)).toBeNull();
  });
});

describe('buildFunnelDeltas', () => {
  it('rejects a body with no usable day', () => {
    expect(buildFunnelDeltas(null, NOW)).toBeNull();
    expect(buildFunnelDeltas('nope', NOW)).toBeNull();
    expect(buildFunnelDeltas({ steps: ['landing_viewed'] }, NOW)).toBeNull();
    expect(buildFunnelDeltas({ day: '1999-01-01', steps: ['landing_viewed'] }, NOW)).toBeNull();
  });

  it('rejects a valid day carrying nothing recordable', () => {
    expect(buildFunnelDeltas({ day: '2026-08-14', steps: [], flags: [] }, NOW)).toBeNull();
  });

  it('counts allowlisted steps and flags once each', () => {
    const plan = buildFunnelDeltas({
      day: '2026-08-14',
      steps: ['landing_viewed', 'landing_viewed', 'cta_clicked'],
      flags: ['stash_lost'],
    }, NOW);
    expect(plan?.deltas.steps).toEqual({ landing_viewed: 1, cta_clicked: 1 });
    expect(plan?.deltas.flags).toEqual({ stash_lost: 1 });
  });

  it('silently drops unknown names instead of erroring — old clients degrade', () => {
    const plan = buildFunnelDeltas({
      day: '2026-08-14',
      steps: ['landing_viewed', 'invented_step', '__proto__', 'constructor'],
      flags: ['not_a_flag'],
      authError: 'auth/made-up',
    }, NOW);
    expect(plan?.deltas.steps).toEqual({ landing_viewed: 1 });
    expect(plan?.deltas.flags).toEqual({});
    expect(plan?.deltas.authErrors).toEqual({});
  });

  it('caps how many names one request can carry', () => {
    const spam = Array.from({ length: 500 }, () => 'landing_viewed');
    const plan = buildFunnelDeltas({ day: '2026-08-14', steps: spam }, NOW);
    expect(Object.keys(plan!.deltas.steps).length).toBe(1);
    expect(plan!.deltas.steps['landing_viewed']).toBe(1);
  });

  it('accepts only allowlisted auth error codes', () => {
    const plan = buildFunnelDeltas({ day: '2026-08-14', authError: 'auth/email-already-in-use' }, NOW);
    expect(plan?.deltas.authErrors).toEqual({ 'auth/email-already-in-use': 1 });
  });

  it('moves the furthest marker forward, decrementing the bucket it left', () => {
    const plan = buildFunnelDeltas({
      day: '2026-08-14', steps: ['wizard_started'], from: 'landing_viewed', to: 'wizard_started',
    }, NOW);
    expect(plan?.deltas.furthest).toEqual({ wizard_started: 1, landing_viewed: -1 });
  });

  it('opens a bucket with no decrement for a first step', () => {
    const plan = buildFunnelDeltas({ day: '2026-08-14', steps: ['landing_viewed'], from: null, to: 'landing_viewed' }, NOW);
    expect(plan?.deltas.furthest).toEqual({ landing_viewed: 1 });
  });

  it('ignores a backwards or equal marker move — the histogram cannot be gamed downwards', () => {
    const back = buildFunnelDeltas({ day: '2026-08-14', steps: ['cta_clicked'], from: 'site_live', to: 'cta_clicked' }, NOW);
    expect(back?.deltas.furthest).toEqual({});
    const same = buildFunnelDeltas({ day: '2026-08-14', steps: ['cta_clicked'], from: 'cta_clicked', to: 'cta_clicked' }, NOW);
    expect(same?.deltas.furthest).toEqual({});
  });
});

describe('funnelDayKeys / clampFunnelDays', () => {
  it('returns the range oldest-first, ending today', () => {
    expect(funnelDayKeys(3, NOW)).toEqual(['2026-08-12', '2026-08-13', '2026-08-14']);
  });

  it('clamps the range to 7, 30 or 90', () => {
    expect(clampFunnelDays(7)).toBe(7);
    expect(clampFunnelDays('90')).toBe(90);
    expect(clampFunnelDays(1000)).toBe(30);
    expect(clampFunnelDays('nonsense')).toBe(30);
    expect(clampFunnelDays(undefined)).toBe(30);
  });
});

describe('buildFunnelReport', () => {
  const day = (date: string, over: Partial<FunnelDayDoc> = {}): FunnelDayDoc => ({ date, ...over });

  it('zero-fills missing days so the trend series has no gaps', () => {
    const report = buildFunnelReport([null, null, null], 3, NOW);
    expect(report.daily.map(d => d.date)).toEqual(['2026-08-12', '2026-08-13', '2026-08-14']);
    expect(report.sessions).toBe(0);
    expect(report.funnel.every(r => r.reached === 0)).toBe(true);
  });

  it('never divides by zero on an empty range', () => {
    const report = buildFunnelReport([null], 1, NOW);
    for (const row of report.funnel) {
      expect(Number.isFinite(row.conversionFromPrev)).toBe(true);
      expect(Number.isFinite(row.conversionFromTop)).toBe(true);
      expect(row.conversionFromPrev).toBe(0);
    }
  });

  it('sums across days and derives sessions from the furthest buckets', () => {
    const docs = [
      day('2026-08-13', { steps: { landing_viewed: 10, wizard_started: 4 }, furthest: { landing_viewed: 6, wizard_started: 4 } }),
      day('2026-08-14', { steps: { landing_viewed: 10, wizard_started: 6 }, furthest: { landing_viewed: 4, wizard_started: 6 } }),
    ];
    const report = buildFunnelReport(docs, 2, NOW);
    expect(report.sessions).toBe(20);
    expect(report.totals.steps['landing_viewed']).toBe(20);
    const wizard = report.funnel.find(r => r.step === 'wizard_started')!;
    expect(wizard.reached).toBe(10);
    expect(wizard.conversionFromTop).toBe(50);
    expect(wizard.exitedHere).toBe(10);
  });

  it('computes step-to-step conversion against the previous step', () => {
    const docs = [day('2026-08-14', {
      steps: { landing_viewed: 100, cta_clicked: 50, wizard_started: 25 },
      furthest: { landing_viewed: 100 },
    })];
    const report = buildFunnelReport(docs, 1, NOW);
    expect(report.funnel.find(r => r.step === 'cta_clicked')!.conversionFromPrev).toBe(50);
    expect(report.funnel.find(r => r.step === 'wizard_started')!.conversionFromPrev).toBe(50);
    expect(report.funnel.find(r => r.step === 'wizard_started')!.conversionFromTop).toBe(25);
  });

  it('clamps a negative counter to zero rather than rendering a negative bar', () => {
    const docs = [day('2026-08-14', { furthest: { landing_viewed: -3, wizard_started: 5 } })];
    const report = buildFunnelReport(docs, 1, NOW);
    expect(report.funnel.find(r => r.step === 'landing_viewed')!.exitedHere).toBe(0);
    expect(report.sessions).toBe(5);
  });

  it('ignores keys that are not on the allowlist', () => {
    const docs = [day('2026-08-14', {
      steps: { landing_viewed: 3, hacked_key: 999 } as Record<string, number>,
      furthest: { landing_viewed: 3 },
    })];
    const report = buildFunnelReport(docs, 1, NOW);
    expect(report.totals.steps).toEqual({ landing_viewed: 3 });
  });

  it('buckets abandons into non-overlapping stages that sum with completions to sessions', () => {
    const docs = [day('2026-08-14', {
      furthest: {
        landing_viewed: 40, cta_clicked: 10,
        wizard_started: 15, wizard_engaged: 8, wizard_review_opened: 2,
        publish_clicked: 5, signup_shown: 12,
        account_created: 3, site_live: 4, link_shared: 1,
      },
    })];
    const r = buildFunnelReport(docs, 1, NOW);
    expect(r.abandon).toEqual({ landing: 50, wizard: 25, publish: 5, signup: 12, afterSignup: 7 });
    const total = r.abandon.landing + r.abandon.wizard + r.abandon.publish + r.abandon.signup + r.abandon.afterSignup + r.completed;
    expect(total).toBe(r.sessions);
  });
});
