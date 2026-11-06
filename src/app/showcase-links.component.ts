import { TooltipDirective } from './tooltip.directive';
import { Component, OnInit, PLATFORM_ID, inject, input, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export interface ShowcaseLink { id: string; label: string; name: string; path: string }

/** "See it working for: Mobile Mechanic / Lawn Mowing" — links to the seeded demo showcase sites. */
@Component({
  selector: 'app-showcase-links',
  standalone: true,
  imports: [TooltipDirective, MatIconModule],
  template: `
    @if (showcases().length) {
      <section class="rounded-2xl border border-gray-200 bg-white p-4 text-sm" aria-label="Example sites" data-testid="showcase-links">
        <p class="font-semibold text-gray-900 flex items-center gap-2"><mat-icon class="text-[18px]">visibility</mat-icon> See it working for:</p>
        <div class="mt-2 flex flex-wrap gap-2">
          @for (s of showcases(); track s.id) {
            <a bfTip="Opens this example website in a new tab." [href]="s.path" target="_blank" rel="noopener" class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 font-medium text-gray-800 hover:bg-gray-200">
              {{ s.label }} <span class="text-gray-500">· {{ s.name }}</span>
            </a>
          }
        </div>
        @if (hint()) { <p class="mt-2 text-xs text-gray-500">{{ hint() }}</p> }
      </section>
    }
  `,
})
export class ShowcaseLinksComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  hint = input<string>('Example businesses with real prices, bookings and quote forms. Try booking a time or requesting a quote.');
  showcases = signal<ShowcaseLink[]>([]);

  async ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const res = await fetch('/api/showcases');
      if (!res.ok) return;
      const body = await res.json();
      if (Array.isArray(body?.showcases)) this.showcases.set(body.showcases);
    } catch {
      // Demo links are optional; never break the page over them.
    }
  }
}
