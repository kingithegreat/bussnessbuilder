import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from './data.service';
import { CustomizationSettings } from './types';
import { PublicPageComponent } from './public-page.component';

@Component({
  selector: 'app-admin-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, PublicPageComponent],
  template: `
    <div class="h-full flex flex-col md:flex-row bg-[#F5F5F7]">
      <!-- Sidebar / Editor -->
      <div class="w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 shadow-sm flex flex-col h-full overflow-y-auto shrink-0 z-10">
        <div class="p-6 border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur z-10 flex justify-between items-center">
          <div>
            <h2 class="text-lg font-black text-gray-900 tracking-tight">Page Builder</h2>
            <p class="text-xs text-gray-500 font-medium">Design your public page</p>
          </div>
          <button (click)="saveSettings()" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-colors">
            Save
          </button>
        </div>

        <div class="p-6 space-y-6">
          @for (section of localCust.sections; track section.id; let i = $index) {
            <div class="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
              <div class="p-4 flex items-center justify-between cursor-pointer select-none bg-white hover:bg-gray-50 transition-colors"
                   tabindex="0"
                   (keydown.enter)="expandedSection === section.id ? expandedSection = null : expandedSection = section.id"
                   (click)="expandedSection === section.id ? expandedSection = null : expandedSection = section.id">
                <div class="flex items-center gap-3">
                  <mat-icon class="text-gray-400 cursor-move">drag_indicator</mat-icon>
                  <div>
                    <h3 class="font-bold text-gray-900 text-sm flex items-center gap-2">
                      {{ getSectionName(section.id) }}
                      @if (!section.visible) {
                        <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-200 text-gray-500 uppercase tracking-wider">Hidden</span>
                      }
                    </h3>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                   <button (click)="moveUp(i); $event.stopPropagation()" [disabled]="i === 0" class="text-gray-400 hover:text-gray-700 disabled:opacity-30">
                     <mat-icon class="text-[18px]">keyboard_arrow_up</mat-icon>
                   </button>
                   <button (click)="moveDown(i); $event.stopPropagation()" [disabled]="i === localCust.sections.length - 1" class="text-gray-400 hover:text-gray-700 disabled:opacity-30">
                     <mat-icon class="text-[18px]">keyboard_arrow_down</mat-icon>
                   </button>
                   <mat-icon class="text-gray-400 text-[20px] transition-transform" [class.rotate-180]="expandedSection === section.id">
                     expand_more
                   </mat-icon>
                </div>
              </div>
              
              @if (expandedSection === section.id) {
                <div class="p-4 border-t border-gray-100 space-y-4">
                  <div class="flex items-center justify-between">
                    <label [for]="'visible_'+section.id" class="text-xs font-bold text-gray-700 cursor-pointer">Visible on Page</label>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input [id]="'visible_'+section.id" type="checkbox" [(ngModel)]="section.visible" class="sr-only peer">
                      <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div>
                    <label [for]="'heading_'+section.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Section Heading</label>
                    <input [id]="'heading_'+section.id" type="text" [(ngModel)]="section.heading" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700">
                  </div>
                  
                  <div>
                    <label [for]="'sub_'+section.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Subheading</label>
                    <input [id]="'sub_'+section.id" type="text" [(ngModel)]="section.subheading" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700">
                  </div>
                  
                  @if (getVariants(section.id).length > 0) {
                    <div>
                      <label [for]="'var_'+section.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Layout Variant</label>
                      <select [id]="'var_'+section.id" [(ngModel)]="section.layoutVariant" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700 font-medium">
                        <option value="default">Default</option>
                        @for(variant of getVariants(section.id); track variant.id) {
                           <option [value]="variant.id">{{ variant.label }}</option>
                        }
                      </select>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Preview Area -->
      <div class="flex-grow flex flex-col h-full bg-[#E5E5EA]">
        <div class="h-14 border-b border-gray-200 bg-white flex items-center justify-center gap-2 shrink-0">
          <button (click)="previewMode = 'desktop'" [class.bg-gray-100]="previewMode === 'desktop'" [class.text-blue-600]="previewMode === 'desktop'" class="p-2 rounded-lg text-gray-500 hover:text-gray-900 transition-colors">
            <mat-icon class="text-[20px]">desktop_mac</mat-icon>
          </button>
          <button (click)="previewMode = 'tablet'" [class.bg-gray-100]="previewMode === 'tablet'" [class.text-blue-600]="previewMode === 'tablet'" class="p-2 rounded-lg text-gray-500 hover:text-gray-900 transition-colors">
            <mat-icon class="text-[20px]">tablet_mac</mat-icon>
          </button>
          <button (click)="previewMode = 'mobile'" [class.bg-gray-100]="previewMode === 'mobile'" [class.text-blue-600]="previewMode === 'mobile'" class="p-2 rounded-lg text-gray-500 hover:text-gray-900 transition-colors">
            <mat-icon class="text-[20px]">smartphone</mat-icon>
          </button>
        </div>
        
        <div class="flex-grow overflow-auto p-4 md:p-8 flex items-start justify-center">
          <div class="bg-white shadow-2xl overflow-hidden transition-all duration-300 relative w-full h-full rounded-2xl border border-gray-300"
               [style.maxWidth]="previewMode === 'mobile' ? '375px' : previewMode === 'tablet' ? '768px' : '100%'"
               [style.height]="previewMode === 'mobile' ? '812px' : previewMode === 'tablet' ? '1024px' : '100%'">
            <!-- Iframe approach or direct embed. Since styles are global, direct embed works well and is interactive -->
            <div class="w-full h-full overflow-y-auto overflow-x-hidden">
               <app-public-page [previewCustomization]="localCust"></app-public-page>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminBuilderComponent implements OnInit {
  dataService = inject(DataService);
  
  localCust!: CustomizationSettings;
  expandedSection: string | null = null;
  previewMode: 'desktop' | 'tablet' | 'mobile' = 'desktop';

  ngOnInit() {
    this.localCust = JSON.parse(JSON.stringify(this.dataService.customization()));
    // Sort sections just in case
    this.localCust.sections.sort((a, b) => a.order - b.order);
  }

  getSectionName(id: string): string {
    const names: Record<string, string> = {
      hero: 'Hero / Header',
      about: 'About Us',
      services: 'Services',
      products: 'Products',
      pricing: 'Pricing',
      testimonials: 'Testimonials',
      gallery: 'Gallery',
      faq: 'FAQ',
      contact: 'Contact Form',
      location: 'Location Map',
      hours: 'Business Hours',
      badges: 'Trust Badges',
      cta: 'Call to Action'
    };
    return names[id] || id;
  }

  getVariants(sectionId: string): {id: string, label: string}[] {
    switch (sectionId) {
      case 'hero': return [
        {id: 'centered', label: 'Centered (Default)'},
        {id: 'split', label: 'Split with Image'},
        {id: 'minimal', label: 'Minimal Text'},
        {id: 'premium', label: 'Premium Card'}
      ];
      case 'services': return [
        {id: 'grid', label: 'Grid Cards (Default)'},
        {id: 'list', label: 'List Layout'},
        {id: 'featured', label: 'Featured Spotlight'},
        {id: 'compact', label: 'Compact Icons'}
      ];
      case 'testimonials': return [
        {id: 'quote', label: 'Quote Cards (Default)'},
        {id: 'carousel', label: 'Horizontal Carousel'},
        {id: 'list', label: 'Simple List'}
      ];
      case 'faq': return [
        {id: 'accordion', label: 'Accordion/Cards (Default)'},
        {id: 'two-column', label: 'Two Column Grid'}
      ];
      case 'contact': return [
        {id: 'split', label: 'Split Layout (Default)'},
        {id: 'form-only', label: 'Form Only'},
        {id: 'form-details', label: 'Form + Contact Details'}
      ];
      default: return [];
    }
  }

  moveUp(index: number) {
    if (index === 0) return;
    const temp = this.localCust.sections[index];
    this.localCust.sections[index] = this.localCust.sections[index - 1];
    this.localCust.sections[index - 1] = temp;
    this.reindex();
  }

  moveDown(index: number) {
    if (index === this.localCust.sections.length - 1) return;
    const temp = this.localCust.sections[index];
    this.localCust.sections[index] = this.localCust.sections[index + 1];
    this.localCust.sections[index + 1] = temp;
    this.reindex();
  }

  private reindex() {
    this.localCust.sections.forEach((s, i) => s.order = i + 1);
  }

  saveSettings() {
    this.dataService.updateCustomization(this.localCust);
    alert('Page layouts saved successfully!');
  }
}
