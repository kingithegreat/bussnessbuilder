import { parseHeroDraft, parseCtaLabel, parseTestimonialDraft, parseSectionDraft } from './admin-growth.component';

describe('admin-growth recommendation parsers', () => {
  describe('parseHeroDraft', () => {
    it('splits "headline\\n\\nsubtitle" into tagline and description', () => {
      const result = parseHeroDraft('Sparkling Clean Homes\n\nTrusted local cleaners serving your area.');
      expect(result.tagline).toBe('Sparkling Clean Homes');
      expect(result.description).toBe('Trusted local cleaners serving your area.');
    });

    it('joins multiple subtitle lines into the description', () => {
      const result = parseHeroDraft('Headline\n\nLine one.\nLine two.');
      expect(result.tagline).toBe('Headline');
      expect(result.description).toBe('Line one. Line two.');
    });

    it('strips leading labels and surrounding quotes', () => {
      const result = parseHeroDraft('Headline: "Big Bold Promise"\n\nSubtitle: "Why we are the best"');
      expect(result.tagline).toBe('Big Bold Promise');
      expect(result.description).toBe('Why we are the best');
    });

    it('returns only a tagline when there is a single line', () => {
      const result = parseHeroDraft('Just a headline');
      expect(result.tagline).toBe('Just a headline');
      expect(result.description).toBeUndefined();
    });

    it('returns an empty object for blank input', () => {
      expect(parseHeroDraft('   \n  ')).toEqual({});
    });
  });

  describe('parseCtaLabel', () => {
    it('keeps a short label as-is (without trailing punctuation)', () => {
      expect(parseCtaLabel('Book your free quote today!')).toBe('Book your free quote today');
    });

    it('reduces a paragraph to its first sentence', () => {
      const label = parseCtaLabel('Ready to start? Contact us for a free consultation across the region.');
      expect(label).toBe('Ready to start');
    });

    it('clamps an overly long single sentence on a word boundary with an ellipsis', () => {
      const label = parseCtaLabel(
        'Get in touch with our friendly team right now to discuss exactly how we can help your business grow',
      );
      expect(label.length).toBeLessThanOrEqual(49);
      expect(label.endsWith('…')).toBe(true);
      // clamped on a word boundary: no partial word is left dangling before the ellipsis
      expect('Get in touch with our friendly team right now to discuss exactly how we can help your business grow')
        .toContain(label.slice(0, -1).trim());
    });

    it('strips a leading "CTA:" label and quotes', () => {
      expect(parseCtaLabel('CTA: "Get Started"')).toBe('Get Started');
    });

    it('uses the first non-empty line', () => {
      expect(parseCtaLabel('\n\nClaim your discount\nmore text')).toBe('Claim your discount');
    });
  });

  describe('parseTestimonialDraft', () => {
    it('separates the quote text from an em-dash attribution line', () => {
      const result = parseTestimonialDraft('"Excellent service, highly recommended!"\n\n— Jane D., Springfield');
      expect(result.text).toBe('Excellent service, highly recommended!');
      expect(result.author).toBe('Jane D., Springfield');
    });

    it('handles a plain hyphen attribution', () => {
      const result = parseTestimonialDraft('They were fantastic.\n- Bob');
      expect(result.text).toBe('They were fantastic.');
      expect(result.author).toBe('Bob');
    });

    it('returns an empty author when there is no attribution', () => {
      const result = parseTestimonialDraft('Great work all around.');
      expect(result.text).toBe('Great work all around.');
      expect(result.author).toBe('');
    });

    it('does not treat a leading dash as attribution when no text precedes it', () => {
      const result = parseTestimonialDraft('- Not an author, this is the quote');
      expect(result.text).toBe('- Not an author, this is the quote');
      expect(result.author).toBe('');
    });
  });

  describe('parseSectionDraft', () => {
    it('uses the recommendation title as heading and the draft as body', () => {
      const result = parseSectionDraft('Boost local SEO', 'We serve Springfield and nearby suburbs.\nCall us for same-day quotes.');
      expect(result.heading).toBe('Boost local SEO');
      expect(result.content).toBe('We serve Springfield and nearby suburbs.\nCall us for same-day quotes.');
    });

    it('lets an explicit "Heading:" first line override the title and drops it from the body', () => {
      const result = parseSectionDraft('Rec title', 'Heading: Why choose us\nBecause we care.\nAnd we show up on time.');
      expect(result.heading).toBe('Why choose us');
      expect(result.content).toBe('Because we care.\nAnd we show up on time.');
    });

    it('strips quotes from the heading', () => {
      const result = parseSectionDraft('"Special offers"', 'Title: "Spring deals"\n10% off all bookings in September.');
      expect(result.heading).toBe('Spring deals');
      expect(result.content).toBe('10% off all bookings in September.');
    });

    it('preserves interior blank lines but trims leading/trailing ones', () => {
      const result = parseSectionDraft('Our promise', '\n\nFirst paragraph.\n\nSecond paragraph.\n\n');
      expect(result.content).toBe('First paragraph.\n\nSecond paragraph.');
    });

    it('returns an empty body and a fallback heading for blank input', () => {
      const result = parseSectionDraft('   ', '  \n  ');
      expect(result.heading).toBe('New Section');
      expect(result.content).toBe('');
    });
  });
});
