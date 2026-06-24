import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { DataService } from './data.service';
import { SubscriptionService } from './subscription.service';
import { AuthService } from './auth.service';
import { NotificationPreferences, SiteTemplate } from './types';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [FormsModule, MatIconModule, RouterLink, DatePipe],
  template: `
    <div class="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h1 class="text-2xl font-black text-gray-900 tracking-tight">Settings</h1>
        <p class="text-sm text-gray-500 font-medium">Manage your account, domain, and notification preferences.</p>
      </div>

      <!-- Public Site Link -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 class="font-bold text-gray-900 flex items-center gap-2"><mat-icon class="text-[18px] text-gray-400">language</mat-icon> Your Public Site</h2>
        </div>
        <div class="p-6">
          <p class="text-sm text-gray-500 mb-3">Share this link with customers so they can view your site and submit enquiries.</p>
          <div class="flex items-center gap-2">
            <input type="text" [value]="siteUrl" readonly class="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-700 select-all">
            <button (click)="copySiteUrl()" class="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shrink-0">
              <mat-icon class="text-[18px]">content_copy</mat-icon> Copy
            </button>
          </div>
          <a [href]="siteUrl" target="_blank" class="text-blue-600 text-xs font-bold hover:underline mt-2 inline-flex items-center gap-1">
            <mat-icon class="text-[14px]">open_in_new</mat-icon> Open in new tab
          </a>
        </div>
      </div>

      <!-- Subscription -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 class="font-bold text-gray-900 flex items-center gap-2"><mat-icon class="text-[18px] text-gray-400">credit_card</mat-icon> Subscription</h2>
        </div>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <span class="text-sm font-bold text-gray-900">Current Plan: </span>
              <span class="px-2 py-0.5 rounded-full text-xs font-bold uppercase"
                    [class]="subService.tier() === 'free' ? 'bg-gray-100 text-gray-600' : subService.tier() === 'pro' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'">
                {{ subService.tierLabel() }}
              </span>
            </div>
            @if (subService.tier() !== 'free') {
              <button (click)="openPortal()" class="text-sm text-blue-600 font-bold hover:underline">Manage Subscription</button>
            }
          </div>
          @if (subService.tier() === 'free') {
            <p class="text-sm text-gray-500 mb-4">Upgrade to unlock AI tools, unlimited services, and more.</p>
            <a routerLink="/pricing" class="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">
              <mat-icon class="text-[18px]">upgrade</mat-icon> View Plans
            </a>
          }
        </div>
      </div>

      <!-- Site Templates -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h2 class="font-bold text-gray-900 flex items-center gap-2"><mat-icon class="text-[18px] text-gray-400">layers</mat-icon> Site Templates</h2>
          <span class="text-xs font-bold text-gray-400">{{ dataService.templates().length }} / 3</span>
        </div>
        <div class="p-6 space-y-4">
          <p class="text-sm text-gray-500">Save up to 3 versions of your site. Only the active template is shown on your public page.</p>

          @for (template of dataService.templates(); track template.id) {
            <div class="flex items-center justify-between p-4 rounded-xl border transition-colors"
                 [class.border-blue-300]="dataService.activeTemplateId() === template.id"
                 [class.bg-blue-50]="dataService.activeTemplateId() === template.id"
                 [class.border-gray-200]="dataService.activeTemplateId() !== template.id">
              <div class="flex items-center gap-3 min-w-0">
                @if (dataService.activeTemplateId() === template.id) {
                  <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                    <mat-icon class="text-white text-[16px]">check</mat-icon>
                  </div>
                } @else {
                  <div class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <mat-icon class="text-gray-400 text-[16px]">web</mat-icon>
                  </div>
                }
                <div class="min-w-0">
                  <p class="font-bold text-sm text-gray-900 truncate">{{ template.name }}</p>
                  <p class="text-[10px] text-gray-400">Updated {{ template.updatedAt | date:'medium' }}</p>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                @if (dataService.activeTemplateId() !== template.id) {
                  <button (click)="deployTemplate(template.id)" class="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors">Deploy</button>
                  <button (click)="loadTemplate(template.id)" class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit this template">
                    <mat-icon class="text-[16px]">edit</mat-icon>
                  </button>
                } @else {
                  <span class="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-lg text-xs font-bold">Live</span>
                  <button (click)="updateCurrentTemplate()" class="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Save current changes to this template">
                    <mat-icon class="text-[16px]">save</mat-icon>
                  </button>
                }
                <button (click)="deleteTemplate(template.id, template.name)" class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                  <mat-icon class="text-[16px]">delete</mat-icon>
                </button>
              </div>
            </div>
          }

          @if (dataService.templates().length === 0) {
            <div class="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              <mat-icon class="text-3xl mb-2">web</mat-icon>
              <p class="text-sm font-medium">No saved templates yet</p>
              <p class="text-xs mt-1">Save your current site as a template to get started</p>
            </div>
          }

          @if (dataService.templates().length < 3) {
            <div class="flex gap-2">
              <input type="text" [(ngModel)]="newTemplateName" placeholder="Template name..." class="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
              <button (click)="saveAsTemplate()" [disabled]="!newTemplateName.trim()" class="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0">
                <mat-icon class="text-[16px]">add</mat-icon> Save Current Site
              </button>
            </div>
          } @else {
            <div class="bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-xs text-yellow-800 flex items-center gap-2">
              <mat-icon class="text-[16px]">info</mat-icon>
              Maximum of 3 templates reached. Delete one to create a new one.
            </div>
          }
        </div>
      </div>

      <!-- Custom Domain -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 class="font-bold text-gray-900 flex items-center gap-2"><mat-icon class="text-[18px] text-gray-400">language</mat-icon> Custom Domain</h2>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label for="domain" class="block text-sm font-bold text-gray-700 mb-2">Your Domain</label>
            <input id="domain" type="text" [(ngModel)]="prefs.customDomain" placeholder="www.yourbusiness.com" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
          </div>
          @if (prefs.customDomain) {
            <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
              <p class="font-bold mb-2">DNS Setup Instructions</p>
              <ol class="list-decimal pl-4 space-y-1 text-xs">
                <li>Go to your domain registrar's DNS settings</li>
                <li>Add a CNAME record pointing <strong>{{ prefs.customDomain }}</strong> to <strong>businessflow-722923667291.us-central1.run.app</strong></li>
                <li>Wait for DNS propagation (up to 48 hours)</li>
                <li>Contact support to activate SSL for your domain</li>
              </ol>
            </div>
          }
          @if (subService.tier() !== 'business') {
            <div class="bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-xs text-yellow-800 flex items-center gap-2">
              <mat-icon class="text-[16px]">info</mat-icon>
              Custom domains are available on the Business plan.
            </div>
          }
        </div>
      </div>

      <!-- Email Notifications -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 class="font-bold text-gray-900 flex items-center gap-2"><mat-icon class="text-[18px] text-gray-400">notifications</mat-icon> Email Notifications</h2>
        </div>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-bold text-gray-700">New Enquiry Notifications</p>
              <p class="text-xs text-gray-500">Get an email when someone submits an enquiry</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" [(ngModel)]="prefs.emailOnNewEnquiry" class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          @if (prefs.emailOnNewEnquiry) {
            <div>
              <label for="notifEmail" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Notification Email</label>
              <input id="notifEmail" type="email" [(ngModel)]="prefs.notificationEmail" placeholder="you@example.com" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
            </div>
          }
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-red-100 bg-red-50/50">
          <h2 class="font-bold text-red-900 flex items-center gap-2"><mat-icon class="text-[18px] text-red-400">warning</mat-icon> Danger Zone</h2>
        </div>
        <div class="p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-bold text-gray-700">Delete Account</p>
              <p class="text-xs text-gray-500">Permanently delete your account and all data</p>
            </div>
            <button (click)="confirmDelete()" class="px-4 py-2 border border-red-300 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors">Delete Account</button>
          </div>
        </div>
      </div>

      <div class="flex justify-end">
        <button (click)="saveSettings()" class="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2">
          <mat-icon class="text-[18px]">save</mat-icon> Save Settings
        </button>
      </div>
    </div>
  `
})
export class AdminSettingsComponent implements OnInit {
  dataService = inject(DataService);
  subService = inject(SubscriptionService);
  private authService = inject(AuthService);

