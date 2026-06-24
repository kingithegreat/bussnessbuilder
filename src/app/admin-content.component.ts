import { Component, inject, OnInit } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from './data.service';
import { Service, Testimonial, FAQ } from './types';

type Tab = 'services' | 'testimonials' | 'faqs';

/**
 * Content editor for the three list-based content types that drive the public
 * page — Services, Testimonials and FAQs. Each tab edits a local working copy
 * and commits the whole list on Save (mirroring the Form Builder pattern), so
 * nothing changes on the live site until the user explicitly saves.
 */
@Component({
  selector: 'app-admin-content',
  standalone: true,
  imports: [FormsModule, MatIconModule, NgTemplateOutlet],
  template: `
    <div class="max-w-3xl mx-auto">
      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-2xl font-black text-gray-900 tracking-tight">Content</h1>
          <p class="text-sm text-gray-500 font-medium">Manage the services, testimonials and FAQs shown on your public page.</p>
        </div>
        <button (click)="save()" class="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-colors flex items-center gap-1.5">
          <mat-icon class="text-[18px]">save</mat-icon> Save {{ tabLabel() }}
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        @for (t of tabs; track t.id) {
          <button (click)="tab = t.id"
                  class="px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5"
                  [class]="tab === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
            <mat-icon class="text-[18px]">{{ t.icon }}</mat-icon> {{ t.label }}
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full" [class]="tab === t.id ? 'bg-blue-50 text-blue-600' : 'bg-gray-200 text-gray-500'">{{ count(t.id) }}</span>
          </button>
        }
      </div>

      <div class="flex justify-end mb-4">
        <button (click)="add()" class="text-blue-600 text-sm font-bold hover:underline flex items-center gap-1">
          <mat-icon class="text-[16px]">add</mat-icon> Add {{ singular() }}
        </button>
      </div>

      <!-- SERVICES -->
      @if (tab === 'services') {
        @if (services.length === 0) { <ng-container *ngTemplateOutlet="empty"></ng-container> }
        @for (item of services; track item.id; let i = $index) {
          <div class="bg-white rounded-xl border border-gray-200 mb-3 overflow-hidden shadow-sm">
            <div class="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50 transition-colors"
                 tabindex="0" role="button"
                 (keydown.enter)="toggle(item.id)" (click)="toggle(item.id)">
              <div class="flex items-center gap-3 min-w-0">
                <mat-icon class="text-gray-300">sell</mat-icon>
                <div class="min-w-0">
                  <h3 class="font-bold text-gray-900 text-sm truncate">{{ item.name || 'Untitled service' }}</h3>
                  <p class="text-xs text-gray-500 truncate">{{ item.price || 'No price' }}@if (item.duration) { · {{ item.duration }}}</p>
                </div>
              </div>
              <ng-container *ngTemplateOutlet="rowActions; context: { i: i, id: item.id, len: services.length }"></ng-container>
            </div>
            @if (expanded === item.id) {
              <div class="p-4 border-t border-gray-100 space-y-4">
                <div>
                  <label [for]="'sn_'+item.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Name</label>
                  <input [id]="'sn_'+item.id" type="text" [(ngModel)]="item.name" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700">
                </div>
                <div>
                  <label [for]="'sd_'+item.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                  <textarea [id]="'sd_'+item.id" rows="2" [(ngModel)]="item.description" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700"></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label [for]="'sp_'+item.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Price <span class="text-gray-400 normal-case">(optional)</span></label>
                    <input [id]="'sp_'+item.id" type="text" [(ngModel)]="item.price" placeholder="e.g. $120" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700">
                  </div>
                  <div>
                    <label [for]="'su_'+item.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Duration <span class="text-gray-400 normal-case">(optional)</span></label>
                    <input [id]="'su_'+item.id" type="text" [(ngModel)]="item.duration" placeholder="e.g. 2 hours" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700">
                  </div>
                </div>
                <ng-container *ngTemplateOutlet="removeBtn; context: { i: i }"></ng-container>
              </div>
            }
          </div>
        }
      }

      <!-- TESTIMONIALS -->
      @if (tab === 'testimonials') {
        @if (testimonials.length === 0) { <ng-container *ngTemplateOutlet="empty"></ng-container> }
        @for (item of testimonials; track item.id; let i = $index) {
          <div class="bg-white rounded-xl border border-gray-200 mb-3 overflow-hidden shadow-sm">
            <div class="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50 transition-colors"
                 tabindex="0" role="button"
                 (keydown.enter)="toggle(item.id)" (click)="toggle(item.id)">
              <div class="flex items-center gap-3 min-w-0">
                <mat-icon class="text-gray-300">format_quote</mat-icon>
                <div class="min-w-0">
                  <h3 class="font-bold text-gray-900 text-sm truncate">{{ item.author || 'Anonymous' }}</h3>
                  <p class="text-xs text-amber-500 truncate">{{ stars(item.rating) }} <span class="text-gray-400">{{ item.role }}</span></p>
                </div>
              </div>
              <ng-container *ngTemplateOutlet="rowActions; context: { i: i, id: item.id, len: testimonials.length }"></ng-container>
            </div>
            @if (expanded === item.id) {
              <div class="p-4 border-t border-gray-100 space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label [for]="'ta_'+item.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Author</label>
                    <input [id]="'ta_'+item.id" type="text" [(ngModel)]="item.author" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700">
                  </div>
                  <div>
                    <label [for]="'tr_'+item.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Role / location <span class="text-gray-400 normal-case">(optional)</span></label>
                    <input [id]="'tr_'+item.id" type="text" [(ngModel)]="item.role" placeholder="e.g. Homeowner" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700">
                  </div>
                </div>
                <div>
                  <label [for]="'trt_'+item.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Rating</label>
                  <select [id]="'trt_'+item.id" [(ngModel)]="item.rating" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700 font-medium">
                    @for (r of [5,4,3,2,1]; track r) { <option [ngValue]="r">{{ stars(r) }} ({{ r }})</option> }
                  </select>
                </div>
                <div>
                  <label [for]="'tt_'+item.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Quote</label>
                  <textarea [id]="'tt_'+item.id" rows="3" [(ngModel)]="item.text" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700"></textarea>
                </div>
                <ng-container *ngTemplateOutlet="removeBtn; context: { i: i }"></ng-container>
              </div>
            }
          </div>
        }
      }

      <!-- FAQS -->
      @if (tab === 'faqs') {
        @if (faqs.length === 0) { <ng-container *ngTemplateOutlet="empty"></ng-container> }
        @for (item of faqs; track item.id; let i = $index) {
          <div class="bg-white rounded-xl border border-gray-200 mb-3 overflow-hidden shadow-sm">
            <div class="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50 transition-colors"
                 tabindex="0" role="button"
                 (keydown.enter)="toggle(item.id)" (click)="toggle(item.id)">
              <div class="flex items-center gap-3 min-w-0">
                <mat-icon class="text-gray-300">help_outline</mat-icon>
                <h3 class="font-bold text-gray-900 text-sm truncate">{{ item.question || 'Untitled question' }}</h3>
              </div>
              <ng-container *ngTemplateOutlet="rowActions; context: { i: i, id: item.id, len: faqs.length }"></ng-container>
            </div>
            @if (expanded === item.id) {
              <div class="p-4 border-t border-gray-100 space-y-4">
                <div>
                  <label [for]="'fq_'+item.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Question</label>
                  <input [id]="'fq_'+item.id" type="text" [(ngModel)]="item.question" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700">
                </div>
                <div>
                  <label [for]="'fa_'+item.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Answer</label>
                  <textarea [id]="'fa_'+item.id" rows="3" [(ngModel)]="item.answer" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700"></textarea>
                </div>
                <ng-container *ngTemplateOutlet="removeBtn; context: { i: i }"></ng-container>
              </div>
            }
          </div>
        }
      }
    </div>

    <!-- Shared row action buttons (move up/down + expand chevron) -->
    <ng-template #rowActions let-i="i" let-id="id" let-len="len">
      <div class="flex items-center gap-2 shrink-0">
        <button (click)="moveUp(i); $event.stopPropagation()" [disabled]="i === 0" class="text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label="Move up">
          <mat-icon class="text-[18px]">keyboard_arrow_up</mat-icon>
        </button>
        <button (click)="moveDown(i); $event.stopPropagation()" [disabled]="i === len - 1" class="text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label="Move down">
          <mat-icon class="text-[18px]">keyboard_arrow_down</mat-icon>
        </button>
        <mat-icon class="text-gray-400 text-[20px] transition-transform" [class.rotate-180]="expanded === id">expand_more</mat-icon>
      </div>
    </ng-template>

    <ng-template #removeBtn let-i="i">
      <div class="pt-2 flex justify-end">
        <button (click)="remove(i)" class="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
          <mat-icon class="text-[16px]">delete</mat-icon> Remove
        </button>
      </div>
    </ng-template>

    <ng-template #empty>
      <div class="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl bg-white">
        <mat-icon class="text-gray-300 text-[40px]">inbox</mat-icon>
        <p class="text-sm text-gray-500 font-medium mt-2">No {{ tabLabel().toLowerCase() }} yet. Click “Add {{ singular() }}” to create one.</p>
      </div>
    </ng-template>
  `,
})
export class AdminContentComponent implements OnInit {
  private dataService = inject(DataService);

