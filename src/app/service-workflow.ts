/**
 * Configurable service-job workflow used by the public, self-contained
 * proposal demo at /demo/workflow.
 *
 * Scope (honest): businesses whose work is "take a job in, move it through a
 * few ordered stages, optionally collect/return items and use a partner, then
 * get paid". Business profile, service catalogue, stage names, labels and the
 * pickup/return/partner fields are all configuration — nothing here is
 * laundry-specific; laundry is just one preset.
 *
 * Demo-only: state lives in the visitor's own browser (localStorage). It never
 * writes to Firestore, never touches a real tenant, takes no real payment and
 * sends no real notifications.
 */
import { SiteCurrency, formatMoney, roundCents } from './money';

export const WORKFLOW_SCHEMA_VERSION = 1;
export const WORKFLOW_STORAGE_KEY = 'bf.demo.workflow.v1';
export const MAX_STAGES = 10;
export const MIN_STAGES = 2;
export const MAX_SERVICES = 30;

export interface WorkflowStage { id: string; label: string; description: string }
export interface WorkflowService { id: string; name: string; unit: string; price: number }
export interface WorkflowBusiness {
  name: string; tagline: string; phone: string; area: string;
  accent: string; currency: SiteCurrency; pricesIncludeGst: boolean;
}
export interface WorkflowLabels { job: string; customer: string; partner: string; pickup: string; dropoff: string }
export interface WorkflowConfig {
  version: number;
  presetId: string;
  business: WorkflowBusiness;
  labels: WorkflowLabels;
  usesPickup: boolean;
  usesDropoff: boolean;
  usesPartner: boolean;
  partners: string[];
  services: WorkflowService[];
  stages: WorkflowStage[];
}

/** Payment is tracked separately from fulfilment. Demo only: no money moves. */
export type PaymentStatus = 'unpaid' | 'invoiced' | 'paid';
export const PAYMENT_STATUSES: { id: PaymentStatus; label: string }[] = [
  { id: 'unpaid', label: 'Not invoiced' },
  { id: 'invoiced', label: 'Invoice sent (demo)' },
  { id: 'paid', label: 'Marked paid (demo)' },
];

/**
 * A booked line. `name`, `unit` and `price` are a snapshot taken when the job
 * is created, so later catalogue edits (price changes, renames, removing a
 * service) never silently re-price or drop items on jobs already in progress.
 * Lines without a snapshot (older saved demos) fall back to the catalogue.
 */
export interface JobLine { serviceId: string; qty: number; name?: string; unit?: string; price?: number }
export interface JobEvent { at: string; text: string }
export interface WorkflowJob {
  id: string; ref: string;
  customerName: string; customerPhone: string; address: string;
  pickupAt: string; dropoffAt: string; partner: string; notes: string;
  lines: JobLine[];
  stageId: string;
  payment: PaymentStatus;
  history: JobEvent[];
  createdAt: string;
  sample: boolean;
}
export interface WorkflowState { config: WorkflowConfig; jobs: WorkflowJob[]; nextRef: number }

export interface WorkflowPreset { id: string; label: string; summary: string; build: () => WorkflowConfig }

const stage = (id: string, label: string, description: string): WorkflowStage => ({ id, label, description });
const svc = (id: string, name: string, unit: string, price: number): WorkflowService => ({ id, name, unit, price });

