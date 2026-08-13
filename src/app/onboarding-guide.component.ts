import { Component, inject, signal, computed, output, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from './data.service';
import { getPreset } from './presets';
import { BusinessType } from './types';
import {
  ActivationStep,
  activationSteps,
  activationProgress,
  nextStepIndex,
  isBrandingTouched,
  areServicesEdited,
} from './activation';

/** Set by the dashboard when the owner copies their public link. */
export const LINK_SHARED_KEY = 'bf_link_shared';

@Component({
  selector: 'app-onboarding-guide',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    @if (!dismissed()) {
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <!-- Header -->
        <div class="bg-gradient-to-r from-blue-600 to-blue-700 p-5 md:p-6 text-white relative overflow-hidden">
          <div class="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div class="relative flex items-start justify-between">
            <div>
              <h2 class="text-lg md:text-xl font-black tracking-tight mb-1">Get your first customer</h2>
              <p class="text-blue-100 text-sm font-medium">{{ progress().done }} of {{ progress().total }} done — finish these and you're ready for enquiries.</p>
            </div>
            <button (click)="dismiss()" class="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0" title="Dismiss guide">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- Progress — real completion, not slide position -->
          <div class="mt-4 flex items-center gap-3">
            <div class="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div class="h-full bg-white rounded-full transition-all duration-500" [style.width.%]="progress().percent"></div>
            </div>
            <span class="text-xs font-bold text-blue-100">{{ progress().percent }}%</span>
          </div>
        </div>

        <!-- Focused step -->
        <div class="p-5 md:p-6">
          <div class="flex items-start gap-4 mb-6">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                 [class]="stepBgClass(current().color)">
              <mat-icon class="text-white">{{ current().icon }}</mat-icon>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-bold text-gray-900 mb-1 flex items-center gap-2">
                {{ current().title }}
                @if (current().done) {
                  <span class="inline-flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-0.5 rounded-full">
                    <mat-icon class="text-[14px]">check</mat-icon> Done
                  </span>
                }
              </h3>
              <p class="text-sm text-gray-500 leading-relaxed">{{ current().description }}</p>
              <a [routerLink]="current().route" [queryParams]="current().queryParams || {}"
                 class="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm">
                {{ current().action }}
                <mat-icon class="text-[14px]">arrow_forward</mat-icon>
              </a>
            </div>
          </div>

          <!-- Checklist -->
          <div class="flex items-center justify-between border-t border-gray-100 pt-4">
            <div class="flex gap-3 overflow-x-auto pb-1">
              @for (step of steps(); track step.id; let i = $index) {
                <button (click)="focused.set(i)"
                        class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                        [class]="i === focusedIndex() ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'">
                  <div class="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px]"
                       [class]="step.done ? 'bg-green-500' : stepBgClass(step.color)">
                    @if (step.done) {
                      <mat-icon class="text-[12px]">check</mat-icon>
                    } @else {
                      {{ i + 1 }}
                    }
                  </div>
                  <span class="hidden sm:inline" [class.line-through]="step.done" [class.text-gray-400]="step.done">{{ step.title }}</span>
                </button>
              }
            </div>

            <div class="flex items-center gap-2 shrink-0 ml-4">
              <button (click)="dismiss()" class="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                Hide
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class OnboardingGuideComponent {
  private data = inject(DataService);
  private platformId = inject(PLATFORM_ID);

  dismissed = signal(false);
  guideDismissed = output<void>();

  /** Step the user clicked on, if any; otherwise the first outstanding one. */
  focused = signal<number | null>(null);

  steps = computed<ActivationStep[]>(() => {
    const profile = this.data.profile();
    const seeded = getPreset(profile.type as BusinessType)?.suggestedServices.map(s => s.name) || [];
    return activationSteps({
      published: this.data.isSetupComplete(),
      brandingTouched: isBrandingTouched(this.data.customization().branding),
      servicesEdited: areServicesEdited(this.data.services(), seeded),
      linkShared: this.linkShared(),
      enquiryCount: this.data.enquiries().length,
    });
  });

  progress = computed(() => activationProgress(this.steps()));
  focusedIndex = computed(() => this.focused() ?? nextStepIndex(this.steps()));
  current = computed(() => this.steps()[this.focusedIndex()]);

  private linkShared(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    try {
      return !!localStorage.getItem(LINK_SHARED_KEY);
    } catch {
      return false;
    }
  }

  dismiss() {
    this.dismissed.set(true);
    this.guideDismissed.emit();
  }

  stepBgClass(color: string): string {
    const map: Record<string, string> = {
      blue: 'bg-blue-500',
      purple: 'bg-purple-500',
      green: 'bg-green-500',
      orange: 'bg-orange-500',
      pink: 'bg-pink-500',
      gray: 'bg-gray-500',
    };
    return map[color] || 'bg-blue-500';
  }
}
