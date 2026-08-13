import { describe, it, expect } from 'vitest';
import {
  ActivationState,
  activationSteps,
  activationProgress,
  nextStepIndex,
  isFullyActivated,
  isBrandingTouched,
  areServicesEdited,
  DEFAULT_PRIMARY_COLOR,
} from './activation';

const fresh: ActivationState = {
  published: true,
  brandingTouched: false,
  servicesEdited: false,
  linkShared: false,
  enquiryCount: 0,
};

describe('isBrandingTouched', () => {
  it('is false for seeded defaults and for missing branding', () => {
    expect(isBrandingTouched(undefined)).toBe(false);
    expect(isBrandingTouched({ logoUrl: '', primaryColor: DEFAULT_PRIMARY_COLOR })).toBe(false);
    expect(isBrandingTouched({ logoUrl: '   ', primaryColor: '  #2563EB ' })).toBe(false);
  });

  it('is true once a logo or a non-default colour is set', () => {
    expect(isBrandingTouched({ logoUrl: 'https://x/logo.png', primaryColor: DEFAULT_PRIMARY_COLOR })).toBe(true);
    expect(isBrandingTouched({ logoUrl: '', primaryColor: '#ff0000' })).toBe(true);
  });
});

describe('areServicesEdited', () => {
  const seeded = ['Standard Clean', 'Deep Clean'];

  it('is false while the seeded starter services are untouched', () => {
    expect(areServicesEdited([{ name: 'Standard Clean' }, { name: 'Deep Clean' }], seeded)).toBe(false);
  });

  it('is false when there are no services at all', () => {
    expect(areServicesEdited([], seeded)).toBe(false);
    expect(areServicesEdited(undefined, seeded)).toBe(false);
  });

  it('is true when a service is renamed, added, or removed', () => {
    expect(areServicesEdited([{ name: 'Standard Clean' }, { name: 'Gutters' }], seeded)).toBe(true);
    expect(areServicesEdited([{ name: 'Standard Clean' }, { name: 'Deep Clean' }, { name: 'Gutters' }], seeded)).toBe(true);
    expect(areServicesEdited([{ name: 'Standard Clean' }], seeded)).toBe(true);
  });

  it('treats any service as edited when nothing was seeded', () => {
    expect(areServicesEdited([{ name: 'Anything' }], [])).toBe(true);
  });
});

describe('activationSteps', () => {
  it('marks only the published step done for a fresh account', () => {
    const steps = activationSteps(fresh);
    expect(steps.filter(s => s.done).map(s => s.id)).toEqual(['publish']);
  });

  it('counts an enquiry as the final step', () => {
    const steps = activationSteps({ ...fresh, enquiryCount: 1 });
    expect(steps.find(s => s.id === 'enquiry')?.done).toBe(true);
  });

  it('every step has a route and an action label', () => {
    for (const step of activationSteps(fresh)) {
      expect(step.route).toMatch(/^\/admin\//);
      expect(step.action.length).toBeGreaterThan(0);
    }
  });
});

describe('activationProgress', () => {
  it('reports real completion, not slide position', () => {
    expect(activationProgress(activationSteps(fresh))).toEqual({ done: 1, total: 5, percent: 20 });
  });

  it('reaches 100% only when every step is done', () => {
    const all = activationSteps({
      published: true,
      brandingTouched: true,
      servicesEdited: true,
      linkShared: true,
      enquiryCount: 3,
    });
    expect(activationProgress(all).percent).toBe(100);
    expect(isFullyActivated(all)).toBe(true);
  });

  it('is 0 for an empty list', () => {
    expect(activationProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
    expect(isFullyActivated([])).toBe(false);
  });
});

describe('nextStepIndex', () => {
  it('points at the first outstanding step', () => {
    expect(nextStepIndex(activationSteps(fresh))).toBe(1);
    expect(nextStepIndex(activationSteps({ ...fresh, brandingTouched: true }))).toBe(2);
  });

  it('falls back to the last step when everything is done', () => {
    const all = activationSteps({
      published: true,
      brandingTouched: true,
      servicesEdited: true,
      linkShared: true,
      enquiryCount: 1,
    });
    expect(nextStepIndex(all)).toBe(all.length - 1);
  });
});
