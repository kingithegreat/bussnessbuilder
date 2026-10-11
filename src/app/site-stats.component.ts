import { Component, computed, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { OwnerApiService } from './owner-api.service';
import { StatsSummary } from './stats-rules';

/** Dashboard card: visits, visitors, enquiries, bookings + a 30-day chart. */
@Component({
  selector: 'app-site-stats',
  standalone: true,
  template: `
    <section class="bg-white border border-gray-200 rounded-2xl p-5" aria-labelledby="stats-title">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 id="stats-title" class="text-lg font-semibold text-gray-900">Your site, last {{ days() }} days</h2>
        <div class="flex gap-1" role="group" aria-label="Time range">
          @for (d of [7, 30, 90]; track d) {
            <button type="button" (click)="load(d)" [attr.aria-pressed]="days() === d" class="px-2.5 py-1 rounded-lg text-xs font-bold"
              [class.bg-gray-900]="days() === d" [class.text-white]="days() === d" [class.bg-gray-100]="days() !== d" [class.text-gray-900]="days() !== d">{{ d }}d</button>
          }
        </div>
      </div>
      @if (stats(); as s) {
        <dl class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div class="bg-gray-50 rounded-xl p-3"><dt class="text-xs text-gray-600">Page views</dt><dd class="text-2xl font-bold text-gray-900">{{ s.totals.views }}</dd></div>
          <div class="bg-gray-50 rounded-xl p-3"><dt class="text-xs text-gray-600">Visitors</dt><dd class="text-2xl font-bold text-gray-900">{{ s.totals.uniques }}</dd></div>
          <div class="bg-gray-50 rounded-xl p-3"><dt class="text-xs text-gray-600">Enquiries</dt><dd class="text-2xl font-bold text-gray-900">{{ s.totals.enquiries }}</dd></div>
          <div class="bg-gray-50 rounded-xl p-3"><dt class="text-xs text-gray-600">Bookings</dt><dd class="text-2xl font-bold text-gray-900">{{ s.totals.bookings }}</dd></div>
        </dl>
        <svg [attr.viewBox]="'0 0 ' + width + ' 100'" class="w-full h-28" role="img" [attr.aria-label]="chartLabel()">
          @for (b of bars(); track b.day) {
            <rect [attr.x]="b.x" [attr.y]="100 - b.hViews" [attr.width]="b.w" [attr.height]="b.hViews" fill="#bfdbfe" rx="1"><title>{{ b.day }}: {{ b.views }} views, {{ b.uniques }} visitors</title></rect>
            <rect [attr.x]="b.x" [attr.y]="100 - b.hUniques" [attr.width]="b.w" [attr.height]="b.hUniques" fill="#2563eb" rx="1"></rect>
            @if (b.leads) { <circle [attr.cx]="b.x + b.w / 2" cy="6" r="2.5" fill="#16a34a"><title>{{ b.day }}: {{ b.leads }} enquiries/bookings</title></circle> }
          }
        </svg>
        <p class="text-xs text-gray-600 mt-1"><span class="inline-block w-2 h-2 bg-blue-200 rounded-sm"></span> views · <span class="inline-block w-2 h-2 bg-blue-600 rounded-sm"></span> visitors · <span class="inline-block w-2 h-2 bg-green-600 rounded-full"></span> enquiry or booking</p>
        @if (s.topPages.length) {
          <h3 class="text-sm font-bold text-gray-900 mt-4 mb-1">Top pages</h3>
          <ol class="text-sm text-gray-700 space-y-0.5">
            @for (p of s.topPages; track p.path) { <li class="flex justify-between gap-2"><span class="font-mono truncate">{{ p.path }}</span><span>{{ p.views }}</span></li> }
          </ol>
        } @else if (!s.totals.views) {
          <p class="text-sm text-gray-600 mt-3">No visits counted yet. Share your site link and visits will show here.</p>
        }
        <p class="text-[11px] text-gray-600 mt-3">Counted on our own servers: no cookies, no third-party trackers. Visitors who decline cookies aren't counted.</p>
      } @else if (error()) {
        <p class="text-sm text-gray-600">{{ error() }}</p>
      } @else {
        <p class="text-sm text-gray-600">Loading…</p>
      }
    </section>
  `,
})
export class SiteStatsComponent implements OnInit {
  private api = inject(OwnerApiService);
  private platformId = inject(PLATFORM_ID);
  readonly width = 300;
  days = signal(30);
  stats = signal<StatsSummary | null>(null);
  error = signal('');
  bars = computed(() => {
    const s = this.stats(); if (!s) return [];
    const max = Math.max(1, ...s.series.map(x => x.views));
    const slot = this.width / s.series.length;
    return s.series.map((x, i) => ({
      day: x.day, views: x.views, uniques: x.uniques, leads: x.enquiries + x.bookings,
      x: i * slot + slot * 0.15, w: slot * 0.7,
      hViews: (x.views / max) * 88, hUniques: (x.uniques / max) * 88,
    }));
  });
  chartLabel = computed(() => {
    const s = this.stats();
    return s ? `Daily page views over ${s.series.length} days, total ${s.totals.views} views from ${s.totals.uniques} visitors.` : '';
  });

  ngOnInit() {
    if (isPlatformBrowser(this.platformId) && this.api.uid()) void this.load(30);
  }

  async load(days: number) {
    this.days.set(days);
    try { this.stats.set(await this.api.get<StatsSummary>('/api/stats', { days: String(days) })); this.error.set(''); }
    catch { this.error.set("Stats aren't available right now."); }
  }
}
