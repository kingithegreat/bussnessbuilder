import { TooltipDirective } from './tooltip.directive';
import { Component, inject, OnInit, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from './data.service';
import { AiService } from './ai.service';
import { AuthService } from './auth.service';
import { SlugService } from './slug.service';
import { FunnelService } from './funnel.service';
import { BusinessType } from './types';
import { MatIconModule } from '@angular/material/icon';
import { BUSINESS_PRESETS, getPreset, businessTypeLabel } from './presets';
import { INDUSTRY_TEMPLATES, getIndustryTemplate, applyTemplateSections, templateServices } from './industry-templates';
import { getStockImages } from './stock-images';
import {
  SETUP_DRAFT_KEY,
  PENDING_PUBLISH_KEY,
  SetupDraft,
  emptyDraft,
  parseDraft,
  serializeDraft,
  hasContent,
  draftProgress,
  missingRequiredLabels,
} from './setup-draft';

@Component({
  selector: 'app-setup-wizard',
  standalone: true,
  imports: [TooltipDirective, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="min-h-screen bg-[#F5F5F7] pt-8 pb-40 lg:pt-12 lg:pb-32 px-4 sm:px-6 lg:px-8 font-sans flex justify-center">
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
               <span class="text-xs font-bold text-gray-600 uppercase tracking-wider">Setup Wizard</span>
             </div>

             <!-- Progress Indicator — reflects what's actually filled in -->
             <div>
               <div class="flex justify-between text-xs font-bold mb-2">
                 <span class="text-blue-600">Your details</span>
                 <span class="text-gray-600">{{ progress() }}%</span>
               </div>
               <div class="w-full bg-gray-200 rounded-full h-1.5">
                 <div class="bg-blue-600 h-1.5 rounded-full transition-all duration-300" [style.width.%]="progress()"></div>
               </div>
             </div>

             @if (!isLoggedIn()) {
               <p class="mt-3 text-[13px] text-gray-500 flex items-center gap-1.5">
                 <mat-icon class="text-[16px] text-green-600">check_circle</mat-icon>
                 No account needed yet — build it first, sign up when you publish.
               </p>
             }
          </div>

          <form [formGroup]="form" (ngSubmit)="onReview()" class="p-8 space-y-8">
            <div class="space-y-6">

              <fieldset>
                <legend class="block text-sm font-bold text-gray-900 mb-1">Start from a template <span class="font-normal text-gray-600">(optional)</span></legend>
                <p class="text-[13px] text-gray-600 mb-3">Pick your industry for ready-made sections, wording, colours and photos. You can change everything later.</p>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  @for (t of templates; track t.id) {
                    <label class="relative cursor-pointer rounded-2xl overflow-hidden border-2 transition-colors focus-within:ring-2 focus-within:ring-blue-500"
                      [class.border-blue-600]="form.get('template')?.value === t.id" [class.border-transparent]="form.get('template')?.value !== t.id">
                      <input type="radio" class="sr-only" formControlName="template" [value]="t.id" (change)="applyTemplate(t.id)">
                      <img [src]="t.heroImage.replace('w=1200', 'w=400')" alt="" class="w-full h-20 object-cover" loading="lazy" referrerpolicy="no-referrer">
                      <span class="block p-2 bg-white">
                        <span class="block text-xs font-bold text-gray-900">{{ t.label }}</span>
                        <span class="block text-[11px] text-gray-600 leading-tight">{{ t.blurb }}</span>
                      </span>
                      <span class="absolute top-1 left-1 w-4 h-4 rounded-full border-2 border-white" [style.backgroundColor]="t.colors.primary" aria-hidden="true"></span>
                    </label>
                  }
                </div>
                @if (form.get('template')?.value) {
                  <button type="button" (click)="clearTemplate()" class="mt-2 text-xs font-bold text-gray-700 underline">Don't use a template</button>
                }
              </fieldset>

              <div>
                <label for="setup-name" class="block text-sm font-bold text-gray-900 mb-1">Business Name *</label>
                <p id="setup-name-help" class="text-[13px] text-gray-600 mb-2">What's the official name of your business?</p>
                <input type="text" id="setup-name" aria-describedby="setup-name-help" formControlName="name" class="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none transition-all" [class.border-red-300]="form.get('name')?.invalid && form.get('name')?.touched" placeholder="e.g. Apex Cleaners">
                @if (form.get('name')?.invalid && form.get('name')?.touched) {
                   <p class="text-red-500 text-xs mt-1">Business name is required</p>
                }
              </div>

              <div>
                <label for="setup-type" class="block text-sm font-bold text-gray-900 mb-1">Business Type *</label>
                <p id="setup-type-help" class="text-[13px] text-gray-600 mb-2">This helps us generate the right services and FAQs for you.</p>
                <select id="setup-type" aria-describedby="setup-type-help" formControlName="type" class="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none transition-all text-gray-900" [class.border-red-300]="form.get('type')?.invalid && form.get('type')?.touched">
                  <option value="" disabled>Select a type...</option>
                  @for (preset of presets; track preset.id) {
                    <option [value]="preset.id">{{ preset.label }}</option>
                  }
                  <option value="cafe">Café / Restaurant</option>
                  <option value="other">Other</option>
                </select>
                @if (form.get('type')?.invalid && form.get('type')?.touched) {
                   <p class="text-red-500 text-xs mt-1">Please select a business type</p>
                }
              </div>

              <div>
                <label for="setup-tagline" class="block text-sm font-bold text-gray-900 mb-1">Tagline</label>
                <p id="setup-tagline-help" class="text-[13px] text-gray-600 mb-2">A short, catchy phrase summarizing what you do.</p>
                <input type="text" id="setup-tagline" aria-describedby="setup-tagline-help" formControlName="tagline" class="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none transition-all" placeholder="e.g. Professional cleaning you can trust.">
              </div>

              <div>
                <label for="setup-email" class="block text-sm font-bold text-gray-900 mb-1">Email Address *</label>
                <p id="setup-email-help" class="text-[13px] text-gray-600 mb-2">Where should we send new customer enquiries?</p>
                <input type="email" id="setup-email" aria-describedby="setup-email-help" formControlName="email" class="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none transition-all" [class.border-red-300]="form.get('email')?.invalid && form.get('email')?.touched" placeholder="hello@example.com">
                @if (form.get('email')?.invalid && form.get('email')?.touched) {
                   <p class="text-red-500 text-xs mt-1">Please enter a valid email</p>
                }
              </div>

              <div>
                <label for="setup-phone" class="block text-sm font-bold text-gray-900 mb-1">Phone Number</label>
                <p id="setup-phone-help" class="text-[13px] text-gray-600 mb-2">Optional. Customers can use this to call you directly.</p>
                <input type="tel" id="setup-phone" aria-describedby="setup-phone-help" formControlName="phone" class="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none transition-all" placeholder="021 123 4567">
              </div>

              <div>
                <label for="setup-serviceArea" class="block text-sm font-bold text-gray-900 mb-1">Service Area / Location</label>
                <p id="setup-serviceArea-help" class="text-[13px] text-gray-600 mb-2">The city or neighborhood where you operate.</p>
                <input type="text" id="setup-serviceArea" aria-describedby="setup-serviceArea-help" formControlName="serviceArea" class="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none transition-all" placeholder="e.g. Pyes Pa, Tauranga">
              </div>

              <!-- Optional: opening hours + a photo (both skippable) -->
              <details class="rounded-2xl border border-gray-200 bg-white" [open]="extrasOpen()" (toggle)="extrasOpen.set($any($event.target).open)">
                <summary class="cursor-pointer select-none px-4 py-3 text-sm font-bold text-gray-900 flex items-center gap-2">
                  <mat-icon class="text-[18px] text-blue-600" aria-hidden="true">add_circle</mat-icon>
                  Add opening hours &amp; a photo <span class="font-normal text-gray-600">(optional)</span>
                </summary>
                <div class="px-4 pb-4 space-y-5">
                  <div>
                    <label for="setup-openingHours" class="block text-sm font-bold text-gray-900 mb-1">Opening hours</label>
                    <p id="setup-openingHours-help" class="text-[13px] text-gray-600 mb-2">One line per day or group of days. Leave blank if you'd rather not show hours.</p>
                    <div class="flex flex-wrap gap-2 mb-2">
                      @for (preset of hoursPresets; track preset.label) {
                        <button bfTip="Fills in these opening hours for you. You can edit them after." type="button" (click)="form.patchValue({ openingHours: preset.value })" class="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100">{{ preset.label }}</button>
                      }
                    </div>
                    <textarea id="setup-openingHours" aria-describedby="setup-openingHours-help" formControlName="openingHours" rows="3" class="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm" placeholder="Mon–Fri: 7:30am – 5pm&#10;Sat: 8am – 1pm"></textarea>
                  </div>
                  <fieldset>
                    <legend class="block text-sm font-bold text-gray-900 mb-1">Main photo</legend>
                    <p class="text-[13px] text-gray-600 mb-2">Pick a starter photo for the top of your site. You can upload your own from the dashboard later.</p>
                    @if (photoChoices().length) {
                      <div class="grid grid-cols-3 gap-2">
                        @for (photo of photoChoices(); track photo.url) {
                          <label class="relative block rounded-xl overflow-hidden cursor-pointer ring-offset-2 has-[:checked]:ring-2 has-[:checked]:ring-blue-600 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-400">
                            <input type="radio" class="sr-only" formControlName="heroImageUrl" [value]="photo.url" [attr.aria-label]="photo.alt">
                            <img [src]="photo.url" [alt]="photo.alt" loading="lazy" referrerpolicy="no-referrer" class="w-full h-20 object-cover">
                          </label>
                        }
                      </div>
                      <button type="button" (click)="form.patchValue({ heroImageUrl: '' })" class="mt-2 text-xs font-bold text-gray-700 underline">No photo for now</button>
                    } @else {
                      <p class="text-[13px] text-gray-600 italic">Choose your business type above to see photo suggestions.</p>
                    }
                  </fieldset>
                </div>
              </details>
            </div>

            <div class="pt-6 mt-4 flex flex-col-reverse items-stretch gap-3 border-t border-gray-100">
              <div class="text-[13px] text-gray-600 flex items-center justify-center gap-1">
                 <mat-icon class="text-[16px]" aria-hidden="true">auto_awesome</mat-icon> AI will write the rest for you
              </div>
              <button type="button" (click)="onReview()" class="w-full whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-full font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer">
                <span>Review &amp; continue</span>
                <mat-icon class="text-sm" aria-hidden="true">arrow_forward</mat-icon>
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
             <div class="mx-auto bg-white px-3 py-1 rounded-md text-xs font-medium text-gray-500 shadow-sm border border-gray-100">Live Preview</div>
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
                   {{ getPreviewHeroCopy() || 'Great work, done right — for customers who expect the best.' }}
                 </h1>
                 <p class="text-gray-500 text-sm mb-8 leading-relaxed">
                   {{ form.value.tagline || 'Professional, reliable, and high-quality solutions tailored for you.' }}
                 </p>
                 <div class="bg-blue-600 text-white px-6 py-3 rounded-full text-sm font-bold inline-block shadow-sm">
                   {{ getPreviewCtaText() || 'Get Started' }}
                 </div>
               </div>

               <!-- Preview Badges -->
               <div class="border-y border-gray-100 py-6 bg-gray-50 flex justify-center gap-6 text-gray-500 text-xs font-medium">
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
              @if (isLoggedIn()) {
                <p class="text-sm text-gray-500 mb-5">Review the details below and check the live preview. Publishing makes your site <strong>publicly visible</strong> — you can change anything later from your dashboard.</p>
              } @else {
                <p class="text-sm text-gray-500 mb-5">Everything below is saved. Create a free account on the next screen and your site goes live straight away — <strong>no credit card</strong>, and you can change anything later.</p>
              }
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
                <button bfTip="publish" type="button" (click)="onConfirmPublish()" [disabled]="isSubmitting()" class="flex-1 px-5 py-3 rounded-full font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  @if (isSubmitting()) {
                    <span class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                    {{ isLoggedIn() ? 'Publishing...' : 'Saving...' }}
                  } @else {
                    <mat-icon class="text-[18px]">rocket_launch</mat-icon>
                    {{ isLoggedIn() ? 'Publish & go live' : 'Create account & publish' }}
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
  private slugService = inject(SlugService);
  private funnel = inject(FunnelService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  isSubmitting = signal(false);
  reviewing = signal(false);
  formError = signal('');
  presets = BUSINESS_PRESETS;

  /** Live draft mirror of the form, so the progress bar is a real signal. */
  private draft = signal<SetupDraft>(emptyDraft());
  progress = computed(() => draftProgress(this.draft()));

  form = this.fb.group({
    name: ['', Validators.required],
    type: ['', Validators.required],
    tagline: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    serviceArea: [''],
    // Optional extras (not part of the saved draft).
    openingHours: [''],
    heroImageUrl: [''],
    template: [''],
  });

  extrasOpen = signal(false);
  readonly templates = INDUSTRY_TEMPLATES;

  /** Fill the wizard from an industry template without overwriting what the visitor typed. */
  applyTemplate(id: string) {
    const t = getIndustryTemplate(id);
    if (!t) return;
    const v = this.form.value;
    const autoTaglines = new Set(['', ...INDUSTRY_TEMPLATES.map(x => x.tagline), ...this.presets.map(p => p.suggestedHeroCopy)]);
    this.form.patchValue({
      type: t.businessType,
      heroImageUrl: t.heroImage,
      ...(autoTaglines.has(v.tagline || '') ? { tagline: t.tagline } : {}),
      ...(!(v.openingHours || '').trim() || INDUSTRY_TEMPLATES.some(x => x.openingHours === v.openingHours) ? { openingHours: t.openingHours } : {}),
    });
    // patchValue on type resets the tagline to the preset's; restore the template's.
    if (autoTaglines.has(this.form.value.tagline || '')) this.form.patchValue({ tagline: t.tagline });
  }

  clearTemplate() {
    this.form.patchValue({ template: '' });
  }
  readonly hoursPresets = [
    { label: 'Mon–Fri 8–5', value: 'Mon–Fri: 8am – 5pm\nSat–Sun: Closed' },
    { label: 'Mon–Sat', value: 'Mon–Fri: 8am – 5pm\nSat: 9am – 1pm\nSun: Closed' },
    { label: '7 days', value: 'Mon–Sun: 8am – 6pm' },
    { label: 'By appointment', value: 'By appointment — call or enquire online' },
  ];
  private selectedType = signal('');
  photoChoices = computed(() => {
    const type = this.selectedType();
    return type ? getStockImages(type, 'hero').slice(0, 6) : [];
  });

  /**
   * Logged-out visitors can fill in the whole wizard; the account is only
   * needed to publish. Drives the copy and the confirm-button label.
   */
  isLoggedIn = () => this.authService.isLoggedIn();

  ngOnInit() {
    // Restore any half-finished draft *before* wiring valueChanges, so a saved
    // type doesn't clobber the tagline the visitor had already written.
    const resumed = this.restoreDraft();

    // FunnelService is a no-op outside the browser, so this is SSR-safe as-is.
    // (afterNextRender cannot be used here — ngOnInit is not an injection context.)
    this.funnel.step('wizard_started');
    if (resumed) this.funnel.flag('wizard_resumed');

    this.form.valueChanges.subscribe(() => {
      // De-duplicated per session, so the tagline auto-patch on type selection
      // can't inflate this.
      this.funnel.step('wizard_engaged');
      this.draft.set(this.currentDraft());
      this.saveDraft();
    });

    this.selectedType.set(this.form.get('type')?.value || '');
    this.form.get('type')?.valueChanges.subscribe(type => {
      this.selectedType.set(type || '');
      // Re-fill the tagline whenever it is still OUR auto-fill, and clear it
      // when the new type has no preset. Previously it only ever filled a blank
      // field, so changing type after the first pick left the previous trade's
      // line in place — a barber's site headlined with the cleaning copy.
      const current = this.form.get('tagline')?.value || '';
      const isAutofill = BUSINESS_PRESETS.some(p => p.suggestedHeroCopy === current);
      if (current && !isAutofill) return; // the owner wrote this — never touch it
      const preset = type ? getPreset(type as BusinessType) : undefined;
      this.form.patchValue({ tagline: preset?.suggestedHeroCopy || '' });
    });
  }

  private currentDraft(): SetupDraft {
    const v = this.form.value;
    return {
      name: v.name || '',
      type: v.type || '',
      tagline: v.tagline || '',
      email: v.email || '',
      phone: v.phone || '',
      serviceArea: v.serviceArea || '',
      ...(v.template ? { template: v.template } : {}),
    };
  }

  /**
   * Persist every keystroke. Before this, a refresh or a bounce out to the
   * Terms page emptied the wizard and the visitor started over — or didn't.
   */
  private saveDraft() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(SETUP_DRAFT_KEY, serializeDraft(this.currentDraft()));
    } catch {
      /* private mode / quota — the wizard still works, it just won't survive a reload */
    }
  }

  /** @returns true when a saved draft was restored (i.e. this is a continuation). */
  private restoreDraft(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    let stored: SetupDraft | null = null;
    try {
      stored = parseDraft(localStorage.getItem(SETUP_DRAFT_KEY));
    } catch {
      stored = null;
    }
    if (!stored || !hasContent(stored)) return false;
    this.form.patchValue(stored, { emitEvent: false });
    this.draft.set(stored);
    return true;
  }

  private clearDraft() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.removeItem(SETUP_DRAFT_KEY);
    } catch {
      /* nothing to clean up */
    }
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
    return businessTypeLabel(type) || 'Other';
  }

  /**
   * Step 1: validate, then open the review/confirm gate instead of publishing
   * immediately. The site only goes live after the user confirms.
   */
  onReview() {
    this.formError.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const missing = missingRequiredLabels(this.currentDraft());
      // An email that's present but malformed isn't "missing" — name it anyway.
      if (!missing.length && this.form.get('email')?.invalid) missing.push('a valid Email');
      this.formError.set(`Please fill in: ${missing.join(', ')}`);
      this.funnel.flag('wizard_review_blocked');
      return;
    }

    this.funnel.step('wizard_review_opened');
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
   * site and mark setup complete.
   *
   * Logged in: publish, claim a slug, land on the "your site is live" moment.
   * Logged out: stash the finished site locally and send them to sign-up.
   * `DataService.init()` migrates that stash into Firestore on first login, so
   * the account and the finished site arrive together.
   */
  async onConfirmPublish() {
    this.formError.set('');
    this.isSubmitting.set(true);
    this.funnel.step('publish_clicked');

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
        // Never invented. The wizard does not ask for hours, and asserting
        // "Mon-Fri: 9am - 5pm" told every cafe, salon and weekend trader's
        // customers in writing that it was shut on Saturday. All three render
        // sites already guard on a non-empty value.
        openingHours: (val.openingHours || '').trim(),
        toneOfVoice: preset?.suggestedTone || 'Professional yet friendly',
        brandColor: '#2563eb',
        heroCopy: preset?.suggestedHeroCopy || val.tagline || '',
        ctaText: preset?.suggestedCtaText || 'Get Started',
        trustBadges: preset?.trustBadges || [],
        enquiryFields: preset?.suggestedEnquiryFields || []
      };

      // Anonymous visitors have no token, so the AI endpoint would reject them;
      // the template fallback is used instead and AI copy can be regenerated
      // from the dashboard once they're in.
      if (this.isLoggedIn()) {
        try {
          profile.description = await this.aiService.generateBusinessDescription(profile);
        } catch {
          profile.description = this.fallbackDescription(profile.name, profile.tagline);
        }
      } else {
        profile.description = this.fallbackDescription(profile.name, profile.tagline);
      }

      // New sites price in NZ dollars incl. GST by default (changeable in Settings).
      this.dataService.updateProfile({ currency: 'NZD', pricesIncludeGst: true, ...profile });

      const template = getIndustryTemplate(val.template);
      if (template) {
        this.dataService.updateProfile({
          heroCopy: template.heroCopy, ctaText: template.ctaText, toneOfVoice: template.tone,
          trustBadges: template.trustBadges, enquiryFields: template.enquiryFields,
          ...(profile.description === this.fallbackDescription(profile.name, profile.tagline) ? { description: template.description } : {}),
        });
        this.dataService.setServices(templateServices(template));
        this.dataService.setFaqs(template.faqs);
        const c = this.dataService.customization();
        this.dataService.updateCustomization({
          branding: { ...c.branding, primaryColor: template.colors.primary, secondaryColor: template.colors.secondary, backgroundColor: template.colors.background },
          sections: applyTemplateSections(c.sections || [], template),
        });
      } else if (preset) {
        this.dataService.setServices(preset.suggestedServices);
        this.dataService.setFaqs(preset.suggestedFaqs);
      } else {
        const presetServices = this.aiService.getPresetServices(profile.type);
        this.dataService.setServices(presetServices);
        this.dataService.setFaqs([]);
      }

      const heroImageUrl = (val.heroImageUrl || '').trim();
      if (heroImageUrl) {
        const sections = this.dataService.customization().sections || [];
        this.dataService.updateCustomization({
          sections: sections.map(sec => (sec.id === 'hero' ? { ...sec, imageUrl: heroImageUrl } : sec)),
        });
      }

      this.dataService.completeSetup();

      if (!this.isLoggedIn()) {
        this.stashForSignUp();
        this.funnel.flushNow();
        await this.router.navigate(['/signup']);
        return;
      }

      await this.slugService.claimIfMissing();
      this.clearDraft();
      this.funnel.step('site_live');
      this.funnel.flushNow();
      await this.router.navigate(['/admin/dashboard'], { queryParams: { welcome: 1 } });
    } catch (e) {
      console.error('[Setup] Failed:', e);
      this.funnel.flag('publish_failed');
      this.formError.set('Something went wrong. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private fallbackDescription(name: string, tagline: string): string {
    // A blank tagline used to leave a floating " . " mid-paragraph, and one
    // that already ended in '.' got a second one.
    const t = (tagline || '').trim().replace(/[.!?]+$/, '');
    const sentence = t ? ` ${t}.` : '';
    return `Welcome to ${name}!${sentence} Our goal is to make your life easier through professional, reliable, and high-quality solutions.`;
  }

  /**
   * Hand the finished site to the sign-up screen. `businessflow_state` is the
   * key `DataService.init()` already migrates into Firestore on first login,
   * so no new plumbing is needed — the visitor signs up and their site is
   * simply there.
   */
  private stashForSignUp() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem('businessflow_state', this.dataService.exportState());
      localStorage.setItem(PENDING_PUBLISH_KEY, '1');
      localStorage.removeItem(SETUP_DRAFT_KEY);
    } catch {
      /* storage unavailable — fall through; they'll re-enter details after sign-up */
    }
  }
}
