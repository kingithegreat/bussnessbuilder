import { Component, inject, signal, OnInit, PLATFORM_ID, REQUEST_CONTEXT, TransferState } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from './data.service';
import { PublicPageComponent } from './public-page.component';
import { PublicSiteData } from './types';
import { PUBLIC_SITE_STATE_KEY, readPublicSiteContext } from './public-site-context';

@Component({
  selector: 'app-site-view',
  standalone: true,
  imports: [PublicPageComponent, MatIconModule, RouterLink],
  template: `
    @if (loading()) {
      <div class="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p class="text-gray-500 text-sm font-medium">Loading site...</p>
        </div>
      </div>
    } @else if (error()) {
      <div class="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-4">
        <div class="text-center max-w-md">
          <mat-icon class="text-gray-300 text-[64px] mb-4">language</mat-icon>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Site not found</h1>
          <p class="text-gray-500 text-sm mb-6">This business site doesn't exist or hasn't been published yet.</p>
          <a routerLink="/" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors inline-block">Go to BusinessFlow</a>
        </div>
      </div>
    } @else {
      <app-public-page></app-public-page>
    }
  `
})
export class SiteViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private dataService = inject(DataService);
  private platformId = inject(PLATFORM_ID);
  private requestContext = inject(REQUEST_CONTEXT, { optional: true });
  private transferState = inject(TransferState);

  loading = signal(true);
  error = signal(false);

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      // Server: render the real site body when server.ts supplied the site via
      // request context, and stash it in TransferState so the browser's first
      // load reuses it instead of re-fetching. Without context (data load
      // failed, or a path server.ts doesn't cover) keep the loading shell —
      // the browser then fetches as before.
      const ctx = readPublicSiteContext(this.requestContext);
      if (ctx) {
        this.transferState.set(PUBLIC_SITE_STATE_KEY, ctx);
        this.dataService.loadPublicSite(ctx.uid, ctx.data);
        this.loading.set(false);
      }
      return;
    }

    // React to the route param (not just a one-time snapshot) so navigating
    // between /site/:uid routes re-loads the correct site instead of getting
    // stuck on a stale view.
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const uid = params.get('uid');
          this.loading.set(true);
          this.error.set(false);
          if (!uid) {
            this.error.set(true);
            this.loading.set(false);
            return of(null);
          }
          // First load: the server may have already rendered this site and
          // serialized its payload into ng-state — reuse it (once) instead of
          // re-fetching. Later paramMap emissions (navigations) fetch fresh.
          const transferred = this.transferState.get(PUBLIC_SITE_STATE_KEY, null);
          if (transferred) {
            this.transferState.remove(PUBLIC_SITE_STATE_KEY);
            return of({ uid: transferred.uid, data: transferred.data as PublicSiteData | null, failed: false });
          }
          return this.http.get<PublicSiteData>(`/api/site/${uid}`).pipe(
            switchMap((data) => of({ uid, data, failed: false })),
            // Catch here (not on the outer stream) so a failed load doesn't kill
            // the subscription — later navigations can still load a site.
            catchError(() => of({ uid, data: null as PublicSiteData | null, failed: true }))
          );
        })
      )
      .subscribe((result) => {
        if (!result) return;
        if (result.failed || !result.data) {
          this.error.set(true);
          this.loading.set(false);
          return;
        }
        this.dataService.loadPublicSite(result.uid, result.data);
        this.loading.set(false);
      });
  }
}
