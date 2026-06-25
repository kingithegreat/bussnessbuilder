import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from './auth.service';
import { SubscriptionService } from './subscription.service';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <div class="min-h-screen bg-[#F5F5F7] font-sans text-gray-900">
      <header class="max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-6 flex justify-between items-center w-full">
        <a routerLink="/" class="flex items-center gap-2">
          <div class="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <mat-icon>business</mat-icon>
          </div>
          <span class="text-lg md:text-xl font-bold tracking-tight">BusinessFlow Studio</span>
        </a>
        <div class="flex items-center gap-3">
          @if (auth.isLoggedIn()) {
            <a routerLink="/admin/dashboard" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full text-sm font-medium transition-colors shadow-sm">Dashboard</a>
          } @else {
            <a routerLink="/login" class="text-gray-600 hover:text-gray-900 px-4 py-2 text-sm font-medium">Sign In</a>
            <a routerLink="/signup" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full text-sm font-medium shadow-sm">Get Started</a>
          }
        </div>
      </header>

      <main class="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-20">
        <div class="text-center mb-12 md:mb-16">
          <h1 class="text-3xl md:text-5xl font-bold tracking-tight mb-4">Simple, transparent pricing</h1>
          <p class="text-gray-500 max-w-2xl mx-auto text-sm md:text-base">Everything you need to build a professional website — at a fraction of the cost of other platforms.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <!-- Free -->
          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 flex flex-col">
            <div class="mb-6">
              <h3 class="text-lg font-bold text-gray-900 mb-1">Free</h3>
              <p class="text-gray-500 text-sm">Launch your site for free</p>
            </div>
            <div class="mb-6">
              <span class="text-4xl font-black text-gray-900">$0</span>
              <span class="text-gray-500 text-sm">/month</span>
            </div>
            <ul class="space-y-3 mb-8 flex-grow text-sm text-gray-600">
              <li class="flex items-start gap-2"><mat-icon class="text-green-500 text-[18px] shrink-0 mt-0.5">check_circle</mat-icon> Full site customisation</li>
              <li class="flex items-start gap-2"><mat-icon class="text-green-500 text-[18px] shrink-0 mt-0.5">check_circle</mat-icon> Page builder + all layouts</li>
              <li class="flex items-start gap-2"><mat-icon class="text-green-500 text-[18px] shrink-0 mt-0.5">check_circle</mat-icon> Custom contact forms</li>
              <li class="flex items-start gap-2"><mat-icon class="text-green-500 text-[18px] shrink-0 mt-0.5">check_circle</mat-icon> Payment links (Stripe)</li>
              <li class="flex items-start gap-2"><mat-icon class="text-green-500 text-[18px] shrink-0 mt-0.5">check_circle</mat-icon> Up to 3 services</li>
              <li class="flex items-start gap-2"><mat-icon class="text-green-500 text-[18px] shrink-0 mt-0.5">check_circle</mat-icon> Up to 10 enquiries</li>
              <li class="flex items-start gap-2"><mat-icon class="text-gray-300 text-[18px] shrink-0 mt-0.5">cancel</mat-icon> <span class="text-gray-400">AI content tools (templates only)</span></li>
            </ul>
            @if (subService.tier() === 'free') {
              <div class="bg-gray-100 text-gray-500 text-center py-3 rounded-xl text-sm font-bold">Current Plan</div>
            } @else {
              <div class="bg-gray-100 text-gray-500 text-center py-3 rounded-xl text-sm font-bold">Included</div>
            }
          </div>

          <!-- Pro -->
          <div class="bg-white rounded-2xl border-2 border-blue-600 shadow-lg p-6 md:p-8 flex flex-col relative">
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold">Most Popular</div>
            <div class="mb-6">
              <h3 class="text-lg font-bold text-gray-900 mb-1">Pro</h3>
              <p class="text-gray-500 text-sm">For growing businesses</p>
            </div>
            <div class="mb-6">
              <span class="text-4xl font-black text-gray-900">$14</span>
              <span class="text-gray-500 text-sm">/month</span>
            </div>
            <ul class="space-y-3 mb-8 flex-grow text-sm text-gray-600">
              <li class="flex items-start gap-2"><mat-icon class="text-green-500 text-[18px] shrink-0 mt-0.5">check_circle</mat-icon> Everything in Free</li>
              <li class="flex items-start gap-2"><mat-icon class="text-blue-500 text-[18px] shrink-0 mt-0.5">auto_awesome</mat-icon> <strong>AI content generation</strong></li>
              <li class="flex items-start gap-2"><mat-icon class="text-green-500 text-[18px] shrink-0 mt-0.5">check_circle</mat-icon> Unlimited services</li>
              <li class="flex items-start gap-2"><mat-icon class="text-green-500 text-[18px] shrink-0 mt-0.5">check_circle</mat-icon> Unlimited enquiries</li>
              <li class="flex items-start gap-2"><mat-icon class="text-green-500 text-[18px] shrink-0 mt-0.5">check_circle</mat-icon> Data export &amp; import</li>
              <li class="flex items-start gap-2"><mat-icon class="text-green-500 text-[18px] shrink-0 mt-0.5">check_circle</mat-icon> Email notifications</li>
              <li class="flex items-start gap-2"><mat-icon class="text-green-500 text-[18px] shrink-0 mt-0.5">check_circle</mat-icon> 3 site templates</li>
            </ul>
            @if (subService.tier() === 'pro') {
              <div class="bg-blue-50 text-blue-600 text-center py-3 rounded-xl text-sm font-bold">Current Plan</div>
            } @else {
              <button (click)="subscribe('pro')" class="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold shadow-md transition-colors w-full">
                {{ auth.isLoggedIn() ? 'Upgrade to Pro' : 'Get Started' }}
              </button>
            }
          </div>

          <!-- Business -->
          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 flex flex-col">
            <div class="mb-6">
              <h3 class="text-lg font-bold text-gray-900 mb-1">Business</h3>
              <p class="text-gray-500 text-sm">For serious professionals</p>
            </div>
            <div class="mb-6">
              <span class="text-4xl font-black text-gray-900">$22</span>
              <span class="text-gray-500 text-sm">/month</span>
            </div>
            <ul class="space-y-3 mb-8 flex-grow text-sm text-gray-600">
              <li class="flex items-start gap-2"><mat-icon class="text-green-500 text-[18px] shrink-0 mt-0.5">check_circle</mat-icon> Everything in Pro</li>
              <li class="flex items-start gap-2"><mat-icon class="text-purple-500 text-[18px] shrink-0 mt-0.5">bolt</mat-icon> <strong>Priority AI generation</strong></li>
              <li class="flex items-start gap-2"><mat-icon class="text-green-500 text-[18px] shrink-0 mt-0.5">check_circle</mat-icon> Custom domain support</li>
              <li class="flex items-start gap-2"><mat-icon class="text-green-500 text-[18px] shrink-0 mt-0.5">check_circle</mat-icon> Analytics dashboard</li>
              <li class="flex items-start gap-2"><mat-icon class="text-green-500 text-[18px] shrink-0 mt-0.5">check_circle</mat-icon> Priority support</li>
              <li class="flex items-start gap-2"><mat-icon class="text-green-500 text-[18px] shrink-0 mt-0.5">check_circle</mat-icon> Remove branding</li>
              <li class="flex items-start gap-2"><mat-icon class="text-green-500 text-[18px] shrink-0 mt-0.5">check_circle</mat-icon> SEO tools</li>
            </ul>
            @if (subService.tier() === 'business') {
              <div class="bg-purple-50 text-purple-600 text-center py-3 rounded-xl text-sm font-bold">Current Plan</div>
            } @else {
              <button (click)="subscribe('business')" class="bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl text-sm font-bold shadow-md transition-colors w-full">
                {{ auth.isLoggedIn() ? 'Upgrade to Business' : 'Get Started' }}
              </button>
            }
          </div>
        </div>

        <div class="mt-16 text-center">
          <p class="text-gray-500 text-sm mb-2">All plans include full site customisation — branding, layouts, fonts, colours, and all section types.</p>
          <p class="text-gray-400 text-xs">Prices in USD. Cancel anytime. No long-term contracts. Compare: Squarespace starts at $16/mo with no free tier.</p>
        </div>
      </main>

      <footer class="py-8 text-center text-gray-400 text-sm border-t border-gray-200">
        <div class="flex items-center justify-center gap-4 mb-3">
          <a routerLink="/privacy" class="hover:text-gray-600 transition-colors">Privacy Policy</a>
          <span class="text-gray-300">|</span>
          <a routerLink="/terms" class="hover:text-gray-600 transition-colors">Terms of Service</a>
        </div>
        <p>&copy; 2026 BusinessFlow Studio.</p>
      </footer>
    </div>
  `
})
export class PricingComponent {
  private router = inject(Router);
  auth = inject(AuthService);
  subService = inject(SubscriptionService);
  private toast = inject(ToastService);

  async subscribe(tier: 'pro' | 'business') {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/signup']);
      return;
    }
    const user = this.auth.currentUser();
    if (!user) return;
    const url = await this.subService.createCheckoutSession(user.uid, tier);
    if (url) {
      window.location.href = url;
    } else {
      this.toast.error('Subscription checkout is not yet configured. Please set up Stripe API keys.');
    }
  }
}
