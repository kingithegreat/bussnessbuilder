import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PublicPageComponent } from './public-page.component';
import { DataService } from './data.service';
import { INSERTABLE_SECTION_TYPES, createSection } from './section-library';
import { CustomizationSettings, SectionConfig } from './types';

// Guards the Page Builder <-> public page contract: every section a user can
// toggle or insert in the admin panels must render real content, never the
// old "Content Coming Soon" placeholder (only 'custom' uses the generic
// default block, by design).
describe('PublicPageComponent — section renderer completeness', () => {
  const SEEDED_SECTION_IDS = [
    'hero', 'about', 'services', 'products', 'pricing', 'testimonials',
    'gallery', 'faq', 'contact', 'location', 'hours', 'badges', 'cta',
  ];

  function baseCustomization(sections: SectionConfig[]): CustomizationSettings {
    return {
      branding: {
        logoUrl: '', primaryColor: '#2563eb', secondaryColor: '#1e40af',
        backgroundColor: '#F5F5F7', buttonStyle: 'rounded', cardStyle: 'soft',
        fontStyle: 'modern', themeMode: 'light', headerStyle: 'centered',
        ctaText: 'Get a Quote',
      },
      sections,
      formFields: [
        { id: 'name', label: 'Name', type: 'text', required: true, options: '', order: 1 },
        { id: 'email', label: 'Email', type: 'email', required: true, options: '', order: 2 },
      ],
      rules: { statuses: ['New'], leadQualities: ['Hot'] },
    };
  }

  function makeDataStub() {
    return {
      profile: signal({
        name: 'Test Biz', type: 'cleaner', tagline: 'We clean', description: 'desc',
        email: 'a@b.nz', phone: '021 000 0000', address: '123 Cameron Rd, Tauranga',
        serviceArea: 'Bay of Plenty', openingHours: 'Mon-Fri: 9am-5pm, Sat: 10am-2pm',
        toneOfVoice: '', brandColor: '#2563eb', heroCopy: '', ctaText: '',
        trustBadges: ['Fully Insured', '5-Star Rated'], enquiryFields: [],
      }),
      hideBranding: signal(false),
      services: signal([
        { id: 's1', name: 'Standard Clean', description: 'A clean', price: '$120', duration: 'per visit', imageUrl: 'https://example.com/clean.jpg' },
        { id: 's2', name: 'Deep Clean', description: 'A deeper clean', price: '$240' },
      ]),
      faqs: signal([{ id: 'f1', question: 'Q?', answer: 'A.' }]),
      testimonials: signal([{ id: 't1', author: 'Jo', rating: 5, text: 'Great' }]),
      customization: signal(baseCustomization([])),
      getPaymentSettings: () => ({ enabled: false, paymentLinks: [] }),
    };
  }

  function renderCustomization(cust: CustomizationSettings): HTMLElement {
    TestBed.configureTestingModule({
      imports: [PublicPageComponent],
      providers: [
        provideRouter([]),
        { provide: DataService, useValue: makeDataStub() },
        { provide: HttpClient, useValue: { get: () => of(null), post: () => of(null) } },
      ],
    });
    const fixture = TestBed.createComponent(PublicPageComponent);
    fixture.componentRef.setInput('previewCustomization', cust);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function renderWithSections(sections: SectionConfig[]): HTMLElement {
    return renderCustomization(baseCustomization(sections));
  }

  function seededSection(id: string, order: number): SectionConfig {
    return { id, visible: true, order, heading: `${id} heading`, subheading: `${id} sub` };
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders every seeded section without a "Coming Soon" placeholder', () => {
    const sections = SEEDED_SECTION_IDS.map((id, i) => seededSection(id, i + 1));
    const el = renderWithSections(sections);
    expect(el.textContent).not.toContain('Coming Soon');
    for (const s of sections) {
      expect(
        el.querySelector(`[id="${s.id}"]`),
        `section "${s.id}" should render an anchored element`
      ).toBeTruthy();
    }
  });

  it('renders every insertable section type without a "Coming Soon" placeholder', () => {
    const sections: SectionConfig[] = [];
    for (const def of INSERTABLE_SECTION_TYPES) {
      const s = createSection(def.type, sections);
      if (def.type === 'custom') s.content = 'Some custom body text';
      sections.push(s);
    }
    const el = renderWithSections(sections);
    expect(el.textContent).not.toContain('Coming Soon');
  });

  it('location section embeds a keyless Google Maps iframe when an address is set', () => {
    const el = renderWithSections([seededSection('location', 1)]);
    const iframe = el.querySelector('section[id="location"] iframe') as HTMLIFrameElement | null;
    expect(iframe).toBeTruthy();
    expect(iframe!.src).toContain('maps.google.com');
    expect(iframe!.src).toContain(encodeURIComponent('123 Cameron Rd, Tauranga'));
  });

  it('hours section splits the free-text opening hours into rows', () => {
    const el = renderWithSections([seededSection('hours', 1)]);
    const text = el.querySelector('section[id="hours"]')!.textContent!;
    expect(text).toContain('Mon-Fri: 9am-5pm');
    expect(text).toContain('Sat: 10am-2pm');
  });

  it('badges section renders each trust badge from the profile', () => {
    const el = renderWithSections([seededSection('badges', 1)]);
    const text = el.querySelector('section[id="badges"]')!.textContent!;
    expect(text).toContain('Fully Insured');
    expect(text).toContain('5-Star Rated');
  });

  it('cta section links the branding CTA to the contact anchor', () => {
    const el = renderWithSections([seededSection('cta', 1)]);
    const link = el.querySelector('section[id="cta"] a[href="#contact"]');
    expect(link).toBeTruthy();
    expect(link!.textContent).toContain('Get a Quote');
  });

  it('gallery section shows the section image and service images, deduped', () => {
    const gallery = seededSection('gallery', 1);
    gallery.imageUrl = 'https://example.com/clean.jpg'; // same as service s1 image
    const el = renderWithSections([gallery]);
    const imgs = el.querySelectorAll('section[id="gallery"] img');
    expect(imgs.length).toBe(1); // deduped: section image === s1 image, s2 has none
  });

  it('hidden sections do not render', () => {
    const el = renderWithSections([{ ...seededSection('pricing', 1), visible: false }]);
    expect(el.querySelector('section[id="pricing"]')).toBeNull();
  });

  it('default page text renders when no overrides are set (old configs)', () => {
    const el = renderWithSections([
      seededSection('services', 1),
      seededSection('contact', 2),
    ]);
    expect(el.textContent).toContain('Services'); // nav link default
    expect(el.textContent).toContain('Starting at');
    expect(el.textContent).toContain('Send an Enquiry');
    expect(el.textContent).toContain('Send Message');
  });

  it('text overrides replace every fixed label they cover', () => {
    const cust = baseCustomization([
      seededSection('hero', 1),
      seededSection('services', 2),
      seededSection('contact', 3),
    ]);
    cust.text = {
      navServices: 'Mahi',
      navContact: 'Kōrero',
      heroBadge: 'Welcome to Test Biz',
      secondaryCta: 'See the mahi',
      priceLabel: 'From',
      contactFormTitle: 'Flick us a message',
      contactSubmit: 'Send it',
    };
    const el = renderCustomization(cust);
    const text = el.textContent!;
    expect(text).toContain('Mahi');
    expect(text).toContain('Kōrero');
    expect(text).toContain('Welcome to Test Biz');
    expect(text).not.toContain('cleaner • Bay of Plenty'); // auto badge replaced
    expect(text).toContain('See the mahi');
    expect(text).toContain('From');
    expect(text).not.toContain('Starting at');
    expect(text).toContain('Flick us a message');
    expect(text).not.toContain('Send an Enquiry');
    expect(text).toContain('Send it');
  });

  it('hero badge auto-composes from profile type and service area when blank', () => {
    const el = renderWithSections([seededSection('hero', 1)]);
    expect(el.textContent).toContain('cleaner • Bay of Plenty');
  });

  it('nav links hide when their target section is hidden', () => {
    const el = renderWithSections([
      { ...seededSection('services', 1), visible: false },
      seededSection('about', 2),
      seededSection('contact', 3),
    ]);
    const navLinks = Array.from(el.querySelectorAll('nav a[href^="#"]')).map(a => a.getAttribute('href'));
    expect(navLinks).not.toContain('#services');
    expect(navLinks).toContain('#about');
  });

  it('hero description only gets an ellipsis when actually truncated', () => {
    const el = renderWithSections([seededSection('hero', 1)]);
    // stub description "desc" is 4 chars — must NOT be followed by an ellipsis
    expect(el.textContent).toContain('desc');
    expect(el.textContent).not.toContain('desc…');
    expect(el.textContent).not.toContain('desc...');
  });

  it('footer year is the current year, not hardcoded', () => {
    const el = renderWithSections([seededSection('hero', 1)]);
    expect(el.textContent).toContain(`© ${new Date().getFullYear()} Test Biz`);
  });
});
