import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DataService } from './data.service';
import { AiService } from './ai.service';
import { AuthService } from './auth.service';
import { BusinessType } from './types';
import { MatIconModule } from '@angular/material/icon';
import { BUSINESS_PRESETS, getPreset } from './presets';

@Component({
  selector: 'app-setup-wizard',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule],
  template: `
    <div class="min-h-screen bg-[#F5F5F7] py-8 lg:py-12 px-4 sm:px-6 lg:px-8 font-sans flex justify-center">
      <div class="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- Left Column: Form -->
        <div class="lg:col-span-5 bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-sm border border-gray-200/60 overflow-hidden flex flex-col h-fit">
          <div class="bg-gray-50/50 px-8 py-6 border-b border-gray-100">
             <div class="flex items-center justify-between mb-4">
               <div class="flex items-center gap-2">
                 <div class="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
                   <mat-icon class="text-[18px]">business</mat-icon>
                 </div>
                 <span class="font-bold text-gray-900 tracking-tight">BusinessFlow</span>
               </div>
               <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Setup Wizard</span>
             </div>
             
             <!-- Progress Indicator -->
             <div>
               <div class="flex justify-between text-xs font-bold mb-2">
                 <span class="text-blue-600">Step 1: Profile</span>
                 <span class="text-gray-400">100%</span>
               </div>
               <div class="w-full bg-gray-200 rounded-full h-1.5">
                 <div class="bg-blue-600 h-1.5 rounded-full" style="width: 100%"></div>
               </div>
             </div>
          </div>
          
          <form [formGroup]="form" (ngSubmit)="onReview()" class="p-8 space-y-8">
            <div class="space-y-6">
              
              <div>
                <span class="block text-sm font-bold text-gray-900 mb-1">Business Name *</span>
                <p class="text-[13px] text-gray-500 mb-2">What's the official name of your business?</p>
                <input type="text" formControlName="name" class="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none transition-all" [class.border-red-300]="form.get('name')?.invalid && form.get('name')?.touched" placeholder="e.g. Apex Cleaners">
                @if (form.get('name')?.invalid && form.get('name')?.touched) {
                   <p class="text-red-500 text-xs mt-1">Business name is required</p>
                }
              </div>
              
              <div>
                <span class="block text-sm font-bold text-gray-900 mb-1">Business Type *</span>
                <p class="text-[13px] text-gray-500 mb-2">This helps us generate the right services and FAQs for you.</p>
                <select formControlName="type" class="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none transition-all text-gray-900" [class.border-red-300]="form.get('type')?.invalid && form.get('type')?.touched">
                  <option value="" disabled>Select a type...</option>
                  @for (preset of presets; track preset.id) {
                    <option [value]="preset.id">{{ preset.label }}</option>
                  }
                  <option value="other">Other</option>
                </select>
                @if (form.get('type')?.invalid && form.get('type')?.touched) {
                   <p class="text-red-500 text-xs mt-1">Please select a business type</p>
                }
              </div>

              <div>
                <span class="block text-sm font-bold text-gray-900 mb-1">Tagline</span>
                <p class="text-[13px] text-gray-500 mb-2">A short, catchy phrase summarizing what you do.</p>
                <input type="text" formControlName="tagline" class="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none transition-all" placeholder="e.g. Professional cleaning you can trust.">
              </div>
              
              <div>
                <span class="block text-sm font-bold text-gray-900 mb-1">Email Address *</span>
                <p class="text-[13px] text-gray-500 mb-2">Where should we send new customer enquiries?</p>
                <input type="email" formControlName="email" class="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none transition-all" [class.border-red-300]="form.get('email')?.invalid && form.get('email')?.touched" placeholder="hello@example.com">
                @if (form.get('email')?.invalid && form.get('email')?.touched) {
                   <p class="text-red-500 text-xs mt-1">Please enter a valid email</p>
                }
              </div>
              
              <div>
                <span class="block text-sm font-bold text-gray-900 mb-1">Phone Number</span>
                <p class="text-[13px] text-gray-500 mb-2">Optional. Customers can use this to call you directly.</p>
                <input type="tel" formControlName="phone" class="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none transition-all" placeholder="(555) 123-4567">
              </div>

              <div>
                <span class="block text-sm font-bold text-gray-900 mb-1">Service Area / Location</span>
                <p class="text-[13px] text-gray-500 mb-2">The city or neighborhood where you operate.</p>
                <input type="text" formControlName="serviceArea" class="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none transition-all" placeholder="e.g. Greater Seattle Area">
              </div>
            </div>
            
            <div class="pt-6 mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-100">
              <div class="text-[13px] text-gray-500 flex items-center gap-1">
                 <mat-icon class="text-[16px]">auto_awesome</mat-icon> AI will generate the rest
              </div>
              <button type="button" (click)="onReview()" class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-full font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer">
                <span>Review &amp; continue</span>
                <mat-icon class="text-sm">arrow_forward</mat-icon>
              </button>
              @if (formError()) {
                <p class="text-red-500 text-sm font-medium w-full text-center mt-2">{{ formError() }}</p>
              }
            </div>
          </form>
        </div>

        <!-- Right Column: Live Preview -->
        <div class="lg:col-span-7 bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[800px] sticky top-8">
          <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
             <div class="flex gap-1.5">
               <div class="w-3 h-3 rounded-full bg-red-400"></div>
               <div class="w-3 h-3 rounded-full bg-yellow-400"></div>
               <div class="w-3 h-3 rounded-full bg-green-400"></div>
             </div>
             <div class="mx-auto bg-white px-3 py-1 rounded-md text-xs font-medium text-gray-400 shadow-sm border border-gray-100">Live Preview</div>
             <div class="w-10"></div>
          </div>
          <div class="flex-grow overflow-y-auto bg-white relative">
            <div class="absolute inset-0 pointer-events-none">
               
               <!-- Preview Header -->
               <div class="px-8 py-6 flex justify-between items-center">
                 <div class="font-bold text-lg text-gray-900 tracking-tight">{{ form.value.name || 'Your Business Name' }}</div>
                 <div class="bg-blue-60 text-blue-600 px-4 py-1.5 rounded-full text-xs font-bold bg-blue-50">Get a Quote</div>
               </div>

               <!-- Preview Hero -->
               <div class="px-8 py-16 text-center max-w-lg mx-auto">
                 <div class="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold mb-6">
                   <mat-icon class="text-[14px]">location_on</mat-icon>
                   {{ form.value.serviceArea || 'Your City / Area' }}
                 </div>
                 <h1 class="text-4xl font-black text-gray-900 tracking-tight leading-tight mb-4">
                   {{ getPreviewHeroCopy() || 'Spotless cleaning for a healthier, happier home.' }}
                 </h1>
                 <p class="text-gray-500 text-sm mb-8 leading-relaxed">
                   {{ form.value.tagline || 'Professional, reliable, and high-quality solutions tailored for you.' }}
                 </p>
                 <div class="bg-blue-600 text-white px-6 py-3 rounded-full text-sm font-bold inline-block shadow-sm">
                   {{ getPreviewCtaText() || 'Get Started' }}
                 </div>
               </div>

               <!-- Preview Badges -->
               <div class="border-y border-gray-100 py-6 bg-gray-50 flex justify-center gap-6 text-gray-400 text-xs font-medium">
                 @for(badge of getPreviewBadges(); track badge) {
                   <div class="flex items-center gap-1.5">
                     <mat-icon class="text-[14px]">verified</mat-icon>
                     {{ badge }}
                   </div>
                 }
               </div>

            </div>
          </div>
        </div>

        <!-- Review & Publish confirmation (preview-before-publish gate) -->
        @if (reviewing()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4">
            <div class="bg-white rounded-3xl shadow-xl border border-gray-100 max-w-md w-full p-8">
              <div class="flex items-center gap-2 mb-1">
                <mat-icon class="text-[20px] text-blue-600">rocket_launch</mat-icon>
                <h2 class="font-bold text-lg text-gray-900">Ready to go live?</h2>
              </div>
              <p class="text-sm text-gray-500 mb-5">Review the details below and check the live preview. Publishing makes your site <strong>publicly visible</strong> — you can change anything later from your dashboard.</p>
              <dl class="space-y-2 text-sm bg-gray-50 rounded-2xl p-4 mb-6">
                <div class="flex justify-between gap-4"><dt class="text-gray-500">Business</dt><dd class="font-medium text-gray-900 text-right">{{ form.value.name }}</dd></div>
                <div class="flex justify-between gap-4"><dt class="text-gray-500">Type</dt><dd class="font-medium text-gray-900 text-right">{{ selectedTypeLabel() }}</dd></div>
                @if (form.value.tagline) {
                  <div class="flex justify-between gap-4"><dt class="text-gray-500">Tagline</dt><dd class="font-medium text-gray-900 text-right">{{ form.value.tagline }}</dd></div>
                }
                <div class="flex justify-between gap-4"><dt class="text-gray-500">Enquiries to</dt><dd class="font-medium text-gray-900 text-right">{{ form.value.email }}</dd></div>
                @if (form.value.serviceArea) {
                  <div class="flex justify-between gap-4"><dt class="text-gray-500">Service area</dt><dd class="font-medium text-gray-900 text-right">{{ form.value.serviceArea }}</dd></div>
                }
              </dl>
              @if (formError()) {
                <p class="text-red-500 text-sm font-medium mb-4 text-center">{{ formError() }}</p>
              }
              <div class="flex flex-col-reverse sm:flex-row gap-3">
                <button type="button" (click)="onBackToEdit()" [disabled]="isSubmitting()" class="flex-1 px-5 py-3 rounded-full font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50">Back to editing</button>
                <button type="button" (click)="onConfirmPublish()" [disabled]="isSubmitting()" class="flex-1 px-5 py-3 rounded-full font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  @if (isSubmitting()) {
                    <span class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                    Publishing...
                  } @else {
                    <mat-icon class="text-[18px]">rocket_launch</mat-icon> Publish &amp; go live
                  }
                </button>
              </div>
            </div>
          </div>
        }

      </div>
    </div>
  `
})
export class SetupWizardComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dataService = inject(DataService);
  private aiService = inject(AiService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);

  isSubmitting = signal(false);
  reviewing = signal(false);
  formError = signal('');
  presets = BUSINESS_PRESETS;

  form = this.fb.group({
    name: ['', Validators.required],
    type: ['', Validators.required],
    tagline: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    serviceArea: [''],
  });

  ngOnInit() {
    this.form.get('type')?.valueChanges.subscribe(type => {
      if (type) {
        const preset = getPreset(type as BusinessType);
        if (preset && !this.form.get('tagline')?.value) {
          this.form.patchValue({
            tagline: preset.suggestedHeroCopy,
          });
        }
      }
    });
  }

  getPreviewHeroCopy(): string {
    const type = this.form.get('type')?.value;
    if (type) {
      const preset = getPreset(type as BusinessType);
      return preset?.suggestedHeroCopy || '';
    }
    return '';
  }

  getPreviewCtaText(): string {
    const type = this.form.get('type')?.value;
    if (type) {
      const preset = getPreset(type as BusinessType);
      return preset?.suggestedCtaText || '';
    }
    return '';
  }

  getPreviewBadges(): string[] {
    const type = this.form.get('type')?.value;
    if (type) {
      const preset = getPreset(type as BusinessType);
      return preset?.trustBadges || [];
    }
    return [];
  }

  /** Readable label for the selected business type (for the review summary). */
  selectedTypeLabel(): string {
    const type = this.form.get('type')?.value;
    if (!type) return '';
    return getPreset(type as BusinessType)?.label || 'Other';
  }

  /**
   * Step 1: validate, then open the review/confirm gate instead of publishing
   * immediately. The site only goes live after the user confirms.
   */
  onReview() {
    this.formError.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const missing: string[] = [];
      if (this.form.get('name')?.invalid) missing.push('Business Name');
      if (this.form.get('type')?.invalid) missing.push('Business Type');
      if (this.form.get('email')?.invalid) missing.push('a valid Email');
      this.formError.set(`Please fill in: ${missing.join(', ')}`);
      return;
    }

    this.reviewing.set(true);
  }

  /** Return to editing from the review gate. */
  onBackToEdit() {
    if (this.isSubmitting()) return;
    this.formError.set('');
    this.reviewing.set(false);
  }

  /**
   * Step 2: the user confirmed in the review gate — generate the rest of the
   * site, mark setup complete (publishes), claim a slug, and go to the dashboard.
   */
  async onConfirmPublish() {
    this.formError.set('');
    this.isSubmitting.set(true);

    try {
      const val = this.form.value;
      const preset = getPreset(val.type as BusinessType);

      const profile = {
        name: val.name!,
        type: val.type as BusinessType,
        tagline: val.tagline || '',
        email: val.email!,
        phone: val.phone || '',
        serviceArea: val.serviceArea || '',
        description: '',
        address: '',
        openingHours: 'Mon-Fri: 9am - 5pm',
        toneOfVoice: preset?.suggestedTone || 'Professional yet friendly',
        brandColor: '#2563eb',
        heroCopy: preset?.suggestedHeroCopy || val.tagline || '',
        ctaText: preset?.suggestedCtaText || 'Get Started',
        trustBadges: preset?.trustBadges || [],
        enquiryFields: preset?.suggestedEnquiryFields || []
      };

      console.log('[Setup] Generating description...');
      try {
        const generatedDesc = await this.aiService.generateBusinessDescription(profile);
        profile.description = generatedDesc;
      } catch {
        profile.description = `Welcome to ${profile.name}! ${profile.tagline}. Our goal is to make your life easier through professional, reliable, and high-quality solutions.`;
      }

      console.log('[Setup] Saving profile and data...');
      this.dataService.updateProfile(profile);

      if (preset) {
        this.dataService.setServices(preset.suggestedServices);
        this.dataService.setFaqs(preset.suggestedFaqs);
      } else {
        const presetServices = this.aiService.getPresetServices(profile.type);
        this.dataService.setServices(presetServices);
        this.dataService.setFaqs([]);
      }

      console.log('[Setup] Completing setup...');
      this.dataService.completeSetup();

      const user = this.authService.currentUser();
      if (user) {
        const token = await this.authService.getIdToken();
        if (token) {
          const result = await firstValueFrom(
            this.http.post<{ slug: string }>('/api/slugs/claim',
              { uid: user.uid, name: val.name },
              { headers: { Authorization: `Bearer ${token}` } }
            )
          ).catch(() => null);
          if (result?.slug) {
            this.dataService.setSiteSlug(result.slug);
          }
        }
      }

      await this.router.navigate(['/admin/dashboard']);
    } catch (e) {
      console.error('[Setup] Failed:', e);
      this.formError.set('Something went wrong. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