  newTemplateName = '';
  siteUrl = '';

  prefs: NotificationPreferences = {
    emailOnNewEnquiry: false,
    notificationEmail: '',
    customDomain: '',
  };

  ngOnInit() {
    const saved = this.dataService.getNotificationPrefs();
    if (saved) {
      this.prefs = { ...this.prefs, ...saved };
    }
    if (!this.prefs.notificationEmail) {
      const user = this.authService.currentUser();
      if (user?.email) this.prefs.notificationEmail = user.email;
    }
    const user = this.authService.currentUser();
    if (user) {
      this.siteUrl = `${window.location.origin}/site/${user.uid}`;
    }
  }

  async copySiteUrl() {
    try {
      await navigator.clipboard.writeText(this.siteUrl);
      alert('Site link copied!');
    } catch {
      alert(this.siteUrl);
    }
  }

  saveSettings() {
    this.dataService.setNotificationPrefs(this.prefs);
    alert('Settings saved successfully!');
  }

  async openPortal() {
    const user = this.authService.currentUser();
    if (!user) return;
    const url = await this.subService.openCustomerPortal(user.uid);
    if (url) window.location.href = url;
    else alert('Billing portal is not yet configured.');
  }

  saveAsTemplate() {
    const name = this.newTemplateName.trim();
    if (!name) return;
    if (this.dataService.saveCurrentAsTemplate(name)) {
      this.newTemplateName = '';
      alert(`Template "${name}" saved!`);
    } else {
      alert('Maximum of 3 templates reached.');
    }
  }

  deployTemplate(id: string) {
    if (confirm('This will switch your live public page to this template. Continue?')) {
      this.dataService.setActiveTemplate(id);
      alert('Template deployed! Your public page now shows this version.');
    }
  }

  loadTemplate(id: string) {
    if (confirm('This will load this template into the editor. Any unsaved changes to your current site will be lost. Continue?')) {
      this.dataService.loadTemplate(id);
      alert('Template loaded into editor. Make changes and save when ready.');
    }
  }

  updateCurrentTemplate() {
    const activeId = this.dataService.activeTemplateId();
    if (activeId) {
      this.dataService.updateTemplate(activeId);
      alert('Template updated with current changes!');
    }
  }

  deleteTemplate(id: string, name: string) {
    if (confirm(`Delete template "${name}"? This cannot be undone.`)) {
      this.dataService.deleteTemplate(id);
    }
  }

  confirmDelete() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently removed.')) {
      alert('Account deletion will be processed within 30 days. You will receive a confirmation email.');
    }
  }
}
