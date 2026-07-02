import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from './data.service';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';
import { CustomizationSettings, SectionConfig } from './types';
import { INSERTABLE_SECTION_TYPES, canRemoveSection, createSection, removeSectionAt, sectionRenderType } from './section-library';
import { PublicPageComponent } from './public-page.component';
import { ImagePickerComponent } from './image-picker.component';

@Component({
  selector: 'app-admin-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, PublicPageComponent, ImagePickerComponent],
  template: `
    <div class="h-full flex flex-col md:flex-row bg-[#F5F5F7]">
      <!-- Sidebar / Editor -->
      <div class="w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 shadow-sm flex flex-col max-h-[40vh] md:max-h-none md:h-full overflow-y-auto shrink-0 z-10">
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
                      {{ getSectionName(section) }}
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
                      <input [id]="'visible_'+section.id" type="checkbox" [(ngModel)]="section.visible" (ngModelChange)="onPreviewChange()" class="sr-only peer">
                      <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div>
                    <label [for]="'heading_'+section.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Section Heading</label>
                    <input [id]="'heading_'+section.id" type="text" [(ngModel)]="section.heading" (ngModelChange)="onPreviewChange()" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700">
                  </div>
                  
                  <div>
                    <label [for]="'sub_'+section.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Subheading</label>
                    <input [id]="'sub_'+section.id" type="text" [(ngModel)]="section.subheading" (ngModelChange)="onPreviewChange()" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700">
                  </div>
                  
                  @if (renderType(section) === 'custom') {
                    <div>
                      <label [for]="'content_'+section.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Content</label>
                      <textarea [id]="'content_'+section.id" rows="5" [(ngModel)]="section.content" (ngModelChange)="onPreviewChange()" placeholder="Write the text for this section…" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700"></textarea>
                    </div>
                  }

                  @if (getVariants(renderType(section)).length > 0) {
                    <div>
                      <label [for]="'var_'+section.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Layout Variant</label>
                      <select [id]="'var_'+section.id" [(ngModel)]="section.layoutVariant" (ngModelChange)="onPreviewChange()" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700 font-medium">
                        <option value="default">Default</option>
                        @for(variant of getVariants(renderType(section)); track variant.id) {
                           <option [value]="variant.id">{{ variant.label }}</option>
                        }
                      </select>
                    </div>
                  }

                  @if (sectionSupportsImage(renderType(section), section.layoutVariant)) {
                    <app-image-picker
                      [label]="'Section Image'"
                      [section]="getImageSection(renderType(section))"
                      [currentUrl]="section.imageUrl || ''"
                      (imageSelected)="onSectionImageSelected(section, $event)"
                    ></app-image-picker>
                  }

                  @if (canRemove(section)) {
                    <button (click)="removeSection(i)" class="w-full flex items-center justify-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs font-bold transition-colors">
                      <mat-icon class="text-[16px]">delete_outline</mat-icon> Remove Section
                    </button>
                  }
                </div>
              }
            </div>
          }

          <!-- Add section -->
          <div class="bg-white rounded-xl border border-dashed border-gray-300 p-4 space-y-3">
            <label for="new_section_type" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Add a Section</label>
            <div class="flex gap-2">
              <select id="new_section_type" [(ngModel)]="newSectionType" class="flex-grow min-w-0 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700 font-medium">
                @for (t of insertableTypes; track t.type) {
                  <option [value]="t.type">{{ t.label }}</option>
                }
              </select>
              <button (click)="addSection()" class="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors shrink-0">
                <mat-icon class="text-[16px]">add</mat-icon> Add
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Preview Area -->
      <div class="flex-grow flex flex-col h-full bg-[#E5E5EA]">
        <div class="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 shrink-0">
          <div class="flex items-center gap-1">
            <button (click)="undo()" [disabled]="!canUndo()" class="p-2 rounded-lg text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-colors" title="Undo">
              <mat-icon class="text-[20px]">undo</mat-icon>
            </button>
            <button (click)="redo()" [disabled]="!canRedo()" class="p-2 rounded-lg text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-colors" title="Redo">
              <mat-icon class="text-[20px]">redo</mat-icon>
            </button>
          </div>
          <div class="flex items-center gap-2">
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
          @if (canPreview()) {
            <a [href]="previewUrl()" target="_blank" rel="noopener" class="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors">
              <mat-icon class="text-[16px]">open_in_new</mat-icon> Preview Site
            </a>
          } @else {
            <button type="button" disabled title="Complete setup to preview your site" class="flex items-center gap-1.5 bg-gray-100 text-gray-400 px-4 py-1.5 rounded-lg text-xs font-bold cursor-not-allowed">
              <mat-icon class="text-[16px]">open_in_new</mat-icon> Complete setup to preview
            </button>
          }
        </div>
        
        <div class="flex-grow overflow-auto p-4 md:p-8 flex items-start justify-center">
          <div class="bg-white shadow-2xl overflow-hidden transition-all duration-300 relative w-full h-full rounded-2xl border border-gray-300"
               [style.maxWidth]="previewMode === 'mobile' ? '375px' : previewMode === 'tablet' ? '768px' : '100%'"
               [style.height]="previewMode === 'mobile' ? '812px' : previewMode === 'tablet' ? '1024px' : '100%'">
            <!-- Iframe approach or direct embed. Since styles are global, direct embed works well and is interactive -->
            <div class="w-full h-full overflow-y-auto overflow-x-hidden">
               <app-public-page [previewCustomization]="localCust" [editable]="true" (textEdited)="onTextEdited($event)"></app-public-page>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminBuilderComponent implements OnInit {
  dataService = inject(DataService);
  private toast = inject(ToastService);
  private authService = inject(AuthService);

  // Public URL for the live site, served by the public /site/:uid route.
  // Prefer the friendly slug, but fall back to the user's UID — the public
  // /api/site/:uid endpoint resolves either (see server resolveUid), so a
  // claimed slug is NOT required to open the live page. This keeps "Preview
  // Site" working after setup even when the best-effort slug claim hasn't
  // completed, matching the header "View live site" button.
  previewUrl = computed(() => {
    const slug = this.dataService.siteSlug();
    if (slug) return `/site/${slug}`;
    const uid = this.authService.currentUser()?.uid;
    return uid ? `/site/${uid}` : null;
  });
  canPreview = computed(() => this.dataService.isSetupComplete() && !!this.previewUrl());

  localCust!: CustomizationSettings;
  expandedSection: string | null = null;
  previewMode: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  insertableTypes = INSERTABLE_SECTION_TYPES;
  newSectionType = INSERTABLE_SECTION_TYPES[0].type;

  private history: string[] = [];
  private historyIndex = -1;
  private maxHistory = 50;

  ngOnInit() {
    this.localCust = JSON.parse(JSON.stringify(this.dataService.customization()));
    this.localCust.sections.sort((a, b) => a.order - b.order);
    this.pushHistory();
  }

  private pushHistory() {
    const snapshot = JSON.stringify(this.localCust);
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    this.history.push(snapshot);
    if (this.history.length > this.maxHistory) this.history.shift();
    this.historyIndex = this.history.length - 1;
  }

  canUndo() { return this.historyIndex > 0; }
  canRedo() { return this.historyIndex < this.history.length - 1; }

  undo() {
    if (!this.canUndo()) return;
    this.historyIndex--;
    this.localCust = JSON.parse(this.history[this.historyIndex]);
  }

  redo() {
    if (!this.canRedo()) return;
    this.historyIndex++;
    this.localCust = JSON.parse(this.history[this.historyIndex]);
  }

  getSectionName(section: SectionConfig): string {
    // Inserted sections show their (editable) heading so two instances of the
    // same type stay distinguishable in the list.
    if (section.type) return section.heading || this.typeLabel(section.type);
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
    return names[section.id] || section.id;
  }

  private typeLabel(type: string): string {
    return INSERTABLE_SECTION_TYPES.find(t => t.type === type)?.label || type;
  }

  renderType(section: SectionConfig): string {
    return sectionRenderType(section);
  }

  canRemove(section: SectionConfig): boolean {
    return canRemoveSection(section);
  }

  addSection() {
    const section = createSection(this.newSectionType, this.localCust.sections);
    this.localCust.sections.push(section);
    this.expandedSection = section.id;
    this.reindex();
    this.toast.success(`${this.typeLabel(this.newSectionType)} section added`);
  }

  removeSection(index: number) {
    const target = this.localCust.sections[index];
    if (!target || !this.canRemove(target)) return;
    if (this.expandedSection === target.id) this.expandedSection = null;
    this.localCust.sections = removeSectionAt(this.localCust.sections, index);
    this.onPreviewChange();
  }

  getVariants(sectionId: string): {id: string, label: string}[] {
    switch (sectionId) {
      case 'hero': return [
        {id: 'centered', label: 'Centered (Default)'},
        {id: 'split', label: 'Split with Image'},
        {id: 'minimal', label: 'Minimal Text'},
        {id: 'premium', label: 'Premium Card'}
      ];
      case 'about': return [
        {id: 'default', label: 'Side by Side (Default)'},
        {id: 'centered', label: 'Centered Text'},
        {id: 'split', label: 'Split with Image'}
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
    this.onPreviewChange();
  }

  sectionSupportsImage(sectionId: string, variant?: string): boolean {
    if (sectionId === 'hero' && variant === 'split') return true;
    if (sectionId === 'about' && variant === 'split') return true;
    return false;
  }

  getImageSection(sectionId: string): 'hero' | 'about' | 'services' | 'general' {
    if (sectionId === 'hero') return 'hero';
    if (sectionId === 'about') return 'about';
    return 'general';
  }

  onSectionImageSelected(section: SectionConfig, url: string) {
    section.imageUrl = url;
    this.onPreviewChange();
  }

  onPreviewChange() {
    this.localCust = { ...this.localCust, sections: [...this.localCust.sections] };
    this.pushHistory();
  }

  onTextEdited(event: {target: string, field: string, value: string, id?: string}) {
    switch (event.target) {
      case 'profile':
        this.dataService.updateProfile({ [event.field]: event.value });
        break;
      case 'section': {
        const section = this.localCust.sections.find(s => s.id === event.id);
        if (section && (event.field === 'heading' || event.field === 'subheading' || event.field === 'layoutVariant' || event.field === 'imageUrl')) {
          section[event.field] = event.value;
        }
        this.onPreviewChange();
        break;
      }
      case 'service': {
        const services = [...this.dataService.services()];
        const idx = services.findIndex(s => s.id === event.id);
        if (idx >= 0) {
          services[idx] = { ...services[idx], [event.field]: event.value };
          this.dataService.setServices(services);
        }
        break;
      }
      case 'faq': {
        const faqs = [...this.dataService.faqs()];
        const idx = faqs.findIndex(f => f.id === event.id);
        if (idx >= 0) {
          faqs[idx] = { ...faqs[idx], [event.field]: event.value };
          this.dataService.setFaqs(faqs);
        }
        break;
      }
    }
  }

  saveSettings() {
    this.dataService.updateCustomization(this.localCust);
    this.toast.success('Page layouts saved successfully!');
  }
}
