import { Component, inject, computed, input, output, effect, signal } from '@angular/core';
import { DataService } from './data.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Title, Meta } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { SlicePipe, NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CustomizationSettings, SectionConfig, FormFieldConfig } from './types';
import { sectionRenderType } from './section-library';
import { EditableTextDirective } from './editable-text.directive';
import { AnalyticsService } from './analytics.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-public-page',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, SlicePipe, NgTemplateOutlet, RouterLink, EditableTextDirective],
  styles: [`
    :host { display: block; }
    .dark-mode {
      color: #e5e7eb;
    }
    .dark-mode h1, .dark-mode h2, .dark-mode h3, .dark-mode h4, .dark-mode .text-gray-900 {
      color: #f9fafb !important;
    }
    .dark-mode .bg-white {
      background-color: #1f2937 !important;
      border-color: #374151 !important;
    }
    .dark-mode .bg-gray-50 {
      background-color: #111827 !important;
      border-color: #374151 !important;
    }
    .dark-mode .text-gray-500 {
      color: #9ca3af !important;
    }
    .editable-text {
      cursor: text;
      transition: outline 0.15s;
      outline: 2px solid transparent;
      outline-offset: 4px;
      border-radius: 4px;
    }
    .editable-text:hover {
      outline-color: rgba(59, 130, 246, 0.3);
    }
    .editable-text:focus {
      outline-color: rgba(59, 130, 246, 0.7);
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(24px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-in {
      animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .glass-card {
      background: rgba(255, 255, 255, 0.72);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.4);
    }
    .dark-mode .glass-card {
      background: rgba(31, 41, 55, 0.72) !important;
      border-color: rgba(55, 65, 81, 0.4) !important;
    }
  `],
  template: `
    <div [style]="wrapperStyles" class="min-h-screen font-sans text-gray-900 selection:bg-blue-100 flex flex-col transition-colors duration-300" [class.dark-mode]="customization().branding.themeMode === 'dark'" tabindex="0" (click)="handlePreviewClick($event)" (keydown.enter)="handlePreviewClick($event)">
      <!-- Navbar -->
      <nav class="border-b sticky top-0 z-50 transition-colors" style="backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%);" [style.backgroundColor]="customization().branding.themeMode === 'dark' ? 'rgba(17,24,39,0.8)' : 'rgba(255,255,255,0.72)'" [style.borderColor]="'color-mix(in srgb, ' + customization().branding.primaryColor + ' 8%, transparent)'">
        <div class="max-w-5xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <div class="flex items-center gap-2 md:gap-3 min-w-0">
             @if (customization().branding.logoUrl) {
               <img [src]="customization().branding.logoUrl" alt="Logo" class="w-8 h-8 rounded-lg object-cover shrink-0" referrerpolicy="no-referrer">
             } @else {
               <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" [style.backgroundColor]="customization().branding.primaryColor">
                 <div class="w-4 h-4 border-2 border-white rounded-sm"></div>
               </div>
             }
             <div class="font-semibold text-base md:text-lg tracking-tight truncate" [style.color]="customization().branding.themeMode === 'dark' ? 'white' : 'black'" [appEditableText]="editable()" (textChange)="onTextEdit('profile', 'name', $event)">
               {{ profile().name || 'Your Business' }}
             </div>
          </div>
          <div class="hidden md:flex gap-8 text-sm font-semibold text-gray-500">
             <a href="#services" (click)="scrollTo('services', $event)" class="hover:opacity-80 transition-colors cursor-pointer">Services</a>
             <a href="#about" (click)="scrollTo('about', $event)" class="hover:opacity-80 transition-colors cursor-pointer">About</a>
             <a href="#contact" (click)="scrollTo('contact', $event)" class="hover:opacity-80 transition-colors cursor-pointer">Contact</a>
          </div>
          <div class="flex items-center gap-2">
            <a href="#contact" (click)="scrollTo('contact', $event)" [style.backgroundColor]="customization().branding.primaryColor" [style.borderRadius]="buttonRadius" class="text-white px-3 py-2 md:px-5 md:py-2.5 text-xs md:text-sm font-bold shadow-md hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer">
              {{ customization().branding.ctaText || 'Book Now' }}
            </a>
            <button (click)="mobileMenuOpen.set(!mobileMenuOpen())" class="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
              <mat-icon>{{ mobileMenuOpen() ? 'close' : 'menu' }}</mat-icon>
            </button>
          </div>
        </div>
        @if (mobileMenuOpen()) {
          <div class="md:hidden border-t border-gray-100 shadow-lg" [style.backgroundColor]="customization().branding.backgroundColor">
            <div class="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-1">
              <a href="#services" (click)="scrollTo('services', $event); mobileMenuOpen.set(false)" class="px-4 py-3 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">Services</a>
              <a href="#about" (click)="scrollTo('about', $event); mobileMenuOpen.set(false)" class="px-4 py-3 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">About</a>
              <a href="#contact" (click)="scrollTo('contact', $event); mobileMenuOpen.set(false)" class="px-4 py-3 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">Contact</a>
            </div>
          </div>
        }
      </nav>

      @for (section of sortedSections(); track section.id) {
        @if (section.visible) {
          @switch (renderType(section)) {
            @case ('hero') {
              <section class="py-20 md:py-32">
                <div class="max-w-5xl mx-auto px-6">
                  <!-- Centered Hero -->
                  @if (!section.layoutVariant || section.layoutVariant === 'centered') {
                    <div [style.borderRadius]="cardRadius" class="glass-card p-8 sm:p-12 md:p-20 text-center relative overflow-hidden flex flex-col items-center animate-in">
                      <div class="absolute inset-0 bg-gradient-to-b from-gray-50/50 to-white/30 -z-10"></div>
                      <span class="inline-block py-1.5 px-4 rounded-full bg-blue-50/80 text-blue-600 text-[10px] font-semibold uppercase tracking-widest mb-6 md:mb-8 border border-blue-100/60">
                        {{ profile().type }} &bull; {{ profile().serviceArea }}
                      </span>
                      <h1 class="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-gray-900 mb-4 md:mb-6 max-w-3xl leading-[1.08]" [appEditableText]="editable()" (textChange)="onTextEdit('profile', 'tagline', $event)">
                        {{ profile().tagline || 'Professional services you can trust.' }}
                      </h1>
                      <p class="text-lg md:text-xl text-gray-500 max-w-2xl mb-10 font-normal leading-relaxed">
                        {{ profile().description | slice:0:120 }}...
                      </p>
                      <div class="flex gap-3">
                         <a href="#contact" (click)="scrollTo('contact', $event)" [style.backgroundColor]="customization().branding.primaryColor" [style.borderRadius]="buttonRadius" class="text-white px-8 py-3.5 text-sm font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer">
                           {{ customization().branding.ctaText || profile().ctaText || 'Get a Quote' }}
                         </a>
                         <a href="#services" (click)="scrollTo('services', $event)" [style.borderRadius]="buttonRadius" class="bg-gray-100/80 text-gray-900 px-8 py-3.5 text-sm font-semibold hover:bg-gray-200/80 transition-all duration-200 cursor-pointer">
                           View Services
                         </a>
                      </div>
                      @if(profile().trustBadges && profile().trustBadges.length) {
                        <div class="mt-12 pt-8 border-t border-gray-100 w-full flex flex-wrap justify-center gap-6 text-gray-400">
                          @for(badge of profile().trustBadges; track badge) {
                            <div class="flex items-center gap-2 text-sm font-medium">
                              <mat-icon class="text-[18px] text-blue-500">verified</mat-icon>
                              <span>{{ badge }}</span>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                  
                  <!-- Split Hero -->
                  @else if (section.layoutVariant === 'split') {
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                      <div>
                        <span class="inline-block py-1.5 px-3 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-widest mb-6 border border-blue-100">
                          {{ profile().type }} &bull; {{ profile().serviceArea }}
                        </span>
                        <h1 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-gray-900 mb-4 md:mb-6 leading-tight" [appEditableText]="editable()" (textChange)="onTextEdit('profile', 'tagline', $event)">
                          {{ profile().tagline || 'Professional services you can trust.' }}
                        </h1>
                        <p class="text-lg text-gray-500 mb-8 font-medium">
                          {{ profile().description | slice:0:120 }}...
                        </p>
                        <div class="flex flex-wrap gap-4">
                           <a href="#contact" (click)="scrollTo('contact', $event)" [style.backgroundColor]="customization().branding.primaryColor" [style.borderRadius]="buttonRadius" class="text-white px-8 py-4 text-sm font-bold shadow-lg hover:opacity-90 transition-opacity cursor-pointer">
                             {{ customization().branding.ctaText || profile().ctaText || 'Get a Quote' }}
                           </a>
                        </div>
                        @if(profile().trustBadges && profile().trustBadges.length) {
                          <div class="mt-8 flex flex-wrap gap-4 text-gray-400">
                            @for(badge of profile().trustBadges; track badge) {
                              <div class="flex items-center gap-2 text-sm font-medium">
                                <mat-icon class="text-[16px] text-blue-500">verified</mat-icon>
                                <span>{{ badge }}</span>
                              </div>
                            }
                          </div>
                        }
                      </div>
                      <div [style.borderRadius]="cardRadius" class="aspect-square bg-gray-100 overflow-hidden relative shadow-lg">
                        @if (getSection('hero')?.imageUrl) {
                          <img [src]="getSection('hero')!.imageUrl" alt="Hero" referrerpolicy="no-referrer" class="w-full h-full object-cover">
                        } @else {
                          <img src="https://images.unsplash.com/photo-1556761175-5973dc0f32d7?w=800&q=80" alt="Hero" referrerpolicy="no-referrer" class="w-full h-full object-cover">
                        }
                      </div>
                    </div>
                  }
                  
                  <!-- Minimal Hero -->
                  @else if (section.layoutVariant === 'minimal') {
                    <div class="text-center py-10 max-w-3xl mx-auto">
                      <h1 class="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight text-gray-900 mb-4 md:mb-6 leading-none" [appEditableText]="editable()" (textChange)="onTextEdit('profile', 'tagline', $event)">
                        {{ profile().tagline || 'Professional services you can trust.' }}
                      </h1>
                      <p class="text-xl text-gray-500 mb-10 font-medium">
                        {{ profile().description | slice:0:150 }}...
                      </p>
                      <a href="#contact" (click)="scrollTo('contact', $event)" [style.color]="customization().branding.primaryColor" class="inline-flex items-center gap-2 text-lg font-bold hover:opacity-80 transition-opacity cursor-pointer">
                        <span>{{ customization().branding.ctaText || profile().ctaText || 'Get a Quote' }}</span>
                        <mat-icon>arrow_forward</mat-icon>
                      </a>
                    </div>
                  }
                  
                  <!-- Premium Card Hero -->
                  @else if (section.layoutVariant === 'premium') {
                    <div [style.borderRadius]="cardRadius" class="bg-gray-900 text-white p-6 sm:p-12 md:p-20 shadow-2xl border border-gray-800 text-center relative overflow-hidden flex flex-col items-center">
                      <div class="absolute inset-0 bg-gradient-to-tr from-gray-800/50 to-transparent -z-10"></div>
                      <span class="inline-block py-1.5 px-3 rounded-full bg-white/10 text-gray-200 text-[10px] font-bold uppercase tracking-widest mb-6 md:mb-8 border border-white/10">
                        Premium &bull; {{ profile().serviceArea }}
                      </span>
                      <h1 class="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight mb-4 md:mb-6 max-w-3xl leading-tight" [appEditableText]="editable()" (textChange)="onTextEdit('profile', 'tagline', $event)">
                        {{ profile().tagline || 'Professional services you can trust.' }}
                      </h1>
                      <p class="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 font-medium">
                        {{ profile().description | slice:0:120 }}...
                      </p>
                      <div class="flex flex-col sm:flex-row gap-4">
                         <a href="#contact" (click)="scrollTo('contact', $event)" [style.backgroundColor]="customization().branding.primaryColor" [style.borderRadius]="buttonRadius" class="text-white px-8 py-4 text-sm font-bold shadow-lg hover:opacity-90 transition-opacity cursor-pointer">
                           {{ customization().branding.ctaText || profile().ctaText || 'Get a Quote' }}
                         </a>
                         <a href="#services" (click)="scrollTo('services', $event)" [style.borderRadius]="buttonRadius" class="bg-white/10 text-white border border-white/20 px-8 py-4 text-sm font-bold hover:bg-white/20 transition-colors cursor-pointer">
                           View Services
                         </a>
                      </div>
                    </div>
                  }
                </div>
              </section>
            }

            @case ('about') {
              <section [id]="section.id" class="py-16 md:py-24">
                <div class="max-w-5xl mx-auto px-6">
                  <div class="mb-8 md:mb-12">
                    <h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2" [appEditableText]="editable()" (textChange)="onTextEdit('section', 'heading', $event, section.id)">{{ section.heading }}</h2>
                    <p class="text-gray-500 font-medium" [appEditableText]="editable()" (textChange)="onTextEdit('section', 'subheading', $event, section.id)">{{ section.subheading }}</p>
                  </div>

                  @if (!section.layoutVariant || section.layoutVariant === 'default') {
                    <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
                      <div class="lg:col-span-3">
                        <div [style.borderRadius]="cardRadius" class="bg-white p-6 md:p-10 border border-gray-100 shadow-sm h-full">
                          <p class="text-base md:text-lg text-gray-600 leading-relaxed whitespace-pre-line" [appEditableText]="editable()" (textChange)="onTextEdit('profile', 'description', $event)">{{ profile().description }}</p>
                        </div>
                      </div>
                      <div class="lg:col-span-2 space-y-4">
                        @if (profile().serviceArea) {
                          <div [style.borderRadius]="cardRadius" class="bg-white p-6 border border-gray-100 shadow-sm flex items-start gap-4">
                            <div [style.color]="customization().branding.primaryColor" [style.backgroundColor]="'color-mix(in srgb, ' + customization().branding.primaryColor + ' 10%, transparent)'" class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                              <mat-icon>location_on</mat-icon>
                            </div>
                            <div>
                              <h4 class="font-bold text-gray-900 text-sm">Service Area</h4>
                              <p class="text-gray-500 text-sm mt-1">{{ profile().serviceArea }}</p>
                            </div>
                          </div>
                        }
                        @if (profile().address) {
                          <div [style.borderRadius]="cardRadius" class="bg-white p-6 border border-gray-100 shadow-sm flex items-start gap-4">
                            <div [style.color]="customization().branding.primaryColor" [style.backgroundColor]="'color-mix(in srgb, ' + customization().branding.primaryColor + ' 10%, transparent)'" class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                              <mat-icon>business</mat-icon>
                            </div>
                            <div>
                              <h4 class="font-bold text-gray-900 text-sm">Address</h4>
                              <p class="text-gray-500 text-sm mt-1">{{ profile().address }}</p>
                            </div>
                          </div>
                        }
                        @if (profile().openingHours) {
                          <div [style.borderRadius]="cardRadius" class="bg-white p-6 border border-gray-100 shadow-sm flex items-start gap-4">
                            <div [style.color]="customization().branding.primaryColor" [style.backgroundColor]="'color-mix(in srgb, ' + customization().branding.primaryColor + ' 10%, transparent)'" class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                              <mat-icon>schedule</mat-icon>
                            </div>
                            <div>
                              <h4 class="font-bold text-gray-900 text-sm">Business Hours</h4>
                              <p class="text-gray-500 text-sm mt-1 whitespace-pre-wrap">{{ profile().openingHours }}</p>
                            </div>
                          </div>
                        }
                        @if (profile().trustBadges && profile().trustBadges.length) {
                          <div [style.borderRadius]="cardRadius" class="bg-white p-6 border border-gray-100 shadow-sm">
                            <h4 class="font-bold text-gray-900 text-sm mb-3">Why Choose Us</h4>
                            <div class="space-y-2">
                              @for (badge of profile().trustBadges; track badge) {
                                <div class="flex items-center gap-2 text-sm text-gray-600">
                                  <mat-icon [style.color]="customization().branding.primaryColor" class="text-[16px] w-[16px] h-[16px]">check_circle</mat-icon>
                                  <span>{{ badge }}</span>
                                </div>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  } @else if (section.layoutVariant === 'centered') {
                    <div class="max-w-3xl mx-auto text-center">
                      <div [style.borderRadius]="cardRadius" class="bg-white p-6 md:p-10 lg:p-14 border border-gray-100 shadow-sm">
                        @if (profile().tagline) {
                          <p [style.color]="customization().branding.primaryColor" class="text-sm font-bold uppercase tracking-widest mb-4">{{ profile().tagline }}</p>
                        }
                        <p class="text-base md:text-lg lg:text-xl text-gray-600 leading-relaxed" [appEditableText]="editable()" (textChange)="onTextEdit('profile', 'description', $event)">{{ profile().description }}</p>
                        @if (profile().trustBadges && profile().trustBadges.length) {
                          <div class="mt-8 pt-6 border-t border-gray-100 flex flex-wrap justify-center gap-6">
                            @for (badge of profile().trustBadges; track badge) {
                              <div class="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                <mat-icon [style.color]="customization().branding.primaryColor" class="text-[16px] w-[16px] h-[16px]">verified</mat-icon>
                                <span>{{ badge }}</span>
                              </div>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  } @else if (section.layoutVariant === 'split') {
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                      <div [style.borderRadius]="cardRadius" class="aspect-[4/3] bg-gray-100 overflow-hidden relative shadow-lg order-2 lg:order-1">
                        @if (getSection('about')?.imageUrl) {
                          <img [src]="getSection('about')!.imageUrl" alt="About" referrerpolicy="no-referrer" class="w-full h-full object-cover">
                        } @else {
                          <div class="w-full h-full flex items-center justify-center">
                            <mat-icon class="text-[64px] w-[64px] h-[64px] text-gray-300">storefront</mat-icon>
                          </div>
                        }
                      </div>
                      <div class="order-1 lg:order-2">
                        @if (profile().tagline) {
                          <span [style.color]="customization().branding.primaryColor" class="inline-block text-sm font-bold uppercase tracking-widest mb-4">{{ profile().tagline }}</span>
                        }
                        <p class="text-base md:text-lg text-gray-600 leading-relaxed mb-6" [appEditableText]="editable()" (textChange)="onTextEdit('profile', 'description', $event)">{{ profile().description }}</p>
                        <div class="space-y-3">
                          @if (profile().serviceArea) {
                            <div class="flex items-center gap-3 text-sm text-gray-600">
                              <mat-icon [style.color]="customization().branding.primaryColor" class="text-[18px]">location_on</mat-icon>
                              <span>Serving {{ profile().serviceArea }}</span>
                            </div>
                          }
                          @if (profile().openingHours) {
                            <div class="flex items-center gap-3 text-sm text-gray-600">
                              <mat-icon [style.color]="customization().branding.primaryColor" class="text-[18px]">schedule</mat-icon>
                              <span>{{ profile().openingHours }}</span>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </section>
            }

            @case ('services') {
              <!-- Services -->
              <section [id]="section.id" class="py-20 md:py-28">
                <div class="max-w-5xl mx-auto px-6">
                  <div class="mb-10 md:mb-14 flex justify-between items-end">
                    <div>
                      <h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2" [appEditableText]="editable()" (textChange)="onTextEdit('section', 'heading', $event, section.id)">{{ section.heading }}</h2>
                      <p class="text-gray-500 font-medium" [appEditableText]="editable()" (textChange)="onTextEdit('section', 'subheading', $event, section.id)">{{ section.subheading }}</p>
                    </div>
                  </div>
                  
                  @if (!section.layoutVariant || section.layoutVariant === 'grid') {
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      @for (service of services(); track service.id) {
                        <div [style.borderRadius]="cardRadius" class="bg-white border border-gray-100/80 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col h-full overflow-hidden">
                          @if (service.imageUrl) {
                            <img [src]="service.imageUrl" [alt]="service.name" referrerpolicy="no-referrer" class="w-full h-40 object-cover">
                            <div class="p-8 flex flex-col flex-grow">
                              <h3 class="text-lg font-bold text-gray-900 mb-3" [appEditableText]="editable()" (textChange)="onTextEdit('service', 'name', $event, service.id)">{{ service.name }}</h3>
                              <p class="text-gray-500 mb-6 text-sm flex-grow leading-relaxed" [appEditableText]="editable()" (textChange)="onTextEdit('service', 'description', $event, service.id)">{{ service.description }}</p>
                              <div class="pt-4 border-t border-gray-50 mt-auto">
                                <p class="font-bold text-gray-900 flex items-center justify-between text-sm">
                                  <span class="text-gray-400 text-[10px] uppercase tracking-wider">Starting at</span>
                                  {{ service.price }}
                                </p>
                                @if (getPaymentLink(service.name); as payUrl) {
                                  <a [href]="payUrl" target="_blank" rel="noopener" [style.backgroundColor]="customization().branding.primaryColor" [style.borderRadius]="buttonRadius" class="mt-3 inline-flex items-center justify-center gap-1.5 text-white px-4 py-2 text-xs font-bold shadow-sm hover:opacity-90 transition-opacity">
                                    <mat-icon class="text-[16px]">payment</mat-icon> Pay Now
                                  </a>
                                }
                              </div>
                            </div>
                          } @else {
                            <div class="p-8 flex flex-col flex-grow">
                              <div [style.color]="customization().branding.primaryColor" [style.backgroundColor]="'color-mix(in srgb, ' + customization().branding.primaryColor + ' 10%, transparent)'" class="w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                                <mat-icon>check_circle</mat-icon>
                              </div>
                              <h3 class="text-lg font-bold text-gray-900 mb-3" [appEditableText]="editable()" (textChange)="onTextEdit('service', 'name', $event, service.id)">{{ service.name }}</h3>
                              <p class="text-gray-500 mb-6 text-sm flex-grow leading-relaxed" [appEditableText]="editable()" (textChange)="onTextEdit('service', 'description', $event, service.id)">{{ service.description }}</p>
                              <div class="pt-4 border-t border-gray-50 mt-auto">
                                <p class="font-bold text-gray-900 flex items-center justify-between text-sm">
                                  <span class="text-gray-400 text-[10px] uppercase tracking-wider">Starting at</span>
                                  {{ service.price }}
                                </p>
                                @if (getPaymentLink(service.name); as payUrl) {
                                  <a [href]="payUrl" target="_blank" rel="noopener" [style.backgroundColor]="customization().branding.primaryColor" [style.borderRadius]="buttonRadius" class="mt-3 inline-flex items-center justify-center gap-1.5 text-white px-4 py-2 text-xs font-bold shadow-sm hover:opacity-90 transition-opacity">
                                    <mat-icon class="text-[16px]">payment</mat-icon> Pay Now
                                  </a>
                                }
                              </div>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                  
                  @else if (section.layoutVariant === 'list') {
                    <div class="flex flex-col gap-4">
                      @for (service of services(); track service.id) {
                        <div [style.borderRadius]="cardRadius" class="bg-white p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center gap-6">
                          <div [style.color]="customization().branding.primaryColor" [style.backgroundColor]="'color-mix(in srgb, ' + customization().branding.primaryColor + ' 10%, transparent)'" class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0">
                            <mat-icon>check_circle</mat-icon>
                          </div>
                          <div class="flex-grow">
                            <h3 class="text-lg font-bold text-gray-900" [appEditableText]="editable()" (textChange)="onTextEdit('service', 'name', $event, service.id)">{{ service.name }}</h3>
                            <p class="text-gray-500 text-sm mt-1" [appEditableText]="editable()" (textChange)="onTextEdit('service', 'description', $event, service.id)">{{ service.description }}</p>
                          </div>
                          <div class="shrink-0 text-left md:text-right">
                            <span class="text-gray-400 text-[10px] uppercase tracking-wider block">Starting at</span>
                            <p class="font-bold text-gray-900 text-lg">{{ service.price }}</p>
                            @if (getPaymentLink(service.name); as payUrl) {
                              <a [href]="payUrl" target="_blank" rel="noopener" [style.backgroundColor]="customization().branding.primaryColor" [style.borderRadius]="buttonRadius" class="mt-2 inline-flex items-center gap-1.5 text-white px-4 py-2 text-xs font-bold shadow-sm hover:opacity-90 transition-opacity">
                                <mat-icon class="text-[16px]">payment</mat-icon> Pay Now
                              </a>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }

                  @else if (section.layoutVariant === 'featured') {
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                      @for (service of services(); track service.id; let i = $index) {
                        @if (i === 0) {
                          <div [style.borderRadius]="cardRadius" class="bg-gray-900 text-white p-10 md:col-span-2 flex flex-col md:flex-row gap-8 items-center shadow-lg">
                            <div class="flex-grow">
                              <span class="inline-block py-1 px-3 rounded-full bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest mb-4">Featured Service</span>
                              <h3 class="text-2xl md:text-3xl font-black mb-4" [appEditableText]="editable()" (textChange)="onTextEdit('service', 'name', $event, service.id)">{{ service.name }}</h3>
                              <p class="text-gray-400 mb-6 leading-relaxed" [appEditableText]="editable()" (textChange)="onTextEdit('service', 'description', $event, service.id)">{{ service.description }}</p>
                              <p class="font-bold text-xl">{{ service.price }}</p>
                            </div>
                            <div class="w-full md:w-1/3 aspect-video bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                              <mat-icon class="text-6xl text-white/20">star</mat-icon>
                            </div>
                          </div>
                        } @else {
                          <div [style.borderRadius]="cardRadius" class="bg-white p-8 border border-gray-100 shadow-sm flex flex-col h-full">
                            <h3 class="text-xl font-bold text-gray-900 mb-3" [appEditableText]="editable()" (textChange)="onTextEdit('service', 'name', $event, service.id)">{{ service.name }}</h3>
                            <p class="text-gray-500 mb-6 text-sm flex-grow" [appEditableText]="editable()" (textChange)="onTextEdit('service', 'description', $event, service.id)">{{ service.description }}</p>
                            <p class="font-bold text-gray-900">{{ service.price }}</p>
                          </div>
                        }
                      }
                    </div>
                  }
                  
                  @else if (section.layoutVariant === 'compact') {
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                      @for (service of services(); track service.id) {
                        <div [style.borderRadius]="cardRadius" class="bg-white p-6 border border-gray-100 shadow-sm text-center flex flex-col items-center">
                          <div [style.color]="customization().branding.primaryColor" class="mb-3">
                            <mat-icon>business_center</mat-icon>
                          </div>
                          <h3 class="text-sm font-bold text-gray-900 mb-2" [appEditableText]="editable()" (textChange)="onTextEdit('service', 'name', $event, service.id)">{{ service.name }}</h3>
                          <p class="font-bold text-gray-500 text-xs">{{ service.price }}</p>
                        </div>
                      }
                    </div>
                  }
                </div>
              </section>
            }

            @case ('testimonials') {
              <!-- Testimonials -->
              @if (testimonials().length) {
              <section [id]="section.id" class="py-12 md:py-24 bg-gray-50 border-y border-gray-200">
                <div class="max-w-5xl mx-auto px-4 md:px-6">
                  <div class="text-center mb-8 md:mb-12">
                    <h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2" [appEditableText]="editable()" (textChange)="onTextEdit('section', 'heading', $event, section.id)">{{ section.heading }}</h2>
                    <p class="text-gray-500 font-medium" [appEditableText]="editable()" (textChange)="onTextEdit('section', 'subheading', $event, section.id)">{{ section.subheading }}</p>
                  </div>
                  
                  @if (!section.layoutVariant || section.layoutVariant === 'quote') {
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      @for (testimonial of testimonials(); track testimonial.id) {
                        <div [style.borderRadius]="cardRadius" class="bg-white p-8 border border-gray-100 shadow-sm flex flex-col h-full">
                          <div class="flex gap-1 mb-4 text-yellow-400">
                            @for (star of [1,2,3,4,5]; track star) {
                              <mat-icon class="text-[18px] w-[18px] h-[18px]">{{ star <= testimonial.rating ? 'star' : 'star_border' }}</mat-icon>
                            }
                          </div>
                          <p class="text-gray-600 mb-6 italic leading-relaxed flex-grow">"{{ testimonial.text }}"</p>
                          <div class="flex items-center gap-3 mt-auto">
                            <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
                              {{ testimonial.author.charAt(0) }}
                            </div>
                            <div>
                              <p class="font-bold text-gray-900 text-sm">{{ testimonial.author }}</p>
                              @if (testimonial.role) {
                                <p class="text-xs text-gray-500">{{ testimonial.role }}</p>
                              }
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  }
                  
                  @else if (section.layoutVariant === 'carousel') {
                    <div class="flex overflow-x-auto gap-6 pb-8 snap-x">
                      @for (testimonial of testimonials(); track testimonial.id) {
                        <div [style.borderRadius]="cardRadius" class="bg-white p-10 border border-gray-100 shadow-sm flex-none w-full md:w-[600px] snap-center">
                          <mat-icon class="text-gray-200 text-5xl mb-6">format_quote</mat-icon>
                          <p class="text-xl md:text-2xl text-gray-900 mb-8 font-medium leading-relaxed">"{{ testimonial.text }}"</p>
                          <div class="flex items-center justify-between">
                            <div>
                              <p class="font-bold text-gray-900">{{ testimonial.author }}</p>
                              @if (testimonial.role) {
                                <p class="text-sm text-gray-500">{{ testimonial.role }}</p>
                              }
                            </div>
                            <div class="flex gap-1 text-yellow-400">
                              @for (star of [1,2,3,4,5]; track star) {
                                <mat-icon class="text-[16px] w-[16px] h-[16px]">{{ star <= testimonial.rating ? 'star' : 'star_border' }}</mat-icon>
                              }
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  }
                  
                  @else if (section.layoutVariant === 'list') {
                    <div class="max-w-3xl mx-auto space-y-8">
                      @for (testimonial of testimonials(); track testimonial.id) {
                        <div class="border-b border-gray-200 pb-8 last:border-0 last:pb-0">
                          <div class="flex gap-1 mb-3 text-yellow-400">
                            @for (star of [1,2,3,4,5]; track star) {
                              <mat-icon class="text-[16px] w-[16px] h-[16px]">{{ star <= testimonial.rating ? 'star' : 'star_border' }}</mat-icon>
                            }
                          </div>
                          <p class="text-lg text-gray-700 mb-4 font-medium">"{{ testimonial.text }}"</p>
                          <p class="font-bold text-gray-900 text-sm">&mdash; {{ testimonial.author }} <span class="text-gray-400 font-normal ml-2">{{ testimonial.role }}</span></p>
                        </div>
                      }
                    </div>
                  }
                </div>
              </section>
              }
            }
            @case ('faq') {
              <!-- FAQs -->
              @if (faqs().length) {
              <section id="faqs" class="py-12 md:py-24 bg-white border-y border-gray-200">
                <div class="max-w-5xl mx-auto px-4 md:px-6">
                  <div class="text-center mb-8 md:mb-12">
                    <h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2" [appEditableText]="editable()" (textChange)="onTextEdit('section', 'heading', $event, section.id)">{{ section.heading }}</h2>
                    <p class="text-gray-500 font-medium" [appEditableText]="editable()" (textChange)="onTextEdit('section', 'subheading', $event, section.id)">{{ section.subheading }}</p>
                  </div>
                  
                  @if (!section.layoutVariant || section.layoutVariant === 'accordion') {
                    <div class="max-w-3xl mx-auto space-y-6">
                      @for (faq of faqs(); track faq.id) {
                        <div [style.borderRadius]="cardRadius" class="bg-gray-50 p-6 border border-gray-100">
                          <h3 class="text-lg font-bold text-gray-900 mb-2" [appEditableText]="editable()" (textChange)="onTextEdit('faq', 'question', $event, faq.id)">{{ faq.question }}</h3>
                          <p class="text-gray-600 text-sm leading-relaxed" [appEditableText]="editable()" (textChange)="onTextEdit('faq', 'answer', $event, faq.id)">{{ faq.answer }}</p>
                        </div>
                      }
                    </div>
                  }
                  
                  @else if (section.layoutVariant === 'two-column') {
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                      @for (faq of faqs(); track faq.id) {
                        <div class="border-t border-gray-200 pt-6">
                          <h3 class="text-lg font-bold text-gray-900 mb-3" [appEditableText]="editable()" (textChange)="onTextEdit('faq', 'question', $event, faq.id)">{{ faq.question }}</h3>
                          <p class="text-gray-600 text-sm leading-relaxed" [appEditableText]="editable()" (textChange)="onTextEdit('faq', 'answer', $event, faq.id)">{{ faq.answer }}</p>
                        </div>
                      }
                    </div>
                  }
                </div>
              </section>
              }
            }

            @case ('contact') {
              <!-- Contact -->
              <section [id]="section.id" class="py-16 md:py-24">
                <div class="max-w-5xl mx-auto px-6">
                  @if (!section.layoutVariant || section.layoutVariant === 'split') {
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch overflow-hidden">
                      <div [style.borderRadius]="cardRadius" class="col-span-1 lg:col-span-5 bg-gray-900 text-white p-6 md:p-10 flex flex-col shadow-xl overflow-hidden">
                        <div class="mb-8 md:mb-12">
                          <h2 class="text-2xl md:text-3xl font-black mb-4" [appEditableText]="editable()" (textChange)="onTextEdit('section', 'heading', $event, section.id)">{{ section.heading }}</h2>
                          <p class="text-gray-400 text-sm leading-relaxed" [appEditableText]="editable()" (textChange)="onTextEdit('section', 'subheading', $event, section.id)">{{ section.subheading }}</p>
                        </div>
                        
                        <div class="space-y-4 mt-auto">
                          <div class="flex items-center gap-3 bg-white/10 p-4 rounded-xl border border-white/5 min-w-0">
                            <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                              <mat-icon class="text-[20px]">email</mat-icon>
                            </div>
                            <div class="min-w-0">
                              <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Us</p>
                              <p class="font-medium text-sm truncate">{{ profile().email }}</p>
                            </div>
                          </div>
                          @if(profile().phone) {
                            <div class="flex items-center gap-3 bg-white/10 p-4 rounded-xl border border-white/5 min-w-0">
                              <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                <mat-icon class="text-[20px]">phone</mat-icon>
                              </div>
                              <div class="min-w-0">
                                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Call Us</p>
                                <p class="font-medium text-sm">{{ profile().phone }}</p>
                              </div>
                            </div>
                          }
                          @if(profile().openingHours) {
                            <div class="flex gap-3 bg-white/10 p-4 rounded-xl border border-white/5 min-w-0">
                              <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                <mat-icon class="text-[20px]">schedule</mat-icon>
                              </div>
                              <div class="min-w-0">
                                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Business Hours</p>
                                <p class="font-medium text-sm break-words">{{ profile().openingHours }}</p>
                              </div>
                            </div>
                          }
                        </div>
                      </div>
                      
                      <div [style.borderRadius]="cardRadius" class="col-span-1 lg:col-span-7 bg-white text-gray-900 p-6 md:p-10 shadow-sm border border-gray-100">
                        <ng-container *ngTemplateOutlet="contactForm"></ng-container>
                      </div>
                    </div>
                  }
                  
                  @else if (section.layoutVariant === 'form-only') {
                    <div class="max-w-2xl mx-auto">
                      <div class="text-center mb-8 md:mb-10">
                        <h2 class="text-2xl md:text-3xl font-black mb-4" [appEditableText]="editable()" (textChange)="onTextEdit('section', 'heading', $event, section.id)">{{ section.heading }}</h2>
                        <p class="text-gray-500 text-sm leading-relaxed" [appEditableText]="editable()" (textChange)="onTextEdit('section', 'subheading', $event, section.id)">{{ section.subheading }}</p>
                      </div>
                      <div [style.borderRadius]="cardRadius" class="bg-white text-gray-900 p-10 shadow-sm border border-gray-100">
                        <ng-container *ngTemplateOutlet="contactForm"></ng-container>
                      </div>
                    </div>
                  }

                  @else if (section.layoutVariant === 'form-details') {
                    <div class="max-w-4xl mx-auto">
                      <div class="text-center mb-8 md:mb-12">
                        <h2 class="text-2xl md:text-3xl font-black mb-4" [appEditableText]="editable()" (textChange)="onTextEdit('section', 'heading', $event, section.id)">{{ section.heading }}</h2>
                        <p class="text-gray-500 text-sm leading-relaxed" [appEditableText]="editable()" (textChange)="onTextEdit('section', 'subheading', $event, section.id)">{{ section.subheading }}</p>
                      </div>
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                        <div [style.borderRadius]="cardRadius" class="bg-white p-6 border border-gray-100 text-center">
                          <mat-icon class="text-gray-400 mb-3 text-3xl w-8 h-8">email</mat-icon>
                          <h4 class="font-bold text-sm mb-1">Email</h4>
                          <p class="text-gray-500 text-sm">{{ profile().email }}</p>
                        </div>
                        <div [style.borderRadius]="cardRadius" class="bg-white p-6 border border-gray-100 text-center">
                          <mat-icon class="text-gray-400 mb-3 text-3xl w-8 h-8">phone</mat-icon>
                          <h4 class="font-bold text-sm mb-1">Phone</h4>
                          <p class="text-gray-500 text-sm">{{ profile().phone || 'N/A' }}</p>
                        </div>
                        <div [style.borderRadius]="cardRadius" class="bg-white p-6 border border-gray-100 text-center">
                          <mat-icon class="text-gray-400 mb-3 text-3xl w-8 h-8">location_on</mat-icon>
                          <h4 class="font-bold text-sm mb-1">Address</h4>
                          <p class="text-gray-500 text-sm">{{ profile().address || 'N/A' }}</p>
                        </div>
                      </div>
                      <div [style.borderRadius]="cardRadius" class="bg-white text-gray-900 p-10 shadow-sm border border-gray-100">
                        <ng-container *ngTemplateOutlet="contactForm"></ng-container>
                      </div>
                    </div>
                  }
                  
                  <ng-template #contactForm>
                    <div class="flex items-center gap-3 mb-8">
                      <div [style.color]="customization().branding.primaryColor" [style.backgroundColor]="'color-mix(in srgb, ' + customization().branding.primaryColor + ' 10%, transparent)'" class="w-8 h-8 rounded-lg flex items-center justify-center">
                        <mat-icon class="text-[18px]">send</mat-icon>
                      </div>
                      <h3 class="text-2xl font-black">Send an Enquiry</h3>
                    </div>
                    
                    @if(submitSuccess) {
                      <div [style.borderRadius]="cardRadius" class="bg-green-50 border border-green-100 text-green-800 p-8 flex flex-col items-center text-center h-full justify-center">
                        <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-green-500">
                          <mat-icon class="text-3xl">check_circle</mat-icon>
                        </div>
                        <h4 class="text-xl font-black mb-2">Message Sent!</h4>
                        <p class="text-green-700 mb-8 text-sm">Thanks for reaching out. We'll get back to you shortly.</p>
                        <button (click)="submitSuccess = false" [style.backgroundColor]="customization().branding.primaryColor" [style.borderRadius]="buttonRadius" class="text-white px-6 py-2.5 font-bold text-sm shadow-md hover:opacity-90 transition-opacity">Send another message</button>
                      </div>
                    } @else {
                      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
                        @for (field of visibleFormFields; track field.id) {
                          <div>
                            <label [for]="field.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                              {{ field.label }} {{ field.required ? '*' : '' }}
                            </label>
                            
                            @if (field.type === 'textarea') {
                              <textarea [id]="field.id" [formControlName]="field.id" [placeholder]="field.placeholder || ''" rows="4" class="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm transition-all"></textarea>
                            } @else if (field.type === 'dropdown' || field.type === 'budget' || field.type === 'contact-method') {
                              <select [id]="field.id" [formControlName]="field.id" class="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm font-medium text-gray-700 transition-all">
                                <option value="" disabled selected>{{ field.placeholder || 'Select...' }}</option>
                                @if (field.type === 'dropdown') {
                                  @for (opt of field.options.split(','); track opt) {
                                    @if (opt.trim()) {
                                      <option [value]="opt.trim()">{{ opt.trim() }}</option>
                                    }
                                  }
                                } @else if (field.type === 'budget') {
                                  <option value="under500">Under $500</option>
                                  <option value="500to1000">$500 - $1,000</option>
                                  <option value="1000to5000">$1,000 - $5,000</option>
                                  <option value="over5000">Over $5,000</option>
                                } @else if (field.type === 'contact-method') {
                                  <option value="email">Email</option>
                                  <option value="phone">Phone</option>
                                  <option value="text">Text Message</option>
                                }
                              </select>
                            } @else if (field.type === 'checkbox') {
                              <label class="flex items-center gap-3 cursor-pointer">
                                <input [id]="field.id" type="checkbox" [formControlName]="field.id" class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500">
                                <span class="text-sm text-gray-700">{{ field.placeholder || 'Check this box' }}</span>
                              </label>
                            } @else if (field.type === 'radio') {
                              <div class="space-y-2">
                                @for (opt of field.options.split(','); track opt) {
                                  @if (opt.trim()) {
                                    <label class="flex items-center gap-3 cursor-pointer">
                                      <input type="radio" [value]="opt.trim()" [formControlName]="field.id" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                                      <span class="text-sm text-gray-700">{{ opt.trim() }}</span>
                                    </label>
                                  }
                                }
                              </div>
                            } @else if (field.type === 'file') {
                              <div class="w-full px-4 py-6 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-center cursor-pointer hover:bg-gray-100 transition-colors">
                                <mat-icon class="text-gray-400 mb-2">cloud_upload</mat-icon>
                                <p class="text-sm text-gray-600 font-medium">{{ field.placeholder || 'Click or drag file to upload' }}</p>
                              </div>
                            } @else if (field.type === 'multi-select') {
                              <div class="space-y-2">
                                 <p class="text-xs text-gray-500 mb-1">Select all that apply:</p>
                                 @for (opt of field.options.split(','); track opt) {
                                   @if (opt.trim()) {
                                     <label class="flex items-center gap-3 cursor-pointer">
                                       <input type="checkbox" [value]="opt.trim()" [formControlName]="field.id" class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500">
                                       <span class="text-sm text-gray-700">{{ opt.trim() }}</span>
                                     </label>
                                   }
                                 }
                              </div>
                            } @else {
                              <input [id]="field.id" [type]="field.type === 'phone' ? 'tel' : field.type" [formControlName]="field.id" [placeholder]="field.placeholder || ''" class="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm transition-all">
                            }

                            @if (field.helperText) {
                              <p class="text-xs text-gray-500 mt-1.5">{{ field.helperText }}</p>
                            }

                            @if (form.get(field.id)?.invalid && form.get(field.id)?.touched) {
                              @if (form.get(field.id)?.hasError('required')) {
                                <p class="text-red-500 text-xs mt-1">{{ field.label }} is required</p>
                              } @else if (form.get(field.id)?.hasError('email')) {
                                <p class="text-red-500 text-xs mt-1">Please enter a valid email address</p>
                              } @else if (form.get(field.id)?.hasError('minlength')) {
                                <p class="text-red-500 text-xs mt-1">{{ field.type === 'phone' ? 'Please enter a valid phone number' : 'Please enter at least 10 characters' }}</p>
                              } @else {
                                <p class="text-red-500 text-xs mt-1">This field is invalid</p>
                              }
                            }
                          </div>
                        }

                        <div style="position:absolute;left:-9999px" aria-hidden="true">
                          <input type="text" name="website" tabindex="-1" autocomplete="off" #honeypot>
                        </div>

                        <button type="submit" [disabled]="form.invalid" [style.backgroundColor]="customization().branding.primaryColor" [style.borderRadius]="buttonRadius" class="w-full text-white px-6 py-4 text-sm font-bold shadow-md disabled:opacity-50 hover:opacity-90 transition-opacity mt-2">
                          Send Message
                        </button>
                      </form>
                    }
                  </ng-template>
                </div>
              </section>
            }

            @default {
              <!-- Fallback for other sections, and the body of inserted
                   'custom' content sections -->
              <section [id]="section.id" class="py-16 md:py-24">
                <div class="max-w-5xl mx-auto px-6">
                  <div class="mb-12">
                    <h2 class="text-3xl font-bold text-gray-900 mb-2" [style.color]="customization().branding.themeMode === 'dark' ? 'white' : 'black'">{{ section.heading }}</h2>
                    <p class="text-gray-500 font-medium">{{ section.subheading }}</p>
                  </div>
                  @if (section.content) {
                    <div [style.borderRadius]="cardRadius" class="glass-card p-8 md:p-10">
                      <p class="text-gray-700 leading-relaxed whitespace-pre-line">{{ section.content }}</p>
                    </div>
                  } @else if (renderType(section) !== 'custom') {
                    <div [style.borderRadius]="cardRadius" class="bg-gray-50 border border-gray-100 p-10 flex items-center justify-center text-gray-400 text-sm">
                      {{ section.heading }} Content Coming Soon
                    </div>
                  }
                </div>
              </section>
            }
          }
        }
      }
      
      <footer class="mt-auto py-8 border-t border-gray-200/60 text-center text-gray-400 text-xs">
         <div class="max-w-5xl mx-auto px-6">
           <div class="flex items-center justify-center gap-4 mb-3">
             <a routerLink="/privacy" class="hover:text-gray-600 transition-colors text-[12px] font-medium">Privacy</a>
             <span class="text-gray-300">|</span>
             <a routerLink="/terms" class="hover:text-gray-600 transition-colors text-[12px] font-medium">Terms</a>
           </div>
           <p class="text-[11px] text-gray-400">&copy; 2026 {{ profile().name }}. @if (!hideBranding()) {Powered by BusinessFlow Studio.}</p>
         </div>
      </footer>
    </div>
  `
})
export class PublicPageComponent {
  private dataService = inject(DataService);
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private title = inject(Title);
  private meta = inject(Meta);
  private toast = inject(ToastService);
  private analyticsService = (() => {
    try { return inject(AnalyticsService); } catch { return null; }
  })();

