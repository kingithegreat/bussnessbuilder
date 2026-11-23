/** Landing-page feature cards (UX audit F11). Copy unchanged; only order and grouping. */
export interface LandingFeature { icon: string; title: string; body: string; tone: string }

/** The six shown up front. Enquiries, bookings and quotes lead: the job a customer hires BusinessFlow for. */
export const CORE_FEATURES: readonly LandingFeature[] = [
  { icon: 'inbox', title: 'Enquiry Inbox', tone: 'bg-green-50 text-green-600', body: 'Every lead goes straight to your dashboard. Track, reply, and manage enquiries from one place.' },
  { icon: 'event_available', title: 'Online Bookings', tone: 'bg-teal-50 text-teal-600', body: 'Customers pick a time on your site. You accept or decline each request.' },
  { icon: 'request_quote', title: 'Quotes & Invoices', tone: 'bg-amber-50 text-amber-600', body: 'Build quotes and invoices with NZ GST, download a PDF and track whether they are accepted.' },
  { icon: 'view_quilt', title: 'Page Builder', tone: 'bg-blue-50 text-blue-600', body: 'Drag, drop, and customise sections. Choose layouts, colours, and fonts — your site, your way.' },
  { icon: 'travel_explore', title: 'Reviews & Google', tone: 'bg-indigo-50 text-indigo-600', body: 'Collect customer reviews, approve what shows, and follow a simple checklist to get found on Google.' },
  { icon: 'auto_awesome', title: 'AI Content Tools', tone: 'bg-purple-50 text-purple-600', body: 'Generate service descriptions, taglines, and FAQ answers using AI tailored to your business type.' },
];

/** Shown after "See all features". */
export const MORE_FEATURES: readonly LandingFeature[] = [
  { icon: 'dynamic_form', title: 'Custom Forms', tone: 'bg-orange-50 text-orange-600', body: 'Build enquiry forms with dropdowns, checkboxes, file uploads, and conditional logic.' },
  { icon: 'palette', title: 'Full Customisation', tone: 'bg-pink-50 text-pink-600', body: 'Branding, colours, fonts, dark mode, multiple layout variants — make it look exactly how you want.' },
  { icon: 'photo_library', title: 'Stock Photos & Uploads', tone: 'bg-cyan-50 text-cyan-600', body: 'Browse curated Unsplash images by business type or upload your own photos.' },
];
