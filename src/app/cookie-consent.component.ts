import { TooltipDirective } from './tooltip.directive';
import { Component, signal, afterNextRender } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [TooltipDirective, RouterLink],
  template: `
    @if (visible()) {
      <!-- pointer-events-none on the shell so the banner never blocks the form
           beneath it; the card itself re-enables them. Measured: it covered two
           inputs on the setup wizard at a laptop viewport. -->
      <!-- Compact one-row bar (≈60px tall on a 390px phone, was ≈150px) so it
           covers as little as possible until dismissed. UX audit 10 Nov 2026:
           the old card covered setup templates and the demo's Create order. -->
      <div class="fixed bottom-0 left-0 right-0 sm:right-auto z-[9999] p-2 sm:p-4 pointer-events-none" role="region" aria-label="Cookie notice" data-testid="cookie-consent">
        <div class="sm:max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 px-3 py-2 flex items-center gap-2 pointer-events-auto">
          <p class="flex-1 min-w-0 text-[12px] sm:text-[13px] text-gray-700 leading-snug">
            We use essential cookies only, to keep you signed in. No ads or tracking.
            <a routerLink="/privacy" class="text-blue-700 hover:underline font-medium">Privacy</a>
          </p>
          <button type="button" (click)="decline()" class="shrink-0 min-h-[40px] px-3 text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            Decline
          </button>
          <button type="button" (click)="accept()" class="shrink-0 min-h-[40px] px-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm">
            Accept
          </button>
        </div>
      </div>
    }
  `
})
export class CookieConsentComponent {
  visible = signal(false);

  constructor() {
    // Reveal only after the first client render. afterNextRender never runs on
    // the server AND runs after hydration completes, so the banner can't cause
    // a hydration mismatch (the SSR pass renders no banner).
    afterNextRender(() => {
      const consent = localStorage.getItem('cookie-consent');
      if (!consent) {
        this.visible.set(true);
      }
    });
  }

  accept() {
    localStorage.setItem('cookie-consent', 'accepted');
    this.visible.set(false);
  }

  decline() {
    localStorage.setItem('cookie-consent', 'declined');
    this.visible.set(false);
  }
}
