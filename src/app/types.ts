export type BusinessType = 'cleaner' | 'barber' | 'personal trainer' | 'tutor' | 'lawn mowing' | 'mechanic' | 'rental' | 'cafe' | 'consultant' | 'shop' | 'other';

export interface BusinessProfile {
  name: string;
  type: BusinessType | '';
  tagline: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  serviceArea: string;
  openingHours: string;
  toneOfVoice: string;
  brandColor: string;
  heroCopy: string;
  ctaText: string;
  trustBadges: string[];
  enquiryFields: string[];
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price?: string;
  duration?: string;
  imageUrl?: string;
}

export interface Enquiry {
  id: string;
  date: string;
  name: string;
  email: string;
  phone: string;
  serviceInterest: string;
  message: string;
  preferredDateTime: string;
  urgency: string;
  status: string;
  draftReply?: string;
  leadScore?: string;
  nextAction?: string;
  followUpDate?: string;
  customerNotes?: string;
  formData?: Record<string, { label: string; value: string; type: string }>;
}

export interface Testimonial {
  id: string;
  author: string;
  rating: number;
  text: string;
  role?: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export interface ThemeSettings {
  primaryColor: string;
  fontFamily: string;
}

export interface Activity {
  id: string;
  type: 'enquiry_received' | 'status_changed' | 'note_added';
  title: string;
  description: string;
  date: string;
}

export interface SectionConfig {
  id: string;
  visible: boolean;
  order: number;
  heading: string;
  subheading: string;
  layoutVariant?: string;
  imageUrl?: string;
}

export interface FormFieldConfig {
  id: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'dropdown' | 'multi-select' | 'checkbox' | 'radio' | 'date' | 'time' | 'file' | 'address' | 'budget' | 'contact-method';
  required: boolean;
  options: string;
  order: number;
  placeholder?: string;
  helperText?: string;
  dependsOn?: {
    fieldId: string;
    value: string;
  };
}

export interface CustomizationSettings {
  branding: {
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    buttonStyle: 'rounded' | 'pill' | 'square';
    cardStyle: 'soft' | 'flat' | 'glass' | 'bordered';
    fontStyle: 'modern' | 'friendly' | 'professional';
    themeMode: 'light' | 'dark';
    headerStyle: 'centered' | 'left' | 'split';
    ctaText: string;
  };
  sections: SectionConfig[];
  formFields: FormFieldConfig[];
  rules: {
    statuses: string[];
    leadQualities: string[];
  };
}

export interface AppState {
  profile: BusinessProfile;
  services: Service[];
  enquiries: Enquiry[];
  testimonials: Testimonial[];
  faqs: FAQ[];
  activities: Activity[];
  themeSettings: ThemeSettings;
  customization: CustomizationSettings;
  isSetupComplete: boolean;
}

