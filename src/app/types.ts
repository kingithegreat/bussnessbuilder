import { DnsRecord } from './domain-verification';

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
  lastContactedDate?: string;
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
  // Render key for inserted sections (see section-library.ts). The 13 seeded
  // sections omit it and render by their id; inserted instances need it so
  // their id can stay unique while reusing an existing render path.
  type?: string;
  visible: boolean;
  order: number;
  heading: string;
  subheading: string;
  layoutVariant?: string;
  imageUrl?: string;
  // Body text for 'custom' sections, rendered by the public page's default
  // section block.
  content?: string;
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

// User-overridable text for every fixed label on the public page. All fields
// optional — a blank/missing value falls back to DEFAULT_PAGE_TEXT, so old
// saved configs (which have no `text` object at all) keep rendering exactly
// as before.
export interface PageTextSettings {
  navServices?: string;
  navAbout?: string;
  navContact?: string;
  heroBadge?: string;
  secondaryCta?: string;
  priceLabel?: string;
  contactFormTitle?: string;
  contactSubmit?: string;
  contactSuccessTitle?: string;
  contactSuccessMessage?: string;
  contactSendAnother?: string;
}

export const DEFAULT_PAGE_TEXT: Required<PageTextSettings> = {
  navServices: 'Services',
  navAbout: 'About',
  navContact: 'Contact',
  heroBadge: '', // empty = auto ("type • service area")
  secondaryCta: 'View Services',
  priceLabel: 'Starting at',
  contactFormTitle: 'Send an Enquiry',
  contactSubmit: 'Send Message',
  contactSuccessTitle: 'Message Sent!',
  contactSuccessMessage: "Thanks for reaching out. We'll get back to you shortly.",
  contactSendAnother: 'Send another message',
};

export function pageText(
  settings: CustomizationSettings,
  key: keyof PageTextSettings
): string {
  const v = settings.text?.[key];
  return v && v.trim() ? v : DEFAULT_PAGE_TEXT[key];
}

export interface CustomizationSettings {
  text?: PageTextSettings;
  branding: {
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    buttonStyle: 'rounded' | 'pill' | 'square';
    cardStyle: 'soft' | 'flat' | 'glass' | 'bordered';
    fontStyle: 'modern' | 'friendly' | 'professional' | 'elegant' | 'clean' | 'minimal' | 'bold' | 'classic' | 'techy';
    themeMode: 'light' | 'dark';
    headerStyle: 'centered' | 'left' | 'split';
    ctaText: string;
    gradientEnabled?: boolean;
    gradientStartColor?: string;
    gradientEndColor?: string;
    gradientDirection?: 'to right' | 'to bottom' | 'to bottom right' | 'to bottom left';
    backgroundImageUrl?: string;
    seoTitle?: string;
    seoDescription?: string;
    ogImageUrl?: string;
  };
  sections: SectionConfig[];
  formFields: FormFieldConfig[];
  rules: {
    statuses: string[];
    leadQualities: string[];
  };
}

export type SubscriptionTier = 'free' | 'pro' | 'business';

export interface SubscriptionData {
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

/** Progress of automated Cloud Run domain mapping — server-authoritative, see src/server-domain-mapping.ts */
export type DomainMappingStatus =
  | 'none'
  | 'site-verification-pending'
  | 'site-verified'
  | 'mapping-pending'
  | 'cert-provisioning'
  | 'active'
  | 'error';

export interface DomainMappingState {
  status: DomainMappingStatus;
  domain: string;
  ownershipTxtRecord?: DnsRecord;
  cloudRunDnsRecords?: DnsRecord[];
  certMessage?: string;
  errorCode?: string;
  errorMessage?: string;
  updatedAt: string;
}

export interface ContentPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SiteAnalytics {
  totalViews: number;
  viewsByDate: Record<string, number>;
}

export type RecommendationType = 'hero' | 'service' | 'faq' | 'pricing' | 'trust' | 'cta' | 'lead-follow-up' | 'marketing' | 'seo' | 'general';
export type RecommendationStatus = 'new' | 'drafted' | 'applied' | 'dismissed';
export type RecommendationSource = 'ai' | 'template' | 'analytics' | 'enquiry-pattern';

export interface GrowthRecommendation {
  title: string;
  reason: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  type?: RecommendationType;
  draftContent?: string;
}

export interface SavedRecommendation {
  id: string;
  title: string;
  reason: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  type: RecommendationType;
  status: RecommendationStatus;
  source: RecommendationSource;
  draftContent?: string;
  createdAt: string;
  updatedAt: string;
  dismissedAt?: string;
  appliedAt?: string;
}

export interface DraftRecommendationResponse {
  title: string;
  draftType: RecommendationType;
  draftContent: string;
  explanation: string;
  fallback: boolean;
}

export interface GrowthReport {
  id: string;
  createdAt: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  pageViews: number;
  enquiries: number;
  conversionRate: number;
  topServices: { name: string; count: number }[];
  leadSummary: {
    total: number;
    new: number;
    hot: number;
    warm: number;
    cold: number;
    needsFollowUp: number;
  };
  recommendations: GrowthRecommendation[];
  generatedSummary: string;
  suggestedActions: string[];
}

export type ReplyIntent = 'reply' | 'followup' | 'quote' | 'close-lost' | 'booking-confirmation';

export type MarketingContentType = 'facebook' | 'instagram' | 'google-business' | 'review-request' | 'service-promo' | 'seasonal-offer';

export interface NotificationPreferences {
  emailOnNewEnquiry: boolean;
  notificationEmail: string;
  customDomain?: string;
}

export interface PaymentLink {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  stripePaymentLink?: string;
  active: boolean;
}

export interface PaymentSettings {
  enabled: boolean;
  stripeAccountId?: string;
  paymentLinks: PaymentLink[];
}

export interface PublicSiteData {
  profile: BusinessProfile;
  services?: Service[];
  testimonials?: Testimonial[];
  faqs?: FAQ[];
  customization?: CustomizationSettings;
  paymentSettings?: PaymentSettings | null;
  hideBranding?: boolean;
}

export interface SiteTemplate {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  state: AppState;
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
  siteSlug?: string;
}

