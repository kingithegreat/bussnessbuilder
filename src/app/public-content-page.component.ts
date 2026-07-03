import { Component, inject, signal, OnInit, PLATFORM_ID, REQUEST_CONTEXT, TransferState } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
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
    this.uid = this.route.snapshot.paramMap.get('uid') || '';
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!this.uid || !slug) {
      this.loading.set(false);
      return;
    }
    if (!isPlatformBrowser(this.platformId)) {
      // Server: render the real page body when server.ts supplied it via
      // request context, and stash it in TransferState so the browser's first
      // load reuses it instead of re-fetching. Without matching context, keep
      // the loading shell — the browser then fetches as before.
      const ctx = readPublicPageContext(this.requestContext);
      if (ctx && ctx.uid === this.uid && ctx.page.slug === slug) {
        this.transferState.set(PUBLIC_PAGE_STATE_KEY, ctx);
        this.page.set(ctx.page);
        this.loading.set(false);
      }
      return;
    }

    // Browser: reuse the server-serialized page once (skips the round-trip on
    // the SSR'd first paint), otherwise fetch it as before.
    const transferred = this.transferState.get(PUBLIC_PAGE_STATE_KEY, null);
    if (transferred && transferred.uid === this.uid && transferred.page.slug === slug) {
      this.transferState.remove(PUBLIC_PAGE_STATE_KEY);
      this.page.set(transferred.page);
      this.loading.set(false);
      return;
    }
    this.http.get<{ title: string; content: string; slug: string }>(`/api/site/${this.uid}/pages/${slug}`).subscribe({
      next: (data) => {
        this.page.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}