export const WORKFLOW_PRESETS: WorkflowPreset[] = [
  {
    id: 'laundry-pickup',
    label: 'Laundry pickup & return',
    summary: 'Collect washing, take it to a cleaning partner, return it clean and dry.',
    build: () => ({
      version: WORKFLOW_SCHEMA_VERSION, presetId: 'laundry-pickup',
      business: { name: 'FreshRun Laundry (sample)', tagline: 'We pick up, get it cleaned and dried, and bring it back.', phone: '021 000 0000', area: 'Tauranga (example)', accent: '#0f766e', currency: 'NZD', pricesIncludeGst: true },
      labels: { job: 'Order', customer: 'Customer', partner: 'Cleaning partner', pickup: 'Pickup', dropoff: 'Return' },
      usesPickup: true, usesDropoff: true, usesPartner: true,
      partners: ['Sample Dry Cleaners Ltd', 'Example Wash & Fold'],
      services: [
        svc('wash-fold', 'Wash, dry & fold', 'per bag (up to 7 kg)', 35),
        svc('dry-clean', 'Dry cleaning', 'per item', 18),
        svc('duvet', 'Duvet / bedding', 'per item', 40),
        svc('express', 'Express same-day', 'per order', 15),
      ],
      stages: [
        stage('booked', 'Booked', 'Pickup time agreed with the customer.'),
        stage('collected', 'Picked up', 'Operator has the items.'),
        stage('at-partner', 'Cleaning & drying', 'Items are with the cleaning partner.'),
        stage('ready', 'Ready', 'Collected back from the partner, ready to return.'),
        stage('returned', 'Returned', 'Delivered back to the customer.'),
      ],
    }),
  },
  {
    id: 'repair-collect',
    label: 'Collect, repair & return',
    summary: 'For repair services (bikes, devices, shoes) that collect items and use a workshop.',
    build: () => ({
      version: WORKFLOW_SCHEMA_VERSION, presetId: 'repair-collect',
      business: { name: 'Fixit Runner (sample)', tagline: 'Repairs collected from your door.', phone: '021 000 0001', area: 'Your area (example)', accent: '#1d4ed8', currency: 'NZD', pricesIncludeGst: true },
      labels: { job: 'Repair job', customer: 'Customer', partner: 'Workshop', pickup: 'Collection', dropoff: 'Delivery' },
      usesPickup: true, usesDropoff: true, usesPartner: true,
      partners: ['Sample Workshop'],
      services: [svc('assess', 'Assessment', 'per item', 30), svc('repair', 'Standard repair', 'per item', 90), svc('courier', 'Collect & deliver', 'per job', 20)],
      stages: [
        stage('booked', 'Booked', 'Collection arranged.'),
        stage('collected', 'Collected', 'Item picked up.'),
        stage('quoted', 'Quoted', 'Repair quote approved by the customer.'),
        stage('repairing', 'In repair', 'With the workshop.'),
        stage('delivered', 'Delivered', 'Returned to the customer.'),
      ],
    }),
  },
  {
    id: 'on-site-service',
    label: 'On-site service (no pickup)',
    summary: 'For visits done at the customer’s place, e.g. cleaning or gardening.',
    build: () => ({
      version: WORKFLOW_SCHEMA_VERSION, presetId: 'on-site-service',
      business: { name: 'Sparkle Home Services (sample)', tagline: 'Reliable home services, booked online.', phone: '021 000 0002', area: 'Your area (example)', accent: '#7c3aed', currency: 'NZD', pricesIncludeGst: true },
      labels: { job: 'Job', customer: 'Client', partner: 'Contractor', pickup: 'Visit', dropoff: 'Follow-up' },
      usesPickup: true, usesDropoff: false, usesPartner: false,
      partners: [],
      services: [svc('standard', 'Standard visit', 'per hour', 55), svc('deep', 'Deep clean', 'per visit', 280)],
      stages: [
        stage('booked', 'Booked', 'Visit time confirmed.'),
        stage('in-progress', 'On site', 'Work under way.'),
        stage('done', 'Completed', 'Work finished and checked.'),
      ],
    }),
  },
];

export function presetConfig(id: string): WorkflowConfig {
  return (WORKFLOW_PRESETS.find(p => p.id === id) ?? WORKFLOW_PRESETS[0]).build();
}

// ---------- validation / normalisation (storage is untrusted input) ----------

const str = (v: unknown, max: number, fallback = ''): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : fallback;
type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (v && typeof v === 'object' ? v as Rec : {});
const arr = (v: unknown): Rec[] => (Array.isArray(v) ? v.map(rec) : []);
const CURRENCIES: SiteCurrency[] = ['NZD', 'AUD', 'USD', 'GBP', 'EUR'];

export function slugId(text: string, taken: Iterable<string> = []): string {
  const base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'item';
  const used = new Set(taken);
  let id = base; let n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  return id;
}

export function isSafeColour(v: unknown): v is string { return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v); }

/** Returns human-readable problems; empty array means the config is usable. */
export function validateConfig(c: WorkflowConfig): string[] {
  const errs: string[] = [];
  if (!c.business.name.trim()) errs.push('Business name is required.');
  if (!isSafeColour(c.business.accent)) errs.push('Brand colour must be a hex colour like #0f766e.');
  if (c.stages.length < MIN_STAGES) errs.push(`Add at least ${MIN_STAGES} workflow stages.`);
  if (c.stages.length > MAX_STAGES) errs.push(`Use at most ${MAX_STAGES} workflow stages.`);
  if (c.stages.some(s => !s.label.trim())) errs.push('Every stage needs a name.');
  if (new Set(c.stages.map(s => s.id)).size !== c.stages.length) errs.push('Stage ids must be unique.');
  if (!c.services.length) errs.push('Add at least one service.');
  if (c.services.length > MAX_SERVICES) errs.push(`Use at most ${MAX_SERVICES} services.`);
  if (c.services.some(s => !s.name.trim())) errs.push('Every service needs a name.');
  if (c.services.some(s => !Number.isFinite(s.price) || s.price < 0)) errs.push('Service prices must be zero or more.');
  if (!c.labels.job.trim() || !c.labels.customer.trim()) errs.push('Job and customer labels are required.');
  return errs;
}

