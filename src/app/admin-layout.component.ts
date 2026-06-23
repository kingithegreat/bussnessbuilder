import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { DataService } from './data.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <div class="min-h-screen bg-[#F5F5F7] flex font-sans text-gray-900 overflow-hidden">
      <!-- Sidebar -->
      <aside class="w-64 h-full bg-white border-r border-gray-200 flex flex-col hidden md:flex p-6">
        <div class="flex items-center gap-3 mb-10">
          <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <div class="w-4 h-4 border-2 border-white rounded-sm"></div>
          </div>
          <span class="font-bold tracking-tight text-lg">{{ profile().name || 'BusinessFlow' }}</span>
        </div>
        <nav class="flex flex-col gap-1 flex-1">
          <a routerLink="/admin/dashboard" routerLinkActive="bg-blue-50 text-blue-600 font-medium" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-50 font-medium transition-colors">
            <mat-icon class="w-5 h-5">dashboard</mat-icon> Dashboard
          </a>
          <a routerLink="/admin/inbox" routerLinkActive="bg-blue-50 text-blue-600 font-medium" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-50 font-medium transition-colors">
            <mat-icon class="w-5 h-5">inbox</mat-icon> Enquiries
            @if(newEnquiriesCount() > 0) {
              <span class="ml-auto bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{{ newEnquiriesCount() }}</span>
            }
          </a>
          <a routerLink="/admin/ai" routerLinkActive="bg-blue-50 text-blue-600 font-medium" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-50 font-medium transition-colors">
            <mat-icon class="w-5 h-5">auto_awesome</mat-icon> AI Tools
          </a>
          <a routerLink="/admin/customisation" routerLinkActive="bg-blue-50 text-blue-600 font-medium" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-50 font-medium transition-colors">
            <mat-icon class="w-5 h-5">settings</mat-icon> Customisation
          </a>
          <a routerLink="/admin/builder" routerLinkActive="bg-blue-50 text-blue-600 font-medium" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-50 font-medium transition-colors">
            <mat-icon class="w-5 h-5">view_quilt</mat-icon> Page Builder
          </a>
          <a routerLink="/admin/form-builder" routerLinkActive="bg-blue-50 text-blue-600 font-medium" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-50 font-medium transition-colors">
            <mat-icon class="w-5 h-5">dynamic_form</mat-icon> Form Builder
          </a>
        </nav>
        <div class="mt-auto pt-4 border-t border-gray-100">
          <div class="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
            <a routerLink="/public" target="_blank" class="flex items-center justify-center gap-2 w-full bg-white border border-gray-200 text-gray-900 px-4 py-2 rounded-lg transition-colors text-xs font-bold shadow-sm hover:bg-gray-50">
              <mat-icon class="text-[18px]">open_in_new</mat-icon> View Public Page
            </a>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col overflow-hidden">
        <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
           <div class="flex items-center gap-2 text-sm text-gray-500">
             <span>Admin</span>
             <mat-icon class="text-[16px]">chevron_right</mat-icon>
             <span class="text-gray-900 font-semibold">Workspace</span>
           </div>
           <div class="flex items-center gap-4">
             <button (click)="loadDemo()" class="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-200 transition-colors flex items-center gap-1"><mat-icon class="text-[14px]">auto_fix_high</mat-icon> Demo</button>
             <button (click)="exportData()" class="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-200 transition-colors flex items-center gap-1"><mat-icon class="text-[14px]">download</mat-icon> Export</button>
             <button (click)="fileInput.click()" class="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-200 transition-colors flex items-center gap-1"><mat-icon class="text-[14px]">upload</mat-icon> Import</button>
             <input type="file" #fileInput (change)="importData($event)" style="display:none" accept=".json">
             <button (click)="logout()" class="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-200 transition-colors">Sign Out / Reset</button>
           </div>
        </header>
        <div class="flex-1 overflow-auto p-8">
           <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `
})
export class AdminLayoutComponent {
  private dataService = inject(DataService);
  private router = inject(Router);
  
  profile = this.dataService.profile;
  enquiries = this.dataService.enquiries;
  
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
          alert('Profile imported successfully!');
        } else {
          alert('Failed to import profile. Invalid JSON.');
        }
      };
      reader.readAsText(file);
    }
  }

  loadDemo() {
    this.dataService.loadDemoData();
    alert('Demo data loaded!');
  }

  logout() {
    this.dataService.resetSetup();
    this.router.navigate(['/']);
  }
}
