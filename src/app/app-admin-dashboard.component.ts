import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AuthService } from './auth.service';

interface RecentUser {
  uid: string;
  email: string;
  displayName: string;
  businessName: string;
  tier: string;
  createdAt: string;
  siteSlug: string;
}

interface Metrics {
  totalUsers: number;
  setupComplete: number;
  totalEnquiries: number;
  totalServices: number;
  proUsers: number;
  businessUsers: number;
  totalTestimonials: number;
  totalFaqs: number;
  totalPageViews: number;
  signupsByDate: Record<string, number>;
  enquiriesByDate: Record<string, number>;
  tierBreakdown: { free: number; pro: number; business: number };
  recentUsers: RecentUser[];
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [MatIconModule, DatePipe, DecimalPipe, RouterLink],
  template: `
    <div class="max-w-6xl space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-black text-gray-900 tracking-tight">Platform Analytics</h1>
          <p class="text-sm text-gray-500">Full overview of BusinessFlow Studio.</p>
        </div>
        <button (click)="refresh()" class="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
          <mat-icon class="text-[14px]">refresh</mat-icon> Refresh
        </button>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-20">
          <div class="animate-spin h-8 w-8 border-3 border-red-600 border-t-transparent rounded-full"></div>
        </div>
      } @else {
        <!-- Revenue Banner -->
        <div class="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white relative overflow-hidden shadow-lg">
          <div class="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4"></div>
          <div class="relative flex items-center justify-between flex-wrap gap-4">
            <div>
              <p class="text-green-100 text-xs font-bold uppercase tracking-wider mb-1">Monthly Recurring Revenue</p>
              <p class="text-4xl font-black">\${{ mrr() | number:'1.0-0' }}</p>
              <p class="text-green-200 text-sm mt-1">{{ metrics()?.proUsers || 0 }} Pro + {{ metrics()?.businessUsers || 0 }} Business subscribers</p>
            </div>
            <div class="flex gap-6">
              <div class="text-center">
                <p class="text-2xl font-black">{{ metrics()?.totalUsers || 0 }}</p>
                <p class="text-green-200 text-xs font-bold">Total Users</p>
              </div>
              <div class="text-center">
                <p class="text-2xl font-black">{{ conversionRate() | number:'1.0-1' }}%</p>
                <p class="text-green-200 text-xs font-bold">Paid Rate</p>
              </div>
              <div class="text-center">
                <p class="text-2xl font-black">{{ setupRate() | number:'1.0-0' }}%</p>
                <p class="text-green-200 text-xs font-bold">Setup Rate</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Key Metrics Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div class="flex items-center gap-2 mb-3">
              <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <mat-icon class="text-blue-600 text-[16px]">people</mat-icon>
              </div>
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Users</span>
            </div>
            <p class="text-2xl font-black text-gray-900">{{ metrics()?.totalUsers || 0 }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ metrics()?.setupComplete || 0 }} live sites</p>
          </div>

          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div class="flex items-center gap-2 mb-3">
              <div class="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <mat-icon class="text-green-600 text-[16px]">mail</mat-icon>
              </div>
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Enquiries</span>
            </div>
            <p class="text-2xl font-black text-gray-900">{{ metrics()?.totalEnquiries || 0 }}</p>
            <p class="text-xs text-gray-400 mt-1">across all sites</p>
          </div>

          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div class="flex items-center gap-2 mb-3">
              <div class="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <mat-icon class="text-purple-600 text-[16px]">inventory_2</mat-icon>
              </div>
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Services</span>
            </div>
            <p class="text-2xl font-black text-gray-900">{{ metrics()?.totalServices || 0 }}</p>
            <p class="text-xs text-gray-400 mt-1">listed by users</p>
          </div>

          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div class="flex items-center gap-2 mb-3">
              <div class="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                <mat-icon class="text-orange-600 text-[16px]">content_copy</mat-icon>
              </div>
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Content</span>
            </div>
            <p class="text-2xl font-black text-gray-900">{{ (metrics()?.totalTestimonials || 0) + (metrics()?.totalFaqs || 0) }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ metrics()?.totalTestimonials || 0 }} reviews, {{ metrics()?.totalFaqs || 0 }} FAQs</p>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Signups Chart -->
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 class="font-bold text-sm text-gray-900 flex items-center gap-2 mb-4">
              <mat-icon class="text-[18px] text-gray-400">trending_up</mat-icon> User Signups (30 days)
            </h3>
            <div class="flex items-end gap-[3px] h-28">
              @for (day of signupChart(); track day.date) {
                <div class="flex-1 flex flex-col items-center">
                  <div class="w-full bg-blue-100 rounded-t-sm min-h-[2px] transition-all hover:bg-blue-300"
                       [style.height.px]="maxSignup() > 0 ? (day.count / maxSignup()) * 96 + 2 : 2"
                       [title]="day.date + ': ' + day.count + ' signups'"></div>
                </div>
              }
            </div>
            <div class="flex justify-between mt-2 text-[9px] text-gray-400">
              <span>30 days ago</span>
              <span>Today</span>
            </div>
          </div>

          <!-- Enquiries Chart -->
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 class="font-bold text-sm text-gray-900 flex items-center gap-2 mb-4">
              <mat-icon class="text-[18px] text-gray-400">email</mat-icon> Enquiries (30 days)
            </h3>
            <div class="flex items-end gap-[3px] h-28">
              @for (day of enquiryChart(); track day.date) {
                <div class="flex-1 flex flex-col items-center">
                  <div class="w-full bg-green-100 rounded-t-sm min-h-[2px] transition-all hover:bg-green-300"
                       [style.height.px]="maxEnquiry() > 0 ? (day.count / maxEnquiry()) * 96 + 2 : 2"
                       [title]="day.date + ': ' + day.count + ' enquiries'"></div>
                </div>
              }
            </div>
            <div class="flex justify-between mt-2 text-[9px] text-gray-400">
              <span>30 days ago</span>
              <span>Today</span>
            </div>
          </div>
        </div>

        <!-- Tier Breakdown + Recent Users -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Tier Breakdown -->
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 class="font-bold text-sm text-gray-900 flex items-center gap-2 mb-5">
              <mat-icon class="text-[18px] text-gray-400">pie_chart</mat-icon> Plan Breakdown
            </h3>
            <div class="space-y-4">
              <div>
                <div class="flex justify-between text-xs font-bold mb-1.5">
                  <span class="text-gray-600">Free</span>
                  <span class="text-gray-400">{{ metrics()?.tierBreakdown?.free || 0 }}</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-3">
                  <div class="bg-gray-400 h-3 rounded-full transition-all" [style.width.%]="tierPercent('free')"></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-xs font-bold mb-1.5">
                  <span class="text-blue-600">Pro — \$14/mo</span>
                  <span class="text-gray-400">{{ metrics()?.proUsers || 0 }}</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-3">
                  <div class="bg-blue-500 h-3 rounded-full transition-all" [style.width.%]="tierPercent('pro')"></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-xs font-bold mb-1.5">
                  <span class="text-purple-600">Business — \$22/mo</span>
                  <span class="text-gray-400">{{ metrics()?.businessUsers || 0 }}</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-3">
                  <div class="bg-purple-500 h-3 rounded-full transition-all" [style.width.%]="tierPercent('business')"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Signups -->
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:col-span-2">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-sm text-gray-900 flex items-center gap-2">
                <mat-icon class="text-[18px] text-gray-400">person_add</mat-icon> Recent Signups
              </h3>
              <a routerLink="/app-admin/users" class="text-xs text-blue-600 font-bold hover:underline">View all</a>
            </div>
            @if ((metrics()?.recentUsers || []).length === 0) {
              <p class="text-gray-400 text-sm py-6 text-center">No users yet.</p>
            } @else {
              <div class="space-y-3">
                @for (user of metrics()?.recentUsers || []; track user.uid) {
                  <div class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                           [class]="user.tier === 'pro' ? 'bg-blue-100 text-blue-600' : user.tier === 'business' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'">
                        {{ (user.displayName || user.email)[0].toUpperCase() }}
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-bold text-gray-900 truncate">{{ user.displayName || 'No name' }}</p>
                        <p class="text-xs text-gray-400 truncate">{{ user.businessName || user.email }}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-3 shrink-0">
                      @if (user.siteSlug) {
                        <a [href]="'/site/' + user.siteSlug" target="_blank" class="text-xs text-blue-500 hover:underline font-mono hidden sm:inline">
                          /{{ user.siteSlug }}
                        </a>
                      }
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                            [class]="user.tier === 'free' ? 'bg-gray-100 text-gray-500' : user.tier === 'pro' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'">
                        {{ user.tier }}
                      </span>
                      <span class="text-[10px] text-gray-400 hidden md:inline">{{ user.createdAt | date:'shortDate' }}</span>
                    </div>
                  </div>
                }
              </div>
            }
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

  signupChart = computed(() => this.buildChart(this.metrics()?.signupsByDate || {}));
  enquiryChart = computed(() => this.buildChart(this.metrics()?.enquiriesByDate || {}));

  maxSignup = computed(() => Math.max(...this.signupChart().map(d => d.count), 1));
  maxEnquiry = computed(() => Math.max(...this.enquiryChart().map(d => d.count), 1));

  conversionRate = computed(() => {
    const m = this.metrics();
    if (!m || m.totalUsers === 0) return 0;
    return ((m.proUsers + m.businessUsers) / m.totalUsers) * 100;
  });

  setupRate = computed(() => {
    const m = this.metrics();
    if (!m || m.totalUsers === 0) return 0;
    return (m.setupComplete / m.totalUsers) * 100;
  });

  async ngOnInit() {
    await this.loadMetrics();
  }

  refresh() {
    this.loading.set(true);
    this.loadMetrics();
  }

  private async loadMetrics() {
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

  tierPercent(tier: 'free' | 'pro' | 'business'): number {
    const m = this.metrics();
    if (!m || m.totalUsers === 0) return 0;
    const count = tier === 'free' ? (m.tierBreakdown?.free || 0) :
                  tier === 'pro' ? m.proUsers : m.businessUsers;
    return (count / m.totalUsers) * 100;
  }

  private buildChart(data: Record<string, number>): Array<{ date: string; count: number }> {
    const days: Array<{ date: string; count: number }> = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, count: data[key] || 0 });
    }
    return days;
  }
}