  tab: Tab = 'services';
  expanded: string | null = null;

  services: Service[] = [];
  testimonials: Testimonial[] = [];
  faqs: FAQ[] = [];

  readonly tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'services', label: 'Services', icon: 'sell' },
    { id: 'testimonials', label: 'Testimonials', icon: 'format_quote' },
    { id: 'faqs', label: 'FAQs', icon: 'help_outline' },
  ];

  ngOnInit() {
    // Deep copies so edits stay local until Save.
    this.services = JSON.parse(JSON.stringify(this.dataService.services()));
    this.testimonials = JSON.parse(JSON.stringify(this.dataService.testimonials()));
    this.faqs = JSON.parse(JSON.stringify(this.dataService.faqs()));
  }

  count(t: Tab): number {
    return t === 'services' ? this.services.length : t === 'testimonials' ? this.testimonials.length : this.faqs.length;
  }

  tabLabel(): string {
    return this.tabs.find(t => t.id === this.tab)!.label;
  }

  singular(): string {
    return this.tab === 'services' ? 'Service' : this.tab === 'testimonials' ? 'Testimonial' : 'FAQ';
  }

  stars(rating: number): string {
    const r = Math.max(0, Math.min(5, Math.round(rating || 0)));
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  }

  toggle(id: string) {
    this.expanded = this.expanded === id ? null : id;
  }

  private currentList(): { id: string }[] {
    return this.tab === 'services' ? this.services : this.tab === 'testimonials' ? this.testimonials : this.faqs;
  }

  add() {
    const id = this.tab[0] + '_' + Date.now();
    if (this.tab === 'services') {
      this.services.push({ id, name: '', description: '', price: '', duration: '' });
    } else if (this.tab === 'testimonials') {
      this.testimonials.push({ id, author: '', role: '', rating: 5, text: '' });
    } else {
      this.faqs.push({ id, question: '', answer: '' });
    }
    this.expanded = id;
  }

  remove(index: number) {
    this.currentList().splice(index, 1);
  }

  moveUp(index: number) {
    if (index === 0) return;
    const list = this.currentList();
    [list[index - 1], list[index]] = [list[index], list[index - 1]];
  }

  moveDown(index: number) {
    const list = this.currentList();
    if (index >= list.length - 1) return;
    [list[index + 1], list[index]] = [list[index], list[index + 1]];
  }

  save() {
    if (this.tab === 'services') {
      this.dataService.setServices(this.services);
    } else if (this.tab === 'testimonials') {
      // Coerce rating to a number — <select> ngValue keeps it numeric, but guard anyway.
      this.testimonials.forEach(t => (t.rating = Number(t.rating) || 0));
      this.dataService.setTestimonials(this.testimonials);
    } else {
      this.dataService.setFaqs(this.faqs);
    }
    alert(this.tabLabel() + ' saved successfully!');
  }
}
