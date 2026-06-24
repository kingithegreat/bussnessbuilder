import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DataService } from './data.service';
import { ContentPage } from './types';

@Component({
  selector: 'app-content-page-view',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-[#F5F5F7] font-sans text-gray-900">
      <header class="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex items-center gap-3">
        <a routerLink="/public" class="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium">
          <span>&larr; Back to site</span>
        </a>
      </header>

      <main class="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        @if (page()) {
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-12">
            <h1 class="text-3xl md:text-4xl font-bold tracking-tight mb-8">{{ page()!.title }}</h1>
            <div class="prose prose-gray max-w-none text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{{ page()!.content }}</div>
          </div>
        } @else {
          <div class="text-center py-20">
            <p class="text-gray-500 text-lg">Page not found.</p>
            <a routerLink="/public" class="text-blue-600 font-bold text-sm hover:underline mt-4 inline-block">Go back to site</a>
          </div>
        }
      </main>
    </div>
  `
})
export class ContentPageViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private dataService = inject(DataService);
  page = signal<ContentPage | null>(null);

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      const pages = this.dataService.getPages();
      const found = pages.find(p => p.slug === slug && p.published);
      this.page.set(found || null);
    }
  }
}
