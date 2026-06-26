import { Component, inject, signal, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SubscriptionService } from './subscription.service';

interface OnboardingStep {
  icon: string;
  title: string;
  description: string;
  action: string;
  route: string;
  color: string;
}

const STEPS: OnboardingStep[] = [
  {
    icon: 'inventory_2',
    title: 'Add your services',
    description: 'List what you offer — name, description, and pricing. These show on your public site and in the enquiry form dropdown.',
    action: 'Go to Content',
    route: '/admin/content',
    color: 'blue',
  },
  {
    icon: 'palette',
    title: 'Customise your brand',
    description: 'Set your logo, colors, fonts, button styles, and theme. Apply a quick preset or fine-tune every detail.',
    action: 'Open Customisation',
    route: '/admin/customisation',
    color: 'purple',
  },
  {
    icon: 'view_quilt',
    title: 'Build your page',
    description: 'Drag sections, pick layout variants, add images, and preview on desktop/tablet/mobile. Your public site updates live.',
    action: 'Open Page Builder',
    route: '/admin/builder',
    color: 'green',
  },
  {
    icon: 'dynamic_form',
    title: 'Set up your enquiry form',
    description: 'Add custom fields (dropdowns, dates, budgets, file uploads) so you capture the right info from every lead.',
    action: 'Open Form Builder',
    route: '/admin/form-builder',
    color: 'orange',
  },
  {
    icon: 'auto_awesome',
    title: 'Try AI tools',
    description: 'Generate business descriptions, draft email replies, create social media posts, and write Google Business updates — all powered by AI.',
    action: 'Open AI Tools',
    route: '/admin/ai',
    color: 'pink',
  },
  {
    icon: 'tune',
    title: 'Configure settings',
    description: 'Set up email notifications for new enquiries, manage your subscription, connect a custom domain, or delete your account.',
    action: 'Open Settings',
    route: '/admin/settings',
    color: 'gray',
  },
];

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
              <h2 class="text-lg md:text-xl font-black tracking-tight mb-1">Welcome to your dashboard!</h2>
              <p class="text-blue-100 text-sm font-medium">Here's a quick tour of what you can do. Click any step to jump in.</p>
            </div>
            <button (click)="dismiss()" class="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0" title="Dismiss guide">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- Progress -->
          <div class="mt-4 flex items-center gap-3">
            <div class="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div class="h-full bg-white rounded-full transition-all duration-500" [style.width.%]="progressPercent()"></div>
            </div>
            <span class="text-xs font-bold text-blue-100">{{ currentStep() + 1 }}/{{ steps.length }}</span>
          </div>
        </div>

        <!-- Step Content -->
        <div class="p-5 md:p-6">
          <!-- Current Step Detail -->
          <div class="flex items-start gap-4 mb-6">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                 [class]="stepBgClass(steps[currentStep()].color)">
              <mat-icon class="text-white">{{ steps[currentStep()].icon }}</mat-icon>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-bold text-gray-900 mb-1">{{ steps[currentStep()].title }}</h3>
              <p class="text-sm text-gray-500 leading-relaxed">{{ steps[currentStep()].description }}</p>
              <a [routerLink]="steps[currentStep()].route" class="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm">
                {{ steps[currentStep()].action }}
                <mat-icon class="text-[14px]">arrow_forward</mat-icon>
              </a>
            </div>
          </div>

          <!-- Step Dots Navigation -->
          <div class="flex items-center justify-between border-t border-gray-100 pt-4">
            <div class="flex gap-3 overflow-x-auto pb-1">
              @for (step of steps; track step.title; let i = $index) {
                <button (click)="currentStep.set(i)"
                        class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                        [class]="i === currentStep() ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'">
                  <div class="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px]"
                       [class]="stepBgClass(step.color)">
                    {{ i + 1 }}
                  </div>
                  <span class="hidden sm:inline">{{ step.title }}</span>
                </button>
              }
            </div>

            <div class="flex items-center gap-2 shrink-0 ml-4">
              <button (click)="prev()" [disabled]="currentStep() === 0"
                      class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                <mat-icon class="text-[18px]">chevron_left</mat-icon>
              </button>
              <button (click)="next()" [disabled]="currentStep() === steps.length - 1"
                      class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                <mat-icon class="text-[18px]">chevron_right</mat-icon>
              </button>
              <button (click)="dismiss()" class="ml-2 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                Skip tour
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class OnboardingGuideComponent {
  private subService = inject(SubscriptionService);
  dismissed = signal(false);
  currentStep = signal(0);
  guideDismissed = output<void>();

  steps = STEPS;

  progressPercent() {
    return ((this.currentStep() + 1) / this.steps.length) * 100;
  }

  next() {
    if (this.currentStep() < this.steps.length - 1) {
      this.currentStep.update(s => s + 1);
    }
  }

  prev() {
    if (this.currentStep() > 0) {
      this.currentStep.update(s => s - 1);
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
