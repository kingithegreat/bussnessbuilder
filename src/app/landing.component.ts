import { TooltipDirective } from './tooltip.directive';
import { Component, inject, afterNextRender, signal } from '@angular/core';
import { CORE_FEATURES, MORE_FEATURES } from './landing-features';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from './auth.service';
import { FunnelService } from './funnel.service';

import { ShowcaseLinksComponent } from './showcase-links.component';
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [TooltipDirective, RouterLink, MatIconModule, ShowcaseLinksComponent],
  template: `
    <div class="min-h-screen bg-[#F5F5F7] text-gray-900 flex flex-col font-sans">
      <header class="sticky top-0 z-50 bg-[#F5F5F7]/80 backdrop-blur-xl border-b border-gray-200/40">
       <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4 flex justify-between items-center w-full">
        <div class="flex items-center gap-2">
          <div class="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <mat-icon class="text-[20px]">business</mat-icon>
          </div>
          <span class="text-[15px] md:text-base font-semibold tracking-tight">BusinessFlow Studio</span>
        </div>
        <div class="flex items-center gap-2 md:gap-3">
          @if (auth.isLoggedIn()) {
            <a routerLink="/admin/dashboard" class="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-5 py-2 rounded-full text-sm font-medium transition-colors shadow-sm hover:shadow">
              Dashboard
            </a>
          } @else {
            <a routerLink="/login" class="text-gray-600 hover:text-gray-900 px-3 md:px-4 py-2 text-sm font-medium transition-colors">
              Sign In
            </a>
            <a routerLink="/setup" (click)="onCtaClick()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-5 py-2 rounded-full text-sm font-medium transition-colors shadow-sm hover:shadow">
              Get Started
            </a>
          }
        </div>
       </div>
      </header>

      <main class="flex-grow">
        <!-- Hero -->
        <section class="flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div class="bg-white/80 backdrop-blur-xl rounded-2xl md:rounded-[2rem] p-8 md:p-16 shadow-sm border border-gray-200/60 max-w-4xl mx-auto flex flex-col items-center">
            <div class="inline-flex items-center justify-center h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-blue-50 text-blue-600 mb-6 md:mb-8">
              <mat-icon class="text-3xl h-8 w-8">bolt</mat-icon>
            </div>
            <h1 class="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6 md:mb-8 text-gray-900 leading-tight">
              Your business, <br/>
              <span class="text-blue-600">ready in minutes.</span>
            </h1>
            <p class="text-base md:text-xl text-gray-500 max-w-2xl mb-8 md:mb-12">
              The ultimate all-in-one platform for small businesses. Answer a few questions and instantly get a beautifully designed public page, an enquiry inbox, and AI-powered management tools.
            </p>
            <!--
              Straight into the wizard, not into a sign-up form. The account is
              only needed to publish, so the product does the selling first.
            -->
            <div class="flex flex-col items-center gap-3 w-full sm:w-auto">
              <a [routerLink]="auth.isLoggedIn() ? '/admin/dashboard' : '/setup'" (click)="onCtaClick()" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full text-base md:text-lg font-medium transition-colors shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto">
                {{ auth.isLoggedIn() ? 'Go to Dashboard' : 'Start Building — Free' }}
                <mat-icon>arrow_forward</mat-icon>
              </a>
              @if (!auth.isLoggedIn()) {
                <p class="text-sm text-gray-600 flex items-center gap-1.5">
                  <mat-icon class="text-[16px] text-green-600">check_circle</mat-icon>
                  No sign-up needed to start · no credit card
                </p>
              }
            </div>
          </div>
        </section>

        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-4">
          <app-showcase-links></app-showcase-links>
        </div>

        <!-- Features Grid -->
        <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div class="text-center mb-10 md:mb-16">
            <h2 class="text-2xl md:text-4xl font-bold tracking-tight text-gray-900 mb-4">Everything you need to grow</h2>
            <p class="text-gray-500 max-w-2xl mx-auto text-sm md:text-base">Built for small businesses — no design skills or coding required. Get online fast with tools that actually help you run your business.</p>
          </div>
          <!-- UX audit F11: six core features first (enquiries, bookings and quotes lead), the rest behind "See all features". -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" data-testid="core-features">
            @for (f of coreFeatures; track f.title) {
              <div class="bg-white rounded-2xl p-6 md:p-8 border border-gray-100/80 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-4" [class]="f.tone">
                  <mat-icon aria-hidden="true">{{ f.icon }}</mat-icon>
                </div>
                <h3 class="text-lg font-bold text-gray-900 mb-2">{{ f.title }}</h3>
                <p class="text-gray-500 text-sm leading-relaxed">{{ f.body }}</p>
              </div>
            }
          </div>
          @if (showAllFeatures()) {
            <div id="more-features" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-4 md:mt-6" data-testid="more-features">
              @for (f of moreFeatures; track f.title) {
                <div class="bg-white rounded-2xl p-6 md:p-8 border border-gray-100/80 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-4" [class]="f.tone">
                    <mat-icon aria-hidden="true">{{ f.icon }}</mat-icon>
                  </div>
                  <h3 class="text-lg font-bold text-gray-900 mb-2">{{ f.title }}</h3>
                  <p class="text-gray-500 text-sm leading-relaxed">{{ f.body }}</p>
                </div>
              }
            </div>
          }
          <div class="mt-6 md:mt-8 text-center">
            <button type="button" (click)="showAllFeatures.set(!showAllFeatures())" [attr.aria-expanded]="showAllFeatures()" aria-controls="more-features"
              data-testid="see-all-features"
              class="min-h-[44px] inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-bold text-gray-900 hover:bg-gray-50 transition-colors">
              {{ showAllFeatures() ? 'Show fewer features' : 'See all features' }}
              <mat-icon class="text-[18px]" aria-hidden="true">{{ showAllFeatures() ? 'expand_less' : 'expand_more' }}</mat-icon>
            </button>
          </div>
        </section>

        <!-- How It Works -->
        <section class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div class="text-center mb-10 md:mb-16">
            <h2 class="text-2xl md:text-4xl font-bold tracking-tight text-gray-900 mb-4">Live in 3 steps</h2>
            <p class="text-gray-500 text-sm md:text-base">No tech skills needed. We handle the hard parts.</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
            <div class="text-center">
              <div class="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-5 text-2xl font-black shadow-lg">1</div>
              <h3 class="text-lg font-bold text-gray-900 mb-2">Tell us about your business</h3>
              <p class="text-gray-500 text-sm">Answer a quick setup wizard — your business type, services, and contact info.</p>
            </div>
            <div class="text-center">
              <div class="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-5 text-2xl font-black shadow-lg">2</div>
              <h3 class="text-lg font-bold text-gray-900 mb-2">Customise your site</h3>
              <p class="text-gray-500 text-sm">Use the page builder and customisation tools to make it yours. Edit text directly in the preview.</p>
            </div>
            <div class="text-center">
              <div class="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-5 text-2xl font-black shadow-lg">3</div>
              <h3 class="text-lg font-bold text-gray-900 mb-2">Go live & get leads</h3>
              <p class="text-gray-500 text-sm">Share your public page link. Enquiries flow into your inbox automatically.</p>
            </div>
          </div>
        </section>

        <!-- Stats -->
        <section class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div class="bg-gray-900 rounded-2xl md:rounded-3xl p-8 md:p-14 text-white text-center">
            <h2 class="text-2xl md:text-3xl font-bold mb-8 md:mb-12">Built for every type of business</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              <div>
                <p class="text-3xl md:text-4xl font-black text-blue-400 mb-1">11+</p>
                <p class="text-gray-400 text-xs md:text-sm font-medium">Business Types</p>
              </div>
              <div>
                <p class="text-3xl md:text-4xl font-black text-blue-400 mb-1">6</p>
                <p class="text-gray-400 text-xs md:text-sm font-medium">Page Sections</p>
              </div>
              <div>
                <p class="text-3xl md:text-4xl font-black text-blue-400 mb-1">20+</p>
                <p class="text-gray-400 text-xs md:text-sm font-medium">Layout Variants</p>
              </div>
              <div>
                <p class="text-3xl md:text-4xl font-black text-blue-400 mb-1">100%</p>
                <p class="text-gray-400 text-xs md:text-sm font-medium">Customisable</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Bottom CTA -->
        <section class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 text-center">
          <h2 class="text-2xl md:text-4xl font-bold tracking-tight text-gray-900 mb-4">Ready to build your site?</h2>
          <p class="text-gray-500 mb-8 text-sm md:text-base max-w-xl mx-auto">Build it first — you only need an account when you're ready to publish. No credit card required. Paid plans from NZ$29/month (NZD, excl. GST) with a 0% booking fee. <a routerLink="/pricing" class="text-blue-600 font-medium hover:underline">See pricing</a></p>
          <a [routerLink]="auth.isLoggedIn() ? '/admin/dashboard' : '/setup'" (click)="onCtaClick()" class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full text-base md:text-lg font-medium transition-colors shadow-sm">
            {{ auth.isLoggedIn() ? 'Go to Dashboard' : 'Get Started Free' }}
            <mat-icon>arrow_forward</mat-icon>
          </a>
        </section>
      </main>

      <footer class="py-8 md:py-12 text-center text-gray-600 text-sm border-t border-gray-200">
        <div class="flex items-center justify-center gap-4 mb-3">
          <a routerLink="/privacy" class="underline underline-offset-2 hover:text-gray-900 transition-colors">Privacy Policy</a>
          <span class="text-gray-300">|</span>
          <a routerLink="/terms" class="underline underline-offset-2 hover:text-gray-900 transition-colors">Terms of Service</a>
        </div>
        <p>&copy; 2026 BusinessFlow Studio.</p>
      </footer>
    </div>
  `
})
export class LandingComponent {
  auth = inject(AuthService);
  private funnel = inject(FunnelService);
  readonly coreFeatures = CORE_FEATURES;
  readonly moreFeatures = MORE_FEATURES;
  /** F11: the extra feature cards stay tucked away until asked for. */
  showAllFeatures = signal(false);

  constructor() {
    afterNextRender(() => this.funnel.step('landing_viewed'));
  }

  /** A CTA click is the first act of intent — the top of the measurable funnel. */
  onCtaClick() {
    this.funnel.step('cta_clicked');
    // The router navigates immediately after this handler, so the debounce
    // would lose the event.
    this.funnel.flushNow();
  }
}
