/**
 * Launch checklist: the five things that make a new site genuinely ready for
 * customers. Pure module so the rules are unit-testable.
 */
export interface LaunchState {
  openingHours?: string;
  logoUrl?: string;
  /** Any photo on the site: hero/about section images, service images, background. */
  photoUrls: (string | undefined)[];
  /** Custom domain active, or an owner-chosen short address claimed. */
  customDomainActive: boolean;
  hasShortAddress: boolean;
  enquiryCount: number;
}

export interface LaunchItem {
  id: 'hours' | 'logo' | 'photos' | 'domain' | 'enquiry';
  title: string;
  hint: string;
  route: string;
  queryParams?: Record<string, string>;
  done: boolean;
}

export function launchItems(s: LaunchState): LaunchItem[] {
  return [
    { id: 'hours', title: 'Add your opening hours', hint: 'So customers know when to call or visit.', route: '/admin/settings', done: !!(s.openingHours || '').trim() },
    { id: 'logo', title: 'Upload your logo', hint: 'Shows on your site and in the browser tab.', route: '/admin/customisation', done: !!(s.logoUrl || '').trim() },
    { id: 'photos', title: 'Add photos of your work', hint: 'Real photos win more enquiries than stock images.', route: '/admin/builder', done: s.photoUrls.some(u => !!(u || '').trim()) },
    { id: 'domain', title: 'Set your web address', hint: 'Choose a short, easy address in Settings (or connect your own domain on the Business plan).', route: '/admin/settings', done: s.customDomainActive || s.hasShortAddress },
    { id: 'enquiry', title: 'Send yourself a test enquiry', hint: 'Fill in your own contact form to check it reaches your inbox.', route: '/admin/inbox', done: s.enquiryCount > 0 },
  ];
}

export function launchProgress(items: readonly LaunchItem[]): { done: number; total: number; percent: number } {
  const done = items.filter(i => i.done).length;
  return { done, total: items.length, percent: items.length ? Math.round((done / items.length) * 100) : 0 };
}
