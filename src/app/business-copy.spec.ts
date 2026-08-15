import { describe, it, expect } from 'vitest';
import {
  businessTypeNoun,
  hashtag,
  hashtagLine,
  asSentence,
  aboutDescription,
} from './business-copy';
import { BUSINESS_PRESETS } from './presets';
import { BusinessType } from './types';

/** Every declared BusinessType, including the six with no preset. */
const ALL_TYPES: BusinessType[] = [
  'cleaner', 'barber', 'personal trainer', 'tutor', 'lawn mowing',
  'mechanic', 'rental', 'cafe', 'consultant', 'shop', 'other',
];

describe('businessTypeNoun', () => {
  it('reads as a noun phrase mid-sentence for every preset type', () => {
    for (const preset of BUSINESS_PRESETS) {
      const noun = businessTypeNoun(preset.id);
      expect(noun.length).toBeGreaterThan(0);
      expect(noun).toBe(noun.toLowerCase());
      // "the best cleaning service service in town" was the trap.
      expect(noun.endsWith('service service')).toBe(false);
    }
  });

  it("returns '' for 'other', unset, and the preset-less types", () => {
    expect(businessTypeNoun('other')).toBe('');
    expect(businessTypeNoun('')).toBe('');
    expect(businessTypeNoun(null)).toBe('');
    expect(businessTypeNoun(undefined)).toBe('');
    for (const type of ['mechanic', 'rental', 'cafe', 'consultant', 'shop']) {
      expect(businessTypeNoun(type)).toBe('');
    }
  });

  it('never returns a noun that reads as a machine value', () => {
    // 'personal trainer' and 'tutor' are legitimately their own trade nouns, so
    // "not equal to the id" is the wrong contract. What matters is that the
    // result is either a natural lowercase noun phrase or ''.
    for (const type of ALL_TYPES) {
      const noun = businessTypeNoun(type);
      if (!noun) continue;
      expect(noun).toBe(noun.toLowerCase());
      expect(noun).not.toMatch(/[_/]/);
      expect(noun.trim()).toBe(noun);
    }
  });

  it("reads naturally in the sentences it is actually used in", () => {
    // Regression guard for the reason tradeNoun exists at all: label-derived
    // copy produced "the best cleaning service service in town".
    expect(`the best ${businessTypeNoun('cleaner')} in town`).toBe('the best cleaning service in town');
    expect(`a trusted ${businessTypeNoun('barber')}`).toBe('a trusted barbershop');
  });
});

describe('hashtag', () => {
  it('strips everything a hashtag would end on', () => {
    // "#QLD/Brisbane" posts as "#QLD"; "#Lawn Care & Landscaping" as "#Lawn".
    expect(hashtag('QLD/Brisbane')).toBe('#QLDBrisbane');
    expect(hashtag('Lawn Care & Landscaping')).toBe('#LawnCareLandscaping');
    expect(hashtag('Bay of Plenty')).toBe('#BayofPlenty');
  });

  it("returns '' rather than a bare '#' when nothing survives", () => {
    expect(hashtag('')).toBe('');
    expect(hashtag(null)).toBe('');
    expect(hashtag('  /  ')).toBe('');
  });
});

describe('hashtagLine', () => {
  it('drops blanks instead of emitting a stray #', () => {
    expect(hashtagLine(['', null, 'LocalBusiness'])).toBe('#LocalBusiness');
  });

  it('de-duplicates case-insensitively and keeps order', () => {
    expect(hashtagLine(['Tauranga', 'tauranga', 'SmallBusiness']))
      .toBe('#Tauranga #SmallBusiness');
  });

  it('never emits the raw type id for a preset-less business', () => {
    const line = hashtagLine([businessTypeNoun('other'), 'QLD/Brisbane', 'LocalBusiness']);
    expect(line).toBe('#QLDBrisbane #LocalBusiness');
    expect(line).not.toContain('other');
  });
});

describe('asSentence', () => {
  it('does not double the full stop the owner already typed', () => {
    // Live bug: "Spotless cleaning for a healthier, happier home.. Our goal…"
    expect(asSentence('Spotless cleaning for a healthier, happier home.'))
      .toBe('Spotless cleaning for a healthier, happier home.');
    expect(asSentence('Golf tours across Aotearoa!')).toBe('Golf tours across Aotearoa.');
  });

  it("returns '' for blank input rather than a floating full stop", () => {
    expect(asSentence('')).toBe('');
    expect(asSentence('   ')).toBe('');
    expect(asSentence(undefined)).toBe('');
  });
});

describe('aboutDescription', () => {
  it('never mentions the business type, and never a stray full stop', () => {
    const text = aboutDescription({ name: 'Kapai Tours', tagline: '', serviceArea: 'QLD/Brisbane' });
    expect(text).toContain('Welcome to Kapai Tours!');
    expect(text).toContain('in the QLD/Brisbane area');
    expect(text).not.toContain('! .');
    expect(text).not.toContain('..');
    expect(text).not.toContain('other');
  });

  it('folds an owner tagline in with exactly one full stop', () => {
    const text = aboutDescription({
      name: 'Apex',
      tagline: 'Spotless cleaning for a healthier, happier home.',
      serviceArea: 'Tauranga',
    });
    expect(text).toContain('happier home. Our goal');
    expect(text).not.toContain('..');
  });

  it('drops the service-area clause when there is no area', () => {
    const text = aboutDescription({ name: 'Apex' });
    expect(text).toContain('excellent service.');
    expect(text).not.toContain('in the  area');
  });

  it('never contains a preset catalogue blurb', () => {
    // preset.description describes the CATEGORY, not the business: a cleaner's
    // About read "Apex Cleaners! Residential and commercial cleaning businesses."
    for (const preset of BUSINESS_PRESETS) {
      const text = aboutDescription({ name: 'Apex', tagline: 'Tag', serviceArea: 'Akl' });
      expect(text).not.toContain(preset.description);
    }
  });
});
