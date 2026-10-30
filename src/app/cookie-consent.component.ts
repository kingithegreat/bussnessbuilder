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
      <div class="fixed bottom-0 left-0 right-0 sm:right-auto z-[9999] p-3 sm:p-4 pointer-events-none" role="region" aria-label="Cookie notice">
        <div class="sm:max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 flex flex-col gap-3 pointer-events-auto">
          <div class="text-[13px] text-gray-700 leading-snug">
            We only use essential cookies to keep you signed in. No ads or tracking.
            <a routerLink="/privacy" class="text-blue-600 hover:underline font-medium ml-1">Privacy Policy</a>
          </div>
          <div class="flex items-center gap-2 w-full">
            <button (click)="decline()" class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Decline
            </button>
            <button (click)="accept()" class="flex-1 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm">
              Accept
            </button>
          </div>
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
