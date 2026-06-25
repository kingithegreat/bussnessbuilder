import { Component, inject, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { DataService } from './data.service';
import { AuthService } from './auth.service';
import { SubscriptionService } from './subscription.service';
import { ToastService } from './toast.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
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
        <nav class="flex flex-col gap-1 flex-1">
          <a routerLink="/admin/dashboard" routerLinkActive="bg-blue-50 text-blue-600 font-medium" (click)="sidebarOpen.set(false)" class="nav-item flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-50 text-[13px] font-medium transition-colors">
            <mat-icon class="w-5 h-5">dashboard</mat-icon> Dashboard
          </a>
          <a routerLink="/admin/inbox" routerLinkActive="bg-blue-50 text-blue-600 font-medium" (click)="sidebarOpen.set(false)" class="nav-item flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-50 text-[13px] font-medium transition-colors">
            <mat-icon class="w-5 h-5">inbox</mat-icon> Enquiries
            @if(newEnquiriesCount() > 0) {
              <span class="ml-auto bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{{ newEnquiriesCount() }}</span>
            }
          </a>
          <a routerLink="/admin/content" routerLinkActive="bg-blue-50 text-blue-600 font-medium" (click)="sidebarOpen.set(false)" class="nav-item flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-50 text-[13px] font-medium transition-colors">
            <mat-icon class="w-5 h-5">inventory_2</mat-icon> Content
          </a>
          <a routerLink="/admin/ai" routerLinkActive="bg-blue-50 text-blue-600 font-medium" (click)="sidebarOpen.set(false)" class="nav-item flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-50 text-[13px] font-medium transition-colors">
            <mat-icon class="w-5 h-5">auto_awesome</mat-icon> AI Tools
          </a>
          <a routerLink="/admin/customisation" routerLinkActive="bg-blue-50 text-blue-600 font-medium" (click)="sidebarOpen.set(false)" class="nav-item flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-50 text-[13px] font-medium transition-colors">
            <mat-icon class="w-5 h-5">settings</mat-icon> Customisation
          </a>
          <a routerLink="/admin/builder" routerLinkActive="bg-blue-50 text-blue-600 font-medium" (click)="sidebarOpen.set(false)" class="nav-item flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-50 text-[13px] font-medium transition-colors">
            <mat-icon class="w-5 h-5">view_quilt</mat-icon> Page Builder
          </a>
          <a routerLink="/admin/form-builder" routerLinkActive="bg-blue-50 text-blue-600 font-medium" (click)="sidebarOpen.set(false)" class="nav-item flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-50 text-[13px] font-medium transition-colors">
            <mat-icon class="w-5 h-5">dynamic_form</mat-icon> Form Builder
          </a>
          <a routerLink="/admin/pages" routerLinkActive="bg-blue-50 text-blue-600 font-medium" (click)="sidebarOpen.set(false)" class="nav-item flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-50 text-[13px] font-medium transition-colors">
            <mat-icon class="w-5 h-5">article</mat-icon> Pages
          </a>
          <a routerLink="/admin/payments" routerLinkActive="bg-blue-50 text-blue-600 font-medium" (click)="sidebarOpen.set(false)" class="nav-item flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-50 text-[13px] font-medium transition-colors">
            <mat-icon class="w-5 h-5">payments</mat-icon> Payments
          </a>
          <div class="mt-4 pt-4 border-t border-gray-100">
            <a routerLink="/admin/settings" routerLinkActive="bg-blue-50 text-blue-600 font-medium" (click)="sidebarOpen.set(false)" class="nav-item flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-50 text-[13px] font-medium transition-colors">
              <mat-icon class="w-5 h-5">tune</mat-icon> Settings
            </a>
          </div>
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
             <button (click)="sidebarOpen.set(!sidebarOpen())" class="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
               <mat-icon>menu</mat-icon>
             </button>
             <span class="hidden sm:inline">Admin</span>
             <mat-icon class="text-[16px] hidden sm:inline">chevron_right</mat-icon>
             <span class="text-gray-900 font-semibold">Workspace</span>
           </div>
           <div class="flex items-center gap-2 md:gap-4">
             <button (click)="exportData()" class="hidden md:flex bg-gray-100 text-gray-900 px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-200 transition-colors items-center gap-1"><mat-icon class="text-[14px]">download</mat-icon> Export</button>
             <button (click)="fileInput.click()" class="hidden md:flex bg-gray-100 text-gray-900 px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-200 transition-colors items-center gap-1"><mat-icon class="text-[14px]">upload</mat-icon> Import</button>
             <input type="file" #fileInput (change)="importData($event)" style="display:none" accept=".json">
             <div class="flex items-center gap-2 pl-2 border-l border-gray-200">
               @if (authService.currentUser(); as user) {
                 <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{{ user.displayName ? user.displayName[0].toUpperCase() : user.email[0].toUpperCase() }}</div>
               }
               <button (click)="logout()" class="bg-gray-100 text-gray-900 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-200 transition-colors">Sign Out</button>
             </div>
           </div>
        </header>
        <div class="flex-1 overflow-auto p-4 md:p-8">
           <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `
})
export class AdminLayoutComponent {
  private dataService = inject(DataService);
  authService = inject(AuthService);
  subService = inject(SubscriptionService);
  private toast = inject(ToastService);
  private router = inject(Router);
  sidebarOpen = signal(false);
  
  profile = this.dataService.profile;
  enquiries = this.dataService.enquiries;

  publicSiteUrl = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return '/public';
    const slug = this.dataService.siteSlug();
    return slug ? `/site/${slug}` : `/site/${user.uid}`;
  });
  
  // Computed property simulation
  newEnquiriesCount() {
    return this.enquiries().filter(e => e.status === 'New').length;
  }

  exportData() {
    const data = this.dataService.exportState();
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'business-profile.json';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  importData(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result && this.dataService.importState(result)) {
          this.toast.success('Profile imported successfully!');
        } else {
          this.toast.error('Failed to import profile. Invalid JSON.');
        }
      };
      reader.readAsText(file);
    }
  }

  loadDemo() {
    this.dataService.loadDemoData();
    this.toast.success('Demo data loaded!');
  }

  async logout() {
    await this.authService.logout();
  }
}
