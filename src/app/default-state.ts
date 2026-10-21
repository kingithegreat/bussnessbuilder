import { AppState } from './types';

/** Blank owner state. Shared by DataService and the server-side showcase seed. */
export const defaultState: AppState = {
  profile: {
    name: '',
    type: '',
    tagline: '',
    description: '',
    email: '',
    phone: '',
    address: '',
    serviceArea: '',
    openingHours: '',
    toneOfVoice: 'Professional yet friendly',
    brandColor: '#2563eb',
    heroCopy: '',
    ctaText: 'Get a Quote',
    trustBadges: [],
    enquiryFields: []
  },
  services: [],
  enquiries: [],
  testimonials: [],
  faqs: [],
  activities: [],
  themeSettings: {
    primaryColor: '#2563eb',
    fontFamily: 'Inter',
  },
  customization: {
    branding: {
      logoUrl: '',
      primaryColor: '#2563eb',
      secondaryColor: '#f3f4f6',
      backgroundColor: '#ffffff',
      buttonStyle: 'rounded',
      cardStyle: 'soft',
      fontStyle: 'modern',
      themeMode: 'light',
      headerStyle: 'centered',
      // Unset, so ctaLabel() falls through to profile.ctaText — which the
      // wizard fills from the business-type preset. Seeding it here made that
      // preset value unreachable and every site's buttons say the same thing.
      ctaText: '',
      gradientEnabled: false,
      gradientStartColor: '#2563eb',
      gradientEndColor: '#7c3aed',
      gradientDirection: 'to right'
    },
    sections: [
      { id: 'hero', visible: true, order: 1, heading: 'Hero', subheading: '', layoutVariant: 'centered' },
      { id: 'about', visible: true, order: 2, heading: 'About Us', subheading: 'Who we are', layoutVariant: 'default' },
      { id: 'services', visible: true, order: 3, heading: 'Our Services', subheading: 'What we offer', layoutVariant: 'grid' },
      { id: 'products', visible: false, order: 4, heading: 'Products', subheading: 'Browse our items', layoutVariant: 'default' },
      { id: 'pricing', visible: false, order: 5, heading: 'Pricing', subheading: 'Simple & transparent', layoutVariant: 'default' },
      { id: 'testimonials', visible: true, order: 6, heading: 'Testimonials', subheading: 'What our clients say', layoutVariant: 'quote' },
      { id: 'gallery', visible: false, order: 7, heading: 'Gallery', subheading: 'See our work', layoutVariant: 'default' },
      { id: 'faq', visible: true, order: 8, heading: 'FAQ', subheading: 'Frequently asked questions', layoutVariant: 'accordion' },
      { id: 'contact', visible: true, order: 9, heading: 'Contact Us', subheading: 'Get in touch', layoutVariant: 'split' },
      { id: 'location', visible: false, order: 10, heading: 'Location', subheading: 'Find us', layoutVariant: 'default' },
      { id: 'hours', visible: false, order: 11, heading: 'Business Hours', subheading: 'When we are open', layoutVariant: 'default' },
      { id: 'badges', visible: false, order: 12, heading: 'Trust Badges', subheading: 'Why choose us', layoutVariant: 'default' },
      { id: 'cta', visible: false, order: 13, heading: 'Ready to start?', subheading: 'Contact us today', layoutVariant: 'default' }
    ],
    formFields: [
      { id: 'name', label: 'Name', type: 'text', required: true, options: '', order: 1 },
      { id: 'email', label: 'Email', type: 'email', required: true, options: '', order: 2 },
      { id: 'phone', label: 'Phone', type: 'phone', required: false, options: '', order: 3 },
      { id: 'service', label: 'Service Interest', type: 'dropdown', required: true, options: 'Standard Clean,Deep Clean,Other', order: 4 },
      { id: 'message', label: 'Message', type: 'textarea', required: true, options: '', order: 5 }
    ],
    rules: {
      statuses: ['New', 'Contacted', 'Quoted', 'Booked', 'Won', 'Lost'],
      leadQualities: ['Hot', 'Warm', 'Cold']
    }
  },
  isSetupComplete: false,
};
