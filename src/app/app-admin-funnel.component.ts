import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from './auth.service';
import { FUNNEL_FLAG_LABELS, FunnelFlag } from './funnel';

interface FunnelStepRow {
  step: string;
  label: string;
  reached: number;
  conversionFromPrev: number;
  conversionFromTop: number;
  exitedHere: number;
}

interface FunnelReport {
  days: number;
  from: string;
  to: string;
  sessions: number;
  totals: { steps: Record<string, number>; furthest: Record<string, number>; flags: Record<string, number>; authErrors: Record<string, number> };
  funnel: FunnelStepRow[];
  abandon: { landing: number; wizard: number; publish: number; signup: number; afterSignup: number };
  completed: number;
  daily: { date: string; steps: Record<string, number>; flags: Record<string, number> }[];
}

const ABANDON_LABELS: { key: keyof FunnelReport['abandon']; label: string; hint: string }[] = [
  { key: 'landing', label: 'Left the landing page', hint: 'Never opened the wizard' },
  { key: 'wizard', label: 'Quit inside the wizard', hint: 'Started building, never reached publish' },
  { key: 'publish', label: 'Stalled at publish', hint: 'Hit publish but never saw sign-up' },
  { key: 'signup', label: 'Balked at sign-up', hint: 'Saw the account form, never completed it' },
  { key: 'afterSignup', label: 'Went quiet after signing up', hint: 'Account created, link never shared' },
];

