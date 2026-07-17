import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from './data.service';
import { ToastService } from './toast.service';
import { CustomizationSettings, DEFAULT_PAGE_TEXT, PageTextSettings } from './types';
import { ImagePickerComponent } from './image-picker.component';

@Component({
  selector: 'app-admin-customisation',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, ImagePickerComponent],
  template: `
    <div class="max-w-4xl mx-auto space-y-8 pb-12">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 tracking-tight">Customisation</h2>
          <p class="text-gray-500 text-sm mt-1">Configure your business rules, forms, and public website appearance.</p>
        </div>
        <div class="flex gap-3">
          <button (click)="resetToDefaults()" class="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors">Reset</button>
          <button (click)="saveCustomisation()" class="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-100 hover:bg-blue-700 transition-colors flex items-center gap-2">
            <mat-icon class="text-[18px]">save</mat-icon> Save Changes
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex overflow-x-auto gap-2 bg-gray-100 p-1 rounded-xl">
        @for (tab of tabs; track tab.id) {
          <button 
            (click)="currentTab = tab.id"
            [class.bg-white]="currentTab === tab.id"
            [class.shadow-sm]="currentTab === tab.id"
            [class.text-blue-600]="currentTab === tab.id"
            [class.text-gray-500]="currentTab !== tab.id"
            class="px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 flex-1 justify-center">
            <mat-icon class="text-[18px]">{{ tab.icon }}</mat-icon> {{ tab.label }}
          </button>
        }
      </div>

      <!-- Layout Presets -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-bold text-gray-900">Quick Presets</h3>
            <p class="text-xs text-gray-500 mt-0.5">Apply a complete look instantly. You can customise further after.</p>
          </div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          @for (preset of layoutPresets; track preset.id) {
            <button (click)="applyLayoutPreset(preset)" class="group border border-gray-200 rounded-xl p-4 text-left hover:border-blue-500 hover:shadow-md transition-all duration-200">
              <div class="w-full h-16 rounded-lg mb-3 overflow-hidden" [style.background]="preset.preview"></div>
              <p class="text-sm font-semibold text-gray-900">{{ preset.name }}</p>
              <p class="text-[11px] text-gray-500">{{ preset.description }}</p>
            </button>
          }
        </div>
      </div>

      <!-- Tab Content -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        
        <!-- Branding Tab -->
        @if (currentTab === 'branding') {
          <div class="p-6 space-y-8">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div class="space-y-6">
                <h3 class="font-bold text-gray-900 border-b border-gray-100 pb-2">Colours & Mode</h3>
                
                <div>
                  <span class="block text-sm font-bold text-gray-700 mb-2">Primary Brand Colour</span>
                  <div class="flex gap-3">
                    <input type="color" [(ngModel)]="localCust.branding.primaryColor" class="h-10 w-10 rounded cursor-pointer border-0 p-0">
                    <input type="text" [(ngModel)]="localCust.branding.primaryColor" class="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm uppercase">
                  </div>
                </div>

                <div>
                  <span class="block text-sm font-bold text-gray-700 mb-2">Background Colour</span>
                  <div class="flex gap-3">
                    <input type="color" [(ngModel)]="localCust.branding.backgroundColor" class="h-10 w-10 rounded cursor-pointer border-0 p-0">
                    <input type="text" [(ngModel)]="localCust.branding.backgroundColor" class="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm uppercase">
                  </div>
                </div>

                <div>
                  <span class="block text-sm font-bold text-gray-700 mb-2">Theme Mode</span>
                  <select [(ngModel)]="localCust.branding.themeMode" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                  </select>
                </div>

                <div class="pt-4 border-t border-gray-100">
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-sm font-bold text-gray-700">Gradient Background</span>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" [(ngModel)]="localCust.branding.gradientEnabled" class="sr-only peer">
                      <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  @if (localCust.branding.gradientEnabled) {
                    <div class="space-y-3">
                      <div>
                        <span class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Start Colour</span>
                        <div class="flex gap-3">
                          <input type="color" [(ngModel)]="localCust.branding.gradientStartColor" class="h-10 w-10 rounded cursor-pointer border-0 p-0">
                          <input type="text" [(ngModel)]="localCust.branding.gradientStartColor" class="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm uppercase">
                        </div>
                      </div>
                      <div>
                        <span class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">End Colour</span>
                        <div class="flex gap-3">
                          <input type="color" [(ngModel)]="localCust.branding.gradientEndColor" class="h-10 w-10 rounded cursor-pointer border-0 p-0">
                          <input type="text" [(ngModel)]="localCust.branding.gradientEndColor" class="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm uppercase">
                        </div>
                      </div>
                      <div>
                        <span class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Direction</span>
                        <select [(ngModel)]="localCust.branding.gradientDirection" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                          <option value="to right">Left to Right</option>
                          <option value="to bottom">Top to Bottom</option>
                          <option value="to bottom right">Diagonal (↘)</option>
                          <option value="to bottom left">Diagonal (↙)</option>
                        </select>
                      </div>
                      <div class="h-10 rounded-xl border border-gray-200 overflow-hidden" [style.background]="'linear-gradient(' + (localCust.branding.gradientDirection || 'to right') + ', ' + (localCust.branding.gradientStartColor || '#2563eb') + ', ' + (localCust.branding.gradientEndColor || '#7c3aed') + ')'"></div>
                    </div>
                  }
                </div>
              </div>

              <div class="space-y-6">
                <h3 class="font-bold text-gray-900 border-b border-gray-100 pb-2">Style & Typography</h3>
                
                <div>
                  <span class="block text-sm font-bold text-gray-700 mb-2">Font Style</span>
                  <select [(ngModel)]="localCust.branding.fontStyle" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                    <option value="modern">Modern (Inter)</option>
                    <option value="friendly">Friendly (Nunito)</option>
                    <option value="professional">Professional (Merriweather)</option>
                    <option value="elegant">Elegant (Playfair Display)</option>
                    <option value="clean">Clean (Poppins)</option>
                    <option value="minimal">Minimal (DM Sans)</option>
                    <option value="bold">Bold (Montserrat)</option>
                    <option value="classic">Classic (Lora)</option>
                    <option value="techy">Techy (Space Grotesk)</option>
                  </select>
                </div>

                <div>
                  <span class="block text-sm font-bold text-gray-700 mb-2">Button Shape</span>
                  <div class="grid grid-cols-3 gap-2">
                    <button (click)="localCust.branding.buttonStyle = 'rounded'" [class.border-blue-500]="localCust.branding.buttonStyle === 'rounded'" [class.bg-blue-50]="localCust.branding.buttonStyle === 'rounded'" class="py-2 border rounded-xl text-sm font-bold text-gray-700 transition-colors">Rounded</button>
                    <button (click)="localCust.branding.buttonStyle = 'pill'" [class.border-blue-500]="localCust.branding.buttonStyle === 'pill'" [class.bg-blue-50]="localCust.branding.buttonStyle === 'pill'" class="py-2 border rounded-xl text-sm font-bold text-gray-700 transition-colors">Pill</button>
                    <button (click)="localCust.branding.buttonStyle = 'square'" [class.border-blue-500]="localCust.branding.buttonStyle === 'square'" [class.bg-blue-50]="localCust.branding.buttonStyle === 'square'" class="py-2 border rounded-xl text-sm font-bold text-gray-700 transition-colors">Square</button>
                  </div>
                </div>

                <div>
                  <span class="block text-sm font-bold text-gray-700 mb-2">Card Style</span>
                  <select [(ngModel)]="localCust.branding.cardStyle" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                    <option value="soft">Soft Shadows</option>
                    <option value="flat">Flat Design</option>
                    <option value="bordered">Bordered</option>
                    <option value="glass">Glassmorphism</option>
                  </select>
                </div>
              </div>

            </div>

            <div class="space-y-6 pt-6 border-t border-gray-100">
              <h3 class="font-bold text-gray-900 border-b border-gray-100 pb-2">Hero / Header Settings</h3>
              
              <div>
                <span class="block text-sm font-bold text-gray-700 mb-2">Header Layout</span>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button (click)="localCust.branding.headerStyle = 'centered'" [class.border-blue-500]="localCust.branding.headerStyle === 'centered'" [class.bg-blue-50]="localCust.branding.headerStyle === 'centered'" class="p-4 border rounded-xl flex flex-col items-center gap-2 transition-colors text-gray-700">
                    <div class="w-16 h-12 bg-gray-200 rounded flex flex-col items-center justify-center gap-1 p-1">
                      <div class="w-8 h-2 bg-gray-400 rounded-full"></div>
                      <div class="w-12 h-1 bg-gray-300 rounded-full"></div>
                    </div>
                    <span class="text-xs font-bold">Centered</span>
                  </button>
                  <button (click)="localCust.branding.headerStyle = 'left'" [class.border-blue-500]="localCust.branding.headerStyle === 'left'" [class.bg-blue-50]="localCust.branding.headerStyle === 'left'" class="p-4 border rounded-xl flex flex-col items-center gap-2 transition-colors text-gray-700">
                    <div class="w-16 h-12 bg-gray-200 rounded flex flex-col items-start justify-center gap-1 p-2">
                      <div class="w-8 h-2 bg-gray-400 rounded-full"></div>
                      <div class="w-10 h-1 bg-gray-300 rounded-full"></div>
                    </div>
                    <span class="text-xs font-bold">Left Aligned</span>
                  </button>
                  <button (click)="localCust.branding.headerStyle = 'split'" [class.border-blue-500]="localCust.branding.headerStyle === 'split'" [class.bg-blue-50]="localCust.branding.headerStyle === 'split'" class="p-4 border rounded-xl flex flex-col items-center gap-2 transition-colors text-gray-700">
                    <div class="w-16 h-12 bg-gray-200 rounded flex items-center justify-between p-1">
                      <div class="flex flex-col gap-1 w-1/2">
                        <div class="w-full h-2 bg-gray-400 rounded-full"></div>
                        <div class="w-3/4 h-1 bg-gray-300 rounded-full"></div>
                      </div>
                      <div class="w-5 h-8 bg-gray-300 rounded-sm"></div>
                    </div>
                    <span class="text-xs font-bold">Split Hero</span>
                  </button>
                </div>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <span class="block text-sm font-bold text-gray-700 mb-2">Logo</span>
                   <app-image-picker
                     label="Business Logo"
                     section="general"
                     [currentUrl]="localCust.branding.logoUrl"
                     (imageSelected)="localCust.branding.logoUrl = $event"
                   ></app-image-picker>
                 </div>
                 <div>
                   <span class="block text-sm font-bold text-gray-700 mb-2">Main CTA Text</span>
                   <input type="text" [(ngModel)]="localCust.branding.ctaText" placeholder="Get a Quote" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                 </div>
              </div>

              <div class="pt-6 border-t border-gray-100">
                <h3 class="font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4">Background Image</h3>
                <app-image-picker
                  label="Background Image"
                  section="general"
                  [currentUrl]="localCust.branding.backgroundImageUrl || ''"
                  (imageSelected)="localCust.branding.backgroundImageUrl = $event"
                ></app-image-picker>
                @if (localCust.branding.backgroundImageUrl) {
                  <button (click)="localCust.branding.backgroundImageUrl = ''" class="mt-2 text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1">
                    <mat-icon class="text-[14px]">delete</mat-icon> Remove Background Image
                  </button>
                }
                <p class="text-xs text-gray-400 mt-2">Adds a full-page background image behind all content. Works alongside your colour/gradient settings as a fallback.</p>
              </div>
            </div>
          </div>
        }

        <!-- Sections Tab -->
        @if (currentTab === 'sections') {
          <div class="p-0">
            <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
               <p class="text-sm text-gray-500">Toggle sections on or off for your public page, and edit their titles.</p>
               <div class="text-xs font-bold text-gray-400 uppercase tracking-wider">{{ localCust.sections.length }} Sections</div>
            </div>
            
            <div class="divide-y divide-gray-100">
              @for (section of localCust.sections; track section.id; let i = $index) {
                <div class="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:bg-gray-50 transition-colors">
                  <div class="flex items-center gap-3 w-full sm:w-1/3 shrink-0">
                    <div class="flex flex-col">
                      <button (click)="moveSectionUp(i)" [disabled]="i === 0" class="text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move up">
                        <mat-icon class="text-[18px]">keyboard_arrow_up</mat-icon>
                      </button>
                      <button (click)="moveSectionDown(i)" [disabled]="i === localCust.sections.length - 1" class="text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move down">
                        <mat-icon class="text-[18px]">keyboard_arrow_down</mat-icon>
                      </button>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer shrink-0">
                      <input type="checkbox" [(ngModel)]="section.visible" class="sr-only peer">
                      <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    <div>
                      <h4 class="font-bold text-gray-900">{{ getSectionName(section) }}</h4>
                      <p class="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{{ section.visible ? 'Visible' : 'Hidden' }}</p>
                    </div>
                  </div>
                  
                  <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    <div>
                      <input type="text" [(ngModel)]="section.heading" placeholder="Heading..." class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" [disabled]="!section.visible" [class.opacity-50]="!section.visible">
                    </div>
                    <div>
                      <input type="text" [(ngModel)]="section.subheading" placeholder="Subheading..." class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" [disabled]="!section.visible" [class.opacity-50]="!section.visible">
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Text & Labels Tab -->
        @if (currentTab === 'text') {
          <div class="p-6 space-y-8">
            <p class="text-sm text-gray-500">Change any fixed wording on your public page. Leave a field blank to use the default shown in grey.</p>

            <div>
              <h3 class="font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4">Navigation Menu</h3>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Services link</span>
                  <input type="text" [(ngModel)]="textSettings.navServices" [placeholder]="defaults.navServices" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                </div>
                <div>
                  <span class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">About link</span>
                  <input type="text" [(ngModel)]="textSettings.navAbout" [placeholder]="defaults.navAbout" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                </div>
                <div>
                  <span class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Contact link</span>
                  <input type="text" [(ngModel)]="textSettings.navContact" [placeholder]="defaults.navContact" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                </div>
              </div>
              <p class="text-xs text-gray-400 mt-2">Menu links automatically hide when you hide their section on the Page Sections tab.</p>
            </div>

            <div>
              <h3 class="font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4">Hero / Welcome</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Badge above the headline</span>
                  <input type="text" [(ngModel)]="textSettings.heroBadge" placeholder="Auto: business type • service area" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                  <p class="text-xs text-gray-400 mt-1">e.g. "Welcome to {{ profile().name || 'your business' }}". Blank shows your business type and service area.</p>
                </div>
                <div>
                  <span class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Second hero button</span>
                  <input type="text" [(ngModel)]="textSettings.secondaryCta" [placeholder]="defaults.secondaryCta" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                </div>
              </div>
              <p class="text-xs text-gray-400 mt-2">The main headline and welcome paragraph come from your Tagline and Description in Settings → Business Profile — you can also click them directly in the Page Builder preview to edit.</p>
            </div>

            <div>
              <h3 class="font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4">Services & Pricing</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Price label</span>
                  <input type="text" [(ngModel)]="textSettings.priceLabel" [placeholder]="defaults.priceLabel" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                  <p class="text-xs text-gray-400 mt-1">Shown above each service price, e.g. "From" or "Only".</p>
                </div>
              </div>
            </div>

            <div>
              <h3 class="font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4">Contact Form</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Form title</span>
                  <input type="text" [(ngModel)]="textSettings.contactFormTitle" [placeholder]="defaults.contactFormTitle" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                </div>
                <div>
                  <span class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Submit button</span>
                  <input type="text" [(ngModel)]="textSettings.contactSubmit" [placeholder]="defaults.contactSubmit" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                </div>
                <div>
                  <span class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Success title</span>
                  <input type="text" [(ngModel)]="textSettings.contactSuccessTitle" [placeholder]="defaults.contactSuccessTitle" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                </div>
                <div>
                  <span class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Success message</span>
                  <input type="text" [(ngModel)]="textSettings.contactSuccessMessage" [placeholder]="defaults.contactSuccessMessage" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                </div>
                <div>
                  <span class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">"Send another" button</span>
                  <input type="text" [(ngModel)]="textSettings.contactSendAnother" [placeholder]="defaults.contactSendAnother" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                </div>
              </div>
            </div>
          </div>
        }

        <!-- SEO Tab -->
        @if (currentTab === 'seo') {
          <div class="p-6 space-y-6">
            <div>
              <p class="text-sm text-gray-500 mb-6">Control how your site appears in search engines and when shared on social media.</p>
            </div>
            <div>
              <span class="block text-sm font-bold text-gray-700 mb-2">SEO Title</span>
              <input type="text" [(ngModel)]="localCust.branding.seoTitle" placeholder="Your Business — Tagline" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
              <p class="text-xs text-gray-400 mt-1">Appears in browser tabs and search results. Leave blank to auto-generate from your business name.</p>
            </div>
            <div>
              <span class="block text-sm font-bold text-gray-700 mb-2">Meta Description</span>
              <textarea [(ngModel)]="localCust.branding.seoDescription" rows="3" placeholder="A brief description of your business for search engines..." class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"></textarea>
              <p class="text-xs text-gray-400 mt-1">{{ (localCust.branding.seoDescription || '').length }}/160 characters recommended.</p>
            </div>
            <div>
              <span class="block text-sm font-bold text-gray-700 mb-2">Social Share Image (Open Graph)</span>
              <input type="text" [(ngModel)]="localCust.branding.ogImageUrl" placeholder="https://..." class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
              <p class="text-xs text-gray-400 mt-1">Image shown when your page is shared on social media. Recommended: 1200x630px.</p>
            </div>

            <div class="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Search Preview</p>
              <div class="text-blue-700 text-lg font-medium truncate">{{ localCust.branding.seoTitle || (profile().name + ' — ' + profile().tagline) || 'Your Business' }}</div>
              <div class="text-green-700 text-xs truncate mb-1">businessflow-722923667291.us-central1.run.app/public</div>
              <div class="text-gray-600 text-sm line-clamp-2">{{ localCust.branding.seoDescription || profile().description || 'No description set.' }}</div>
            </div>
          </div>
        }

        <!-- Form Tab -->
        @if (currentTab === 'form') {
          <div class="p-6">
            <div class="flex justify-between items-center mb-6">
              <h3 class="font-bold text-gray-900">Enquiry Form Builder</h3>
              <button (click)="addField()" class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1">
                <mat-icon class="text-[16px]">add</mat-icon> Add Field
              </button>
            </div>
            
            <div class="space-y-4">
              @for (field of localCust.formFields; track field.id; let i = $index) {
                <div class="p-4 border border-gray-200 rounded-xl bg-gray-50 flex flex-col md:flex-row gap-4 md:items-center">
                  <div class="w-8 flex justify-center text-gray-400">
                    <mat-icon class="cursor-grab">drag_indicator</mat-icon>
                  </div>
                  
                  <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Label</span>
                      <input type="text" [(ngModel)]="field.label" class="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm">
                    </div>
                    <div>
                      <span class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Type</span>
                      <select [(ngModel)]="field.type" class="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm">
                        <option value="text">Short Text</option>
                        <option value="textarea">Long Text</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="date">Date</option>
                      </select>
                    </div>
                  </div>

                  @if (field.type === 'dropdown') {
                    <div class="flex-1">
                      <span class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Options (comma separated)</span>
                      <input type="text" [(ngModel)]="field.options" placeholder="Option 1, Option 2" class="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm">
                    </div>
                  }

                  <div class="flex items-center justify-between md:justify-end gap-4 shrink-0">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" [(ngModel)]="field.required" class="rounded text-blue-600 focus:ring-blue-500">
                      <span class="text-sm font-bold text-gray-700">Required</span>
                    </label>
                    <button (click)="removeField(i)" class="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors">
                      <mat-icon class="text-[20px]">delete</mat-icon>
                    </button>
                  </div>
                </div>
              }
              
              @if (localCust.formFields.length === 0) {
                 <div class="text-center py-12 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                   No fields defined. Add a field to start building your form.
                 </div>
              }
            </div>
          </div>
        }

        <!-- Rules Tab -->
        @if (currentTab === 'rules') {
          <div class="p-6 space-y-8">
            <div>
              <div class="flex justify-between items-center mb-4">
                <div>
                  <h3 class="font-bold text-gray-900">Enquiry Statuses</h3>
                  <p class="text-xs text-gray-500 mt-1">Comma separated list of pipeline steps.</p>
                </div>
              </div>
              <input type="text" [ngModel]="localCust.rules.statuses.join(', ')" (ngModelChange)="updateStatuses($event)" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700">
              <div class="flex flex-wrap gap-2 mt-3">
                 @for (status of localCust.rules.statuses; track status) {
                    <span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">{{ status }}</span>
                 }
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center mb-4">
                <div>
                  <h3 class="font-bold text-gray-900">Lead Quality Labels</h3>
                  <p class="text-xs text-gray-500 mt-1">Comma separated list of scores (e.g. Hot, Warm, Cold).</p>
                </div>
              </div>
              <input type="text" [ngModel]="localCust.rules.leadQualities.join(', ')" (ngModelChange)="updateLeadQualities($event)" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700">
              <div class="flex flex-wrap gap-2 mt-3">
                 @for (quality of localCust.rules.leadQualities; track quality) {
                    <span class="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">{{ quality }}</span>
                 }
              </div>
            </div>
            
            <div class="pt-6 border-t border-gray-100">
              <h3 class="font-bold text-gray-900 mb-4">Data Management</h3>
              <div class="flex gap-4">
                <button (click)="exportConfig()" class="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2">
                  <mat-icon class="text-[18px]">download</mat-icon> Export JSON
                </button>
                <label class="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2 cursor-pointer">
                  <mat-icon class="text-[18px]">upload</mat-icon> Import JSON
                  <input type="file" class="hidden" accept=".json" (change)="importConfig($event)">
                </label>
              </div>
            </div>
          </div>
        }

      </div>
    </div>
  `
})
export class AdminCustomisationComponent implements OnInit {
  dataService = inject(DataService);
  private toast = inject(ToastService);
  
