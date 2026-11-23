/** Settings page sections (UX audit F10). */
export type SettingsTab = 'profile' | 'site' | 'plan' | 'domain' | 'notifications' | 'advanced';

export interface SettingsTabDef {
  id: SettingsTab;
  label: string;
  /** Space-separated ids of the panels this tab shows (for aria-controls). */
  panels: string;
}

export const SETTINGS_TABS: readonly SettingsTabDef[] = [
  { id: 'profile', label: 'Profile', panels: 'settings-panel-profile' },
  { id: 'site', label: 'Site link', panels: 'settings-panel-site' },
  { id: 'plan', label: 'Plan', panels: 'settings-panel-plan' },
  { id: 'domain', label: 'Domain', panels: 'settings-panel-domain' },
  { id: 'notifications', label: 'Notifications', panels: 'settings-panel-notifications settings-panel-notifications-sms' },
  { id: 'advanced', label: 'Advanced', panels: 'settings-panel-advanced settings-panel-advanced-danger' },
];

/**
 * Which tab to open. A valid ?tab= wins; a Stripe checkout return
 * (?session_id=) opens Plan; otherwise Profile.
 */
export function settingsTab(value: string | null, stripeReturn = false): SettingsTab {
  const hit = SETTINGS_TABS.find(t => t.id === value);
  if (hit) return hit.id;
  return stripeReturn ? 'plan' : 'profile';
}