  previewCustomization = input<CustomizationSettings | null>(null);
  editable = input(false);
  textEdited = output<{target: string, field: string, value: string, id?: string}>();
  mobileMenuOpen = signal(false);

  profile = this.dataService.profile;
  hideBranding = this.dataService.hideBranding;
  services = this.dataService.services;
  faqs = this.dataService.faqs;
  testimonials = this.dataService.testimonials;
  paymentSettings = computed(() => this.dataService.getPaymentSettings());
  
  customization = computed(() => {
    return this.previewCustomization() || this.dataService.customization();
  });

  sortedSections = computed(() => {
    return [...this.customization().sections].sort((a, b) => a.order - b.order);
  });

  getSection(id: string): SectionConfig | undefined {
    return this.customization().sections.find(s => s.id === id);
  }

  renderType(section: SectionConfig): string {
    return sectionRenderType(section);
  }

  getPaymentLink(serviceName: string): string | null {
    const ps = this.paymentSettings();
    if (!ps.enabled) return null;
    const link = ps.paymentLinks.find(l => l.active && l.name.toLowerCase() === serviceName.toLowerCase());
    return link?.stripePaymentLink || null;
  }

  get wrapperStyles() {
    const brand = this.customization().branding;
    const fontMap: Record<string, string> = {
      modern: '"Inter", sans-serif',
      friendly: '"Nunito", sans-serif',
      professional: '"Merriweather", serif',
      elegant: '"Playfair Display", serif',
      clean: '"Poppins", sans-serif',
      minimal: '"DM Sans", sans-serif',
      bold: '"Montserrat", sans-serif',
      classic: '"Lora", serif',
      techy: '"Space Grotesk", sans-serif',
    };
    const fontFamily = fontMap[brand.fontStyle] || '"Inter", sans-serif';

    let bgColor = brand.backgroundColor || '#F5F5F7';
    if (brand.themeMode === 'dark') bgColor = '#111827';

    const styles: Record<string, string> = {
      'background-color': bgColor,
      'font-family': fontFamily,
      '--primary-color': brand.primaryColor,
      '--secondary-color': brand.secondaryColor,
    };

    if (brand.gradientEnabled && brand.gradientStartColor && brand.gradientEndColor) {
      styles['background'] = `linear-gradient(${brand.gradientDirection || 'to right'}, ${brand.gradientStartColor}, ${brand.gradientEndColor})`;
    }

    if (brand.backgroundImageUrl) {
      styles['background-image'] = `url(${brand.backgroundImageUrl})`;
      styles['background-size'] = 'cover';
      styles['background-position'] = 'center';
      // 'fixed' anchors to the viewport; inside the builder's embedded (non-iframe)
      // preview the page sits in nested scroll containers instead of the real
      // viewport, so 'fixed' detaches/flickers there. Only use it on the real
      // published render.
      styles['background-attachment'] = this.editable() ? 'scroll' : 'fixed';
    }

    return styles;
  }

