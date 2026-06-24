import { Component, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (visible()) {
      <div class="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6">
        <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div class="flex-grow text-sm text-gray-600 leading-relaxed">
            We use essential cookies to keep you signed in and store your preferences. We don't use advertising or tracking cookies.
            <a routerLink="/privacy" class="text-blue-600 hover:underline font-medium ml-1">Privacy Policy</a>
          </div>
          <div class="flex items-center gap-3 shrink-0 w-full sm:w-auto">
            <button (click)="decline()" class="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Decline
            </button>
            <button (click)="accept()" class="flex-1 sm:flex-none px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm">
              Accept
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class CookieConsentComponent {
  private platformId = inject(PLATFORM_ID);
  visible = signal(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const consent = localStorage.getItem('cookie-consent');
      if (!consent) {
        this.visible.set(true);
      }
    }
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
