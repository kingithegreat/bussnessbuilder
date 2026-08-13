import { describe, it, expect } from 'vitest';
import {
  emptyDraft,
  parseDraft,
  serializeDraft,
  hasContent,
  draftProgress,
  missingRequiredLabels,
  SetupDraft,
} from './setup-draft';

const full: SetupDraft = {
  name: 'Apex Cleaners',
  type: 'cleaning',
  tagline: 'Professional cleaning you can trust.',
  email: 'hello@apex.example',
  phone: '021 555 0100',
  serviceArea: 'Auckland',
};

describe('parseDraft', () => {
  it('round-trips a serialized draft', () => {
    expect(parseDraft(serializeDraft(full))).toEqual(full);
  });

  it('returns null for missing or unparseable input', () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft('')).toBeNull();
    expect(parseDraft('{not json')).toBeNull();
  });

  it('coerces missing and non-string fields to empty strings', () => {
    const parsed = parseDraft(JSON.stringify({ name: 'Solo', type: 7, extra: 'ignored' }));
    expect(parsed).toEqual({ ...emptyDraft(), name: 'Solo' });
  });

  it('returns null for a JSON scalar', () => {
    expect(parseDraft('null')).toBeNull();
  });
});

describe('hasContent', () => {
  it('is false for an empty draft and for whitespace only', () => {
    expect(hasContent(emptyDraft())).toBe(false);
    expect(hasContent({ ...emptyDraft(), name: '   ' })).toBe(false);
  });

  it('is true as soon as any field has real content', () => {
    expect(hasContent({ ...emptyDraft(), phone: '021' })).toBe(true);
  });
});

describe('draftProgress', () => {
  it('is 0 on an empty form — the old bar claimed 100%', () => {
    expect(draftProgress(emptyDraft())).toBe(0);
  });

  it('is 100 when every field is filled', () => {
    expect(draftProgress(full)).toBe(100);
  });

  it('weights required fields double', () => {
    const requiredOnly = draftProgress({ ...emptyDraft(), name: 'A', type: 'cleaning', email: 'a@b.co' });
    const optionalOnly = draftProgress({ ...emptyDraft(), tagline: 'A', phone: 'B', serviceArea: 'C' });
    expect(requiredOnly).toBeGreaterThan(optionalOnly);
    expect(requiredOnly).toBe(67);
    expect(optionalOnly).toBe(33);
  });

  it('grows monotonically as fields are filled', () => {
    const steps = [
      emptyDraft(),
      { ...emptyDraft(), name: 'A' },
      { ...emptyDraft(), name: 'A', type: 'cleaning' },
      { ...emptyDraft(), name: 'A', type: 'cleaning', email: 'a@b.co' },
      full,
    ].map(draftProgress);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]).toBeGreaterThan(steps[i - 1]);
    }
  });
});

describe('missingRequiredLabels', () => {
  it('lists every missing required field in form order', () => {
    expect(missingRequiredLabels(emptyDraft())).toEqual(['Business Name', 'Business Type', 'a valid Email']);
  });

  it('is empty once the required fields are filled', () => {
    expect(missingRequiredLabels({ ...emptyDraft(), name: 'A', type: 'cleaning', email: 'a@b.co' })).toEqual([]);
  });

  it('ignores optional fields', () => {
    expect(missingRequiredLabels({ ...full, phone: '', serviceArea: '', tagline: '' })).toEqual([]);
  });
});