  get buttonRadius() {
    const style = this.customization().branding.buttonStyle;
    return style === 'pill' ? '9999px' : style === 'square' ? '0px' : '0.5rem';
  }

  get cardRadius() {
    const style = this.customization().branding.cardStyle;
    return style === 'bordered' ? '0px' : '1rem'; // Let's keep it simple
  }

  onTextEdit(target: string, field: string, value: string, id?: string) {
    this.textEdited.emit({ target, field, value, id });
  }

  handlePreviewClick(event: Event) {
    if (this.editable() && (event.target as HTMLElement).closest('a')) {
      event.preventDefault();
    }
  }

  scrollTo(sectionId: string, event?: Event) {
    event?.preventDefault();
    if (this.editable()) return;
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  submitSuccess = false;

  form = this.fb.group({});

  private authService = (() => {
    try { return inject(AuthService); } catch { return null; }
  })();

  constructor() {
    this.setupDynamicForm();
    this.setupSeo();
    this.trackView();
  }

  private trackView() {
    effect(() => {
      if (this.previewCustomization()) return;
      const user = this.authService?.currentUser();
      if (user && this.analyticsService) {
        this.analyticsService.trackPageView(user.uid);
      }
    });
  }

  /**
   * Keep the document <title> and social/SEO meta tags in sync with the
   * business profile (description, Open Graph, Twitter card, theme-color).
   *
   * Note: profile data lives in the browser (localStorage), so the SSR pass
   * renders the default/empty profile and this effect no-ops server-side. The
   * tags are filled in on the client after hydration — which still benefits
   * users (correct tab title) and JS-rendering crawlers/scrapers. True
   * server-rendered SEO would require the profile to live on the server.
   * Skipped entirely when rendered as an embedded admin preview.
   */
  private setupSeo() {
    effect(() => {
      if (this.previewCustomization()) return; // admin preview — don't touch the page <head>
      const p = this.profile();
      if (!p.name) return;

      const brand = this.customization().branding;
      const title = brand.seoTitle || (p.tagline ? `${p.name} — ${p.tagline}` : p.name);
      const description = (brand.seoDescription || p.description || p.tagline || `${p.name} in ${p.serviceArea || 'your area'}.`)
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160);
      const ogImage = brand.ogImageUrl || brand.logoUrl || '';

      this.title.setTitle(title);
      this.meta.updateTag({ name: 'description', content: description });
      this.meta.updateTag({ property: 'og:title', content: title });
      this.meta.updateTag({ property: 'og:description', content: description });
      this.meta.updateTag({ property: 'og:type', content: 'website' });
      if (ogImage) {
        this.meta.updateTag({ property: 'og:image', content: ogImage });
      }
      this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
      this.meta.updateTag({ name: 'twitter:title', content: title });
      this.meta.updateTag({ name: 'twitter:description', content: description });
      this.meta.updateTag({ name: 'theme-color', content: brand.primaryColor || '#2563eb' });
    });
  }

