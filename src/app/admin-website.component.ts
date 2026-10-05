import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from './data.service';
import { AuthService } from './auth.service';

export const WEBSITE_TOOLS = [
  { title: 'Pages and publishing', description: 'Create content pages, review drafts and choose which pages to publish.', route: '/admin/pages', icon: 'article' },
  { title: 'Homepage and preview', description: 'Arrange homepage sections and inspect the preview before saving.', route: '/admin/builder', icon: 'view_quilt' },
  { title: 'Enquiry form', description: 'Choose what customers tell you when they get in touch.', route: '/admin/form-builder', icon: 'dynamic_form' },
  { title: 'Branding', description: 'Edit your logo, colours, fonts and website appearance.', route: '/admin/customisation', icon: 'palette' },
  { title: 'Services and content', description: 'Keep your services, testimonials and FAQs up to date.', route: '/admin/content', icon: 'inventory_2' },
  { title: 'Domain and site settings', description: 'Manage your public address, contact details and domain connection.', route: '/admin/settings', icon: 'language' },
  { title: 'Payment links', description: 'Manage the payment options you offer to customers.', route: '/admin/payments', icon: 'payments' },
] as const;

@Component({
  selector: 'app-admin-website', standalone: true, imports: [RouterLink, MatIconModule],
  template: `
    <div class="max-w-5xl space-y-6">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Website</h1>
        <p class="mt-1 text-sm text-gray-500">Build, preview and publish your website from one place.</p>
      </div>
      <section class="rounded-2xl border border-blue-100 bg-blue-50 p-5" aria-label="Website readiness">
        @if (setupComplete()) {
          <h2 class="font-semibold text-gray-900">Your initial website is published</h2>
          <p class="mt-1 text-sm text-gray-600">Review the live site and use the editors below for your next change. Additional pages keep their own Draft or Published state.</p>
          <a [href]="siteUrl()" target="_blank" rel="noopener" class="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"><mat-icon>open_in_new</mat-icon> View live website</a>
        } @else {
          <h2 class="font-semibold text-gray-900">Finish setup before your first publication</h2>
          <p class="mt-1 text-sm text-gray-600">Review your business details and preview the initial website before publishing.</p>
          <a routerLink="/setup" class="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Continue setup and preview</a>
        }
      </section>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @for (tool of tools; track tool.route) {
          <a [routerLink]="tool.route" class="rounded-2xl border border-gray-200 bg-white p-5 hover:border-blue-300 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-blue-600">
            <mat-icon class="text-blue-600">{{ tool.icon }}</mat-icon>
            <h2 class="mt-2 font-semibold text-gray-900">{{ tool.title }}</h2>
            <p class="mt-1 text-sm text-gray-500">{{ tool.description }}</p>
          </a>
        }
      </div>
    </div>
  `,
})
export class AdminWebsiteComponent {
  private data = inject(DataService);
  private auth = inject(AuthService);
  readonly tools = WEBSITE_TOOLS;
  readonly setupComplete = this.data.isSetupComplete;
  readonly siteUrl = computed(() => {
    const identity = this.data.siteSlug() || this.auth.currentUser()?.uid;
    return identity ? `/site/${encodeURIComponent(identity)}` : '/public';
  });
}