/** Coerce unknown (e.g. localStorage JSON) into a valid config, falling back to the preset. */
export function normaliseConfig(raw: unknown): WorkflowConfig {
  const r = rec(raw);
  const base = presetConfig(str(r['presetId'], 40));
  const b = rec(r['business']);
  const l = rec(r['labels']);
  const stageIds: string[] = [];
  const stages = arr(r['stages']).slice(0, MAX_STAGES).map(s => {
    const label = str(s['label'], 40);
    const id = slugId(str(s['id'], 30) || label, stageIds); stageIds.push(id);
    return stage(id, label, str(s['description'], 160));
  }).filter(s => s.label);
  const svcIds: string[] = [];
  const services = arr(r['services']).slice(0, MAX_SERVICES).map(s => {
    const name = str(s['name'], 60);
    const id = slugId(str(s['id'], 30) || name, svcIds); svcIds.push(id);
    const price = Number(s['price']);
    return svc(id, name, str(s['unit'], 40), Number.isFinite(price) && price >= 0 ? roundCents(price) : 0);
  }).filter(s => s.name);
  const cfg: WorkflowConfig = {
    version: WORKFLOW_SCHEMA_VERSION,
    presetId: base.presetId,
    business: {
      name: str(b['name'], 80, base.business.name) || base.business.name,
      tagline: str(b['tagline'], 160, base.business.tagline),
      phone: str(b['phone'], 30, base.business.phone),
      area: str(b['area'], 80, base.business.area),
      accent: isSafeColour(b['accent']) ? b['accent'] : base.business.accent,
      currency: CURRENCIES.includes(b['currency'] as SiteCurrency) ? b['currency'] as SiteCurrency : base.business.currency,
      pricesIncludeGst: typeof b['pricesIncludeGst'] === 'boolean' ? b['pricesIncludeGst'] as boolean : base.business.pricesIncludeGst,
    },
    labels: {
      job: str(l['job'], 30) || base.labels.job,
      customer: str(l['customer'], 30) || base.labels.customer,
      partner: str(l['partner'], 30) || base.labels.partner,
      pickup: str(l['pickup'], 30) || base.labels.pickup,
      dropoff: str(l['dropoff'], 30) || base.labels.dropoff,
    },
    usesPickup: typeof r['usesPickup'] === 'boolean' ? r['usesPickup'] as boolean : base.usesPickup,
    usesDropoff: typeof r['usesDropoff'] === 'boolean' ? r['usesDropoff'] as boolean : base.usesDropoff,
    usesPartner: typeof r['usesPartner'] === 'boolean' ? r['usesPartner'] as boolean : base.usesPartner,
    partners: Array.isArray(r['partners']) ? r['partners'].map((p: unknown) => str(p, 60)).filter(Boolean).slice(0, 10) : base.partners,
    services: services.length ? services : base.services,
    stages: stages.length >= MIN_STAGES ? stages : base.stages,
  };
  return cfg;
}

// ---------------------------- job logic ----------------------------

export function stageIndex(c: WorkflowConfig, stageId: string): number {
  return c.stages.findIndex(s => s.id === stageId);
}
export function stageLabel(c: WorkflowConfig, stageId: string): string {
  return c.stages.find(s => s.id === stageId)?.label ?? 'Unknown stage';
}
export function isComplete(c: WorkflowConfig, job: WorkflowJob): boolean {
  return stageIndex(c, job.stageId) === c.stages.length - 1;
}

/** Unit price for a line: the booked snapshot if present, else the current catalogue price. */
export function linePrice(c: WorkflowConfig, l: JobLine): number {
  if (typeof l.price === 'number' && Number.isFinite(l.price) && l.price >= 0) return l.price;
  return c.services.find(x => x.id === l.serviceId)?.price ?? 0;
}
/** Display name for a line: the booked snapshot if present, else the current catalogue name. */
export function lineName(c: WorkflowConfig, l: JobLine): string {
  return l.name || c.services.find(x => x.id === l.serviceId)?.name || 'Removed service';
}
export function jobTotal(c: WorkflowConfig, job: Pick<WorkflowJob, 'lines'>): number {
  return roundCents(job.lines.reduce((sum, l) => sum + linePrice(c, l) * Math.max(0, l.qty), 0));
}