  private setupDynamicForm() {
    const fields = [...this.customization().formFields].sort((a, b) => a.order - b.order);
    fields.forEach(field => {
      const validators = field.required ? [Validators.required] : [];
      if (field.type === 'email') {
        validators.push(Validators.email);
      }
      if (field.type === 'phone') {
        validators.push(Validators.minLength(8));
      }
      if (field.type === 'textarea') {
        validators.push(Validators.minLength(10));
      }
      this.form.addControl(field.id, this.fb.control('', validators));
    });
  }
  
  isFieldVisible(field: FormFieldConfig): boolean {
    if (!field.dependsOn) return true;
    const { fieldId, value } = field.dependsOn;
    if (!fieldId || !value) return true;
    const control = this.form.get(fieldId);
    if (!control) return true;
    // Simple equals check
    return control.value === value;
  }

  get visibleFormFields(): FormFieldConfig[] {
    return [...this.customization().formFields]
      .sort((a, b) => a.order - b.order)
      .filter(f => this.isFieldVisible(f));
  }

  isSubmittingEnquiry = false;

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const honeypot = document.querySelector<HTMLInputElement>('input[name="website"]');
    if (honeypot && honeypot.value) {
      this.submitSuccess = true;
      this.form.reset();
      return;
    }
    const val = this.form.value as Record<string, string>;

