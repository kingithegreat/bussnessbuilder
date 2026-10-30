import { TooltipDirective } from './tooltip.directive';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from './data.service';
import { launchItems, launchProgress } from './launch-checklist';

/** Dashboard card: "Get launch-ready" with progress across five checks. */
@Component({
  selector: 'app-launch-checklist',
  standalone: true,
  imports: [TooltipDirective, RouterLink, MatIconModule],
  template: `
    @if (progress().done < progress().total) {
      <section class="rounded-2xl border border-gray-200 bg-white p-5 md:p-6" aria-labelledby="launch-title">
        <div class="flex items-center justify-between gap-4 mb-3">
          <h2 id="launch-title" class="text-lg font-semibold text-gray-900">Get launch-ready</h2>
          <span class="text-sm font-semibold text-gray-700">{{ progress().done }} of {{ progress().total }} done</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2 mb-4" role="progressbar" aria-label="Launch checklist progress"
             aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="progress().percent">
          <div class="bg-green-600 h-2 rounded-full transition-all" [style.width.%]="progress().percent"></div>
        </div>
        <ul class="divide-y divide-gray-100">
          @for (item of items(); track item.id) {
            <li class="py-3 flex items-start gap-3">
              <mat-icon class="shrink-0" [class.text-green-600]="item.done" [class.text-gray-500]="!item.done" aria-hidden="true">{{ item.done ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold" [class.text-gray-500]="item.done" [class.line-through]="item.done" [class.text-gray-900]="!item.done">
                  {{ item.title }}<span class="sr-only">{{ item.done ? ' (done)' : ' (to do)' }}</span>
                </p>
                @if (!item.done) {
                  <p class="text-xs text-gray-600 mt-0.5">{{ item.hint }}</p>
                }
              </div>
              @if (!item.done) {
                <a bfTip="Takes you to the place to finish this launch step." [routerLink]="item.route" class="shrink-0 text-sm font-bold text-blue-700 hover:underline">Do this<span class="sr-only">: {{ item.title }}</span></a>
              }
            </li>
          }
        </ul>
      </section>
    }
  `,
})
export class LaunchChecklistComponent {
  private data = inject(DataService);

  /** Read a DataService signal defensively (partial test doubles omit some). */
  private read<T>(key: string, fallback: T): T {
    const fn = (this.data as unknown as Record<string, unknown>)[key];
    return typeof fn === 'function' ? ((fn as () => T)() ?? fallback) : fallback;
  }

  readonly items = computed(() => {
    const c = this.read<{ branding?: unknown; sections?: unknown[] } | null>('customization', null);
    const branding = (c?.branding || {}) as { logoUrl?: string; backgroundImageUrl?: string };
    return launchItems({
      openingHours: this.read<{ openingHours?: string }>('profile', {}).openingHours,
      logoUrl: branding.logoUrl,
      photoUrls: [
        branding.backgroundImageUrl,
        ...((c?.sections || []) as { imageUrl?: string }[]).map(s => s.imageUrl),
        ...this.read<{ imageUrl?: string }[]>('services', []).map(s => s.imageUrl),
      ],
      // Short address counts; a connected custom domain is a Business-plan extra.
      customDomainActive: false,
      hasShortAddress: !!this.read<string>('siteSlug', ''),
      enquiryCount: this.read<unknown[]>('enquiries', []).length,
    });
  });
  readonly progress = computed(() => launchProgress(this.items()));
}
