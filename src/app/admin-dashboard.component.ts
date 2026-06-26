import { Component, inject, OnInit, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DataService } from './data.service';
import { AnalyticsService } from './analytics.service';
import { AuthService } from './auth.service';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { OnboardingGuideComponent } from './onboarding-guide.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MatIconModule, OnboardingGuideComponent],
  template: `
    <div class="flex flex-col gap-6">
      @if (showOnboarding()) {
        <app-onboarding-guide (guideDismissed)="dismissOnboarding()"></app-onboarding-guide>
      }
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-gray-900">Welcome back!</h2>
        <p class="text-gray-500 text-sm">Here's what's happening with your business today.</p>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
        <!-- Card 1 -->
        <div class="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-sm border border-gray-200/60 flex flex-col justify-between hover:shadow-md transition-shadow duration-200">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <mat-icon class="text-sm">mail</mat-icon>
            </div>
            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Enquiries</span>
          </div>
          <div class="flex items-end justify-between">
            <span class="text-3xl font-bold text-gray-900">{{ enquiries().length }}</span>
            <span class="text-blue-500 text-xs font-bold bg-blue-50 px-2 py-1 rounded">All time</span>
          </div>
        </div>
        
        <!-- Card 2 -->
        <div class="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-sm border border-gray-200/60 flex flex-col justify-between hover:shadow-md transition-shadow duration-200">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <mat-icon class="text-sm">new_releases</mat-icon>
            </div>
            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">New Enquiries</span>
          </div>
          <div class="flex items-end justify-between">
            <span class="text-3xl font-bold text-gray-900">{{ newEnquiries() }}</span>
            <span class="text-green-500 text-xs font-bold bg-green-50 px-2 py-1 rounded">Action required</span>
          </div>
        </div>
        
        <!-- Card 3 -->
        <div class="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-sm border border-gray-200/60 flex flex-col justify-between hover:shadow-md transition-shadow duration-200">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <mat-icon class="text-sm">visibility</mat-icon>
            </div>
            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Page Views</span>
          </div>
          <div class="flex items-end justify-between">
            <span class="text-3xl font-bold text-gray-900">{{ analyticsService.data().totalViews }}</span>
            <span class="text-purple-500 text-xs font-bold bg-purple-50 px-2 py-1 rounded">{{ analyticsService.viewsLast7Days() }} this week</span>
          </div>
        </div>

        <!-- Card 4 -->
        <div class="bg-blue-600 rounded-2xl p-5 shadow-lg shadow-blue-200/50 flex flex-col justify-between hover:shadow-xl transition-shadow duration-200">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center">
              <mat-icon class="text-sm">trending_up</mat-icon>
            </div>
            <span class="text-xs font-bold text-white/80 uppercase tracking-wider">Conversion Rate</span>
          </div>
          <div class="flex items-end justify-between text-white">
            <span class="text-3xl font-bold">{{ conversionRate() | number:'1.0-1' }}%</span>
            <div class="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Views Chart -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-sm text-gray-900 flex items-center gap-2"><mat-icon class="text-[18px] text-gray-400">analytics</mat-icon> Page Views (14 days)</h3>
          <span class="text-xs text-gray-500 font-bold">{{ analyticsService.viewsLast30Days() }} views this month</span>
        </div>
        <div class="flex items-end gap-1 h-24">
          @for (day of analyticsService.dailyViewsChart(); track day.date) {
            <div class="flex-1 flex flex-col items-center gap-1">
              <div class="w-full bg-blue-100 rounded-t-sm min-h-[2px] transition-all" [style.height.px]="maxChartView() > 0 ? (day.views / maxChartView()) * 80 + 2 : 2" [title]="day.date + ': ' + day.views + ' views'"></div>
            </div>
          }
        </div>
        <div class="flex justify-between mt-1 text-[9px] text-gray-400">
          <span>14 days ago</span>
          <span>Today</span>
        </div>
      </div>

      <!-- Main Dashboard Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Recent Activity Timeline -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-96">
          <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
            <h3 class="font-bold text-sm text-gray-900 flex items-center gap-2"><mat-icon class="text-[18px] text-gray-400">history</mat-icon> Recent Activity</h3>
          </div>
          <div class="flex-1 overflow-y-auto p-5">
            @if (activities().length === 0) {
              <div class="h-full flex items-center justify-center text-gray-400 text-sm">No recent activity</div>
            } @else {
              <div class="space-y-6">
                @for (activity of activities(); track activity.id) {
                  <div class="flex gap-4">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
                         [class.bg-blue-100]="activity.type === 'enquiry_received'" [class.text-blue-600]="activity.type === 'enquiry_received'"
                         [class.bg-orange-100]="activity.type === 'status_changed'" [class.text-orange-600]="activity.type === 'status_changed'"
                         [class.bg-gray-100]="activity.type === 'note_added'" [class.text-gray-600]="activity.type === 'note_added'">
                      <mat-icon class="text-[14px]">
                         {{ activity.type === 'enquiry_received' ? 'mail' : activity.type === 'status_changed' ? 'swap_horiz' : 'note' }}
                      </mat-icon>
                    </div>
                    <div>
                      <h4 class="text-sm font-bold text-gray-900">{{ activity.title }}</h4>
                      <p class="text-xs text-gray-500 mt-1">{{ activity.description }}</p>
                      <p class="text-[10px] text-gray-400 mt-2">{{ activity.date | date:'short' }}</p>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Most Requested Services Chart -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-96">
          <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
            <h3 class="font-bold text-sm text-gray-900 flex items-center gap-2"><mat-icon class="text-[18px] text-gray-400">bar_chart</mat-icon> Most Requested Services</h3>
          </div>
          <div class="flex-1 p-5 flex flex-col justify-end gap-4">
            @for (item of topServices(); track item.name) {
              <div>
                <div class="flex justify-between text-xs font-bold mb-1">
                  <span class="text-gray-700">{{ item.name }}</span>
                  <span class="text-gray-500">{{ item.count }} leads</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-3">
                  <div class="bg-blue-500 h-3 rounded-full" [style.width.%]="(item.count / maxServiceCount()) * 100"></div>
                </div>
              </div>
            }
            @if (topServices().length === 0) {
              <div class="h-full flex items-center justify-center text-gray-400 text-sm pb-10">Not enough data</div>
            }
          </div>
        </div>
        
      </div>

      <!-- Recent Enquiries -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
        <div class="p-5 border-b border-gray-100 flex justify-between items-center">
          <h3 class="font-bold text-lg text-gray-900">Recent Enquiries</h3>
        </div>
        <div class="flex-1 overflow-hidden">
          @if (enquiries().length === 0) {
            <div class="p-8 text-center text-gray-500 flex flex-col items-center">
               <mat-icon class="text-4xl text-gray-300 mb-2">inbox</mat-icon>
               <p class="text-sm font-medium">No enquiries yet.</p>
            </div>
          } @else {
            <table class="w-full text-left">
              <thead class="bg-gray-50 text-[10px] uppercase text-gray-400 font-bold">
                <tr>
                  <th class="px-6 py-3">Client</th>
                  <th class="px-6 py-3">Service</th>
                  <th class="px-6 py-3">Date</th>
                  <th class="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody class="text-sm divide-y divide-gray-50">
                @for (enquiry of enquiries().slice(0, 5); track enquiry.id) {
                  <tr class="hover:bg-gray-50/50 transition-colors">
                    <td class="px-6 py-4 font-semibold text-gray-900">{{ enquiry.name }}</td>
                    <td class="px-6 py-4 text-gray-600">{{ enquiry.serviceInterest }}</td>
                    <td class="px-6 py-4 text-gray-500">{{ enquiry.date | date:'shortDate' }}</td>
                    <td class="px-6 py-4">
                      <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                            [class.bg-blue-100]="enquiry.status === 'New'"
                            [class.text-blue-600]="enquiry.status === 'New'"
                            [class.bg-gray-100]="enquiry.status !== 'New'"
                            [class.text-gray-600]="enquiry.status !== 'New'">
                        {{ enquiry.status }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </div>
    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  private dataService = inject(DataService);
  analyticsService = inject(AnalyticsService);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  enquiries = this.dataService.enquiries;
  activities = this.dataService.activities;

  private onboardingDismissed = signal(false);
  showOnboarding = computed(() => {
    if (this.onboardingDismissed()) return false;
    if (isPlatformBrowser(this.platformId)) {
      if (localStorage.getItem('bf_onboarding_dismissed')) return false;
    }
    return this.enquiries().length === 0;
  });

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user) {
      this.analyticsService.loadAnalytics(user.uid);
    }
  }

  dismissOnboarding() {
    this.onboardingDismissed.set(true);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('bf_onboarding_dismissed', '1');
    }
  }

  maxChartView() {
    const chart = this.analyticsService.dailyViewsChart();
    return Math.max(...chart.map(d => d.views), 1);
  }
  
  newEnquiries() {
    return this.enquiries().filter(e => e.status === 'New').length;
  }
  
  conversionRate() {
    const total = this.enquiries().length;
    if (total === 0) return 0;
    const won = this.enquiries().filter(e => e.status === 'Won' || e.status === 'Booked').length;
    return (won / total) * 100;
  }
  
  topServices() {
    const counts = this.enquiries().reduce((acc, e) => {
      acc[e.serviceInterest] = (acc[e.serviceInterest] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
  
  maxServiceCount() {
    const services = this.topServices();
    return services.length > 0 ? services[0].count : 1;
  }
}