    let fullMessage = val['message'] || val['details'] || '';
    const fields = this.customization().formFields;

    const formData: Record<string, { label: string; value: string; type: string }> = {};

    fullMessage += '\n\n--- Form Details ---\n';
    fields.forEach(f => {
      if (this.isFieldVisible(f) && val[f.id]) {
        if (f.id !== 'message' && f.id !== 'details') {
          fullMessage += `${f.label}: ${val[f.id]}\n`;
        }
        formData[f.id] = { label: f.label, value: val[f.id], type: f.type };
      }
    });

    const findValue = (possibleIds: string[]) => {
      for (const id of possibleIds) {
        if (val[id]) return val[id];
      }
      return '';
    };

    const enquiry = {
      name: findValue(['name', 'fullName', 'first_name']) || 'Unknown',
      email: findValue(['email', 'emailAddress']) || 'unknown@example.com',
      phone: findValue(['phone', 'phoneNumber', 'mobile']) || '',
      serviceInterest: findValue(['service', 'serviceInterest', 'interest']) || 'Other',
      preferredDateTime: findValue(['date', 'time', 'preferredDate']) || '',
      urgency: 'Medium',
      message: fullMessage,
      formData: formData,
    };

    const publicUid = this.dataService.publicSiteUid();
    if (publicUid) {
      this.isSubmittingEnquiry = true;
      this.http.post(`/api/site/${publicUid}/enquiry`, enquiry).subscribe({
        next: () => {
          this.submitSuccess = true;
          this.form.reset();
          this.isSubmittingEnquiry = false;
        },
        error: () => {
          this.toast.error('Could not send your message. Please try again.');
          this.isSubmittingEnquiry = false;
        }
      });
    } else {
      this.dataService.addEnquiry(enquiry);
      this.submitSuccess = true;
      this.form.reset();
    }
  }
}
