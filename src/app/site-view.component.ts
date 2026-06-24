import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from './data.service';
import { PublicPageComponent } from './public-page.component';

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

  loading = signal(true);
  error = signal(false);

  ngOnInit() {
    const uid = this.route.snapshot.paramMap.get('uid');
    if (!uid) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }

    if (isPlatformBrowser(this.platformId)) {
      this.http.get<any>(`/api/site/${uid}`).subscribe({
        next: (data) => {
          this.dataService.loadPublicSite(uid, data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        }
      });
    }
  }
}
