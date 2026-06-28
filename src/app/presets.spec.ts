import { BUSINESS_PRESETS, getPreset } from './presets';
import { BusinessType } from './types';

describe('business presets', () => {
  it('exposes at least one preset', () => {
    expect(BUSINESS_PRESETS.length).toBeGreaterThan(0);
  });

  it('has unique preset ids', () => {
    const ids = BUSINESS_PRESETS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses valid BusinessType ids', () => {
    const valid: BusinessType[] = [
      'cleaner', 'barber', 'personal trainer', 'tutor', 'lawn mowing',
      'mechanic', 'rental', 'cafe', 'consultant', 'shop', 'other',
    ];
    for (const preset of BUSINESS_PRESETS) {
      expect(valid).toContain(preset.id);
    }
  });

  it('fully populates every preset', () => {
    for (const preset of BUSINESS_PRESETS) {
      expect(preset.label.trim().length).toBeGreaterThan(0);
      expect(preset.description.trim().length).toBeGreaterThan(0);
      expect(preset.suggestedServices.length).toBeGreaterThan(0);
      expect(preset.suggestedFaqs.length).toBeGreaterThan(0);
      expect(preset.suggestedHeroCopy.trim().length).toBeGreaterThan(0);
      expect(preset.suggestedCtaText.trim().length).toBeGreaterThan(0);
      expect(preset.trustBadges.length).toBeGreaterThan(0);
    }
  });

  it('gives every suggested service an id, name and price', () => {
    for (const preset of BUSINESS_PRESETS) {
      for (const service of preset.suggestedServices) {
        expect(service.id.trim().length).toBeGreaterThan(0);
        expect(service.name.trim().length).toBeGreaterThan(0);
        expect((service.price ?? '').trim().length).toBeGreaterThan(0);
      }
    }
  });

  describe('getPreset', () => {
    it('returns the matching preset by id', () => {
      const first = BUSINESS_PRESETS[0];
      expect(getPreset(first.id)).toBe(first);
    });

    it('returns undefined for a type with no preset', () => {
      expect(getPreset('other')).toBeUndefined();
    });
  });
});