  tabs = [
    { id: 'branding', label: 'Branding', icon: 'palette' },
    { id: 'sections', label: 'Page Sections', icon: 'view_agenda' },
    { id: 'text', label: 'Text & Labels', icon: 'edit_note' },
    { id: 'seo', label: 'SEO', icon: 'search' },
    { id: 'form', label: 'Contact Form', icon: 'list_alt' },
    { id: 'rules', label: 'Business Rules', icon: 'rule' }
  ];
  currentTab = 'branding';

  localCust!: CustomizationSettings;
  profile = this.dataService.profile;

  layoutPresets = [
    {
      id: 'modern',
      name: 'Modern',
      description: 'Clean lines, blue accent',
      preview: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
      branding: { primaryColor: '#2563eb', secondaryColor: '#1e40af', backgroundColor: '#F5F5F7', fontStyle: 'modern' as const, buttonStyle: 'rounded' as const, cardStyle: 'soft' as const, themeMode: 'light' as const },
      heroVariant: 'centered',
      servicesVariant: 'grid',
    },
    {
      id: 'classic',
      name: 'Classic',
      description: 'Warm serif typography',
      preview: 'linear-gradient(135deg, #78350f 0%, #92400e 100%)',
      branding: { primaryColor: '#92400e', secondaryColor: '#78350f', backgroundColor: '#FFFBEB', fontStyle: 'classic' as const, buttonStyle: 'rounded' as const, cardStyle: 'bordered' as const, themeMode: 'light' as const },
      heroVariant: 'split',
      servicesVariant: 'list',
    },
    {
      id: 'bold',
      name: 'Bold',
      description: 'Dark theme, vibrant pink',
      preview: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
      branding: { primaryColor: '#ec4899', secondaryColor: '#db2777', backgroundColor: '#111827', fontStyle: 'bold' as const, buttonStyle: 'pill' as const, cardStyle: 'glass' as const, themeMode: 'dark' as const },
      heroVariant: 'premium',
      servicesVariant: 'featured',
    },
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Stripped back, content first',
      preview: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
      branding: { primaryColor: '#18181b', secondaryColor: '#3f3f46', backgroundColor: '#ffffff', fontStyle: 'minimal' as const, buttonStyle: 'square' as const, cardStyle: 'flat' as const, themeMode: 'light' as const },
      heroVariant: 'minimal',
      servicesVariant: 'compact',
    },
  ];

  applyLayoutPreset(preset: typeof this.layoutPresets[0]) {
    this.localCust.branding = { ...this.localCust.branding, ...preset.branding };
    const heroSection = this.localCust.sections.find(s => s.id === 'hero');
    if (heroSection) heroSection.layoutVariant = preset.heroVariant;
    const servicesSection = this.localCust.sections.find(s => s.id === 'services');
    if (servicesSection) servicesSection.layoutVariant = preset.servicesVariant;
    this.toast.success(`"${preset.name}" preset applied! Save to keep changes.`);
  }

  ngOnInit() {
    // Create a deep copy of the customization settings
    this.localCust = JSON.parse(JSON.stringify(this.dataService.customization()));
    this.localCust.sections.sort((a, b) => a.order - b.order);
    // Older saved configs have no text object — create it so the Text tab binds.
    this.localCust.text = this.localCust.text || {};
    this.textSettings = this.localCust.text;
  }

  defaults = DEFAULT_PAGE_TEXT;
  textSettings: PageTextSettings = {};

  getSectionName(section: { id: string; type?: string; heading?: string }): string {
    if (section.type) return section.heading || section.type;
    const names: Record<string, string> = {
      hero: 'Hero / Header', about: 'About Us', services: 'Services',
      products: 'Products', pricing: 'Pricing', testimonials: 'Testimonials',
      gallery: 'Gallery', faq: 'FAQ', contact: 'Contact Form',
      location: 'Location Map', hours: 'Business Hours', badges: 'Trust Badges',
      cta: 'Call to Action'
    };
    return names[section.id] || section.id;
  }

  moveSectionUp(index: number) {
    if (index === 0) return;
    const s = this.localCust.sections;
    [s[index - 1], s[index]] = [s[index], s[index - 1]];
    s.forEach((sec, i) => sec.order = i + 1);
  }

  moveSectionDown(index: number) {
    if (index === this.localCust.sections.length - 1) return;
    const s = this.localCust.sections;
    [s[index], s[index + 1]] = [s[index + 1], s[index]];
    s.forEach((sec, i) => sec.order = i + 1);
  }

  updateStatuses(val: string) {
    this.localCust.rules.statuses = val.split(',').map(s => s.trim()).filter(s => s);
  }

  updateLeadQualities(val: string) {
    this.localCust.rules.leadQualities = val.split(',').map(s => s.trim()).filter(s => s);
  }

  saveCustomisation() {
    this.dataService.updateCustomization(this.localCust);
    this.toast.success('Customisation settings saved successfully!');
  }

  resetToDefaults() {
    if (confirm('This will reset all branding, section layouts, form fields, and business rules to their original defaults. Your business profile, services, enquiries, and other data will not be affected.\n\nAre you sure?')) {
      this.dataService.resetCustomization();
      this.localCust = JSON.parse(JSON.stringify(this.dataService.customization()));
      this.localCust.text = this.localCust.text || {};
      this.textSettings = this.localCust.text;
      this.toast.info('Customisation settings have been reset to defaults.');
    }
  }

  addField() {
    this.localCust.formFields.push({
      id: 'field_' + Date.now(),
      label: 'New Field',
      type: 'text',
      required: false,
      options: '',
      order: this.localCust.formFields.length + 1
    });
  }

  removeField(index: number) {
    this.localCust.formFields.splice(index, 1);
  }

  exportConfig() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.localCust, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "customization.json");
    dlAnchorElem.click();
  }

  importConfig(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.branding && parsed.sections) {
          this.localCust = parsed;
          this.localCust.text = this.localCust.text || {};
          this.textSettings = this.localCust.text;
          this.toast.success('Config imported successfully. Click Save to apply.');
        } else {
          this.toast.error('Invalid configuration file.');
        }
      } catch {
        this.toast.error('Error parsing JSON file.');
      }
    };
    reader.readAsText(file);
  }
}