/** Copy the current catalogue name/unit/price onto a line (no-op if already snapshotted). */
function snapshotLine(c: WorkflowConfig, l: JobLine): JobLine {
  if (typeof l.price === 'number' && l.name) return l;
  const s = c.services.find(x => x.id === l.serviceId);
  return s ? { ...l, name: s.name, unit: s.unit, price: s.price } : l;
}
/** GST component when prices are GST-inclusive NZD (15%); 0 otherwise. */
export function gstPortion(c: WorkflowConfig, total: number): number {
  if (c.business.currency !== 'NZD' || !c.business.pricesIncludeGst) return 0;
  return roundCents(total * 3 / 23);
}
export function money(c: WorkflowConfig, n: number): string { return formatMoney(n, c.business.currency); }

export interface NewJobInput {
  customerName: string; customerPhone?: string; address?: string;
  pickupAt?: string; dropoffAt?: string; partner?: string; notes?: string; lines: JobLine[];
}
export function newJobErrors(c: WorkflowConfig, input: NewJobInput): string[] {
  const errs: string[] = [];
  if (!input.customerName.trim()) errs.push(`${c.labels.customer} name is required.`);
  const lines = input.lines.filter(l => l.qty > 0 && c.services.some(s => s.id === l.serviceId));
  if (!lines.length) errs.push('Choose at least one service.');
  if (c.usesPickup && !(input.address ?? '').trim()) errs.push('Address is required for ' + c.labels.pickup.toLowerCase() + '.');
  return errs;
}

export function createJob(state: WorkflowState, input: NewJobInput, now = new Date(), sample = false): WorkflowState {
  const c = state.config;
  const errs = newJobErrors(c, input);
  if (errs.length) throw new Error(errs.join(' '));
  const ref = `${c.labels.job.slice(0, 1).toUpperCase() || 'J'}-${String(state.nextRef).padStart(4, '0')}`;
  const job: WorkflowJob = {
    id: `job-${state.nextRef}-${now.getTime().toString(36)}`, ref,
    customerName: input.customerName.trim().slice(0, 80),
    customerPhone: (input.customerPhone ?? '').trim().slice(0, 30),
    address: (input.address ?? '').trim().slice(0, 160),
    pickupAt: input.pickupAt ?? '', dropoffAt: input.dropoffAt ?? '',
    partner: c.usesPartner ? (input.partner ?? '').trim().slice(0, 60) : '',
    notes: (input.notes ?? '').trim().slice(0, 500),
    lines: input.lines.filter(l => l.qty > 0 && c.services.some(s => s.id === l.serviceId))
      .map(l => snapshotLine(c, { serviceId: l.serviceId, qty: Math.min(99, Math.floor(l.qty)) })),
    stageId: c.stages[0].id, payment: 'unpaid',
    history: [{ at: now.toISOString(), text: `Created — ${c.stages[0].label}` }],
    createdAt: now.toISOString(), sample,
  };
  return { ...state, jobs: [job, ...state.jobs], nextRef: state.nextRef + 1 };
}

function updateJob(state: WorkflowState, id: string, fn: (j: WorkflowJob) => WorkflowJob): WorkflowState {
  return { ...state, jobs: state.jobs.map(j => (j.id === id ? fn(j) : j)) };
}

/** Move a job one stage forward (+1) or back (-1). No-op at the ends. */
export function moveJob(state: WorkflowState, id: string, dir: 1 | -1, now = new Date()): WorkflowState {
  const c = state.config;
  return updateJob(state, id, j => {
    const i = stageIndex(c, j.stageId);
    const next = c.stages[i + dir];
    if (i < 0 || !next) return j;
    return { ...j, stageId: next.id, history: [...j.history, { at: now.toISOString(), text: `${dir > 0 ? 'Moved to' : 'Moved back to'} ${next.label}` }] };
  });
}

export function setPayment(state: WorkflowState, id: string, payment: PaymentStatus, now = new Date()): WorkflowState {
  const label = PAYMENT_STATUSES.find(p => p.id === payment)?.label ?? payment;
  return updateJob(state, id, j => (j.payment === payment ? j : { ...j, payment, history: [...j.history, { at: now.toISOString(), text: `Payment: ${label}` }] }));
}

export function deleteJob(state: WorkflowState, id: string): WorkflowState {
  return { ...state, jobs: state.jobs.filter(j => j.id !== id) };
}

