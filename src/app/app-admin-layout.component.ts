import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-panel-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <div class="min-h-screen bg-[#F5F5F7] font-sans">
      <header class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div class="flex items-center gap-3">
          <div class="h-8 w-8 rounded-lg bg-red-600 text-white flex items-center justify-center">
            <mat-icon class="text-[18px]">admin_panel_settings</mat-icon>
          </div>
          <span class="font-bold text-gray-900 tracking-tight">BusinessFlow Admin</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-600">Owner</span>
        </div>
        <a routerLink="/admin/dashboard" class="text-sm text-blue-600 font-bold hover:underline flex items-center gap-1">
          <mat-icon class="text-[16px]">arrow_back</mat-icon> Back to App
        </a>
      </header>

      <div class="flex">
        <nav class="w-56 bg-white border-r border-gray-200 min-h-[calc(100vh-53px)] p-4 space-y-1">
          <a routerLink="/app-admin/dashboard" routerLinkActive="bg-red-50 text-red-600" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <mat-icon class="text-[18px]">dashboard</mat-icon> Dashboard
          </a>
          <a routerLink="/app-admin/users" routerLinkActive="bg-red-50 text-red-600" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <mat-icon class="text-[18px]">people</mat-icon> Users
          </a>
          <a routerLink="/app-admin/discounts" routerLinkActive="bg-red-50 text-red-600" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <mat-icon class="text-[18px]">local_offer</mat-icon> Discounts
          </a>
        </nav>

        <main class="flex-1 p-8">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class AppAdminLayoutComponent {}
