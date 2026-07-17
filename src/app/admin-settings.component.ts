import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, Router } from '@angular/router';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { DataService } from './data.service';
import { SubscriptionService } from './subscription.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { NotificationPreferences, BusinessProfile, BusinessType, DomainMappingState } from './types';
import { requiredRecords, validateDomain, verifyDomain, DnsRecord, VerificationResult } from './domain-verification';
import { resolvePublicSiteUrl, qrFilenameFor } from './qr-code';
import { BUSINESS_PRESETS } from './presets';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [FormsModule, MatIconModule, RouterLink, DatePipe],
  template: `
    <div class="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h1 class="text-2xl font-black text-gray-900 tracking-tight">Settings</h1>
        <p class="text-sm text-gray-500 font-medium">Manage your account, domain, and notification preferences.</p>
      </div>

      <!-- Business Profile -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 class="font-bold text-gray-900 flex items-center gap-2"><mat-icon class="text-[18px] text-gray-400">store</mat-icon> Business Profile</h2>
          <p class="text-xs text-gray-500 mt-1">These details were set during setup — you can change them any time.</p>
        </div>
        <div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <span class="block text-sm font-bold text-gray-700 mb-1">Business Name</span>
            <input type="text" [(ngModel)]="profileForm.name" placeholder="e.g. Apex Cleaners" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
          </div>
          <div>
            <span class="block text-sm font-bold text-gray-700 mb-1">Business Type</span>
            <select [(ngModel)]="profileForm.type" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900">
              <option value="" disabled>Select a type...</option>
              @for (preset of presets; track preset.id) {
                <option [value]="preset.id">{{ preset.label }}</option>
              }
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <span class="block text-sm font-bold text-gray-700 mb-1">Tagline</span>
            <input type="text" [(ngModel)]="profileForm.tagline" placeholder="A short, catchy phrase" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
          </div>
          <div>
            <span class="block text-sm font-bold text-gray-700 mb-1">Contact Email</span>
            <input type="email" [(ngModel)]="profileForm.email" placeholder="hello@example.com" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
          </div>
          <div>
            <span class="block text-sm font-bold text-gray-700 mb-1">Phone</span>
            <input type="tel" [(ngModel)]="profileForm.phone" placeholder="(555) 123-4567" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
          </div>
          <div>
            <span class="block text-sm font-bold text-gray-700 mb-1">Service Area</span>
            <input type="text" [(ngModel)]="profileForm.serviceArea" placeholder="e.g. Greater Seattle Area" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
          </div>
          <div>
            <span class="block text-sm font-bold text-gray-700 mb-1">Opening Hours</span>
            <input type="text" [(ngModel)]="profileForm.openingHours" placeholder="Mon-Fri: 9am - 5pm" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
          </div>
          <div class="sm:col-span-2">
            <span class="block text-sm font-bold text-gray-700 mb-1">Address</span>
            <input type="text" [(ngModel)]="profileForm.address" placeholder="Street address (optional)" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
          </div>
          <div class="sm:col-span-2">
            <span class="block text-sm font-bold text-gray-700 mb-1">Business Description</span>
            <textarea [(ngModel)]="profileForm.description" rows="3" placeholder="A short description of your business" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"></textarea>
          </div>
          <div class="sm:col-span-2">
            <span class="block text-sm font-bold text-gray-700 mb-1">Trust Badges</span>
            <input type="text" [ngModel]="profileForm.trustBadges.join(', ')" (ngModelChange)="updateTrustBadges($event)" placeholder="e.g. Fully Insured, 5-Star Rated, Locally Owned" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
            <p class="text-xs text-gray-400 mt-1">Comma separated. Shown in your hero, about, and trust badges sections.</p>
            @if (profileForm.trustBadges.length) {
              <div class="flex flex-wrap gap-2 mt-2">
                @for (badge of profileForm.trustBadges; track badge) {
                  <span class="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">{{ badge }}</span>
                }
              </div>
            }
          </div>
          <div class="sm:col-span-2 flex justify-end">
            <button (click)="saveProfile()" class="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2">
              <mat-icon class="text-[18px]">save</mat-icon> Save Business Profile
            </button>
          </div>
        </div>
      </div>

      <!-- Public Site Link -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 class="font-bold text-gray-900 flex items-center gap-2"><mat-icon class="text-[18px] text-gray-400">language</mat-icon> Your Public Site</h2>
        </div>
        <div class="p-6">
          <p class="text-sm text-gray-500 mb-3">Share this link with customers so they can view your site and submit enquiries.</p>
          <div class="flex items-center gap-2">
            <input type="text" [value]="friendlyUrl || siteUrl" readonly class="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-700 select-all">
            <button (click)="copySiteUrl()" class="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shrink-0">
              <mat-icon class="text-[18px]">content_copy</mat-icon> Copy
            </button>
            <button (click)="toggleQrCode()" class="border border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-1.5 shrink-0">
              <mat-icon class="text-[18px]">qr_code</mat-icon> QR Code
            </button>
          </div>
          @if (friendlyUrl) {
            <p class="text-xs text-green-600 font-medium mt-2 flex items-center gap-1">
              <mat-icon class="text-[14px]">check_circle</mat-icon> Friendly URL active
            </p>
          }
          <a [href]="friendlyUrl || siteUrl" target="_blank" class="text-blue-600 text-xs font-bold hover:underline mt-2 inline-flex items-center gap-1">
            <mat-icon class="text-[14px]">open_in_new</mat-icon> Open in new tab
          </a>

          @if (showQrPanel) {
            <div class="mt-4 pt-4 border-t border-gray-100 flex flex-col items-center gap-3">
              @if (generatingQr) {
                <p class="text-xs text-gray-400">Generating…</p>
              } @else if (qrError) {
                <p class="text-xs text-red-600 font-medium flex items-center gap-1">
                  <mat-icon class="text-[14px]">error</mat-icon> {{ qrError }}
                </p>
              } @else if (qrDataUrl) {
                <img [src]="qrDataUrl" alt="QR code linking to your public site" class="w-40 h-40 rounded-lg border border-gray-200" />
                <button (click)="downloadQrCode()" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5">
                  <mat-icon class="text-[16px]">download</mat-icon> Download PNG
                </button>
                <p class="text-xs text-gray-500 text-center max-w-xs">Print this on business cards, flyers, or in-store signage — customers scan it to open your site instantly.</p>
              }
            </div>
          }
        </div>
      </div>

      <!-- Subscription -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 class="font-bold text-gray-900 flex items-center gap-2"><mat-icon class="text-[18px] text-gray-400">credit_card</mat-icon> Subscription</h2>
        </div>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <span class="text-sm font-bold text-gray-900">Current Plan: </span>
              <span class="px-2 py-0.5 rounded-full text-xs font-bold uppercase"
                    [class]="subService.tier() === 'free' ? 'bg-gray-100 text-gray-600' : subService.tier() === 'pro' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'">
                {{ subService.tierLabel() }}
              </span>
            </div>
            @if (subService.tier() !== 'free') {
              <button (click)="openPortal()" class="text-sm text-blue-600 font-bold hover:underline">Manage Subscription</button>
            }
          </div>
          @if (subService.tier() === 'free') {
            <p class="text-sm text-gray-500 mb-4">Upgrade to unlock AI tools, unlimited services, and more.</p>
            <a routerLink="/pricing" class="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">
              <mat-icon class="text-[18px]">upgrade</mat-icon> View Plans
            </a>
          }
        </div>
      </div>

      <!-- Site Templates -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h2 class="font-bold text-gray-900 flex items-center gap-2"><mat-icon class="text-[18px] text-gray-400">layers</mat-icon> Site Templates</h2>
          <span class="text-xs font-bold text-gray-400">{{ dataService.templates().length }} / 3</span>
        </div>
        <div class="p-6 space-y-4">
          <p class="text-sm text-gray-500">Save up to 3 versions of your site. Only the active template is shown on your public page.</p>

          @for (template of dataService.templates(); track template.id) {
            <div class="flex items-center justify-between p-4 rounded-xl border transition-colors"
                 [class.border-blue-300]="dataService.activeTemplateId() === template.id"
                 [class.bg-blue-50]="dataService.activeTemplateId() === template.id"
                 [class.border-gray-200]="dataService.activeTemplateId() !== template.id">
              <div class="flex items-center gap-3 min-w-0">
                @if (dataService.activeTemplateId() === template.id) {
                  <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                    <mat-icon class="text-white text-[16px]">check</mat-icon>
                  </div>
                } @else {
                  <div class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <mat-icon class="text-gray-400 text-[16px]">web</mat-icon>
                  </div>
                }
                <div class="min-w-0">
                  <p class="font-bold text-sm text-gray-900 truncate">{{ template.name }}</p>
                  <p class="text-[10px] text-gray-400">Updated {{ template.updatedAt | date:'medium' }}</p>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                @if (dataService.activeTemplateId() !== template.id) {
                  <button (click)="deployTemplate(template.id)" class="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors">Deploy</button>
                  <button (click)="loadTemplate(template.id)" class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit this template">
                    <mat-icon class="text-[16px]">edit</mat-icon>
                  </button>
                } @else {
                  <span class="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-lg text-xs font-bold">Live</span>
                  <button (click)="updateCurrentTemplate()" class="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Save current changes to this template">
                    <mat-icon class="text-[16px]">save</mat-icon>
                  </button>
                }
                <button (click)="deleteTemplate(template.id, template.name)" class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                  <mat-icon class="text-[16px]">delete</mat-icon>
                </button>
              </div>
            </div>
          }

          @if (dataService.templates().length === 0) {
            <div class="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              <mat-icon class="text-3xl mb-2">web</mat-icon>
              <p class="text-sm font-medium">No saved templates yet</p>
              <p class="text-xs mt-1">Save your current site as a template to get started</p>
            </div>
          }

          @if (dataService.templates().length < 3) {
            <div class="flex gap-2">
              <input type="text" [(ngModel)]="newTemplateName" placeholder="Template name..." class="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
              <button (click)="saveAsTemplate()" [disabled]="!newTemplateName.trim()" class="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0">
                <mat-icon class="text-[16px]">add</mat-icon> Save Current Site
              </button>
            </div>
          } @else {
            <div class="bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-xs text-yellow-800 flex items-center gap-2">
              <mat-icon class="text-[16px]">info</mat-icon>
              Maximum of 3 templates reached. Delete one to create a new one.
            </div>
          }
        </div>
      </div>

      <!-- Custom Domain -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 class="font-bold text-gray-900 flex items-center gap-2"><mat-icon class="text-[18px] text-gray-400">language</mat-icon> Custom Domain</h2>
          <p class="text-xs text-gray-500 mt-1">Connect a domain you own and we'll point it at your public site.</p>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label for="domain" class="block text-sm font-bold text-gray-700 mb-2">Your Domain</label>
            <div class="flex items-center gap-2">
              <input id="domain" type="text" [(ngModel)]="prefs.customDomain" (ngModelChange)="onDomainChange()" placeholder="www.yourbusiness.com" class="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono">
              <button (click)="checkDomain()" [disabled]="!domainRecords.length || checkingDomain" class="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
                <mat-icon class="text-[18px]" [class.animate-spin]="checkingDomain">{{ checkingDomain ? 'progress_activity' : 'dns' }}</mat-icon>
                {{ checkingDomain ? 'Checking…' : 'Check DNS' }}
              </button>
            </div>
            @if (domainError) {
              <p class="text-xs text-red-600 font-medium mt-2 flex items-center gap-1"><mat-icon class="text-[14px]">error</mat-icon> {{ domainError }}</p>
            }
          </div>

          @if (domainResult) {
            <div class="rounded-xl p-3 text-sm flex items-center gap-2 font-medium"
                 [class]="domainBadgeClass()">
              <mat-icon class="text-[18px]">{{ domainStatusIcon() }}</mat-icon>
              <span>{{ domainResult.message }}</span>
            </div>
          }

          @if (domainRecords.length) {
            <div>
              <p class="text-sm font-bold text-gray-700 mb-2">Add these records at your domain registrar</p>
              <div class="overflow-hidden rounded-xl border border-gray-200">
                <table class="w-full text-xs">
                  <thead class="bg-gray-50 text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th class="text-left font-bold px-3 py-2">Type</th>
                      <th class="text-left font-bold px-3 py-2">Host</th>
                      <th class="text-left font-bold px-3 py-2">Value</th>
                      <th class="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    @for (rec of domainRecords; track rec.type + rec.host + rec.value) {
                      <tr [class]="recordRowClass(rec)">
                        <td class="px-3 py-2 font-bold text-gray-700">{{ rec.type }}</td>
                        <td class="px-3 py-2 font-mono text-gray-700">{{ rec.host }}</td>
                        <td class="px-3 py-2 font-mono text-gray-700 break-all">{{ rec.value }}</td>
                        <td class="px-3 py-2 text-right">
                          <button (click)="copyValue(rec.value)" class="text-blue-600 hover:text-blue-800 inline-flex items-center" title="Copy value">
                            <mat-icon class="text-[16px]">content_copy</mat-icon>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <p class="text-xs text-gray-400 mt-2">Apex domains use A records; subdomains use a CNAME. The TXT record proves you own the domain. DNS changes can take up to 48 hours.</p>
            </div>
          }

          @if (subService.tier() !== 'business') {
            <div class="bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-xs text-yellow-800 flex items-center gap-2">
              <mat-icon class="text-[16px]">info</mat-icon>
              Custom domains are available on the Business plan.
            </div>
          }

          @if (subService.tier() === 'business' && domainResult?.state === 'verified') {
            <div class="border-t border-gray-100 pt-4">
              <p class="text-sm font-bold text-gray-700 mb-1">Step 2: Connect to Google</p>
              <p class="text-xs text-gray-500 mb-3">We'll verify ownership with Google and create the Cloud Run mapping automatically.</p>

              @if (mappingState) {
                <div class="rounded-xl p-3 text-sm flex items-center gap-2 font-medium mb-3" [class]="mappingBadgeClass()">
                  <mat-icon class="text-[18px]" [class.animate-spin]="mappingBusy()">{{ mappingStatusIcon() }}</mat-icon>
                  <span>{{ mappingStatusLabel() }}</span>
                </div>
              }

              @if (mappingState?.ownershipTxtRecord; as ownershipRecord) {
                <div class="mb-3">
                  <p class="text-xs font-bold text-gray-700 mb-1">Add this record to prove ownership to Google</p>
                  <div class="overflow-hidden rounded-xl border border-gray-200">
                    <table class="w-full text-xs">
                      <tbody>
                        <tr>
                          <td class="px-3 py-2 font-bold text-gray-700">{{ ownershipRecord.type }}</td>
                          <td class="px-3 py-2 font-mono text-gray-700">{{ ownershipRecord.host }}</td>
                          <td class="px-3 py-2 font-mono text-gray-700 break-all">{{ ownershipRecord.value }}</td>
                          <td class="px-3 py-2 text-right">
                            <button (click)="copyValue(ownershipRecord.value)" class="text-blue-600 hover:text-blue-800 inline-flex items-center" title="Copy value">
                              <mat-icon class="text-[16px]">content_copy</mat-icon>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              }

              @if (mappingState?.cloudRunDnsRecords; as cloudRunRecords) {
                @if (cloudRunRecords.length) {
                  <div class="mb-3">
                    <p class="text-xs font-bold text-gray-700 mb-1">Cloud Run mapping records</p>
                    <div class="overflow-hidden rounded-xl border border-gray-200">
                      <table class="w-full text-xs">
                        <tbody class="divide-y divide-gray-100">
                          @for (rec of cloudRunRecords; track rec.type + rec.host + rec.value) {
                            <tr>
                              <td class="px-3 py-2 font-bold text-gray-700">{{ rec.type }}</td>
                              <td class="px-3 py-2 font-mono text-gray-700">{{ rec.host }}</td>
                              <td class="px-3 py-2 font-mono text-gray-700 break-all">{{ rec.value }}</td>
                              <td class="px-3 py-2 text-right">
                                <button (click)="copyValue(rec.value)" class="text-blue-600 hover:text-blue-800 inline-flex items-center" title="Copy value">
                                  <mat-icon class="text-[16px]">content_copy</mat-icon>
                                </button>
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                }
              }

              <div class="flex flex-wrap gap-2">
                @if (!mappingState || mappingState.status === 'none' || mappingState.status === 'error') {
                  <button (click)="startGoogleVerification()" [disabled]="startingVerification" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {{ startingVerification ? 'Starting…' : 'Start Google verification' }}
                  </button>
                }
                @if (mappingState?.status === 'site-verification-pending') {
                  <button (click)="confirmGoogleVerification()" [disabled]="confirmingVerification" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {{ confirmingVerification ? 'Confirming…' : "I've added the record — confirm" }}
                  </button>
                }
                @if (mappingState?.status === 'site-verified') {
                  <button (click)="createGoogleMapping()" [disabled]="creatingMapping" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {{ creatingMapping ? 'Mapping…' : 'Create mapping' }}
                  </button>
                }
                @if (mappingState?.status === 'mapping-pending' || mappingState?.status === 'cert-provisioning') {
                  <button (click)="refreshMappingStatus()" [disabled]="refreshingStatus" class="border border-gray-300 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors disabled:opacity-50">
                    {{ refreshingStatus ? 'Checking…' : 'Refresh status' }}
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </div>


      <!-- Email Notifications -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 class="font-bold text-gray-900 flex items-center gap-2"><mat-icon class="text-[18px] text-gray-400">notifications</mat-icon> Email Notifications</h2>
        </div>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-bold text-gray-700">New Enquiry Notifications</p>
              <p class="text-xs text-gray-500">Get an email when someone submits an enquiry</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" [(ngModel)]="prefs.emailOnNewEnquiry" class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          @if (prefs.emailOnNewEnquiry) {
            <div>
              <label for="notifEmail" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Notification Email</label>
              <input id="notifEmail" type="email" [(ngModel)]="prefs.notificationEmail" placeholder="you@example.com" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
            </div>
          }
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-red-100 bg-red-50/50">
          <h2 class="font-bold text-red-900 flex items-center gap-2"><mat-icon class="text-[18px] text-red-400">warning</mat-icon> Danger Zone</h2>
        </div>
        <div class="p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-bold text-gray-700">Delete Account</p>
              <p class="text-xs text-gray-500">Permanently delete your account and all data</p>
            </div>
            <button (click)="confirmDelete()" class="px-4 py-2 border border-red-300 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors">Delete Account</button>
          </div>
        </div>
      </div>

      <div class="flex justify-end">
        <button (click)="saveSettings()" class="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2">
          <mat-icon class="text-[18px]">save</mat-icon> Save Settings
        </button>
      </div>
    </div>
  `
})
export class AdminSettingsComponent implements OnInit {
  dataService = inject(DataService);
  subService = inject(SubscriptionService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private firestore = inject(Firestore);

  newTemplateName = '';
  siteUrl = '';
  friendlyUrl = '';

  // QR code for the public site link
  showQrPanel = false;
  qrDataUrl: string | null = null;
  qrError = '';
  generatingQr = false;

  presets = BUSINESS_PRESETS;
  profileForm: BusinessProfile = {
    name: '', type: '', tagline: '', description: '', email: '', phone: '',
    address: '', serviceArea: '', openingHours: '', toneOfVoice: '',
    brandColor: '#2563eb', heroCopy: '', ctaText: '', trustBadges: [], enquiryFields: [],
  };

  prefs: NotificationPreferences = {
    emailOnNewEnquiry: false,
    notificationEmail: '',
    customDomain: '',
  };

  // Custom-domain connection flow
  domainRecords: DnsRecord[] = [];
  domainResult: VerificationResult | null = null;
  domainError = '';
  checkingDomain = false;

  // Cloud Run domain mapping automation (step 2, after DNS is verified)
  mappingState: DomainMappingState | null = null;
  startingVerification = false;
  confirmingVerification = false;
  creatingMapping = false;
  refreshingStatus = false;

  ngOnInit() {
    this.profileForm = { ...this.profileForm, ...this.dataService.profile() };
    const saved = this.dataService.getNotificationPrefs();
    if (saved) {
      this.prefs = { ...this.prefs, ...saved };
    }
    this.onDomainChange();
    if (!this.prefs.notificationEmail) {
      const user = this.authService.currentUser();
      if (user?.email) this.prefs.notificationEmail = user.email;
    }
    const user = this.authService.currentUser();
    if (user) {
      this.siteUrl = `${window.location.origin}/site/${user.uid}`;
      const slug = this.dataService.siteSlug();
      if (slug) {
        this.friendlyUrl = `${window.location.origin}/site/${slug}`;
      }
      this.loadMappingState(user.uid);
    }
  }

  private async loadMappingState(uid: string) {
    try {
      const ref = doc(this.firestore, 'domainMappings', uid);
      const snap = await getDoc(ref);
      this.mappingState = snap.exists() ? (snap.data() as DomainMappingState) : null;
    } catch (e) {
      console.error('Failed to load domain mapping', e);
    }
  }

  async copySiteUrl() {
    const url = this.friendlyUrl || this.siteUrl;
    try {
      await navigator.clipboard.writeText(url);
      this.toast.success('Site link copied!');
    } catch {
      this.toast.info(url);
    }
  }

  /** Toggle the QR panel; generate the code lazily the first time it opens. */
  async toggleQrCode() {
    this.showQrPanel = !this.showQrPanel;
    if (!this.showQrPanel || this.qrDataUrl || this.generatingQr) return;

    this.generatingQr = true;
    this.qrError = '';
    try {
      // Lazy-loaded: keeps the QR library out of the initial bundle for the
      // vast majority of visits that never open this panel.
      const QRCode = await import('qrcode');
      const url = resolvePublicSiteUrl({ mappingState: this.mappingState, friendlyUrl: this.friendlyUrl, siteUrl: this.siteUrl });
      this.qrDataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2 });
    } catch (e) {
      console.error('Failed to generate QR code', e);
      this.qrError = "Couldn't generate a QR code right now — try again in a moment.";
    } finally {
      this.generatingQr = false;
    }
  }

  downloadQrCode() {
    if (!this.qrDataUrl) return;
    const url = resolvePublicSiteUrl({ mappingState: this.mappingState, friendlyUrl: this.friendlyUrl, siteUrl: this.siteUrl });
    const link = document.createElement('a');
    link.href = this.qrDataUrl;
    link.download = qrFilenameFor(url);
    link.click();
  }

  saveProfile() {
    const name = (this.profileForm.name || '').trim();
    if (!name) {
      this.toast.error('Business name cannot be empty.');
      return;
    }
    this.dataService.updateProfile({
      name,
      type: this.profileForm.type as BusinessType,
      tagline: (this.profileForm.tagline || '').trim(),
      description: (this.profileForm.description || '').trim(),
      email: (this.profileForm.email || '').trim(),
      phone: (this.profileForm.phone || '').trim(),
      address: (this.profileForm.address || '').trim(),
      serviceArea: (this.profileForm.serviceArea || '').trim(),
      openingHours: (this.profileForm.openingHours || '').trim(),
      trustBadges: this.profileForm.trustBadges,
    });
    this.toast.success('Business profile updated!');
  }

  updateTrustBadges(val: string) {
    this.profileForm.trustBadges = val.split(',').map(s => s.trim()).filter(Boolean);
  }

  onDomainChange() {
    const raw = this.prefs.customDomain || '';
    if (!raw.trim()) {
      this.domainError = '';
      this.domainRecords = [];
      this.domainResult = null;
      return;
    }
    const v = validateDomain(raw);
    this.domainError = v.valid ? '' : v.error || 'That domain is not valid.';
    const uid = this.authService.currentUser()?.uid || '';
    this.domainRecords = v.valid && uid ? requiredRecords(raw, uid) : [];
    this.domainResult = null;
  }

  async checkDomain() {
    const uid = this.authService.currentUser()?.uid;
    const raw = this.prefs.customDomain || '';
    if (!uid || !this.domainRecords.length || this.checkingDomain) return;
    this.checkingDomain = true;
    try {
      this.domainResult = await verifyDomain(raw, uid);
      if (this.domainResult.state === 'verified') {
        this.toast.success('Domain verified!');
      }
    } catch {
      this.toast.error('Could not check DNS right now. Please try again.');
    } finally {
      this.checkingDomain = false;
    }
  }

  async copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      this.toast.success('Copied!');
    } catch {
      this.toast.info(value);
    }
  }

  domainBadgeClass(): string {
    switch (this.domainResult?.state) {
      case 'verified': return 'bg-green-50 border border-green-100 text-green-800';
      case 'misconfigured': return 'bg-red-50 border border-red-100 text-red-800';
      default: return 'bg-blue-50 border border-blue-100 text-blue-800';
    }
  }

  domainStatusIcon(): string {
    switch (this.domainResult?.state) {
      case 'verified': return 'check_circle';
      case 'misconfigured': return 'error';
      default: return 'hourglass_top';
    }
  }

  recordRowClass(rec: DnsRecord): string {
    const check = this.domainResult?.checked.find(
      (c) => c.record.type === rec.type && c.record.host === rec.host && c.record.value === rec.value,
    );
    if (!check) return '';
    return check.ok ? 'bg-green-50/40' : '';
  }

  private async domainMappingHeaders(): Promise<HeadersInit | null> {
    const token = await this.authService.getIdToken();
    return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : null;
  }

  private mappingErrorMessage(code?: string): string {
    switch (code) {
      case 'SITE_VERIFICATION_API_DISABLED':
      case 'RUN_API_DISABLED':
        return "Custom domain mapping isn't fully set up on our end yet — check back soon or contact support.";
      case 'DOMAIN_ALREADY_MAPPED':
        return 'This domain is already connected somewhere else — remove it there first.';
      case 'MAPPING_QUOTA_EXCEEDED':
        return 'Too many domain mappings right now — please try again shortly.';
      case 'NOT_YET_VERIFIED':
        return "Google hasn't seen the verification record yet — DNS changes can take up to 48 hours.";
      case 'PERMISSION_DENIED':
        return "We don't have permission to do this yet — contact support.";
      default:
        return "Something went wrong — our team's been notified.";
    }
  }

  async startGoogleVerification() {
    const user = this.authService.currentUser();
    const domain = validateDomain(this.prefs.customDomain || '').normalized;
    if (!user || !domain || this.startingVerification) return;
    this.startingVerification = true;
    try {
      const headers = await this.domainMappingHeaders();
      if (!headers) { this.toast.error('Please sign in again.'); return; }
      const resp = await fetch('/api/domain/verification/start', {
        method: 'POST', headers, body: JSON.stringify({ uid: user.uid, domain }),
      });
      const data = await resp.json();
      if (!resp.ok) { this.toast.error(data.error || this.mappingErrorMessage()); return; }
      this.mappingState = data;
      if (data.errorCode) this.toast.error(this.mappingErrorMessage(data.errorCode));
    } catch {
      this.toast.error('Could not reach the server. Please try again.');
    } finally {
      this.startingVerification = false;
    }
  }

  async confirmGoogleVerification() {
    const user = this.authService.currentUser();
    const domain = this.mappingState?.domain;
    if (!user || !domain || this.confirmingVerification) return;
    this.confirmingVerification = true;
    try {
      const headers = await this.domainMappingHeaders();
      if (!headers) { this.toast.error('Please sign in again.'); return; }
      const resp = await fetch('/api/domain/verification/confirm', {
        method: 'POST', headers, body: JSON.stringify({ uid: user.uid, domain }),
      });
      const data = await resp.json();
      if (!resp.ok) { this.toast.error(data.error || this.mappingErrorMessage()); return; }
      this.mappingState = data;
      if (data.status === 'site-verified') this.toast.success('Ownership verified with Google!');
      else if (data.errorCode) this.toast.error(this.mappingErrorMessage(data.errorCode));
      else this.toast.info(data.errorMessage || "Not visible to Google yet — try again shortly.");
    } catch {
      this.toast.error('Could not reach the server. Please try again.');
    } finally {
      this.confirmingVerification = false;
    }
  }

  async createGoogleMapping() {
    const user = this.authService.currentUser();
    const domain = this.mappingState?.domain;
    if (!user || !domain || this.creatingMapping) return;
    this.creatingMapping = true;
    try {
      const headers = await this.domainMappingHeaders();
      if (!headers) { this.toast.error('Please sign in again.'); return; }
      const resp = await fetch('/api/domain/mapping/create', {
        method: 'POST', headers, body: JSON.stringify({ uid: user.uid, domain }),
      });
      const data = await resp.json();
      if (!resp.ok) { this.toast.error(data.error || this.mappingErrorMessage()); return; }
      this.mappingState = data;
      if (data.status === 'mapping-pending') this.toast.success('Mapping created! Add the records below to finish.');
      else if (data.errorCode) this.toast.error(this.mappingErrorMessage(data.errorCode));
    } catch {
      this.toast.error('Could not reach the server. Please try again.');
    } finally {
      this.creatingMapping = false;
    }
  }

  async refreshMappingStatus() {
    const user = this.authService.currentUser();
    if (!user || this.refreshingStatus) return;
    this.refreshingStatus = true;
    try {
      const headers = await this.domainMappingHeaders();
      if (!headers) { this.toast.error('Please sign in again.'); return; }
      const resp = await fetch('/api/domain/mapping/refresh', {
        method: 'POST', headers, body: JSON.stringify({ uid: user.uid }),
      });
      const data = await resp.json();
      if (!resp.ok) { this.toast.error(data.error || this.mappingErrorMessage()); return; }
      this.mappingState = data;
      if (data.status === 'active') this.toast.success('Your custom domain is live!');
      else if (data.errorCode) this.toast.error(this.mappingErrorMessage(data.errorCode));
    } catch {
      this.toast.error('Could not reach the server. Please try again.');
    } finally {
      this.refreshingStatus = false;
    }
  }

  mappingBusy(): boolean {
    return this.startingVerification || this.confirmingVerification || this.creatingMapping || this.refreshingStatus;
  }

  mappingBadgeClass(): string {
    switch (this.mappingState?.status) {
      case 'active': return 'bg-green-50 border border-green-100 text-green-800';
      case 'error': return 'bg-red-50 border border-red-100 text-red-800';
      default: return 'bg-blue-50 border border-blue-100 text-blue-800';
    }
  }

  mappingStatusIcon(): string {
    switch (this.mappingState?.status) {
      case 'active': return 'check_circle';
      case 'error': return 'error';
      default: return this.mappingBusy() ? 'progress_activity' : 'hourglass_top';
    }
  }

  mappingStatusLabel(): string {
    const s = this.mappingState;
    if (!s) return '';
    switch (s.status) {
      case 'site-verification-pending': return 'Add the TXT record below, then confirm with Google.';
      case 'site-verified': return 'Ownership verified with Google — ready to create the mapping.';
      case 'mapping-pending': return 'Mapping created — add the records below, then refresh status.';
      case 'cert-provisioning': return s.certMessage || 'Provisioning SSL certificate — this can take a while.';
      case 'active': return 'Your custom domain is live and serving traffic.';
      case 'error': return s.errorMessage ? this.mappingErrorMessage(s.errorCode) : 'Something went wrong.';
      default: return '';
    }
  }

  saveSettings() {
    this.dataService.setNotificationPrefs(this.prefs);
    this.toast.success('Settings saved successfully!');
  }

  async openPortal() {
    const user = this.authService.currentUser();
    if (!user) return;
    const url = await this.subService.openCustomerPortal(user.uid);
    if (url) window.location.href = url;
    else this.toast.error('Billing portal is not yet configured.');
  }

  saveAsTemplate() {
    const name = this.newTemplateName.trim();
    if (!name) return;
    if (this.dataService.saveCurrentAsTemplate(name)) {
      this.newTemplateName = '';
      this.toast.success(`Template "${name}" saved!`);
    } else {
      this.toast.error('Maximum of 3 templates reached.');
    }
  }

  deployTemplate(id: string) {
    if (confirm('This will switch your live public page to this template. Continue?')) {
      this.dataService.setActiveTemplate(id);
      this.toast.success('Template deployed! Your public page now shows this version.');
    }
  }

  loadTemplate(id: string) {
    if (confirm('This will load this template into the editor. Any unsaved changes to your current site will be lost. Continue?')) {
      this.dataService.loadTemplate(id);
      this.toast.info('Template loaded into editor. Make changes and save when ready.');
    }
  }

  updateCurrentTemplate() {
    const activeId = this.dataService.activeTemplateId();
    if (activeId) {
      this.dataService.updateTemplate(activeId);
      this.toast.success('Template updated with current changes!');
    }
  }

  deleteTemplate(id: string, name: string) {
    if (confirm(`Delete template "${name}"? This cannot be undone.`)) {
      this.dataService.deleteTemplate(id);
    }
  }

  async confirmDelete() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently removed.')) return;
    if (!confirm('This is your last chance. Type your mind — are you absolutely sure?')) return;

    const user = this.authService.currentUser();
    if (!user) return;

    const token = await this.authService.getIdToken();
    if (!token) return;

    this.http.delete(`/api/account/${user.uid}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).subscribe({
      next: () => {
        this.toast.success('Account deleted. Goodbye!');
        this.authService.logout();
      },
      error: () => {
        this.toast.error('Failed to delete account. Please contact support.');
      },
    });
  }
}
