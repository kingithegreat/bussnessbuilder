import { Component, inject, signal, OnInit, PLATFORM_ID, REQUEST_CONTEXT, TransferState } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { PUBLIC_PAGE_STATE_KEY, readPublicPageContext } from './public-site-context';

@Component({
  selector: 'app-public-content-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-[#F5F5F7] font-sans text-gray-900">
      @if (loading()) {
        <div class="flex items-center justify-center py-32">
          <div class="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      } @else if (page()) {
        <header class="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex items-center gap-3">
          <a [routerLink]="'/site/' + uid" class="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium">
            <span>&larr; Back to site</span>
          </a>
        </header>
        <main class="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-12">
            <h1 class="text-3xl md:text-4xl font-bold tracking-tight mb-8">{{ page()!.title }}</h1>
            <div class="prose prose-gray max-w-none text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{{ page()!.content }}</div>
          </div>
        </main>
      } @else {
        <div class="text-center py-20">
          <p class="text-gray-500 text-lg">Page not found.</p>
          <a [routerLink]="'/site/' + uid" class="text-blue-600 font-bold text-sm hover:underline mt-4 inline-block">Go back to site</a>
        </div>
      }
    </div>
  `
})
export class PublicContentPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private requestContext = inject(REQUEST_CONTEXT, { optional: true });
  private transferState = inject(TransferState);

  uid = '';
  loading = signal(true);
  page = signal<{ title: string; content: string; slug: string } | null>(null);

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      // Server: render the real page body when server.ts supplied it via
      // request context, and stash it in TransferState so the browser's first
      // load reuses it instead of re-fetching. Without matching context, keep
      // the loading shell — the browser then fetches as before.
      this.uid = this.route.snapshot.paramMap.get('uid') || '';
      const slug = this.route.snapshot.paramMap.get('slug');
      const ctx = readPublicPageContext(this.requestContext);
      if (ctx && slug && ctx.uid === this.uid && ctx.page.slug === slug) {
        this.transferState.set(PUBLIC_PAGE_STATE_KEY, ctx);
        this.page.set(ctx.page);
        this.loading.set(false);
      }
      return;
    }

    // Browser: react to the route param (not just a one-time snapshot) so
    // navigating between /site/:uid/pages/:slug routes re-loads the correct
    // page instead of getting stuck on a stale view — same fix already
    // shipped for SiteViewComponent (see its ngOnInit for the sibling case).
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const uid = params.get('uid') || '';
          const slug = params.get('slug');
          this.uid = uid;
          this.loading.set(true);
          this.page.set(null);
          if (!uid || !slug) {
            this.loading.set(false);
            return of(null);
          }
          // First load: the server may have already rendered this page and
          // serialized its payload into ng-state — reuse it (once) instead of
          // re-fetching. Later paramMap emissions (navigations) fetch fresh.
          const transferred = this.transferState.get(PUBLIC_PAGE_STATE_KEY, null);
          if (transferred && transferred.uid === uid && transferred.page.slug === slug) {
            this.transferState.remove(PUBLIC_PAGE_STATE_KEY);
            return of(transferred.page);
          }
          return this.http.get<{ title: string; content: string; slug: string }>(`/api/site/${uid}/pages/${slug}`).pipe(
            catchError(() => of(null))
          );
        })
      )
      .subscribe((page) => {
        this.page.set(page);
        this.loading.set(false);
      });
  }
}
