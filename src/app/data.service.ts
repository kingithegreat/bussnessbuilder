import { Injectable, computed, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AppState, BusinessProfile, Enquiry, FAQ, Service, Activity, Testimonial, ContentPage, NotificationPreferences, PaymentSettings, SiteTemplate, PublicSiteData } from './types';
import { FirestoreService } from './firestore.service';

const defaultState: AppState = {
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
      ctaText: 'Get a Quote',
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
      statuses: ['New', 'In Progress', 'Replied', 'Booked', 'Won', 'Lost', 'Archived'],
      leadQualities: ['Hot', 'Warm', 'Cold']
    }
  },
  isSetupComplete: false,
};

@Injectable({ providedIn: 'root' })
export class DataService {
  private platformId = inject(PLATFORM_ID);
  private firestoreService = inject(FirestoreService);

  private state = signal<AppState>(defaultState);
  private uid = signal<string | null>(null);
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  private geminiKey = signal<string>('');
  readonly geminiApiKey = this.geminiKey.asReadonly();
  private pages = signal<ContentPage[]>([]);
  private notifPrefs = signal<NotificationPreferences>({ emailOnNewEnquiry: false, notificationEmail: '' });
  private paymentSettings = signal<PaymentSettings>({ enabled: false, paymentLinks: [] });
  private _templates = signal<SiteTemplate[]>([]);
  private _activeTemplateId = signal<string>('');
  readonly templates = this._templates.asReadonly();
  readonly activeTemplateId = this._activeTemplateId.asReadonly();
  private _publicSiteUid = signal('');
  readonly publicSiteUid = this._publicSiteUid.asReadonly();

  readonly profile = computed(() => this.state().profile);
  readonly services = computed(() => this.state().services);
  readonly enquiries = computed(() => this.state().enquiries);
  readonly testimonials = computed(() => this.state().testimonials);
  readonly faqs = computed(() => this.state().faqs);
  readonly activities = computed(() => this.state().activities);
  readonly customization = computed(() => this.state().customization);
  readonly isSetupComplete = computed(() => this.state().isSetupComplete);
  readonly siteSlug = computed(() => this.state().siteSlug || '');

