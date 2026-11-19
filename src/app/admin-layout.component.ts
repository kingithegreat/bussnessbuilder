import { MAX_IMPORT_BYTES } from './site-import';
import { TooltipDirective } from './tooltip.directive';
import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DataService } from './data.service';
import { AuthService } from './auth.service';
import { SubscriptionService } from './subscription.service';
import { ToastService } from './toast.service';
import { MatIconModule } from '@angular/material/icon';

export const OUTCOME_NAVIGATION = [
  { label: 'Home', route: '/admin/dashboard', icon: 'home' },
  { label: 'Website', route: '/admin/website', icon: 'language' },
  { label: 'Leads', route: '/admin/inbox', icon: 'inbox' },
  { label: 'Marketing', route: '/admin/ai', icon: 'campaign' },
  { label: 'Growth', route: '/admin/growth', icon: 'trending_up' },
  { label: 'Analytics', route: '/admin/analytics', icon: 'analytics' },
  { label: 'Settings', route: '/admin/settings', icon: 'tune' },
] as const;

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [TooltipDirective, RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  styles: [`
    @media (min-width: 768px) {
      .admin-sidebar {
        transform: translateX(0) !important;
        position: relative !important;
      }
    }
    .nav-item {
      transition: all 0.15s ease;
    }
    .nav-item:hover {
      transform: translateX(2px);
    }
  `],
  template: `
    <div class="h-screen bg-[#F5F5F7] flex font-sans text-gray-900 overflow-hidden relative">
      @if (sidebarOpen()) {
        <button type="button" aria-label="Close sidebar" (click)="sidebarOpen.set(false)" class="fixed inset-0 bg-black/50 z-40 md:hidden"></button>
      }
      <!-- Sidebar -->
      <aside class="admin-sidebar w-[260px] bg-white/80 backdrop-blur-xl border-r border-gray-200/60 flex flex-col p-5 fixed inset-y-0 left-0 z-50 transition-transform duration-200" [style.transform]="sidebarOpen() ? 'translateX(0)' : 'translateX(-100%)'">
        <div class="flex items-center gap-3 mb-8">
          <div class="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <div class="w-4 h-4 border-2 border-white rounded-sm"></div>
          </div>
          <span class="font-semibold tracking-tight text-[15px]">{{ profile().name || 'BusinessFlow' }}</span>
          @if (subService.tier() !== 'free') {
            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                  [class]="subService.tier() === 'pro' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'">
              {{ subService.tierLabel() }}
            </span>
          }
        </div>
        <nav aria-label="Workspace" class="flex flex-col gap-1 flex-1 overflow-y-auto min-h-0">
          @for (item of navigation; track item.route) {
            <a [routerLink]="item.route" [attr.aria-label]="item.label" routerLinkActive="bg-blue-50 text-blue-600 font-medium" (click)="sidebarOpen.set(false)" class="nav-item flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-50 text-[13px] font-medium transition-colors">
              <mat-icon class="w-5 h-5">{{ item.icon }}</mat-icon> {{ item.label }}
              @if (item.label === 'Leads' && newEnquiriesCount() > 0) {
                <span class="ml-auto bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{{ newEnquiriesCount() }}</span>
              }
            </a>
          }
          @if (isOwnerAdmin()) {
            <div class="mt-4 pt-4 border-t border-gray-100">
              <a routerLink="/app-admin" (click)="sidebarOpen.set(false)" class="nav-item flex items-center gap-3 px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 text-[13px] font-medium transition-colors">
                <mat-icon class="w-5 h-5">admin_panel_settings</mat-icon> Owner Admin
              </a>
            </div>
          }
        </nav>
        <div class="mt-auto pt-4 border-t border-gray-100">
          <div class="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
            <a [href]="publicSiteUrl()" target="_blank" class="flex items-center justify-center gap-2 w-full bg-white border border-gray-200 text-gray-900 px-4 py-2 rounded-lg transition-colors text-xs font-bold shadow-sm hover:bg-gray-50">
              <mat-icon class="text-[18px]">open_in_new</mat-icon> View Public Page
            </a>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col overflow-hidden">
        <header class="h-12 md:h-14 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 flex items-center justify-between px-4 md:px-8 shrink-0">
           <div class="flex items-center gap-2 text-sm text-gray-500">
             <button (click)="sidebarOpen.set(!sidebarOpen())" class="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors" aria-label="Open menu">
               <mat-icon aria-hidden="true">menu</mat-icon>
             </button>
             <span class="hidden sm:inline">Admin</span>
             <mat-icon class="text-[16px] hidden sm:inline">chevron_right</mat-icon>
             <span class="text-gray-900 font-semibold">Workspace</span>
           </div>
           <div class="flex items-center gap-2 md:gap-4">
             <a [href]="publicSiteUrl()" target="_blank" rel="noopener" class="flex bg-blue-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors items-center gap-1"><mat-icon class="text-[14px]">open_in_new</mat-icon> <span class="hidden sm:inline">View live site</span></a>
             <input type="file" #fileInput (change)="importData($event)" style="display:none" accept=".json">
             <div class="flex items-center gap-2 pl-2 border-l border-gray-200">
               @if (authService.currentUser(); as user) {
                 <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{{ (user.displayName || user.email || 'U').charAt(0).toUpperCase() }}</div>
               }
               <button [disabled]="saving() || importing()" (click)="logout()" class="bg-gray-100 text-gray-900 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-200 transition-colors">Sign Out</button>
             </div>
           </div>
        </header>
        <div class="bg-white border-b border-gray-200 px-4 md:px-8 py-2 flex flex-wrap items-center gap-3 text-xs" role="status" aria-live="polite">
          <span [class.text-red-700]="dataService.saveStatus() === 'error'">{{ saveLabels[dataService.saveStatus()] }}</span>
          @if (dataService.saveError()) { <span class="text-red-700">{{ dataService.saveError() }}</span> }
          @if (dataService.saveStatus() === 'paused') { <span>Return to Home to retry the unconfirmed website change.</span> }
          @if (dataService.hasUnsavedChanges() && dataService.saveStatus() !== 'paused') {
            <button type="button" (click)="saveChanges()" [disabled]="saving() || dataService.saveStatus() === 'saving'" class="text-blue-700 underline disabled:opacity-50">{{ dataService.saveStatus() === 'error' ? 'Retry saving' : 'Save now' }}</button>
          }
          <div class="ml-auto flex items-center gap-2">
             <button aria-label="Export data" (click)="exportData()" class="flex bg-gray-100 text-gray-900 px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-200 transition-colors items-center gap-1"><mat-icon aria-hidden="true" class="text-[14px]">download</mat-icon><span class="hidden lg:inline">Export</span></button>
             <button aria-label="Import website settings" [disabled]="importing()" (click)="fileInput.click()" class="flex bg-gray-100 text-gray-900 px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-200 transition-colors items-center gap-1"><mat-icon aria-hidden="true" class="text-[14px]">upload</mat-icon><span class="hidden lg:inline">Import</span></button>
          </div>
        </div>
        <div class="flex-1 overflow-auto p-4 md:p-8">
           <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `
})
export class AdminLayoutComponent implements OnInit {
  dataService = inject(DataService);
  readonly saving = signal(false);
  readonly importing = signal(false);
  readonly saveLabels = { idle: '', pending: 'Unsaved changes', saving: 'Saving…', saved: 'Saved', error: 'Not saved', paused: 'Change awaiting confirmation' };
  authService = inject(AuthService);
  subService = inject(SubscriptionService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private http = inject(HttpClient);
  sidebarOpen = signal(false);
  isOwnerAdmin = signal(false);
  readonly navigation = OUTCOME_NAVIGATION;
  
  profile = this.dataService.profile;
  enquiries = this.dataService.enquiries;

  async ngOnInit() {
    if (this.authService.isLoading()) {
      await new Promise<void>(resolve => {
        const check = setInterval(() => {
          if (!this.authService.isLoading()) { clearInterval(check); resolve(); }
        }, 50);
      });
    }
    const token = await this.authService.getIdToken();
    if (token) {
      this.http.get<{ admin?: boolean }>('/api/admin/verify?soft=1', {
        headers: { Authorization: `Bearer ${token}` },
      }).subscribe({
        next: (r) => this.isOwnerAdmin.set(r?.admin === true),
        error: () => { /* non-admin user — leave isOwnerAdmin false */ },
      });
    }
  }

  publicSiteUrl = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return '/public';
    const slug = this.dataService.siteSlug();
    return slug ? `/s/${slug}` : `/site/${user.uid}`;
  });
  
  // Computed property simulation
  newEnquiriesCount() {
    return this.enquiries().filter(e => e.status === 'New').length;
  }

  exportData() {
    // The pricing page sells export as a Pro feature and SubscriptionService
    // has canExport(), but nothing ever called it — every free user already had
    // it. Enforce the entitlement that was being advertised.
    if (!this.subService.canExport()) {
      this.toast.info('Data export is available on the Pro plan.');
      return;
    }
    // Snapshot of the records currently loaded (profile + pages,
    // recommendations, payments, templates). The profile portion re-imports.
    const data = this.dataService.exportAll();
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'businessflow-data-export.json';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async importData(event: Event) {
    const input = event.target as HTMLInputElement, file = input.files?.[0];
    input.value = '';
    if (!file || this.importing()) return;
    if (!this.subService.canExport()) { this.toast.info('Website import is available on the Pro plan.'); return; }
    if (file.size > MAX_IMPORT_BYTES) { this.toast.error('Choose a BusinessFlow JSON export up to 2 MB.'); return; }
    const uid = this.authService.currentUser()?.uid;
    this.importing.set(true);
    try {
      const json = await file.text();
      if (uid !== this.authService.currentUser()?.uid) throw new Error('Your account changed. Select the file again.');
      if (!confirm('Replace this website’s profile, services and design from the file? Existing enquiries, activities and web address stay. Pages, payments and other account records in a full export are not restored.')) return;
      if (!this.dataService.importState(json)) throw new Error('Invalid website export, or a website change is awaiting confirmation. Your current website was kept.');
      await this.dataService.saveNow();
      this.toast.success('Website settings imported and saved. Existing enquiries and account records were kept.');
    } catch (error) { this.toast.error(error instanceof Error ? error.message : 'Could not import or save this file. Retry saving before leaving.'); }
    finally { this.importing.set(false); }
  }

  @HostListener('window:beforeunload', ['$event'])
  warnBeforeLeaving(event: BeforeUnloadEvent) {
    if (this.dataService.hasUnsavedChanges()) { event.preventDefault(); event.returnValue = ''; }
  }

  async saveChanges(): Promise<boolean> {
    this.saving.set(true);
    try { await this.dataService.saveNow(); return true; }
    catch (error) { this.toast.error(error instanceof Error ? error.message : 'Changes have not saved. Please retry.'); return false; }
    finally { this.saving.set(false); }
  }

  async logout() {
    if (!await this.saveChanges()) return;
    this.dataService.resetSession();
    try { await this.authService.logout(); }
    catch { this.toast.error('Sign-out failed. Reload to reopen your saved workspace.'); }
  }
}
