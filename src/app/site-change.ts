export interface SiteChangeField {
  target: 'profile' | 'service';
  field: 'tagline' | 'description' | 'ctaText' | 'price';
  serviceId?: string;
  /** Server mutation responses use this when a service was removed elsewhere. */
  removed?: boolean;
  before: string;
  after: string;
}
export interface ChangeOutcome {
  status: 'waiting' | 'available' | 'insufficient_data' | 'undone';
  before?: { views: number; enquiries: number; bookings: number };
  after?: { views: number; enquiries: number; bookings: number };
  beforeStart?: string;
  afterStart?: string;
  message: string;
}
export interface SiteChange {
  id: string;
  type: 'profile.copy' | 'service.prices';
  request: string;
  fields: SiteChangeField[];
  status: 'prepared' | 'applied' | 'undone';
  actorUid: string;
  createdAt: string;
  appliedAt?: string;
  undoneAt?: string;
  outcome?: ChangeOutcome;
}
export function validChangeFields(value: unknown): value is SiteChangeField[] {
  if (!Array.isArray(value) || !value.length || value.length > 50) return false;
  const keys = new Set<string>();
  return value.every(f => {
    if (!f || typeof f !== 'object' || typeof f.before !== 'string' || typeof f.after !== 'string') return false;
    const maximum = f.field === 'description' ? 4000 : f.field === 'tagline' ? 160 : f.field === 'ctaText' ? 80 : 40;
    const valid = f.target === 'profile' ? ['tagline', 'description', 'ctaText'].includes(f.field) && f.serviceId === undefined
      : f.target === 'service' && f.field === 'price' && typeof f.serviceId === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(f.serviceId);
    const key = `${f.target}:${f.serviceId || ''}:${f.field}`;
    if (!valid || keys.has(key) || !f.after.trim() || f.before === f.after || f.before.length > 10000 || f.after.length > maximum
      || (/[<>]/.test(f.after) || [...f.after].some(c => c.charCodeAt(0) === 127 || c.charCodeAt(0) < 32 && ![9,10,13].includes(c.charCodeAt(0))))) return false;
    keys.add(key); return true;
  });
}
