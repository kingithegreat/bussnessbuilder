import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from './data.service';
import { CustomizationSettings } from './types';

@Component({
  selector: 'app-admin-customisation',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
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
              </div>

              <div class="space-y-6">
                <h3 class="font-bold text-gray-900 border-b border-gray-100 pb-2">Style & Typography</h3>
                
                <div>
                  <span class="block text-sm font-bold text-gray-700 mb-2">Font Style</span>
                  <select [(ngModel)]="localCust.branding.fontStyle" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                    <option value="modern">Modern (Inter)</option>
                    <option value="friendly">Friendly (Quicksand)</option>
                    <option value="professional">Professional (Merriweather)</option>
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
                   <span class="block text-sm font-bold text-gray-700 mb-2">Logo URL (Optional)</span>
                   <input type="text" [(ngModel)]="localCust.branding.logoUrl" placeholder="https://..." class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                 </div>
                 <div>
                   <span class="block text-sm font-bold text-gray-700 mb-2">Main CTA Text</span>
                   <input type="text" [(ngModel)]="localCust.branding.ctaText" placeholder="Get a Quote" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                 </div>
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
              @for (section of localCust.sections; track section.id) {
                <div class="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:bg-gray-50 transition-colors">
                  <div class="flex items-center gap-4 w-full sm:w-1/3 shrink-0">
                    <button class="text-gray-400 cursor-grab active:cursor-grabbing hover:text-gray-600">
                      <mat-icon>drag_indicator</mat-icon>
                    </button>
                    <label class="relative inline-flex items-center cursor-pointer shrink-0">
                      <input type="checkbox" [(ngModel)]="section.visible" class="sr-only peer">
                      <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    <div>
                      <h4 class="font-bold text-gray-900 capitalize">{{ section.id }}</h4>
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
  
  tabs = [
    { id: 'branding', label: 'Branding', icon: 'palette' },
    { id: 'sections', label: 'Page Sections', icon: 'view_agenda' },
    { id: 'form', label: 'Contact Form', icon: 'list_alt' },
    { id: 'rules', label: 'Business Rules', icon: 'rule' }
  ];
  currentTab = 'branding';

  localCust!: CustomizationSettings;

  ngOnInit() {
    // Create a deep copy of the customization settings
    this.localCust = JSON.parse(JSON.stringify(this.dataService.customization()));
  }

  updateStatuses(val: string) {
    this.localCust.rules.statuses = val.split(',').map(s => s.trim()).filter(s => s);
  }

  updateLeadQualities(val: string) {
    this.localCust.rules.leadQualities = val.split(',').map(s => s.trim()).filter(s => s);
  }

  saveCustomisation() {
    this.dataService.updateCustomization(this.localCust);
    alert('Customisation settings saved successfully!');
  }

  resetToDefaults() {
    if (confirm('This will reset all branding, section layouts, form fields, and business rules to their original defaults. Your business profile, services, enquiries, and other data will not be affected.\n\nAre you sure?')) {
      this.dataService.resetCustomization();
      this.localCust = JSON.parse(JSON.stringify(this.dataService.customization()));
      alert('Customisation settings have been reset to defaults.');
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
          alert('Config imported successfully. Click Save to apply.');
        } else {
          alert('Invalid configuration file.');
        }
      } catch {
        alert('Error parsing JSON file.');
      }
    };
    reader.readAsText(file);
  }
}
