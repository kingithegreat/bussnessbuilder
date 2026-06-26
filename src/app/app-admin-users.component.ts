import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import { AuthService } from './auth.service';

interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
  isSetupComplete: boolean;
  businessName: string;
  siteSlug: string;
  tier: string;
  enquiryCount: number;
  serviceCount: number;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [MatIconModule, DatePipe],
  template: `
    <div class="max-w-6xl space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-black text-gray-900 tracking-tight">Users</h1>
          <p class="text-sm text-gray-500">All registered accounts and their sites.</p>
        </div>
        <span class="text-sm font-bold text-gray-400">{{ users().length }} total</span>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-20">
          <div class="animate-spin h-8 w-8 border-3 border-red-600 border-t-transparent rounded-full"></div>
        </div>
      } @else if (users().length === 0) {
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <mat-icon class="text-gray-300 text-[48px]">people_outline</mat-icon>
          <p class="text-gray-500 text-sm mt-2">No users yet.</p>
        </div>
      } @else {
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-100">
                  <th class="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wider">User</th>
                  <th class="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wider">Business</th>
                  <th class="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wider">Plan</th>
                  <th class="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                  <th class="text-right px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wider">Enquiries</th>
                  <th class="text-right px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wider">Services</th>
                  <th class="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody>
                @for (user of users(); track user.uid) {
                  <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td class="px-4 py-3">
                      <p class="font-bold text-gray-900">{{ user.displayName || 'No name' }}</p>
                      <p class="text-xs text-gray-400">{{ user.email }}</p>
                    </td>
                    <td class="px-4 py-3">
                      @if (user.businessName) {
                        <p class="font-medium text-gray-900">{{ user.businessName }}</p>
                        @if (user.siteSlug) {
                          <a [href]="'/site/' + user.siteSlug" target="_blank" class="text-xs text-blue-500 font-mono hover:underline">/site/{{ user.siteSlug }}</a>
                        } @else {
                          <a [href]="'/site/' + user.uid" target="_blank" class="text-xs text-blue-500 font-mono hover:underline">View site</a>
                        }
                      } @else {
                        <span class="text-gray-400 text-xs">Not set up</span>
                      }
                    </td>
                    <td class="px-4 py-3">
                      <span class="px-2 py-0.5 rounded-full text-xs font-bold uppercase"
                            [class]="user.tier === 'free' ? 'bg-gray-100 text-gray-600' : user.tier === 'pro' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'">
                        {{ user.tier }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      @if (user.isSetupComplete) {
                        <span class="flex items-center gap-1 text-green-600 text-xs font-bold">
                          <mat-icon class="text-[14px]">check_circle</mat-icon> Live
                        </span>
                      } @else {
                        <span class="flex items-center gap-1 text-yellow-600 text-xs font-bold">
                          <mat-icon class="text-[14px]">pending</mat-icon> Setup
                        </span>
                      }
                    </td>
                    <td class="px-4 py-3 text-right font-bold text-gray-900">{{ user.enquiryCount }}</td>
                    <td class="px-4 py-3 text-right font-bold text-gray-900">{{ user.serviceCount }}</td>
                    <td class="px-4 py-3 text-gray-500 text-xs">{{ user.createdAt | date:'mediumDate' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `
})
export class AppAdminUsersComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  loading = signal(true);
  users = signal<AdminUser[]>([]);

  async ngOnInit() {
    const token = await this.authService.getIdToken();
    if (!token) return;

    this.http.get<{ users: AdminUser[] }>('/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
    }).subscribe({
      next: (data) => {
        this.users.set(data.users);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
