import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from './data.service';
import { AiService } from './ai.service';
import { AnalyticsService } from './analytics.service';
import { AuthService } from './auth.service';
import { SubscriptionService } from './subscription.service';
import { ToastService } from './toast.service';
import { GrowthReport, GrowthRecommendation, MarketingContentType, Enquiry, SavedRecommendation, RecommendationType, Service } from './types';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-admin-growth',
  standalone: true,
  imports: [MatIconModule, FormsModule, DatePipe, RouterLink],
  template: `
    <div class="max-w-5xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex justify-between items-start">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <div class="w-8 h-8 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center shadow-sm">
              <mat-icon class="text-white text-[18px]">trending_up</mat-icon>
            </div>
            Growth Coach
          </h2>
          <p class="text-gray-500 text-sm mt-1">AI-powered insights to help you get more customers.</p>
        </div>
        <button (click)="generateReport()" [disabled]="isGenerating()"
          class="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
          @if (isGenerating()) {
            <span class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> Analysing...
          } @else {
            <mat-icon class="text-[18px]">auto_awesome</mat-icon> Generate Report
          }
        </button>
      </div>

      @if (!subService.canUseGrowthAi()) {
        <div class="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex items-center gap-4">
          <mat-icon class="text-emerald-500 text-[28px]">lock</mat-icon>
          <div class="flex-1">
            <p class="font-bold text-gray-900 text-sm">Unlock Full AI Growth Reports</p>
            <p class="text-xs text-gray-500">Free plan shows basic metrics and template drafts. Upgrade to Pro for AI-powered recommendations and drafting.</p>
          </div>
          <a routerLink="/pricing" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0">Upgrade</a>
        </div>
      }

      <!-- Metric Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <mat-icon class="text-[16px]">visibility</mat-icon>
            </div>
            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Views (7d)</span>
          </div>
          <span class="text-2xl font-bold text-gray-900">{{ analyticsService.viewsLast7Days() }}</span>
        </div>
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <mat-icon class="text-[16px]">mail</mat-icon>
            </div>
            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Enquiries</span>
          </div>
          <span class="text-2xl font-bold text-gray-900">{{ enquiries().length }}</span>
        </div>
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-7 h-7 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <mat-icon class="text-[16px]">percent</mat-icon>
            </div>
            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Conversion</span>
          </div>
          <span class="text-2xl font-bold text-gray-900">{{ conversionRate() }}%</span>
        </div>
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <mat-icon class="text-[16px]">schedule</mat-icon>
            </div>
            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Follow-ups</span>
          </div>
          <span class="text-2xl font-bold" [class.text-amber-600]="needsFollowUp().length > 0" [class.text-gray-900]="needsFollowUp().length === 0">{{ needsFollowUp().length }}</span>
        </div>
      </div>

      <!-- AI Summary -->
      @if (report()) {
        <div class="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 shadow-sm">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-6 h-6 bg-gradient-to-tr from-emerald-400 to-teal-400 rounded-md flex items-center justify-center">
              <mat-icon class="text-white text-[14px]">auto_awesome</mat-icon>
            </div>
            <h3 class="text-white font-bold text-sm">AI Growth Summary</h3>
            <span class="ml-auto text-gray-500 text-[10px]">{{ report()!.createdAt | date:'medium' }}</span>
          </div>
          <p class="text-gray-300 text-sm leading-relaxed">{{ report()!.generatedSummary }}</p>
          @if (report()!.suggestedActions.length > 0) {
            <div class="mt-4 flex flex-wrap gap-2">
              @for (action of report()!.suggestedActions; track action) {
                <span class="px-3 py-1 bg-white/10 text-emerald-300 rounded-full text-[11px] font-bold">{{ action }}</span>
              }
            </div>
          }
        </div>
      }

      <!-- Two Column: Recommendations + Follow-ups -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Recommendations -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div class="p-5 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50 rounded-t-2xl">
            <mat-icon class="text-[18px] text-gray-400">lightbulb</mat-icon>
            <h3 class="font-bold text-sm text-gray-900">Recommendations</h3>
            @if (dismissedCount() > 0) {
              <button (click)="showDismissed.set(!showDismissed())" class="ml-auto text-[10px] text-gray-400 hover:text-gray-600 font-bold">
                {{ showDismissed() ? 'Hide' : 'Show' }} dismissed ({{ dismissedCount() }})
              </button>
            }
          </div>
          <div class="p-5 flex-1 space-y-4 max-h-[600px] overflow-y-auto">
            @if (visibleRecommendations().length === 0) {
              <div class="text-center py-8 text-gray-400">
                <mat-icon class="text-3xl mb-2">psychology</mat-icon>
                <p class="text-sm font-medium">Generate a report to get personalised recommendations.</p>
              </div>
            }
            @for (rec of visibleRecommendations(); track rec.id) {
              <div class="p-4 rounded-xl border transition-all" [class.border-red-200]="rec.priority === 'high' && rec.status !== 'applied' && rec.status !== 'dismissed'" [class.bg-red-50]="rec.priority === 'high' && rec.status !== 'applied' && rec.status !== 'dismissed'" [class.border-amber-200]="rec.priority === 'medium' && rec.status !== 'applied' && rec.status !== 'dismissed'" [class.bg-amber-50]="rec.priority === 'medium' && rec.status !== 'applied' && rec.status !== 'dismissed'" [class.border-green-200]="rec.priority === 'low' && rec.status !== 'applied' && rec.status !== 'dismissed'" [class.bg-green-50]="rec.priority === 'low' && rec.status !== 'applied' && rec.status !== 'dismissed'" [class.border-gray-200]="rec.status === 'applied' || rec.status === 'dismissed'" [class.bg-gray-50]="rec.status === 'applied' || rec.status === 'dismissed'" [class.opacity-60]="rec.status === 'dismissed'">
                <div class="flex items-start gap-3">
                  <span class="w-2 h-2 rounded-full mt-1.5 shrink-0" [class.bg-red-500]="rec.priority === 'high'" [class.bg-amber-500]="rec.priority === 'medium'" [class.bg-green-500]="rec.priority === 'low'"></span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <p class="font-bold text-gray-900 text-sm">{{ rec.title }}</p>
                      @if (rec.status === 'applied') {
                        <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-600 uppercase">Done</span>
                      }
                      @if (rec.status === 'drafted') {
                        <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-600 uppercase">Drafted</span>
                      }
                      @if (rec.status === 'dismissed') {
                        <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-200 text-gray-500 uppercase">Dismissed</span>
                      }
                      <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                        [class.bg-red-100]="rec.priority === 'high'" [class.text-red-600]="rec.priority === 'high'"
                        [class.bg-amber-100]="rec.priority === 'medium'" [class.text-amber-600]="rec.priority === 'medium'"
                        [class.bg-green-100]="rec.priority === 'low'" [class.text-green-600]="rec.priority === 'low'">{{ rec.priority }}</span>
                    </div>
                    <p class="text-xs text-gray-600 mt-1">{{ rec.reason }}</p>
                    <p class="text-xs text-gray-500 mt-2 italic">{{ rec.suggestion }}</p>

                    <!-- Action buttons -->
                    @if (rec.status !== 'applied' && rec.status !== 'dismissed') {
                      <div class="flex flex-wrap gap-2 mt-3">
                        <button (click)="draftImprovement(rec)" [disabled]="isDrafting() === rec.id"
                          class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50 flex items-center gap-1">
                          @if (isDrafting() === rec.id) {
                            <span class="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span> Drafting...
                          } @else {
                            <mat-icon class="text-[14px]">edit_note</mat-icon> Draft Improvement
                          }
                        </button>
                        @if (rec.type === 'lead-follow-up') {
                          <a routerLink="/admin/inbox" class="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1">
                            <mat-icon class="text-[14px]">inbox</mat-icon> Open Inbox
                          </a>
                        }
                        <button (click)="markDone(rec)" class="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1">
                          <mat-icon class="text-[14px]">check</mat-icon> Done
                        </button>
                        <button (click)="dismiss(rec)" class="bg-white border border-gray-200 hover:bg-gray-50 text-gray-400 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1">
                          <mat-icon class="text-[14px]">close</mat-icon> Dismiss
                        </button>
                      </div>
                    }
                    @if (rec.status === 'dismissed') {
                      <div class="mt-3">
                        <button (click)="restore(rec)" class="text-[11px] text-gray-500 hover:text-gray-700 font-bold">Restore</button>
                      </div>
                    }

                    <!-- Draft preview -->
                    @if (rec.draftContent) {
                      <div class="mt-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div class="flex items-center justify-between mb-2">
                          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Draft Preview</span>
                          <div class="flex gap-1">
                            @if (rec.type === 'faq' && rec.status !== 'applied') {
                              <button (click)="addAsFaq(rec)" class="bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1 rounded text-[10px] font-bold transition-colors flex items-center gap-1">
                                <mat-icon class="text-[12px]">add</mat-icon> Add as FAQ
                              </button>
                            }
                            @if (rec.type === 'service' && rec.status !== 'applied') {
                              <button (click)="addAsService(rec)" class="bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1 rounded text-[10px] font-bold transition-colors flex items-center gap-1">
                                <mat-icon class="text-[12px]">add</mat-icon> Add as Service
                              </button>
                            }
                            <button (click)="copyDraft(rec)" class="bg-gray-50 hover:bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold transition-colors flex items-center gap-1">
                              <mat-icon class="text-[12px]">content_copy</mat-icon> {{ copiedId() === rec.id ? 'Copied!' : 'Copy' }}
                            </button>
                          </div>
                        </div>
                        <pre class="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{{ rec.draftContent }}</pre>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Leads Needing Follow-up -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div class="p-5 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50 rounded-t-2xl">
            <mat-icon class="text-[18px] text-gray-400">people</mat-icon>
            <h3 class="font-bold text-sm text-gray-900">Leads Needing Follow-up</h3>
          </div>
          <div class="flex-1 max-h-96 overflow-y-auto">
            @if (needsFollowUp().length === 0) {
              <div class="p-8 text-center text-gray-400">
                <mat-icon class="text-3xl mb-2">check_circle</mat-icon>
                <p class="text-sm font-medium">All caught up! No leads need follow-up.</p>
              </div>
            }
            <div class="divide-y divide-gray-50">
              @for (lead of needsFollowUp(); track lead.id) {
                <a routerLink="/admin/inbox" class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    [class.bg-red-100]="lead.leadScore === 'Hot'" [class.text-red-600]="lead.leadScore === 'Hot'"
                    [class.bg-orange-100]="lead.leadScore === 'Warm'" [class.text-orange-600]="lead.leadScore === 'Warm'"
                    [class.bg-blue-100]="lead.leadScore !== 'Hot' && lead.leadScore !== 'Warm'" [class.text-blue-600]="lead.leadScore !== 'Hot' && lead.leadScore !== 'Warm'">
                    {{ lead.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-bold text-gray-900 text-sm truncate">{{ lead.name }}</p>
                    <p class="text-xs text-gray-500 truncate">{{ lead.serviceInterest }}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase" [class.bg-red-100]="lead.leadScore === 'Hot'" [class.text-red-600]="lead.leadScore === 'Hot'" [class.bg-orange-100]="lead.leadScore === 'Warm'" [class.text-orange-600]="lead.leadScore === 'Warm'" [class.bg-blue-100]="lead.leadScore !== 'Hot' && lead.leadScore !== 'Warm'" [class.text-blue-600]="lead.leadScore !== 'Hot' && lead.leadScore !== 'Warm'">{{ lead.leadScore || 'New' }}</span>
                    <p class="text-[10px] text-gray-400 mt-1">{{ daysSince(lead.date) }}</p>
                  </div>
                </a>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Marketing Quick Actions -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div class="p-5 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50 rounded-t-2xl">
          <mat-icon class="text-[18px] text-gray-400">campaign</mat-icon>
          <h3 class="font-bold text-sm text-gray-900">Marketing Content Generator</h3>
          @if (!subService.canUseMarketing()) {
            <span class="ml-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-600">Pro</span>
          }
        </div>
        <div class="p-5">
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            @for (action of marketingActions; track action.type) {
              <button (click)="selectMarketingAction(action.type)" [disabled]="isGeneratingMarketing()"
                class="p-4 rounded-xl border text-left transition-all hover:shadow-sm"
                [class.border-emerald-300]="selectedMarketing() === action.type" [class.bg-emerald-50]="selectedMarketing() === action.type"
                [class.border-gray-200]="selectedMarketing() !== action.type" [class.hover:border-gray-300]="selectedMarketing() !== action.type">
                <mat-icon class="text-[20px] mb-2" [class.text-emerald-600]="selectedMarketing() === action.type" [class.text-gray-400]="selectedMarketing() !== action.type">{{ action.icon }}</mat-icon>
                <p class="text-sm font-bold text-gray-900">{{ action.label }}</p>
                <p class="text-[10px] text-gray-500 mt-0.5">{{ action.desc }}</p>
              </button>
            }
          </div>

          @if (selectedMarketing()) {
            <div class="space-y-3">
              <input type="text" [(ngModel)]="marketingTopic" [placeholder]="marketingPlaceholder()" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm">
              <button (click)="generateMarketing()" [disabled]="isGeneratingMarketing() || (!subService.canUseMarketing() && !subService.canUseAi())"
                class="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                @if (isGeneratingMarketing()) {
                  <span class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> Generating...
                } @else {
                  <mat-icon class="text-[16px]">auto_awesome</mat-icon> Generate {{ marketingLabel() }}
                }
              </button>
            </div>
          }

          @if (marketingResult()) {
            <div class="mt-4 space-y-3">
              <textarea rows="6" [(ngModel)]="marketingResultText" class="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-700 text-sm bg-gray-50"></textarea>
              <div class="flex justify-end gap-2">
                <button (click)="copyMarketing()" class="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                  <mat-icon class="text-[16px]">content_copy</mat-icon> {{ marketingCopied() ? 'Copied!' : 'Copy' }}
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class AdminGrowthComponent implements OnInit {
  private dataService = inject(DataService);
  private aiService = inject(AiService);
  analyticsService = inject(AnalyticsService);
  private authService = inject(AuthService);
  subService = inject(SubscriptionService);
  private toast = inject(ToastService);

  enquiries = this.dataService.enquiries;
  report = signal<GrowthReport | null>(null);
  isGenerating = signal(false);
  isDrafting = signal<string | null>(null);
  copiedId = signal<string | null>(null);
  showDismissed = signal(false);
  selectedMarketing = signal<MarketingContentType | null>(null);
  marketingTopic = '';
  marketingResultText = '';
  isGeneratingMarketing = signal(false);
  marketingResult = signal(false);
  marketingCopied = signal(false);

  marketingActions: { type: MarketingContentType; label: string; icon: string; desc: string }[] = [
    { type: 'facebook', label: 'Facebook Post', icon: 'thumb_up', desc: 'Engaging post for your page' },
    { type: 'instagram', label: 'Instagram Caption', icon: 'photo_camera', desc: 'Caption with hashtags' },
    { type: 'google-business', label: 'Google Business', icon: 'storefront', desc: 'Local SEO update post' },
    { type: 'review-request', label: 'Review Request', icon: 'star', desc: 'Ask for customer reviews' },
    { type: 'service-promo', label: 'Service Promo', icon: 'local_offer', desc: 'Promote a service' },
    { type: 'seasonal-offer', label: 'Seasonal Offer', icon: 'celebration', desc: 'Seasonal marketing' },
  ];

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user) {
      this.analyticsService.loadAnalytics(user.uid);
    }
  }

  conversionRate(): number {
    const total = this.enquiries().length;
    if (total === 0) return 0;
    const won = this.enquiries().filter(e => e.status === 'Won' || e.status === 'Booked').length;
    return Math.round((won / total) * 1000) / 10;
  }

  needsFollowUp(): Enquiry[] {
    const today = new Date().toISOString().slice(0, 10);
    return this.enquiries().filter(e => {
      if (e.status === 'Won' || e.status === 'Lost') return false;
      if (!e.followUpDate) return e.status === 'New' || e.status === 'Contacted';
      return e.followUpDate <= today;
    });
  }

  visibleRecommendations(): SavedRecommendation[] {
    const all = this.dataService.savedRecommendations();
    if (this.showDismissed()) return all;
    return all.filter(r => r.status !== 'dismissed');
  }

  dismissedCount(): number {
    return this.dataService.savedRecommendations().filter(r => r.status === 'dismissed').length;
  }

  daysSince(dateStr: string): string {
    if (!dateStr) return '';
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  }

  async generateReport() {
    this.isGenerating.set(true);
    try {
      const result = await this.aiService.generateGrowthReport();
      if (result) {
        this.report.set(result);
        this.mergeRecommendations(result.recommendations);
        this.toast.success('Growth report generated!');
      } else {
        this.toast.error('Could not generate report. Please try again.');
      }
    } catch {
      this.toast.error('Failed to generate growth report.');
    } finally {
      this.isGenerating.set(false);
    }
  }

  private mergeRecommendations(newRecs: GrowthRecommendation[]) {
    const existing = this.dataService.savedRecommendations();
    const now = new Date().toISOString();
    const isAi = this.subService.canUseGrowthAi();
    const merged: SavedRecommendation[] = [];

    for (const saved of existing) {
      if (saved.status === 'dismissed' || saved.status === 'applied') {
        merged.push(saved);
      }
    }

    for (const rec of newRecs) {
      const match = existing.find(e => e.title === rec.title);
      if (match) {
        if (match.status === 'dismissed' || match.status === 'applied') continue;
        merged.push({
          ...match,
          reason: rec.reason,
          suggestion: rec.suggestion,
          priority: rec.priority,
          type: (rec.type as RecommendationType) || match.type || 'general',
          updatedAt: now,
        });
      } else {
        merged.push({
          id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          title: rec.title,
          reason: rec.reason,
          suggestion: rec.suggestion,
          priority: rec.priority,
          type: (rec.type as RecommendationType) || 'general',
          status: 'new',
          source: isAi ? 'ai' : 'template',
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    this.dataService.setRecommendations(merged);
  }

  async draftImprovement(rec: SavedRecommendation) {
    this.isDrafting.set(rec.id);
    try {
      const result = await this.aiService.draftRecommendation({
        title: rec.title,
        type: rec.type,
        suggestion: rec.suggestion,
      });
      if (result) {
        this.dataService.updateRecommendation(rec.id, {
          draftContent: result.draftContent,
          status: 'drafted',
        });
        this.toast.success(result.fallback ? 'Template draft generated.' : 'AI draft generated!');
      } else {
        this.toast.error('Failed to generate draft.');
      }
    } catch {
      this.toast.error('Failed to generate draft.');
    } finally {
      this.isDrafting.set(null);
    }
  }

  markDone(rec: SavedRecommendation) {
    this.dataService.updateRecommendation(rec.id, {
      status: 'applied',
      appliedAt: new Date().toISOString(),
    });
    this.toast.success('Recommendation marked as done.');
  }

  dismiss(rec: SavedRecommendation) {
    this.dataService.updateRecommendation(rec.id, {
      status: 'dismissed',
      dismissedAt: new Date().toISOString(),
    });
  }

  restore(rec: SavedRecommendation) {
    this.dataService.updateRecommendation(rec.id, {
      status: rec.draftContent ? 'drafted' : 'new',
      dismissedAt: undefined,
    });
  }

  async copyDraft(rec: SavedRecommendation) {
    if (!rec.draftContent) return;
    try {
      await navigator.clipboard.writeText(rec.draftContent);
      this.copiedId.set(rec.id);
      setTimeout(() => this.copiedId.set(null), 2000);
    } catch {
      this.toast.error('Failed to copy.');
    }
  }

  addAsFaq(rec: SavedRecommendation) {
    if (!rec.draftContent) return;
    const lines = rec.draftContent.split('\n').filter(l => l.trim());
    let question = '';
    let answer = '';
    for (const line of lines) {
      if (line.startsWith('Q:')) question = line.replace(/^Q:\s*/, '').trim();
      else if (line.startsWith('A:')) answer = line.replace(/^A:\s*/, '').trim();
      else if (question && !answer) answer += line.trim();
    }
    if (!question) {
      question = lines[0] || 'New FAQ';
      answer = lines.slice(1).join(' ') || rec.draftContent;
    }
    const currentFaqs = this.dataService.faqs();
    this.dataService.setFaqs([
      ...currentFaqs,
      { id: `faq_${Date.now()}`, question, answer },
    ]);
    this.dataService.updateRecommendation(rec.id, {
      status: 'applied',
      appliedAt: new Date().toISOString(),
    });
    this.toast.success('FAQ added to your site!');
  }

  addAsService(rec: SavedRecommendation) {
    if (!rec.draftContent) return;
    // Drafts follow the format: "service name\n\ndescription\n\nStarting from $price".
    const lines = rec.draftContent.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const name = lines[0].replace(/^(?:name|service)\s*:\s*/i, '').replace(/^\[|\]$/g, '').trim();
    let price = '';
    const descLines: string[] = [];
    for (const line of lines.slice(1)) {
      let match: RegExpMatchArray | null = null;
      if (/^(?:starting\s+(?:from|at)|price)\b/i.test(line)) {
        match = line.match(/\$?\s?[\d][\d.,]*\+?/);
      } else if (/^\$?[\d][\d.,]*\+?$/.test(line)) {
        match = line.match(/\$?[\d][\d.,]*\+?/);
      }
      if (match && !price) {
        const raw = match[0].replace(/\s+/g, '');
        price = raw.startsWith('$') ? raw : `$${raw}`;
        continue;
      }
      descLines.push(line);
    }
    const service: Service = {
      id: `svc_${Date.now()}`,
      name: name || 'New Service',
      description: descLines.join(' ').trim() || rec.suggestion,
    };
    if (price) service.price = price;
    this.dataService.setServices([...this.dataService.services(), service]);
    this.dataService.updateRecommendation(rec.id, {
      status: 'applied',
      appliedAt: new Date().toISOString(),
    });
    this.toast.success('Service added to your site!');
  }

  selectMarketingAction(type: MarketingContentType) {
    this.selectedMarketing.set(type);
    this.marketingResult.set(false);
    this.marketingResultText = '';
    this.marketingTopic = '';
  }

  marketingPlaceholder(): string {
    const type = this.selectedMarketing();
    if (type === 'seasonal-offer') return 'What season or occasion? e.g. Summer, Christmas';
    if (type === 'service-promo') return 'Which service to promote?';
    return 'What should the post be about? (optional)';
  }

  marketingLabel(): string {
    const action = this.marketingActions.find(a => a.type === this.selectedMarketing());
    return action?.label || 'Content';
  }

  async generateMarketing() {
    const type = this.selectedMarketing();
    if (!type) return;
    this.isGeneratingMarketing.set(true);
    try {
      const result = await this.aiService.generateMarketingContent(
        this.dataService.profile(),
        this.dataService.services(),
        type,
        this.marketingTopic || undefined
      );
      this.marketingResultText = result;
      this.marketingResult.set(true);
    } catch {
      this.toast.error('Failed to generate content.');
    } finally {
      this.isGeneratingMarketing.set(false);
    }
  }

  async copyMarketing() {
    try {
      await navigator.clipboard.writeText(this.marketingResultText);
      this.marketingCopied.set(true);
      setTimeout(() => this.marketingCopied.set(false), 2000);
    } catch {
      this.toast.error('Failed to copy.');
    }
  }
}