@Component({
  selector: 'app-admin-funnel',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-gray-900">Acquisition funnel</h1>
        <p class="text-sm text-gray-500">
          Anonymous, aggregate counts — no visitor is identified or tracked between visits.
        </p>
      </div>
      <div class="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
        @for (range of ranges; track range) {
          <button (click)="setDays(range)"
                  class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                  [class]="range === days() ? 'bg-red-600 text-white' : 'text-gray-500 hover:bg-gray-50'">
            {{ range }}d
          </button>
        }
      </div>
    </div>

    @if (loading()) {
      <div class="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400 text-sm">Loading…</div>
    } @else if (!report()) {
      <div class="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <mat-icon class="text-4xl text-gray-300">filter_alt</mat-icon>
        <p class="text-sm font-medium text-gray-500 mt-2">Couldn't load funnel data.</p>
      </div>
    } @else if (report()!.sessions === 0) {
      <div class="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <mat-icon class="text-4xl text-gray-300">hourglass_empty</mat-icon>
        <p class="text-sm font-medium text-gray-500 mt-2">No sessions recorded yet in this window.</p>
        <p class="text-xs text-gray-400 mt-1">Counting starts from the first visit after this was deployed.</p>
      </div>
    } @else {
      <!-- Headline tiles -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-2xl border border-gray-200 p-5">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center"><mat-icon class="text-[16px]">groups</mat-icon></div>
            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sessions</span>
          </div>
          <p class="text-2xl font-black text-gray-900">{{ report()!.sessions }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-200 p-5">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><mat-icon class="text-[16px]">edit_note</mat-icon></div>
            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reached wizard</span>
          </div>
          <p class="text-2xl font-black text-gray-900">{{ stepValue('wizard_started') }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ stepPct('wizard_started') }}% of sessions</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-200 p-5">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-7 h-7 rounded-lg bg-green-50 text-green-600 flex items-center justify-center"><mat-icon class="text-[16px]">person_add</mat-icon></div>
            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Accounts</span>
          </div>
          <p class="text-2xl font-black text-gray-900">{{ stepValue('account_created') }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ stepPct('account_created') }}% of sessions</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-200 p-5">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"><mat-icon class="text-[16px]">rocket_launch</mat-icon></div>
            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sites live</span>
          </div>
          <p class="text-2xl font-black text-gray-900">{{ stepValue('site_live') }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ stepPct('site_live') }}% of sessions</p>
        </div>
      </div>

      <!-- The funnel itself -->
      <div class="bg-white rounded-2xl border border-gray-200 mb-6">
        <div class="px-5 py-4 border-b border-gray-100">
          <h2 class="font-bold text-sm text-gray-900">Step by step</h2>
          <p class="text-xs text-gray-400 mt-0.5">Each bar is the share of all sessions. The drop column is how many of the previous step made it here.</p>
        </div>
        <div class="p-5 space-y-3">
          @for (row of report()!.funnel; track row.step) {
            <div>
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-bold text-gray-700">{{ row.label }}</span>
                <span class="text-gray-500">
                  <span class="font-bold text-gray-900">{{ row.reached }}</span>
                  <span class="text-gray-400"> · {{ row.conversionFromTop }}% of all</span>
                  @if (!$first) {
                    <span [class]="row.conversionFromPrev < 50 ? 'text-red-600 font-bold' : 'text-gray-400'">
                      · {{ row.conversionFromPrev }}% of previous
                    </span>
                  }
                </span>
              </div>
              <div class="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div class="bg-blue-500 h-2.5 rounded-full transition-all" [style.width.%]="row.conversionFromTop"></div>
              </div>
            </div>
          }
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Where they quit -->
        <div class="bg-white rounded-2xl border border-gray-200">
          <div class="px-5 py-4 border-b border-gray-100">
            <h2 class="font-bold text-sm text-gray-900">Where they quit</h2>
            <p class="text-xs text-gray-400 mt-0.5">Every session lands in exactly one bucket, so these add up.</p>
          </div>
          <div class="p-5 space-y-4">
            @for (bucket of abandonRows(); track bucket.key) {
              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span class="font-bold text-gray-700">{{ bucket.label }}</span>
                  <span class="font-bold text-gray-900">{{ bucket.count }} <span class="text-gray-400 font-medium">({{ bucket.pct }}%)</span></span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-2">
                  <div class="bg-red-400 h-2 rounded-full" [style.width.%]="bucket.pct"></div>
                </div>
                <p class="text-[11px] text-gray-400 mt-1">{{ bucket.hint }}</p>
              </div>
            }
            <div class="pt-3 border-t border-gray-100 flex justify-between text-xs">
              <span class="font-bold text-green-700">Shared their link</span>
              <span class="font-bold text-gray-900">{{ report()!.completed }}</span>
            </div>
          </div>
        </div>

        <!-- Friction -->
        <div class="bg-white rounded-2xl border border-gray-200">
          <div class="px-5 py-4 border-b border-gray-100">
            <h2 class="font-bold text-sm text-gray-900">Friction</h2>
            <p class="text-xs text-gray-400 mt-0.5">Things that went wrong, counted once per session.</p>
          </div>
          <div class="p-5">
            @if (frictionRows().length === 0) {
              <p class="text-sm text-gray-400 text-center py-6">Nothing recorded.</p>
            } @else {
              <table class="w-full text-left">
                <tbody class="text-sm divide-y divide-gray-50">
                  @for (row of frictionRows(); track row.key) {
                    <tr>
                      <td class="py-2.5 text-gray-600">{{ row.label }}</td>
                      <td class="py-2.5 text-right font-bold" [class]="row.key === 'stash_lost' ? 'text-red-600' : 'text-gray-900'">{{ row.count }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        </div>
      </div>

      <!-- Auth errors -->
      @if (authErrorRows().length) {
        <div class="bg-white rounded-2xl border border-gray-200 mb-6">
          <div class="px-5 py-4 border-b border-gray-100">
            <h2 class="font-bold text-sm text-gray-900">Why sign-ups failed</h2>
          </div>
          <div class="p-5">
            <table class="w-full text-left">
              <tbody class="text-sm divide-y divide-gray-50">
                @for (row of authErrorRows(); track row.code) {
                  <tr>
                    <td class="py-2.5 font-mono text-xs text-gray-600">{{ row.code }}</td>
                    <td class="py-2.5 text-right font-bold text-gray-900">{{ row.count }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Trend -->
      <div class="bg-white rounded-2xl border border-gray-200">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 class="font-bold text-sm text-gray-900">Sites going live, by day</h2>
          <span class="text-xs text-gray-400">{{ report()!.from }} → {{ report()!.to }}</span>
        </div>
        <div class="p-5">
          <div class="flex items-end gap-1 h-24">
            @for (day of report()!.daily; track day.date) {
              <div class="flex-1 bg-blue-100 rounded-t-sm min-h-[2px] hover:bg-blue-300 transition-colors"
                   [style.height.px]="barHeight(day.steps['site_live'] || 0)"
                   [title]="day.date + ': ' + (day.steps['site_live'] || 0) + ' live'"></div>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class AppAdminFunnelComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  ranges = [7, 30, 90];
  days = signal(30);
  loading = signal(true);
  report = signal<FunnelReport | null>(null);

  ngOnInit() {
    this.load();
  }

  setDays(days: number) {
    if (days === this.days()) return;
    this.days.set(days);
    this.load();
  }

  private async load() {
    this.loading.set(true);
    const token = await this.auth.getIdToken();
    if (!token) {
      // The other admin pages leave the spinner up forever on this path.
      this.loading.set(false);
      return;
    }
    this.http.get<FunnelReport>(`/api/admin/funnel?days=${this.days()}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).subscribe({
      next: data => { this.report.set(data); this.loading.set(false); },
      error: () => { this.report.set(null); this.loading.set(false); },
    });
  }

  stepValue(step: string): number {
    return this.report()?.funnel.find(r => r.step === step)?.reached || 0;
  }

  stepPct(step: string): number {
    return this.report()?.funnel.find(r => r.step === step)?.conversionFromTop || 0;
  }

  abandonRows = computed(() => {
    const r = this.report();
    if (!r) return [];
    return ABANDON_LABELS.map(a => ({
      key: a.key,
      label: a.label,
      hint: a.hint,
      count: r.abandon[a.key],
      pct: r.sessions > 0 ? Math.round((r.abandon[a.key] / r.sessions) * 1000) / 10 : 0,
    }));
  });

  frictionRows = computed(() => {
    const flags = this.report()?.totals.flags || {};
    return Object.entries(flags)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({
        key,
        label: FUNNEL_FLAG_LABELS[key as FunnelFlag] || key,
        count,
      }));
  });

  authErrorRows = computed(() => {
    const errors = this.report()?.totals.authErrors || {};
    return Object.entries(errors)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({ code, count }));
  });

  private maxDailyLive(): number {
    const daily = this.report()?.daily || [];
    return Math.max(...daily.map(d => d.steps['site_live'] || 0), 1);
  }

  barHeight(value: number): number {
    return (value / this.maxDailyLive()) * 80 + 2;
  }
}