/**
 * Apply a new config mid-journey without corrupting jobs already in progress:
 * - booked lines keep the price/name they were booked at (snapshotted from the
 *   old config if needed), even if the service is re-priced, renamed or removed;
 * - a job whose stage was removed moves to the nearest earlier stage that still
 *   exists (by the old order), falling back to the first stage, and the move is
 *   recorded in its history.
 */
export function applyConfig(state: WorkflowState, next: WorkflowConfig, now = new Date()): WorkflowState {
  const errs = validateConfig(next);
  if (errs.length) throw new Error(errs.join(' '));
  const prev = state.config;
  const remap = (stageId: string): WorkflowStage => {
    const oldIdx = prev.stages.findIndex(s => s.id === stageId);
    for (let i = oldIdx - 1; i >= 0; i--) {
      const kept = next.stages.find(s => s.id === prev.stages[i].id);
      if (kept) return kept;
    }
    return next.stages[0];
  };
  const jobs = state.jobs.map(j => {
    let job = { ...j, lines: j.lines.map(l => snapshotLine(prev, l)) };
    if (!next.stages.some(s => s.id === j.stageId)) {
      const to = remap(j.stageId);
      const was = prev.stages.find(s => s.id === j.stageId)?.label ?? 'Previous stage';
      job = { ...job, stageId: to.id, history: [...job.history, { at: now.toISOString(), text: `Stage "${was}" removed in settings — moved to ${to.label}` }] };
    }
    if (!next.usesPartner) job.partner = '';
    return job;
  });
  return { ...state, config: next, jobs };
}

/** Clearly fictional sample jobs spread across the stages. */
export function withSampleJobs(state: WorkflowState, now = new Date()): WorkflowState {
  const c = state.config;
  const names = ['Sample Customer A', 'Sample Customer B', 'Sample Customer C'];
  let s = state;
  names.forEach((name, i) => {
    s = createJob(s, {
      customerName: name, customerPhone: '000 000 000', address: `${10 + i} Example Street (fictional)`,
      partner: c.partners[0] ?? '', notes: 'Fictional sample job for the demo.',
      lines: [{ serviceId: c.services[i % c.services.length].id, qty: i + 1 }],
    }, now, true);
    const id = s.jobs[0].id;
    for (let k = 0; k < Math.min(i * 2, c.stages.length - 1); k++) s = moveJob(s, id, 1, now);
  });
  return s;
}

export function initialState(presetId = WORKFLOW_PRESETS[0].id, now = new Date()): WorkflowState {
  return withSampleJobs({ config: presetConfig(presetId), jobs: [], nextRef: 1 }, now);
}

/** Parse persisted state; anything malformed falls back to a fresh demo. */
export function parseState(json: string | null): WorkflowState {
  if (!json) return initialState();
  try {
    const raw = rec(JSON.parse(json));
    const config = normaliseConfig(raw['config']);
    const jobs: WorkflowJob[] = arr(raw['jobs']).slice(0, 200)
      .filter(j => typeof j['id'] === 'string' && typeof j['customerName'] === 'string')
      .map((j): WorkflowJob => ({
        id: str(j['id'], 60), ref: str(j['ref'], 20), customerName: str(j['customerName'], 80),
        customerPhone: str(j['customerPhone'], 30), address: str(j['address'], 160),
        pickupAt: str(j['pickupAt'], 30), dropoffAt: str(j['dropoffAt'], 30), partner: str(j['partner'], 60), notes: str(j['notes'], 500),
        lines: arr(j['lines']).filter(l => typeof l['serviceId'] === 'string').map((l): JobLine => {
          const line: JobLine = { serviceId: str(l['serviceId'], 30), qty: Math.max(0, Math.min(99, Number(l['qty']) || 0)) };
          const price = Number(l['price']);
          if (l['price'] !== undefined && Number.isFinite(price) && price >= 0) line.price = roundCents(price);
          if (typeof l['name'] === 'string' && l['name'].trim()) line.name = str(l['name'], 60);
          if (typeof l['unit'] === 'string') line.unit = str(l['unit'], 40);
          return line;
        }),
        stageId: config.stages.some(s => s.id === j['stageId']) ? j['stageId'] as string : config.stages[0].id,
        payment: PAYMENT_STATUSES.some(p => p.id === j['payment']) ? j['payment'] as PaymentStatus : 'unpaid',
        history: arr(j['history']).slice(-50).map(h => ({ at: str(h['at'], 40), text: str(h['text'], 200) })),
        createdAt: str(j['createdAt'], 40), sample: j['sample'] === true,
      }));
    const n = raw['nextRef'];
    const nextRef = typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : jobs.length + 1;
    return { config, jobs, nextRef };
  } catch {
    return initialState();
  }
}
