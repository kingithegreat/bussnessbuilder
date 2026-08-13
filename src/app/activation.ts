/**
 * Activation checklist for a brand-new account.
 *
 * The dashboard used to show a six-slide feature tour whose progress bar
 * measured *which slide you were looking at* — it read 6/6 for someone who had
 * done nothing but click "next" five times. This replaces it with a short
 * ladder of things that actually move a new user toward value, each derived
 * from real state, ending at the only step that matters: a first enquiry.
 *
 * Pure module — no Angular, no browser APIs — so the rules are unit-testable.
 */

/** Defaults seeded by `DataService`; used to tell "untouched" from "customised". */
export const DEFAULT_PRIMARY_COLOR = '#2563eb';

export interface ActivationState {
  /** Site has been through the setup wizard and is publicly visible. */
  published: boolean;
  /** Logo uploaded or brand colour changed away from the seeded default. */
  brandingTouched: boolean;
  /** At least one service the owner wrote or edited themselves. */
  servicesEdited: boolean;
  /** Owner has copied/shared their public link at least once. */
  linkShared: boolean;
  /** Enquiries received. */
  enquiryCount: number;
}

export interface ActivationStep {
  id: string;
  icon: string;
  title: string;
  description: string;
  action: string;
  route: string;
  /** Extra query params for the deep link (Admin → Content honours `?tab=`). */
  queryParams?: Record<string, string>;
  color: string;
  done: boolean;
}

/**
 * True when branding has been touched at all. Kept separate from the step list
 * so the caller can pass a plain object rather than the whole AppState.
 */
export function isBrandingTouched(branding: { logoUrl?: string; primaryColor?: string } | undefined): boolean {
  if (!branding) return false;
  const logo = (branding.logoUrl || '').trim();
  const color = (branding.primaryColor || '').trim().toLowerCase();
  return logo.length > 0 || (color.length > 0 && color !== DEFAULT_PRIMARY_COLOR);
}

/**
 * True when the owner has edited the seeded starter services — a service whose
 * name isn't one of the preset suggestions, or a changed count.
 */
export function areServicesEdited(
  services: readonly { name?: string }[] | undefined,
  seededNames: readonly string[] | undefined
): boolean {
  const current = (services || []).map(s => (s.name || '').trim()).filter(Boolean);
  if (current.length === 0) return false;
  const seeded = new Set((seededNames || []).map(n => n.trim()));
  if (seeded.size === 0) return true;
  if (current.length !== seeded.size) return true;
  return current.some(name => !seeded.has(name));
}

export function activationSteps(state: ActivationState): ActivationStep[] {
  return [
    {
      id: 'publish',
      icon: 'rocket_launch',
      title: 'Publish your site',
      description: 'Your public page is live and ready to take enquiries.',
      action: 'View your site',
      route: '/admin/settings',
      color: 'blue',
      done: state.published,
    },
    {
      id: 'brand',
      icon: 'palette',
      title: 'Make it look like you',
      description: 'Add your logo and set your brand colour so the page looks like your business, not a template.',
      action: 'Open Customisation',
      route: '/admin/customisation',
      color: 'purple',
      done: state.brandingTouched,
    },
    {
      id: 'services',
      icon: 'inventory_2',
      title: 'List your real services',
      description: 'We pre-filled some starters for your business type — swap in what you actually offer and what it costs.',
      action: 'Edit services',
      route: '/admin/content',
      queryParams: { tab: 'services' },
      color: 'green',
      done: state.servicesEdited,
    },
    {
      id: 'share',
      icon: 'share',
      title: 'Share your link',
      description: 'Put it on Facebook, Instagram, your Google listing and your email signature. Nobody can enquire until they can find you.',
      action: 'Get your link',
      route: '/admin/settings',
      color: 'orange',
      done: state.linkShared,
    },
    {
      id: 'enquiry',
      icon: 'mail',
      title: 'Get your first enquiry',
      description: 'When someone fills in your form it lands in your inbox here, with the lead scored and ready to reply.',
      action: 'Open Inbox',
      route: '/admin/inbox',
      color: 'pink',
      done: state.enquiryCount > 0,
    },
  ];
}

export function activationProgress(steps: readonly ActivationStep[]): { done: number; total: number; percent: number } {
  const total = steps.length;
  const done = steps.filter(s => s.done).length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** The first step still outstanding — what the guide should point at. */
export function nextStepIndex(steps: readonly ActivationStep[]): number {
  const i = steps.findIndex(s => !s.done);
  return i === -1 ? steps.length - 1 : i;
}

/** True once every step is done — the guide can retire itself. */
export function isFullyActivated(steps: readonly ActivationStep[]): boolean {
  return steps.length > 0 && steps.every(s => s.done);
}
