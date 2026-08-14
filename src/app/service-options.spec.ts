import { describe, it, expect } from 'vitest';
import {
  resolveFieldOptions,
  hasSeededServiceOptions,
  SEEDED_SERVICE_OPTIONS,
  SERVICE_FIELD_ID,
} from './service-options';

const serviceField = (options = SEEDED_SERVICE_OPTIONS) => ({
  id: SERVICE_FIELD_ID,
  type: 'dropdown',
  options,
});

describe('hasSeededServiceOptions', () => {
  it('recognises the shipped cleaning defaults', () => {
    expect(hasSeededServiceOptions(SEEDED_SERVICE_OPTIONS)).toBe(true);
    expect(hasSeededServiceOptions('Deep Clean, Standard Clean, Other')).toBe(true);
    expect(hasSeededServiceOptions('standard clean,deep clean,other')).toBe(true);
  });

  it('treats empty as untouched', () => {
    expect(hasSeededServiceOptions('')).toBe(true);
    expect(hasSeededServiceOptions(null)).toBe(true);
    expect(hasSeededServiceOptions(undefined)).toBe(true);
  });

  it('recognises an owner-authored list', () => {
    expect(hasSeededServiceOptions('Green Fees,Tour Package,Other')).toBe(false);
    expect(hasSeededServiceOptions('Standard Clean,Deep Clean')).toBe(false);
    expect(hasSeededServiceOptions('Standard Clean,Deep Clean,Other,Move Out')).toBe(false);
  });
});

describe('resolveFieldOptions', () => {
  it('derives the seeded service dropdown from the real services', () => {
    // The live bug: a golf-tour site asked visitors to pick a kind of clean.
    const services = [{ name: 'Golf Tour Package' }, { name: 'Cultural Day Trip' }];
    expect(resolveFieldOptions(serviceField(), services)).toEqual([
      'Golf Tour Package',
      'Cultural Day Trip',
      'Other',
    ]);
  });

  it('never leaves the cleaning defaults on a non-cleaning site', () => {
    const opts = resolveFieldOptions(serviceField(), [{ name: 'Green Fees' }]);
    expect(opts).not.toContain('Standard Clean');
    expect(opts).not.toContain('Deep Clean');
  });

  it('appends Other exactly once', () => {
    expect(resolveFieldOptions(serviceField(), [{ name: 'Repair' }, { name: 'Other' }]))
      .toEqual(['Repair', 'Other']);
    expect(resolveFieldOptions(serviceField(), [{ name: 'Repair' }, { name: 'other' }]))
      .toEqual(['Repair', 'other']);
  });

  it('respects options the owner has edited', () => {
    const custom = serviceField('Green Fees,Tour Package,Other');
    expect(resolveFieldOptions(custom, [{ name: 'Ignored Service' }]))
      .toEqual(['Green Fees', 'Tour Package', 'Other']);
  });

  it('keeps the existing options when there are no services yet', () => {
    // Better a stale required dropdown than an empty one no visitor can satisfy.
    expect(resolveFieldOptions(serviceField(), [])).toEqual(['Standard Clean', 'Deep Clean', 'Other']);
    expect(resolveFieldOptions(serviceField(), null)).toEqual(['Standard Clean', 'Deep Clean', 'Other']);
    expect(resolveFieldOptions(serviceField(), [{ name: '   ' }])).toEqual(['Standard Clean', 'Deep Clean', 'Other']);
  });

  it('de-duplicates service names case-insensitively', () => {
    const services = [{ name: 'Deep Clean' }, { name: 'deep clean' }, { name: 'Windows' }];
    expect(resolveFieldOptions(serviceField(), services)).toEqual(['Deep Clean', 'Windows', 'Other']);
  });

  it('leaves every other field alone', () => {
    const other = { id: 'budget_range', type: 'dropdown', options: 'A,B,C' };
    expect(resolveFieldOptions(other, [{ name: 'Golf Tour' }])).toEqual(['A', 'B', 'C']);

    const notADropdown = { id: SERVICE_FIELD_ID, type: 'text', options: SEEDED_SERVICE_OPTIONS };
    expect(resolveFieldOptions(notADropdown, [{ name: 'Golf Tour' }]))
      .toEqual(['Standard Clean', 'Deep Clean', 'Other']);
  });

  it('trims whitespace and drops empty entries', () => {
    const field = { id: 'x', type: 'dropdown', options: ' A , , B ,' };
    expect(resolveFieldOptions(field, [])).toEqual(['A', 'B']);
  });
});
