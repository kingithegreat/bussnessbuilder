import { Component, computed, inject, input, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService } from './data.service';
import { AuthService } from './auth.service';
import { GBP_STEPS } from './seo-score';
import { scoreSite, SiteSnapshot } from './seo-inputs';

/** "Get found on Google": Google Business Profile checklist + per-page SEO scores. */
@Component({
  selector: 'app-seo-helper',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (compact()) {
      <section class="bg-white border border-gray-200 rounded-2xl p-5" aria-labelledby="seo-card-title">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 id="seo-card-title" class="text-lg font-semibold text-gray-900">Get found on Google</h2>
            <p class="text-sm text-gray-600">Google Business Profile: {{ doneCount() }}/{{ steps.length }} steps · Home page SEO score: <strong>{{ homeScore() }}/100</strong></p>
          </div>
          <a routerLink="/admin/seo" class="shrink-0 bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-xl">Open</a>
        </div>
      </section>
    } @else {
      <div class="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 class="text-2xl font-semibold text-gray-900">Get found on Google</h1>
          <p class="text-sm text-gray-600 mt-1">Two things matter most for local businesses: a Google Business Profile, and a website Google understands.</p>
        </div>

        <section class="bg-white border border-gray-200 rounded-2xl p-5" aria-labelledby="gbp-title">
          <div class="flex items-center justify-between mb-3">
            <h2 id="gbp-title" class="font-bold text-gray-900">Google Business Profile checklist</h2>
            <span class="text-sm font-bold text-gray-900">{{ doneCount() }}/{{ steps.length }}</span>
          </div>
          <div class="h-2 bg-gray-100 rounded-full mb-4" role="progressbar" [attr.aria-valuenow]="doneCount()" aria-valuemin="0" [attr.aria-valuemax]="steps.length" aria-label="Google Business Profile progress">
            <div class="h-2 bg-green-600 rounded-full" [style.width.%]="(doneCount() / steps.length) * 100"></div>
          </div>
          <ol class="space-y-3">
            @for (s of steps; track s.id; let i = $index) {
              <li class="flex gap-3">
                <input type="checkbox" [id]="'gbp-' + s.id" [checked]="done().includes(s.id)" (change)="toggle(s.id)" class="mt-1 w-5 h-5 shrink-0">
                <div>
                  <label [for]="'gbp-' + s.id" class="font-semibold text-gray-900 text-sm">{{ i + 1 }}. {{ s.title }}</label>
                  <p class="text-sm text-gray-700">{{ s.detail }}</p>
                  <a [href]="s.link" target="_blank" rel="noopener" class="text-sm font-bold text-blue-700 hover:underline">{{ s.linkLabel }} ↗</a>
                </div>
              </li>
            }
          </ol>
          <p class="text-xs text-gray-600 mt-4">Your website address for Google: <span class="font-mono">{{ origin() }}{{ homePath() }}</span></p>
        </section>

        <section class="bg-white border border-gray-200 rounded-2xl p-5" aria-labelledby="seo-title">
          <h2 id="seo-title" class="font-bold text-gray-900 mb-1">Page SEO scores</h2>
          <p class="text-sm text-gray-600 mb-4">Checked against the title, description, headings, photo descriptions, length and local keywords.</p>
          @for (pg of scores(); track pg.input.path) {
            <details class="border border-gray-100 rounded-xl mb-3" [open]="$first">
              <summary class="cursor-pointer p-4 flex items-center justify-between gap-3">
                <span class="font-semibold text-gray-900">{{ pg.input.name }} <span class="font-normal text-gray-600 text-xs font-mono">{{ pg.input.path }}</span></span>
                <span class="text-sm font-bold px-2 py-1 rounded-full"
                  [class.bg-green-100]="pg.result.grade === 'Great'" [class.text-green-900]="pg.result.grade === 'Great'"
                  [class.bg-amber-100]="pg.result.grade === 'Good'" [class.text-amber-900]="pg.result.grade === 'Good'"
                  [class.bg-red-100]="pg.result.grade === 'Needs work'" [class.text-red-900]="pg.result.grade === 'Needs work'">{{ pg.result.score }}/100 · {{ pg.result.grade }}</span>
              </summary>
              <ul class="px-4 pb-4 space-y-2">
                @for (c of pg.result.checks; track c.id) {
                  <li class="text-sm flex gap-2">
                    <span aria-hidden="true" [class.text-green-700]="c.pass" [class.text-red-700]="!c.pass">{{ c.pass ? '✓' : '✗' }}</span>
                    <span><span class="sr-only">{{ c.pass ? 'Passed:' : 'To fix:' }}</span> <strong class="text-gray-900">{{ c.label }}</strong>
                      @if (!c.pass) { <br><span class="text-gray-700">{{ c.fix }}</span> <span class="text-gray-600 text-xs">({{ c.where }})</span> }
                    </span>
                  </li>
                }
              </ul>
            </details>
          }
          <p class="text-sm text-gray-700 mt-2">✓ <strong>LocalBusiness structured data</strong> is added to your site automatically (name, contact, area, hours and approved reviews), so Google can show rich results.
            <a [href]="'https://search.google.com/test/rich-results?url=' + encode(origin() + homePath())" target="_blank" rel="noopener" class="font-bold text-blue-700 hover:underline">Test it with Google ↗</a></p>
          <div class="mt-4 flex flex-wrap gap-2">
            <a routerLink="/admin/customisation" class="text-sm font-bold bg-gray-100 text-gray-900 px-4 py-2 rounded-xl">Edit SEO title &amp; description</a>
            <a routerLink="/admin/content" class="text-sm font-bold bg-gray-100 text-gray-900 px-4 py-2 rounded-xl">Edit services &amp; text</a>
            <a routerLink="/admin/settings" class="text-sm font-bold bg-gray-100 text-gray-900 px-4 py-2 rounded-xl">Set service area</a>
          </div>
        </section>
      </div>
    }
  `,
})
export class SeoHelperComponent implements OnInit {
  compact = input(false);
  private data = inject(DataService);
  private auth = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  readonly steps = GBP_STEPS;
  done = signal<string[]>([]);
  doneCount = computed(() => this.done().filter(id => this.steps.some(s => s.id === id)).length);
  origin = signal('');
  encode = encodeURIComponent;

  private read<T>(key: string, fallback: T): T {
    const fn = (this.data as unknown as Record<string, unknown>)[key];
    return typeof fn === 'function' ? ((fn as () => T).call(this.data) ?? fallback) : fallback;
  }
  homePath = computed(() => {
    const slug = this.read<string>('siteSlug', '');
    const uid = this.auth.currentUser?.()?.uid || '';
    return slug ? `/s/${slug}` : `/site/${uid}`;
  });
  scores = computed(() => scoreSite({
    profile: this.read('profile', {}),
    customization: this.read('customization', null),
    services: this.read('services', []),
    faqs: this.read('faqs', []),
    pages: this.read('getPages', []),
    homePath: this.homePath(),
  } as SiteSnapshot));
  homeScore = computed(() => this.scores()[0]?.result.score ?? 0);

  private key() { return `bf-gbp-${this.auth.currentUser?.()?.uid || 'anon'}`; }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.origin.set(window.location.origin);
    try { this.done.set(JSON.parse(localStorage.getItem(this.key()) || '[]')); } catch { this.done.set([]); }
  }

  toggle(id: string) {
    const next = this.done().includes(id) ? this.done().filter(x => x !== id) : [...this.done(), id];
    this.done.set(next);
    try { localStorage.setItem(this.key(), JSON.stringify(next)); } catch { /* private mode */ }
  }
}