  constructor() {
    effect(() => {
      const currentState = this.state();
      const currentUid = this.uid();
      if (currentUid && isPlatformBrowser(this.platformId)) {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
          this.firestoreService.saveBusinessData(currentUid, currentState);
        }, 1500);
      }
    });
  }

  private initialized = false;

  async init(uid: string) {
    if (this.initialized && this.uid() === uid) return;
    this.uid.set(uid);
    this.initialized = true;

    this.loadPaymentSettings(uid);
    this.loadTemplates(uid);
    this.loadPages(uid);
    this.loadNotificationPrefs(uid);

    const firestoreData = await this.firestoreService.loadBusinessData(uid);
    if (firestoreData) {
      this.state.set(firestoreData);
      this.clearLocalStorage();
      return;
    }

    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('businessflow_state');
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as AppState;
          this.state.set(parsed);
          await this.firestoreService.saveBusinessData(uid, parsed);
          this.clearLocalStorage();
          return;
        } catch (e) {
          console.error('Failed to migrate localStorage data', e);
        }
      }
      const key = localStorage.getItem('businessflow_gemini_key');
      if (key) this.geminiKey.set(key);
    }

    this.state.set(defaultState);
  }

  private clearLocalStorage() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('businessflow_state');
      localStorage.removeItem('businessflow_gemini_key');
    }
  }

  setGeminiApiKey(key: string) {
    this.geminiKey.set(key.trim());
  }

  updateProfile(profile: Partial<BusinessProfile>) {
    this.state.update(s => ({ ...s, profile: { ...s.profile, ...profile } }));
  }

  updateCustomization(customization: Partial<AppState['customization']>) {
    this.state.update(s => ({ ...s, customization: { ...s.customization, ...customization } }));
  }

  completeSetup() {
    this.state.update(s => ({ ...s, isSetupComplete: true }));
  }

  setSiteSlug(slug: string) {
    this.state.update(s => ({ ...s, siteSlug: slug }));
  }

  resetSetup() {
    this.state.set(defaultState);
    this.initialized = false;
  }

  resetCustomization() {
    this.state.update(s => ({
      ...s,
      customization: JSON.parse(JSON.stringify(defaultState.customization))
    }));
  }

  exportState(): string {
    return JSON.stringify(this.state(), null, 2);
  }

  importState(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.profile) {
        this.state.set(parsed);
        return true;
      }
    } catch (e) {
      console.error('Invalid JSON', e);
    }
    return false;
  }

  loadDemoData() {
    this.state.set({
      ...defaultState,
      profile: {
        name: 'Demo Cleaners',
        type: 'cleaner',
        tagline: 'Spotless cleaning for a healthier, happier home.',
        description: 'Welcome to Demo Cleaners! Residential and commercial cleaning businesses. Spotless cleaning for a healthier, happier home.. Our goal is to make your life easier through professional, reliable, and high-quality solutions.',
        email: 'hello@democleaners.com',
        phone: '(555) 123-4567',
        address: '123 Main St, Seattle, WA',
        serviceArea: 'Greater Seattle Area',
        openingHours: 'Mon-Fri: 9am - 5pm',
        toneOfVoice: 'Professional, trustworthy, and detail-oriented',
        brandColor: '#2563eb',
        heroCopy: 'Spotless cleaning for a healthier, happier home.',
        ctaText: 'Get a Free Estimate',
        trustBadges: ['Fully Insured', 'Eco-Friendly Products', 'Satisfaction Guarantee'],
        enquiryFields: ['Property Size (sq ft)', 'Number of Bedrooms', 'Number of Bathrooms']
      },
      services: [
        { id: 'c1', name: 'Standard Clean', description: 'Regular maintenance cleaning for your home.', price: '$120' },
        { id: 'c2', name: 'Deep Clean', description: 'Thorough top-to-bottom cleaning including baseboards and inside cabinets.', price: '$250' }
      ],
      faqs: [
        { id: 'f1', question: 'Do I need to provide cleaning supplies?', answer: 'No, we bring our own professional-grade supplies and equipment.' },
      ],
      testimonials: [
        { id: 't1', author: 'Sarah M.', role: 'Homeowner, Ballard', rating: 5, text: 'Demo Cleaners did an incredible job on our move-out deep clean. Spotless, on time, and so friendly. We got our full deposit back!' },
        { id: 't2', author: 'James T.', role: 'Office Manager', rating: 5, text: 'We switched our weekly office cleaning to them and never looked back. Reliable, thorough, and great communication.' },
        { id: 't3', author: 'Priya K.', role: 'Repeat Client', rating: 4, text: 'Consistently great results. Booking is easy and the team always pays attention to the little details.' },
      ],
      enquiries: [
        { id: 'e1', name: 'Jane Doe', email: 'jane@example.com', phone: '555-987-6543', serviceInterest: 'Deep Clean', preferredDateTime: 'Next Tuesday morning', urgency: 'Medium', message: 'Looking for a deep clean before my parents visit.', status: 'New', date: new Date().toISOString(), leadScore: 'Hot', nextAction: 'Call to confirm details' }
      ],
      activities: [
        { id: 'a1', type: 'enquiry_received', title: 'New Enquiry', description: 'Jane Doe requested a Deep Clean.', date: new Date().toISOString() }
      ],
      isSetupComplete: true
    });
  }

  addActivity(activity: Omit<Activity, 'id' | 'date'>) {
    const newActivity: Activity = {
      ...activity,
      id: crypto.randomUUID(),
      date: new Date().toISOString()
    };
    this.state.update(s => ({ ...s, activities: [newActivity, ...s.activities] }));
  }

  addEnquiry(enquiry: Omit<Enquiry, 'id' | 'date' | 'status'>) {
    const leadScore = enquiry.urgency === 'High' ? 'Hot' : (enquiry.urgency === 'Medium' ? 'Warm' : 'Cold');
    const newEnquiry: Enquiry = {
      ...enquiry,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      status: 'New',
      leadScore,
      nextAction: 'Review and reply'
    };
    this.state.update(s => ({ ...s, enquiries: [newEnquiry, ...s.enquiries] }));
    this.addActivity({
      type: 'enquiry_received',
      title: 'New Enquiry Received',
      description: `${enquiry.name} requested ${enquiry.serviceInterest}`
    });
  }

  updateEnquiry(id: string, updates: Partial<Enquiry>) {
    let statusChanged = false;
    let oldStatus = '';
    let name = '';

    this.state.update(s => {
      const enquiry = s.enquiries.find(e => e.id === id);
      if (enquiry && updates.status && updates.status !== enquiry.status) {
        statusChanged = true;
        oldStatus = enquiry.status;
        name = enquiry.name;
      }
      return {
        ...s,
        enquiries: s.enquiries.map(e => e.id === id ? { ...e, ...updates } : e)
      };
    });

    if (statusChanged) {
      this.addActivity({
        type: 'status_changed',
        title: 'Enquiry Updated',
        description: `${name}'s enquiry moved from ${oldStatus} to ${updates.status}`
      });
    }
  }

  setServices(services: Service[]) {
    this.state.update(s => ({ ...s, services }));
  }

  setFaqs(faqs: FAQ[]) {
    this.state.update(s => ({ ...s, faqs }));
  }

  setTestimonials(testimonials: Testimonial[]) {
    this.state.update(s => ({ ...s, testimonials }));
  }

  getPages(): ContentPage[] {
    return this.pages();
  }

  setPages(p: ContentPage[]) {
    this.pages.set(p);
    if (isPlatformBrowser(this.platformId) && this.uid()) {
      this.firestoreService.savePages(this.uid()!, p);
    }
  }

  async loadPages(uid: string) {
    const p = await this.firestoreService.loadPages(uid);
    if (p) this.pages.set(p);
  }

  getNotificationPrefs(): NotificationPreferences {
    return this.notifPrefs();
  }

  setNotificationPrefs(prefs: NotificationPreferences) {
    this.notifPrefs.set(prefs);
    if (isPlatformBrowser(this.platformId) && this.uid()) {
      this.firestoreService.saveNotificationPrefs(this.uid()!, prefs);
    }
  }

  async loadNotificationPrefs(uid: string) {
    const prefs = await this.firestoreService.loadNotificationPrefs(uid);
    if (prefs) this.notifPrefs.set(prefs);
  }

  getPaymentSettings(): PaymentSettings {
    return this.paymentSettings();
  }

  setPaymentSettings(settings: PaymentSettings) {
    this.paymentSettings.set(settings);
    if (isPlatformBrowser(this.platformId) && this.uid()) {
      this.firestoreService.savePaymentSettings(this.uid()!, settings);
    }
  }

  async loadPaymentSettings(uid: string) {
    const settings = await this.firestoreService.loadPaymentSettings(uid);
    if (settings) this.paymentSettings.set(settings);
  }

  async loadTemplates(uid: string) {
    const data = await this.firestoreService.loadTemplates(uid);
    if (data) {
      this._templates.set(data.templates);
      this._activeTemplateId.set(data.activeTemplateId);
    }
  }

  private saveTemplates() {
    if (isPlatformBrowser(this.platformId) && this.uid()) {
      this.firestoreService.saveTemplates(this.uid()!, {
        templates: this._templates(),
        activeTemplateId: this._activeTemplateId()
      });
    }
  }

  saveCurrentAsTemplate(name: string): boolean {
    const templates = this._templates();
    if (templates.length >= 3) return false;
    const now = new Date().toISOString();
    const template: SiteTemplate = {
      id: 'tpl_' + Date.now(),
      name,
      createdAt: now,
      updatedAt: now,
      state: JSON.parse(JSON.stringify(this.state()))
    };
    this._templates.set([...templates, template]);
    if (!this._activeTemplateId()) {
      this._activeTemplateId.set(template.id);
    }
    this.saveTemplates();
    return true;
  }

  updateTemplate(id: string) {
    this._templates.update(list => list.map(t =>
      t.id === id ? { ...t, state: JSON.parse(JSON.stringify(this.state())), updatedAt: new Date().toISOString() } : t
    ));
    this.saveTemplates();
  }

  loadTemplate(id: string) {
    const template = this._templates().find(t => t.id === id);
    if (template) {
      this.state.set(JSON.parse(JSON.stringify(template.state)));
    }
  }

  setActiveTemplate(id: string) {
    const template = this._templates().find(t => t.id === id);
    if (template) {
      this._activeTemplateId.set(id);
      this.state.set(JSON.parse(JSON.stringify(template.state)));
      this.saveTemplates();
    }
  }

  deleteTemplate(id: string) {
    this._templates.update(list => list.filter(t => t.id !== id));
    if (this._activeTemplateId() === id) {
      const remaining = this._templates();
      this._activeTemplateId.set(remaining.length > 0 ? remaining[0].id : '');
      if (remaining.length > 0) {
        this.state.set(JSON.parse(JSON.stringify(remaining[0].state)));
      }
    }
    this.saveTemplates();
  }

  renameTemplate(id: string, name: string) {
    this._templates.update(list => list.map(t =>
      t.id === id ? { ...t, name } : t
    ));
    this.saveTemplates();
  }

  loadPublicSite(uid: string, data: PublicSiteData) {
    this._publicSiteUid.set(uid);
    this.state.set({
      ...defaultState,
      profile: data.profile,
      services: data.services || [],
      testimonials: data.testimonials || [],
      faqs: data.faqs || [],
      customization: data.customization || defaultState.customization,
      isSetupComplete: true,
    });
    if (data.paymentSettings) {
      this.paymentSettings.set(data.paymentSettings);
    }
  }
}
