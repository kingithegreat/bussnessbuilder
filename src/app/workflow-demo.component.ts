import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import {
  JobLine, PAYMENT_STATUSES, lineName, PaymentStatus, WORKFLOW_PRESETS, WORKFLOW_STORAGE_KEY,
  WorkflowConfig, WorkflowJob, WorkflowState, applyConfig, createJob, deleteJob, gstPortion,
  initialState, isComplete, jobTotal, money, moveJob, newJobErrors, parseState, setPayment,
  slugId, stageIndex, stageLabel, validateConfig, withSampleJobs, MAX_STAGES, MIN_STAGES,
} from './service-workflow';

type Tab = 'board' | 'new' | 'settings';

/**
 * Public, self-contained proposal demo: run a service job end-to-end with a
 * configurable business profile, catalogue and workflow. Browser-local only.
 */
@Component({
  selector: 'app-workflow-demo',
  standalone: true,
  imports: [FormsModule, RouterLink, MatIconModule],
  template: `
<div class="min-h-screen bg-slate-50 text-slate-900" [style.--accent]="cfg().business.accent">
  <div class="bg-amber-100 border-b border-amber-300 text-amber-900 text-sm px-4 py-2 text-center" role="note" data-testid="demo-banner">
    <strong>Demo mode.</strong> Fictional sample data saved only in this browser. No real payments, emails or texts are sent.
  </div>

  <header class="bg-white border-b border-slate-200">
    <div class="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center gap-4 justify-between">
      <div class="flex items-center gap-3 min-w-0">
        <div class="h-11 w-11 shrink-0 rounded-xl grid place-items-center text-white font-bold text-lg" style="background: var(--accent)" aria-hidden="true">{{ initials() }}</div>
        <div class="min-w-0">
          <h1 class="text-lg sm:text-xl font-bold truncate" data-testid="biz-name">{{ cfg().business.name }}</h1>
          <p class="text-sm text-slate-600 truncate">{{ cfg().business.tagline }}</p>
        </div>
      </div>
      <nav class="flex gap-1 rounded-xl bg-slate-100 p-1" aria-label="Demo sections">
        @for (t of tabs; track t.id) {
          <button type="button" (click)="tab.set(t.id)" [attr.aria-current]="tab() === t.id ? 'page' : null"
            class="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            [class.bg-white]="tab() === t.id" [class.shadow-sm]="tab() === t.id" [attr.data-testid]="'tab-' + t.id">
            <mat-icon class="!text-[18px] !w-[18px] !h-[18px]" aria-hidden="true">{{ t.icon }}</mat-icon>{{ t.id === 'new' ? 'New ' + cfg().labels.job.toLowerCase() : t.label }}
          </button>
        }
      </nav>
    </div>
  </header>

  <p class="sr-only" aria-live="polite">{{ announce() }}</p>

  <main class="max-w-6xl mx-auto px-4 py-6">
    @if (tab() === 'board') {
      <section aria-labelledby="board-h">
        <div class="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h2 id="board-h" class="text-xl font-semibold">{{ cfg().labels.job }}s</h2>
            <p class="text-sm text-slate-600">{{ activeCount() }} in progress · {{ doneCount() }} completed · {{ money(cfg(), unpaidTotal()) }} awaiting payment</p>
          </div>
          <button type="button" class="btn-accent" (click)="tab.set('new')"><mat-icon aria-hidden="true">add</mat-icon> New {{ cfg().labels.job.toLowerCase() }}</button>
        </div>

        <ol class="grid gap-4 md:grid-flow-col md:auto-cols-[minmax(220px,1fr)] overflow-x-auto pb-2" aria-label="Workflow stages">
          @for (s of cfg().stages; track s.id; let i = $index) {
            <li class="rounded-2xl bg-white border border-slate-200 p-3 min-w-[220px]" [attr.data-testid]="'stage-' + s.id">
              <h3 class="font-semibold text-sm flex items-center gap-2">
                <span class="h-6 w-6 rounded-full grid place-items-center text-xs text-white" style="background: var(--accent)">{{ i + 1 }}</span>
                {{ s.label }} <span class="ml-auto text-slate-500 font-normal">{{ jobsIn(s.id).length }}</span>
              </h3>
              <p class="text-xs text-slate-500 mt-1">{{ s.description }}</p>
              <ul class="mt-3 space-y-2">
                @for (j of jobsIn(s.id); track j.id) {
                  <li>
                    <button type="button" (click)="selectedId.set(j.id)" class="w-full text-left rounded-xl border p-3 hover:border-slate-400 focus:outline-none focus-visible:ring-2"
                      [class.border-slate-900]="selectedId() === j.id" [attr.aria-pressed]="selectedId() === j.id" [attr.data-testid]="'job-' + j.ref">
                      <span class="flex justify-between text-xs text-slate-500"><span>{{ j.ref }}</span><span [class]="payClass(j.payment)">{{ payLabel(j.payment) }}</span></span>
                      <span class="block font-medium mt-1">{{ j.customerName }}</span>
                      <span class="block text-sm text-slate-600">{{ money(cfg(), jobTotal(cfg(), j)) }}</span>
                    </button>
                  </li>
                } @empty { <li class="text-xs text-slate-400 italic">Nothing here</li> }
              </ul>
            </li>
          }
        </ol>

        @if (selected(); as j) {
          <section class="mt-6 rounded-2xl bg-white border border-slate-200 p-5" aria-labelledby="detail-h" data-testid="job-detail">
            <div class="flex flex-wrap justify-between gap-3">
              <div>
                <h3 id="detail-h" class="text-lg font-semibold">{{ j.ref }} · {{ j.customerName }} @if (j.sample) {<span class="ml-2 text-xs rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">sample</span>}</h3>
                <p class="text-sm text-slate-600">Stage: <strong>{{ stageLabel(cfg(), j.stageId) }}</strong> ({{ stageIndex(cfg(), j.stageId) + 1 }} of {{ cfg().stages.length }})</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn-ghost" (click)="move(j, -1)" [disabled]="stageIndex(cfg(), j.stageId) === 0">Back</button>
                <button type="button" class="btn-accent" (click)="move(j, 1)" [disabled]="isComplete(cfg(), j)" data-testid="advance">
                  @if (isComplete(cfg(), j)) { Completed } @else { Move to {{ cfg().stages[stageIndex(cfg(), j.stageId) + 1].label }} }
                </button>
              </div>
            </div>
            <div class="mt-4 grid gap-6 md:grid-cols-3 text-sm">
              <dl class="space-y-1">
                <div><dt class="inline text-slate-500">Phone: </dt><dd class="inline">{{ j.customerPhone || '—' }}</dd></div>
                @if (cfg().usesPickup || cfg().usesDropoff) { <div><dt class="inline text-slate-500">Address: </dt><dd class="inline">{{ j.address || '—' }}</dd></div> }
                @if (cfg().usesPickup) { <div><dt class="inline text-slate-500">{{ cfg().labels.pickup }}: </dt><dd class="inline">{{ when(j.pickupAt) }}</dd></div> }
                @if (cfg().usesDropoff) { <div><dt class="inline text-slate-500">{{ cfg().labels.dropoff }}: </dt><dd class="inline">{{ when(j.dropoffAt) }}</dd></div> }
                @if (cfg().usesPartner) { <div><dt class="inline text-slate-500">{{ cfg().labels.partner }}: </dt><dd class="inline">{{ j.partner || '—' }}</dd></div> }
                @if (j.notes) { <div><dt class="inline text-slate-500">Notes: </dt><dd class="inline">{{ j.notes }}</dd></div> }
              </dl>
              <div>
                <table class="w-full"><caption class="sr-only">Services</caption>
                  <tbody>
                    @for (l of j.lines; track l.serviceId) {
                      <tr><td>{{ l.qty }} × {{ lineName(cfg(), l) }}</td><td class="text-right">{{ money(cfg(), lineTotal(l)) }}</td></tr>
                    }
                    <tr class="border-t font-semibold"><td>Total</td><td class="text-right" data-testid="job-total">{{ money(cfg(), jobTotal(cfg(), j)) }}</td></tr>
                    @if (gstPortion(cfg(), jobTotal(cfg(), j)); as g) { <tr class="text-xs text-slate-500"><td>Includes GST</td><td class="text-right">{{ money(cfg(), g) }}</td></tr> }
                  </tbody>
                </table>
                <label class="block mt-4 text-slate-600" for="pay">Payment (demo — no money moves)</label>
                <select id="pay" class="input mt-1" [ngModel]="j.payment" (ngModelChange)="pay(j, $event)" data-testid="payment">
                  @for (p of payments; track p.id) { <option [value]="p.id">{{ p.label }}</option> }
                </select>
              </div>
              <div>
                <h4 class="font-medium">History</h4>
                <ol class="mt-1 space-y-1 text-xs text-slate-600 max-h-48 overflow-auto">
                  @for (h of j.history; track $index) { <li><time [attr.datetime]="h.at">{{ when(h.at) }}</time> — {{ h.text }}</li> }
                </ol>
                <button type="button" class="mt-3 text-xs text-red-700 underline" (click)="remove(j)">Delete this {{ cfg().labels.job.toLowerCase() }}</button>
              </div>
            </div>
          </section>
        }
      </section>
    }

    @if (tab() === 'new') {
      <form class="rounded-2xl bg-white border border-slate-200 p-5 max-w-3xl" (ngSubmit)="submitJob()" aria-labelledby="new-h" data-testid="new-job-form">
        <h2 id="new-h" class="text-xl font-semibold">New {{ cfg().labels.job.toLowerCase() }}</h2>
        <p class="text-sm text-slate-600">Use made-up details — this is a demo.</p>
        <div class="grid gap-4 sm:grid-cols-2 mt-4">
          <label class="field">{{ cfg().labels.customer }} name *<input class="input" name="cn" [(ngModel)]="draft.customerName" required autocomplete="off"></label>
          <label class="field">Phone<input class="input" name="cp" [(ngModel)]="draft.customerPhone" autocomplete="off"></label>
          @if (cfg().usesPickup || cfg().usesDropoff) { <label class="field sm:col-span-2">Address @if (cfg().usesPickup) {*}<input class="input" name="ad" [(ngModel)]="draft.address" autocomplete="off"></label> }
          @if (cfg().usesPickup) { <label class="field">{{ cfg().labels.pickup }} time<input class="input" type="datetime-local" name="pu" [(ngModel)]="draft.pickupAt"></label> }
          @if (cfg().usesDropoff) { <label class="field">{{ cfg().labels.dropoff }} time<input class="input" type="datetime-local" name="do" [(ngModel)]="draft.dropoffAt"></label> }
          @if (cfg().usesPartner) {
            <label class="field">{{ cfg().labels.partner }}
              <select class="input" name="pa" [(ngModel)]="draft.partner"><option value="">Not assigned</option>@for (p of cfg().partners; track p) { <option [value]="p">{{ p }}</option> }</select>
            </label>
          }
        </div>
        <fieldset class="mt-5">
          <legend class="font-medium">Services</legend>
          <div class="mt-2 divide-y rounded-xl border">
            @for (s of cfg().services; track s.id) {
              <label class="flex items-center gap-3 p-3">
                <span class="flex-1"><span class="font-medium">{{ s.name }}</span> <span class="text-sm text-slate-500">{{ money(cfg(), s.price) }} {{ s.unit }}</span></span>
                <span class="sr-only">Quantity of {{ s.name }}</span>
                <input class="input w-20" type="number" min="0" max="99" [name]="'q-' + s.id" [(ngModel)]="qty[s.id]" [attr.data-testid]="'qty-' + s.id">
              </label>
            }
          </div>
          <p class="mt-2 text-right font-semibold">Estimated total: {{ money(cfg(), draftTotal()) }}</p>
        </fieldset>
        <label class="field mt-4">Notes<textarea class="input" rows="2" name="no" [(ngModel)]="draft.notes"></textarea></label>
        @if (formErrors().length) { <ul class="mt-3 text-sm text-red-700" role="alert">@for (e of formErrors(); track e) { <li>{{ e }}</li> }</ul> }
        <div class="mt-5 flex gap-2"><button class="btn-accent" type="submit" data-testid="create-job">Create {{ cfg().labels.job.toLowerCase() }}</button><button type="button" class="btn-ghost" (click)="tab.set('board')">Cancel</button></div>
      </form>
    }

    @if (tab() === 'settings') {
      <form class="space-y-6 max-w-4xl" (ngSubmit)="saveSettings()" aria-labelledby="set-h" data-testid="settings-form">
        <div>
          <h2 id="set-h" class="text-xl font-semibold">Customise for any service business</h2>
          <p class="text-sm text-slate-600">Change the name, brand colour, services, prices, stage names and which fields you use. Start from a preset or edit freely.</p>
        </div>
        <section class="card">
          <h3 class="font-semibold">Start from a preset</h3>
          <div class="mt-2 grid gap-2 sm:grid-cols-3">
            @for (p of presets; track p.id) {
              <button type="button" class="text-left rounded-xl border p-3 hover:border-slate-500" (click)="loadPreset(p.id)" [attr.data-testid]="'preset-' + p.id">
                <span class="block font-medium">{{ p.label }}</span><span class="block text-xs text-slate-500">{{ p.summary }}</span>
              </button>
            }
          </div>
          <p class="text-xs text-slate-500 mt-2">Loading a preset replaces the settings below and resets the demo jobs.</p>
        </section>
        <section class="card grid gap-4 sm:grid-cols-2">
          <h3 class="font-semibold sm:col-span-2">Business profile</h3>
          <label class="field">Business name *<input class="input" name="bn" [(ngModel)]="edit.business.name" data-testid="set-name"></label>
          <label class="field">Phone<input class="input" name="bp" [(ngModel)]="edit.business.phone"></label>
          <label class="field sm:col-span-2">Tagline<input class="input" name="bt" [(ngModel)]="edit.business.tagline"></label>
          <label class="field">Service area<input class="input" name="ba" [(ngModel)]="edit.business.area"></label>
          <label class="field">Brand colour<span class="flex gap-2"><input type="color" class="h-10 w-14 rounded border" name="bc" [(ngModel)]="edit.business.accent"><input class="input" name="bc2" [(ngModel)]="edit.business.accent"></span></label>
        </section>
        <section class="card grid gap-4 sm:grid-cols-3">
          <h3 class="font-semibold sm:col-span-3">Words and fields</h3>
          <label class="field">A job is called<input class="input" name="lj" [(ngModel)]="edit.labels.job"></label>
          <label class="field">A customer is called<input class="input" name="lc" [(ngModel)]="edit.labels.customer"></label>
          <span></span>
          <label class="flex items-center gap-2"><input type="checkbox" name="up" [(ngModel)]="edit.usesPickup"> Use collection/visit</label>
          <label class="field">…called<input class="input" name="lpu" [(ngModel)]="edit.labels.pickup" [disabled]="!edit.usesPickup"></label>
          <span></span>
          <label class="flex items-center gap-2"><input type="checkbox" name="ud" [(ngModel)]="edit.usesDropoff"> Use return/delivery</label>
          <label class="field">…called<input class="input" name="ldo" [(ngModel)]="edit.labels.dropoff" [disabled]="!edit.usesDropoff"></label>
          <span></span>
          <label class="flex items-center gap-2"><input type="checkbox" name="upa" [(ngModel)]="edit.usesPartner"> Use a partner/supplier</label>
          <label class="field">…called<input class="input" name="lpa" [(ngModel)]="edit.labels.partner" [disabled]="!edit.usesPartner"></label>
          <label class="field">Partners (comma separated)<input class="input" name="pl" [(ngModel)]="partnersText" [disabled]="!edit.usesPartner"></label>
        </section>
        <section class="card">
          <h3 class="font-semibold">Services and example prices ({{ edit.business.currency }}, {{ edit.business.pricesIncludeGst ? 'incl. GST' : 'excl. GST' }})</h3>
          <div class="mt-2 space-y-2">
            <!-- Inputs are named by the row's stable id (not its position) so reordering/removing rows can't re-wire NgModel controls and shuffle typed values. -->
            @for (s of edit.services; track s.id; let i = $index) {
              <div class="grid grid-cols-12 gap-2 items-center border-b border-slate-100 pb-2 sm:border-0 sm:pb-0">
                <input class="input col-span-12 sm:col-span-5" [name]="'sn-' + s.id" [(ngModel)]="s.name" [attr.aria-label]="'Service ' + (i + 1) + ' name'">
                <input class="input col-span-6 sm:col-span-4" [name]="'su-' + s.id" [(ngModel)]="s.unit" [attr.aria-label]="'Service ' + (i + 1) + ' unit'" placeholder="per item">
                <input class="input col-span-4 sm:col-span-2" type="number" min="0" step="0.5" [name]="'sp-' + s.id" [(ngModel)]="s.price" [attr.aria-label]="'Service ' + (i + 1) + ' price'">
                <button type="button" class="col-span-2 sm:col-span-1 text-slate-500 hover:text-red-700" (click)="removeService(i)" [attr.aria-label]="'Remove service ' + (s.name || i + 1)"><mat-icon aria-hidden="true">delete</mat-icon></button>
              </div>
            }
          </div>
          <button type="button" class="btn-ghost mt-2" (click)="addService()">+ Add service</button>
        </section>
        <section class="card">
          <h3 class="font-semibold">Workflow stages (in order, {{ minStages }}–{{ maxStages }})</h3>
          <div class="mt-2 space-y-2">
            @for (s of edit.stages; track s.id; let i = $index) {
              <div class="grid grid-cols-12 gap-2 items-center border-b border-slate-100 pb-2 sm:border-0 sm:pb-0">
                <span class="col-span-1 text-sm text-slate-500 text-center">{{ i + 1 }}</span>
                <input class="input col-span-7 sm:col-span-3" [name]="'stl-' + s.id" [(ngModel)]="s.label" [attr.aria-label]="'Stage ' + (i + 1) + ' name'">
                <input class="input col-span-12 order-last sm:order-none sm:col-span-5" [name]="'std-' + s.id" [(ngModel)]="s.description" [attr.aria-label]="'Stage ' + (i + 1) + ' description'">
                <span class="col-span-4 sm:col-span-3 flex gap-1 justify-end sm:justify-start">
                  <button type="button" class="icon-btn" (click)="moveStage(i, -1)" [disabled]="i === 0" [attr.aria-label]="'Move stage ' + (i + 1) + ' up'"><mat-icon aria-hidden="true">arrow_upward</mat-icon></button>
                  <button type="button" class="icon-btn" (click)="moveStage(i, 1)" [disabled]="i === edit.stages.length - 1" [attr.aria-label]="'Move stage ' + (i + 1) + ' down'"><mat-icon aria-hidden="true">arrow_downward</mat-icon></button>
                  <button type="button" class="icon-btn" (click)="removeStage(i)" [attr.aria-label]="'Remove stage ' + (i + 1)"><mat-icon aria-hidden="true">delete</mat-icon></button>
                </span>
              </div>
            }
          </div>
          <button type="button" class="btn-ghost mt-2" (click)="addStage()" [disabled]="edit.stages.length >= maxStages">+ Add stage</button>
          <p class="text-xs text-slate-500 mt-2">Jobs in a removed stage move back to the nearest earlier stage. Prices on existing jobs stay as booked. Payment is tracked separately from stages.</p>
        </section>
        @if (settingsErrors().length) { <ul class="text-sm text-red-700" role="alert">@for (e of settingsErrors(); track e) { <li>{{ e }}</li> }</ul> }
        <div class="flex flex-wrap gap-2">
          <button class="btn-accent" type="submit" data-testid="save-settings">Save settings</button>
          <button type="button" class="btn-ghost" (click)="resetEdit()">Discard changes</button>
          <button type="button" class="btn-ghost" (click)="resetDemo()">Reset whole demo</button>
        </div>
      </form>
    }
  </main>
  <footer class="max-w-6xl mx-auto px-4 pb-8 text-xs text-slate-500">
    {{ cfg().business.area }} · {{ cfg().business.phone }} — fictional demo business. Built with <a routerLink="/" class="underline">BusinessFlow</a>.
  </footer>
</div>
  `,
  styles: [`
    :host { --accent: #0f766e; }
    .btn-accent { display:inline-flex; align-items:center; gap:.25rem; border-radius:.75rem; padding:.55rem 1rem; font-weight:600; font-size:.875rem; color:#fff; background: var(--accent); }
    .btn-accent:hover { filter: brightness(.92); }
    .btn-accent:disabled, .btn-ghost:disabled, .icon-btn:disabled { opacity:.45; cursor:not-allowed; }
    .btn-ghost { display:inline-flex; align-items:center; border-radius:.75rem; padding:.55rem 1rem; font-size:.875rem; font-weight:500; border:1px solid #cbd5e1; background:#fff; }
    .icon-btn { padding:.25rem; border-radius:.5rem; color:#475569; }
    .btn-accent:focus-visible, .btn-ghost:focus-visible, .icon-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .input { width:100%; border:1px solid #cbd5e1; border-radius:.6rem; padding:.5rem .65rem; font-size:.9rem; background:#fff; }
    .input:focus { outline:2px solid var(--accent); outline-offset:0; }
    .field { display:flex; flex-direction:column; gap:.25rem; font-size:.875rem; color:#334155; }
    .card { border-radius:1rem; background:#fff; border:1px solid #e2e8f0; padding:1.25rem; }
  `],
})
export class WorkflowDemoComponent {
  private browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly presets = WORKFLOW_PRESETS;
  readonly payments = PAYMENT_STATUSES;
  readonly maxStages = MAX_STAGES;
  readonly minStages = MIN_STAGES;
  readonly tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'board', label: 'Board', icon: 'view_kanban' },
    { id: 'new', label: 'New', icon: 'add_circle' },
    { id: 'settings', label: 'Settings', icon: 'tune' },
  ];
  // template helpers
  readonly money = money; readonly jobTotal = jobTotal; readonly lineName = lineName; readonly gstPortion = gstPortion;
  readonly stageIndex = stageIndex; readonly stageLabel = stageLabel; readonly isComplete = isComplete;

  state = signal<WorkflowState>(this.load());
  tab = signal<Tab>('board');
  selectedId = signal<string | null>(null);
  announce = signal('');
  formErrors = signal<string[]>([]);
  settingsErrors = signal<string[]>([]);

  cfg = computed(() => this.state().config);
  selected = computed(() => this.state().jobs.find(j => j.id === this.selectedId()) ?? null);
  activeCount = computed(() => this.state().jobs.filter(j => !isComplete(this.cfg(), j)).length);
  doneCount = computed(() => this.state().jobs.length - this.activeCount());
  unpaidTotal = computed(() => this.state().jobs.filter(j => j.payment !== 'paid').reduce((s, j) => s + jobTotal(this.cfg(), j), 0));
  initials = computed(() => this.cfg().business.name.split(/\s+/).filter(w => /^[a-z0-9]/i.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'BF');

  draft = this.emptyDraft();
  qty: Record<string, number> = {};
  edit: WorkflowConfig = structuredClone(this.cfg());
  partnersText = this.edit.partners.join(', ');

  jobsIn(stageId: string): WorkflowJob[] { return this.state().jobs.filter(j => j.stageId === stageId); }
  lineTotal(l: JobLine) { return jobTotal(this.cfg(), { lines: [l] }); }
  draftTotal() { return jobTotal(this.cfg(), { lines: this.draftLines() }); }
  payLabel(p: PaymentStatus) { return p === 'paid' ? 'Paid' : p === 'invoiced' ? 'Invoiced' : 'Unpaid'; }
  payClass(p: PaymentStatus) { return p === 'paid' ? 'text-emerald-700 font-medium' : p === 'invoiced' ? 'text-amber-700' : 'text-slate-500'; }
  when(iso: string) {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' });
  }

  move(j: WorkflowJob, dir: 1 | -1) {
    this.commit(moveJob(this.state(), j.id, dir));
    this.announce.set(`${j.ref} moved to ${stageLabel(this.cfg(), this.selected()?.stageId ?? '')}`);
  }
  pay(j: WorkflowJob, p: PaymentStatus) { this.commit(setPayment(this.state(), j.id, p)); this.announce.set(`${j.ref} payment updated`); }
  remove(j: WorkflowJob) {
    if (this.browser && !confirm(`Delete ${j.ref}?`)) return;
    this.commit(deleteJob(this.state(), j.id)); this.selectedId.set(null);
  }

  submitJob() {
    const input = { ...this.draft, lines: this.draftLines() };
    const errs = newJobErrors(this.cfg(), input);
    this.formErrors.set(errs);
    if (errs.length) return;
    const next = createJob(this.state(), input);
    this.commit(next);
    this.selectedId.set(next.jobs[0].id);
    this.announce.set(`${next.jobs[0].ref} created`);
    this.draft = this.emptyDraft(); this.qty = {};
    this.tab.set('board');
  }

  // Settings rows are replaced immutably (new arrays) and their form controls are
  // named by stable id, so reordering/removing rows never shuffles typed values.
  addService() { this.edit.services = [...this.edit.services, { id: slugId('service', this.edit.services.map(s => s.id)), name: '', unit: '', price: 0 }]; }
  removeService(i: number) { this.edit.services = this.edit.services.filter((_, k) => k !== i); }
  addStage() { this.edit.stages = [...this.edit.stages, { id: slugId('stage', this.edit.stages.map(s => s.id)), label: '', description: '' }]; }
  removeStage(i: number) { this.edit.stages = this.edit.stages.filter((_, k) => k !== i); }
  moveStage(i: number, dir: 1 | -1) {
    const a = [...this.edit.stages]; const k = i + dir;
    if (k < 0 || k >= a.length) return;
    [a[i], a[k]] = [a[k], a[i]];
    this.edit.stages = a;
  }
  saveSettings() {
    const next: WorkflowConfig = { ...structuredClone(this.edit), partners: this.partnersText.split(',').map(p => p.trim()).filter(Boolean) };
    next.services.forEach(s => (s.price = Number(s.price)));
    const errs = validateConfig(next);
    this.settingsErrors.set(errs);
    if (errs.length) return;
    this.commit(applyConfig(this.state(), next));
    this.announce.set('Settings saved'); this.tab.set('board');
  }
  resetEdit() { this.edit = structuredClone(this.cfg()); this.partnersText = this.edit.partners.join(', '); this.settingsErrors.set([]); }
  loadPreset(id: string) {
    this.commit(initialState(id)); this.resetEdit(); this.selectedId.set(null); this.announce.set('Preset loaded');
  }
  resetDemo() {
    if (this.browser && !confirm('Reset the demo to the laundry preset with fresh sample data?')) return;
    this.loadPreset(WORKFLOW_PRESETS[0].id);
  }
  /** Re-add sample jobs (used when the board is empty). */
  addSamples() { this.commit(withSampleJobs(this.state())); }

  private draftLines(): JobLine[] {
    return Object.entries(this.qty).map(([serviceId, q]) => ({ serviceId, qty: Number(q) || 0 })).filter(l => l.qty > 0);
  }
  private emptyDraft() { return { customerName: '', customerPhone: '', address: '', pickupAt: '', dropoffAt: '', partner: '', notes: '' }; }
  private load(): WorkflowState {
    if (!this.browser) return initialState();
    try { return parseState(localStorage.getItem(WORKFLOW_STORAGE_KEY)); } catch { return initialState(); }
  }
  private commit(s: WorkflowState) {
    this.state.set(s);
    if (!this.browser) return;
    try { localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(s)); } catch { /* storage full/blocked: demo still works in memory */ }
  }
}
