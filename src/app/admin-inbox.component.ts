import { Component, inject, signal } from '@angular/core';
import { DataService } from './data.service';
import { Enquiry } from './types';
import { DatePipe } from '@angular/common';
import { AiService } from './ai.service';
import { FormsModule } from '@angular/forms';
import { EncodeUriComponentPipe } from './encode-uri.pipe';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-inbox',
  standalone: true,
  imports: [DatePipe, FormsModule, EncodeUriComponentPipe, MatIconModule],
  template: `
    <div class="h-full flex flex-col -m-8">
      <div class="px-8 py-5 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
        <h2 class="text-xl font-bold tracking-tight text-gray-900">Enquiries</h2>
        <div class="relative">
          <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</mat-icon>
          <input type="text" placeholder="Search..." [(ngModel)]="searchQuery" class="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-sm bg-gray-50">
        </div>
      </div>
      
      <div class="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#F5F5F7]">
        <!-- List -->
        <div class="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-gray-200 bg-white overflow-y-auto h-1/2 md:h-full">
          @if (filteredEnquiries.length === 0) {
            <div class="p-8 text-center text-gray-500">
               <p class="text-sm font-medium">No enquiries found.</p>
            </div>
          }
          <div class="divide-y divide-gray-50">
            @for (enquiry of filteredEnquiries; track enquiry.id) {
              <div class="p-5 cursor-pointer hover:bg-gray-50 transition-colors border-l-4"
                   tabindex="0"
                   (keydown.enter)="selectEnquiry(enquiry)"
                   [class.border-blue-500]="selectedEnquiry()?.id === enquiry.id"
                   [class.bg-blue-50]="selectedEnquiry()?.id === enquiry.id"
                   [class.border-transparent]="selectedEnquiry()?.id !== enquiry.id"
                   (click)="selectEnquiry(enquiry)">
                <div class="flex justify-between items-start mb-1">
                  <span class="font-bold text-gray-900">{{ enquiry.name }}</span>
                  <span class="text-[10px] font-bold text-gray-400">{{ enquiry.date | date:'shortTime' }}</span>
                </div>
                <div class="text-sm text-gray-500 truncate mb-3">{{ enquiry.serviceInterest }}</div>
                <div class="flex gap-2 items-center">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600"
                        [class.bg-blue-100]="enquiry.status === 'New'" [class.text-blue-600]="enquiry.status === 'New'"
                        [class.bg-orange-100]="enquiry.status === 'In Progress'" [class.text-orange-600]="enquiry.status === 'In Progress'"
                        [class.bg-green-100]="enquiry.status === 'Won'" [class.text-green-600]="enquiry.status === 'Won'">
                    {{ enquiry.status }}
                  </span>
                  @if (enquiry.leadScore) {
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
                          [class.border-red-200]="enquiry.leadScore === 'Hot'" [class.text-red-600]="enquiry.leadScore === 'Hot'" [class.bg-red-50]="enquiry.leadScore === 'Hot'"
                          [class.border-orange-200]="enquiry.leadScore === 'Warm'" [class.text-orange-600]="enquiry.leadScore === 'Warm'" [class.bg-orange-50]="enquiry.leadScore === 'Warm'"
                          [class.border-blue-200]="enquiry.leadScore === 'Cold'" [class.text-blue-600]="enquiry.leadScore === 'Cold'" [class.bg-blue-50]="enquiry.leadScore === 'Cold'">
                      {{ enquiry.leadScore }}
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Detail View -->
        <div class="flex-1 overflow-y-auto p-8">
          @if (selectedEnquiry(); as enquiry) {
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-3xl mx-auto flex flex-col">
              <div class="flex justify-between items-start mb-8 pb-6 border-b border-gray-100">
                <div>
                  <h3 class="text-2xl font-black text-gray-900 mb-2">{{ enquiry.name }}</h3>
                  <div class="flex gap-4 text-sm text-gray-500 font-medium">
                    <a href="mailto:{{ enquiry.email }}" class="flex items-center gap-1 hover:text-blue-600 transition-colors"><mat-icon class="text-[18px]">email</mat-icon> {{ enquiry.email }}</a>
                    <a href="tel:{{ enquiry.phone }}" class="flex items-center gap-1 hover:text-blue-600 transition-colors"><mat-icon class="text-[18px]">phone</mat-icon> {{ enquiry.phone || 'N/A' }}</a>
                  </div>
                </div>
                <select [ngModel]="enquiry.status" (ngModelChange)="updateStatus(enquiry.id, $event)" class="bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none uppercase tracking-wider">
                  @for (status of customization().rules.statuses; track status) {
                    <option [value]="status">{{ status }}</option>
                  }
                </select>
              </div>

              <div class="grid grid-cols-2 gap-6 mb-8">
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Service Interest</p>
                  <p class="font-bold text-gray-900">{{ enquiry.serviceInterest }}</p>
                </div>
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Preferred Time</p>
                  <p class="font-bold text-gray-900">{{ enquiry.preferredDateTime || 'Anytime' }}</p>
                </div>
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Suggested Next Action</p>
                  <input type="text" [ngModel]="enquiry.nextAction" (ngModelChange)="updateField(enquiry.id, 'nextAction', $event)" class="w-full bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none font-bold text-blue-600 text-sm py-1" placeholder="What's next?">
                </div>
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Follow-up Date</p>
                  <input type="date" [ngModel]="enquiry.followUpDate" (ngModelChange)="updateField(enquiry.id, 'followUpDate', $event)" class="w-full bg-transparent outline-none font-bold text-gray-900 text-sm py-1 cursor-pointer">
                </div>
              </div>

              @if (enquiry.formData) {
                <div class="mb-8">
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Custom Form Data</p>
                    <button (click)="copyCustomerDetails(enquiry)" class="text-[10px] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600 font-bold flex items-center gap-1 transition-colors">
                      <mat-icon class="text-[12px]">content_copy</mat-icon> Copy Details
                    </button>
                  </div>
                  <div class="bg-blue-50 border border-blue-100 p-5 rounded-xl text-sm shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                    @for (key of getFormDataKeys(enquiry.formData); track key) {
                      <div class="flex flex-col">
                        <span class="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">{{ enquiry.formData[key].label }}</span>
                        <span class="font-medium text-blue-900">{{ enquiry.formData[key].value }}</span>
                      </div>
                    }
                  </div>
                </div>
              }

              <div class="mb-8">
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Message</p>
                <div class="bg-white border border-gray-100 p-5 rounded-xl text-gray-600 whitespace-pre-wrap text-sm leading-relaxed shadow-sm">{{ enquiry.message }}</div>
              </div>
              
              <div class="mb-8">
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                   <mat-icon class="text-[14px]">edit_note</mat-icon> Customer Notes
                </p>
                <textarea rows="3" [ngModel]="enquiry.customerNotes" (ngModelChange)="updateField(enquiry.id, 'customerNotes', $event)" class="w-full p-4 border border-yellow-200 bg-yellow-50 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none text-gray-700 font-sans text-sm shadow-inner" placeholder="Add private notes about this lead..."></textarea>
              </div>

              <div class="border-t border-gray-100 pt-8 mt-auto">
                <div class="flex justify-between items-center mb-4">
                  <h4 class="font-bold text-gray-900 flex items-center gap-2">
                    <div class="w-6 h-6 bg-gradient-to-tr from-blue-400 to-purple-400 rounded-md flex items-center justify-center">
                       <mat-icon class="text-white text-[14px]">auto_awesome</mat-icon>
                    </div>
                    AI Draft Reply
                  </h4>
                  <button (click)="generateDraft(enquiry)" [disabled]="isGeneratingDraft" class="text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold disabled:opacity-50 flex items-center gap-1 transition-colors">
                    @if(isGeneratingDraft) {
                       <span class="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full"></span>
                    } @else {
                       <mat-icon class="text-[14px]">refresh</mat-icon> Generate
                    }
                  </button>
                </div>
                @if (enquiry.draftReply) {
                  <textarea rows="6" [ngModel]="enquiry.draftReply" (ngModelChange)="updateDraft(enquiry.id, $event)" class="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-700 font-sans text-sm bg-gray-50 shadow-inner"></textarea>
                  <div class="mt-4 flex flex-wrap justify-end gap-3">
                     <button (click)="copyToClipboard(enquiry.draftReply)" class="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                       <mat-icon class="text-[18px]">content_copy</mat-icon> {{ copySuccess ? 'Copied!' : 'Copy' }}
                     </button>
                     <a href="mailto:{{ enquiry.email }}?subject=Re: {{ enquiry.serviceInterest }}&body={{ enquiry.draftReply | encodeURIComponent }}" class="bg-blue-600 shadow-md shadow-blue-100 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                       <mat-icon class="text-[18px]">send</mat-icon> Open in Email Client
                     </a>
                  </div>
                } @else {
                  <div class="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-6 text-center">
                    <p class="text-sm text-gray-400 font-medium">Click generate to create an AI-powered reply based on your business profile and this enquiry.</p>
                  </div>
                }
              </div>
            </div>
          } @else {
            <div class="h-full flex items-center justify-center text-gray-400 flex-col gap-4">
              <div class="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
                <mat-icon class="text-3xl text-gray-300">inbox</mat-icon>
              </div>
              <p class="text-sm font-bold">Select an enquiry to view details</p>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class AdminInboxComponent {
  private dataService = inject(DataService);
  private aiService = inject(AiService);
  
  searchQuery = signal('');
  selectedEnquiry = signal<Enquiry | null>(null);
  isGeneratingDraft = false;
  copySuccess = false;
  customization = this.dataService.customization;

  get filteredEnquiries() {
    const q = this.searchQuery().toLowerCase();
    const list = this.dataService.enquiries();
    if (!q) return list;
    return list.filter(e => 
      e.name.toLowerCase().includes(q) || 
      e.email.toLowerCase().includes(q) || 
      e.serviceInterest.toLowerCase().includes(q)
    );
  }

  selectEnquiry(enquiry: Enquiry) {
    this.selectedEnquiry.set(enquiry);
    if (enquiry.status === 'New') {
      this.updateStatus(enquiry.id, 'In Progress');
    }
    this.copySuccess = false;
  }

  updateStatus(id: string, status: string) {
    this.dataService.updateEnquiry(id, { status: status });
    if (this.selectedEnquiry()?.id === id) {
       this.selectedEnquiry.update(e => e ? {...e, status: status } : null);
    }
  }
  
  updateField(id: string, field: keyof Enquiry, value: unknown) {
    this.dataService.updateEnquiry(id, { [field]: value });
    if (this.selectedEnquiry()?.id === id) {
      this.selectedEnquiry.update(e => e ? { ...e, [field]: value } : null);
    }
  }
  
  updateDraft(id: string, draft: string) {
      this.dataService.updateEnquiry(id, { draftReply: draft });
  }

  async copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.copySuccess = true;
      setTimeout(() => this.copySuccess = false, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }

  getFormDataKeys(formData: Record<string, { label: string; value: string; type: string }> | undefined): string[] {
    if (!formData) return [];
    return Object.keys(formData);
  }

  async copyCustomerDetails(enquiry: Enquiry) {
    let details = `Name: ${enquiry.name}\nEmail: ${enquiry.email}\nPhone: ${enquiry.phone || 'N/A'}\nService: ${enquiry.serviceInterest}\nTime: ${enquiry.preferredDateTime || 'Anytime'}\n`;
    
    if (enquiry.formData) {
      details += `\n--- Custom Form Data ---\n`;
      for (const key of Object.keys(enquiry.formData)) {
        details += `${enquiry.formData[key].label}: ${enquiry.formData[key].value}\n`;
      }
    }
    
    try {
      await navigator.clipboard.writeText(details);
      alert('Customer details copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy details', err);
    }
  }

  async generateDraft(enquiry: Enquiry) {
    this.isGeneratingDraft = true;
    const draft = await this.aiService.generateDraftReply(enquiry, this.dataService.profile());
    this.dataService.updateEnquiry(enquiry.id, { draftReply: draft });
    
    // update local selection
    if (this.selectedEnquiry()?.id === enquiry.id) {
       this.selectedEnquiry.update(e => e ? {...e, draftReply: draft} : null);
    }
    this.isGeneratingDraft = false;
  }
}
