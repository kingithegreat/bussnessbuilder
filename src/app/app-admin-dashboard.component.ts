import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from './auth.service';

interface Metrics {
  totalUsers: number;
  setupComplete: number;
  totalEnquiries: number;
  totalServices: number;
  proUsers: number;
  businessUsers: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="max-w-5xl space-y-6">
      <div>
        <h1 class="text-2xl font-black text-gray-900 tracking-tight">Dashboard</h1>
        <p class="text-sm text-gray-500">Platform overview and key metrics.</p>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-20">
          <div class="animate-spin h-8 w-8 border-3 border-red-600 border-t-transparent rounded-full"></div>
        </div>
      } @else {
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <mat-icon class="text-blue-600 text-[20px]">people</mat-icon>
              </div>
              <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Users</span>
            </div>
            <p class="text-3xl font-black text-gray-900">{{ metrics()?.totalUsers || 0 }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ metrics()?.setupComplete || 0 }} completed setup</p>
          </div>

          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <mat-icon class="text-green-600 text-[20px]">mail</mat-icon>
              </div>
              <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Enquiries</span>
            </div>
            <p class="text-3xl font-black text-gray-900">{{ metrics()?.totalEnquiries || 0 }}</p>
            <p class="text-xs text-gray-400 mt-1">across all sites</p>
          </div>

          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <mat-icon class="text-purple-600 text-[20px]">work</mat-icon>
              </div>
              <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Services</span>
            </div>
            <p class="text-3xl font-black text-gray-900">{{ metrics()?.totalServices || 0 }}</p>
            <p class="text-xs text-gray-400 mt-1">listed across all sites</p>
          </div>

          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <mat-icon class="text-blue-600 text-[20px]">star</mat-icon>
              </div>
              <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Pro Users</span>
            </div>
            <p class="text-3xl font-black text-gray-900">{{ metrics()?.proUsers || 0 }}</p>
            <p class="text-xs text-gray-400 mt-1">$14/mo subscribers</p>
          </div>

          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <mat-icon class="text-purple-600 text-[20px]">diamond</mat-icon>
              </div>
              <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Business Users</span>
            </div>
            <p class="text-3xl font-black text-gray-900">{{ metrics()?.businessUsers || 0 }}</p>
            <p class="text-xs text-gray-400 mt-1">$22/mo subscribers</p>
          </div>

          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <mat-icon class="text-green-600 text-[20px]">attach_money</mat-icon>
              </div>
              <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">MRR</span>
            </div>
            <p class="text-3xl font-black text-gray-900">{{ '$' + mrr() }}</p>
            <p class="text-xs text-gray-400 mt-1">monthly recurring revenue</p>
          </div>
        </div>
      }
    </div>
  `
})
export class AppAdminDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  loading = signal(true);
  metrics = signal<Metrics | null>(null);
  mrr = signal(0);

  async ngOnInit() {
    const token = await this.authService.getIdToken();
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    this.http.get<Metrics>('/api/admin/metrics', { headers }).subscribe({
      next: (data) => {
        this.metrics.set(data);
        this.mrr.set(data.proUsers * 14 + data.businessUsers * 22);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
