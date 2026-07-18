import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from './data.service';
import { ToastService } from './toast.service';
import { FormFieldConfig, CustomizationSettings } from './types';

@Component({
  selector: 'app-admin-form-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col md:flex-row bg-[#F5F5F7]">
      <!-- Editor Sidebar -->
      <div class="w-full md:w-96 bg-white border-r border-gray-200 shadow-sm flex flex-col h-full overflow-y-auto shrink-0 z-10">
        <div class="p-6 border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur z-10 flex justify-between items-center">
          <div>
            <h2 class="text-lg font-black text-gray-900 tracking-tight">Form Builder</h2>
            <p class="text-xs text-gray-500 font-medium">Customize the enquiry form</p>
          </div>
          <button (click)="saveSettings()" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-colors">
            Save
          </button>
        </div>

        <div class="p-6 space-y-6">
          <div class="flex justify-between items-center">
            <h3 class="font-bold text-gray-900 text-sm">Form Fields</h3>
            <button (click)="addField()" class="text-blue-600 text-sm font-bold hover:underline flex items-center gap-1">
              <mat-icon class="text-[16px]">add</mat-icon> Add Field
            </button>
          </div>

          @for (field of fields; track field.id; let i = $index) {
            <div class="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
              <div class="p-4 flex items-center justify-between cursor-pointer select-none bg-white hover:bg-gray-50 transition-colors"
                   tabindex="0"
                   (keydown.enter)="expandedField === field.id ? expandedField = null : expandedField = field.id"
                   (click)="expandedField === field.id ? expandedField = null : expandedField = field.id">
                <div class="flex items-center gap-3">
                  <mat-icon class="text-gray-400 cursor-move">drag_indicator</mat-icon>
                  <div>
                    <h3 class="font-bold text-gray-900 text-sm">{{ field.label || 'Unnamed Field' }}</h3>
                    <p class="text-[10px] font-bold text-gray-500 uppercase">{{ field.type }} @if (field.required) {<span class="text-red-500">*</span>}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                   <button (click)="moveUp(i); $event.stopPropagation()" [disabled]="i === 0" class="text-gray-400 hover:text-gray-700 disabled:opacity-30">
                     <mat-icon class="text-[18px]">keyboard_arrow_up</mat-icon>
                   </button>
                   <button (click)="moveDown(i); $event.stopPropagation()" [disabled]="i === fields.length - 1" class="text-gray-400 hover:text-gray-700 disabled:opacity-30">
                     <mat-icon class="text-[18px]">keyboard_arrow_down</mat-icon>
                   </button>
                   <mat-icon class="text-gray-400 text-[20px] transition-transform" [class.rotate-180]="expandedField === field.id">
                     expand_more
                   </mat-icon>
                </div>
              </div>

              @if (expandedField === field.id) {
                <div class="p-4 border-t border-gray-100 space-y-4">
                  <div>
                    <label [for]="'label_'+field.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Field Label</label>
                    <input [id]="'label_'+field.id" type="text" [(ngModel)]="field.label" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700">
                  </div>
                  
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label [for]="'type_'+field.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Field Type</label>
                      <select [id]="'type_'+field.id" [(ngModel)]="field.type" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700 font-medium">
                        <option value="text">Short Text</option>
                        <option value="textarea">Long Text</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="number">Number</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="multi-select">Multi-Select</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="radio">Radio Buttons</option>
                        <option value="date">Date</option>
                        <option value="time">Time</option>
                        <option value="address">Address</option>
                        <option value="budget">Budget Range</option>
                        <option value="contact-method">Preferred Contact Method</option>
                      </select>
                    </div>
                    
                    <div class="flex items-center justify-between pt-6">
                      <label [for]="'req_'+field.id" class="text-xs font-bold text-gray-700 cursor-pointer">Required</label>
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input [id]="'req_'+field.id" type="checkbox" [(ngModel)]="field.required" class="sr-only peer">
                        <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  @if (field.type === 'dropdown' || field.type === 'radio' || field.type === 'multi-select') {
                    <div>
                      <label [for]="'opt_'+field.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Options (Comma separated)</label>
                      <input [id]="'opt_'+field.id" type="text" [(ngModel)]="field.options" placeholder="Option 1, Option 2" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700">
                    </div>
                  }

                  <div>
                    <label [for]="'ph_'+field.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Placeholder Text</label>
                    <input [id]="'ph_'+field.id" type="text" [(ngModel)]="field.placeholder" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700">
                  </div>

                  <div>
                    <label [for]="'ht_'+field.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Helper Text</label>
                    <input [id]="'ht_'+field.id" type="text" [(ngModel)]="field.helperText" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700">
                  </div>

                  <div class="pt-2 border-t border-gray-100">
                    <div class="flex items-center justify-between mb-2">
                      <label [for]="'cond_'+field.id" class="text-xs font-bold text-gray-700 cursor-pointer">Conditional Logic</label>
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input [id]="'cond_'+field.id" type="checkbox" [checked]="!!field.dependsOn" (change)="toggleConditionalLogic(field, $event)" class="sr-only peer">
                        <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    @if (field.dependsOn) {
                      <div class="bg-gray-100 p-3 rounded-lg flex flex-col gap-2 mt-2">
                        <div class="flex items-center gap-2">
                          <span class="text-xs text-gray-600">Show this field if</span>
                        </div>
                        <select [(ngModel)]="field.dependsOn.fieldId" class="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md outline-none text-xs text-gray-700">
                          <option value="">Select a field...</option>
                          @for (other of getOtherFields(field.id); track other.id) {
                            <option [value]="other.id">{{ other.label }}</option>
                          }
                        </select>
                        <div class="flex items-center gap-2">
                          <span class="text-xs text-gray-600">equals</span>
                        </div>
                        <input type="text" [(ngModel)]="field.dependsOn.value" placeholder="Value to match" class="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md outline-none text-xs text-gray-700">
                      </div>
                    }
                  </div>

                  <div class="pt-4 flex justify-end">
                    <button (click)="removeField(i)" class="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
                      <mat-icon class="text-[16px]">delete</mat-icon> Remove
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Preview Area -->
      <div class="flex-grow flex flex-col h-full bg-[#E5E5EA]">
        <div class="p-6 md:p-12 h-full overflow-y-auto flex justify-center">
          <div class="max-w-2xl w-full">
            <h2 class="text-xl font-bold text-gray-900 mb-6 px-2">Live Preview</h2>
            <div class="bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-gray-100">
               <form class="space-y-6" (submit)="$event.preventDefault()">
                 @for (field of getVisibleFields(); track field.id) {
                   <div>
                      <label [for]="'prev_'+field.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                        {{ field.label }} {{ field.required ? '*' : '' }}
                      </label>
                      
                      @if (field.type === 'textarea') {
                        <textarea [id]="'prev_'+field.id" [placeholder]="field.placeholder || ''" rows="4" class="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm transition-all"></textarea>
                      } @else if (field.type === 'dropdown' || field.type === 'budget' || field.type === 'contact-method') {
                        <select [id]="'prev_'+field.id" class="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm font-medium text-gray-700 transition-all">
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
                          <input type="checkbox" class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500">
                          <span class="text-sm text-gray-700">{{ field.placeholder || 'Check this box' }}</span>
                        </label>
                      } @else if (field.type === 'radio') {
                        <div class="space-y-2">
                          @for (opt of field.options.split(','); track opt) {
                            @if (opt.trim()) {
                              <label class="flex items-center gap-3 cursor-pointer">
                                <input type="radio" [name]="'radio_'+field.id" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
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
                                 <input type="checkbox" class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500">
                                 <span class="text-sm text-gray-700">{{ opt.trim() }}</span>
                               </label>
                             }
                           }
                        </div>
                      } @else {
                        <input [id]="'prev_'+field.id" [type]="field.type" [placeholder]="field.placeholder || ''" class="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm transition-all">
                      }

                      @if (field.helperText) {
                        <p class="text-xs text-gray-500 mt-1.5">{{ field.helperText }}</p>
                      }
                   </div>
                 }
                 
                 <button type="submit" class="w-full bg-blue-600 text-white px-6 py-4 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition-colors mt-2">
                   Submit Form
                 </button>
               </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminFormBuilderComponent implements OnInit {
  dataService = inject(DataService);
  private toast = inject(ToastService);
  
  fields: FormFieldConfig[] = [];
  expandedField: string | null = null;
  
  ngOnInit() {
    this.fields = JSON.parse(JSON.stringify(this.dataService.customization().formFields));
    this.fields.sort((a, b) => a.order - b.order);
  }

  addField() {
    const newId = 'field_' + Date.now();
    this.fields.push({
      id: newId,
      label: 'New Field',
      type: 'text',
      required: false,
      options: '',
      order: this.fields.length + 1
    });
    this.expandedField = newId;
  }

  removeField(index: number) {
    this.fields.splice(index, 1);
    this.reindex();
  }

  moveUp(index: number) {
    if (index === 0) return;
    const temp = this.fields[index];
    this.fields[index] = this.fields[index - 1];
    this.fields[index - 1] = temp;
    this.reindex();
  }

  moveDown(index: number) {
    if (index === this.fields.length - 1) return;
    const temp = this.fields[index];
    this.fields[index] = this.fields[index + 1];
    this.fields[index + 1] = temp;
    this.reindex();
  }

  private reindex() {
    this.fields.forEach((f, i) => f.order = i + 1);
  }

  toggleConditionalLogic(field: FormFieldConfig, event: Event) {
    if ((event.target as HTMLInputElement).checked) {
      field.dependsOn = { fieldId: '', value: '' };
    } else {
      delete field.dependsOn;
    }
  }

  getOtherFields(currentFieldId: string) {
    return this.fields.filter(f => f.id !== currentFieldId);
  }
  
  getVisibleFields() {
    // In preview mode we just show everything, or maybe try to evaluate conditions loosely?
    // We'll show everything in the preview to make it easy to edit, but visually distinct if we wanted.
    // For now just show all.
    return this.fields;
  }

  saveSettings() {
    const currentSettings = this.dataService.customization();
    const updatedSettings: CustomizationSettings = {
      ...currentSettings,
      formFields: this.fields
    };
    this.dataService.updateCustomization(updatedSettings);
    this.toast.success('Form fields saved successfully!');
  }
}
