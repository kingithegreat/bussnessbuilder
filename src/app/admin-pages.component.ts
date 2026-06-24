import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from './data.service';
import { ContentPage } from './types';

@Component({
  selector: 'app-admin-pages',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  template: `
    <div class="max-w-3xl mx-auto space-y-6 pb-12">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-black text-gray-900 tracking-tight">Pages</h1>
          <p class="text-sm text-gray-500 font-medium">Create additional content pages for your site.</p>
        </div>
        <button (click)="addPage()" class="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-colors flex items-center gap-1.5">
          <mat-icon class="text-[18px]">add</mat-icon> New Page
        </button>
      </div>

      @if (pages.length === 0) {
        <div class="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl bg-white">
          <mat-icon class="text-gray-300 text-[40px]">article</mat-icon>
          <p class="text-sm text-gray-500 font-medium mt-2">No pages yet. Create your first page to get started.</p>
        </div>
      }

      @for (page of pages; track page.id; let i = $index) {
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
               (click)="expanded === page.id ? expanded = null : expanded = page.id">
            <div class="flex items-center gap-3 min-w-0">
              <mat-icon class="text-gray-300">article</mat-icon>
              <div class="min-w-0">
                <h3 class="font-bold text-gray-900 text-sm truncate">{{ page.title || 'Untitled page' }}</h3>
                <p class="text-xs text-gray-500">/pages/{{ page.slug || '...' }}
                  <span class="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" [class]="page.published ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'">
                    {{ page.published ? 'Published' : 'Draft' }}
                  </span>
                </p>
              </div>
            </div>
            <mat-icon class="text-gray-400 text-[20px] transition-transform" [class.rotate-180]="expanded === page.id">expand_more</mat-icon>
          </div>

          @if (expanded === page.id) {
            <div class="p-4 border-t border-gray-100 space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label [for]="'pt_'+page.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Page Title</label>
                  <input [id]="'pt_'+page.id" type="text" [(ngModel)]="page.title" (ngModelChange)="autoSlug(page)" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                </div>
                <div>
                  <label [for]="'ps_'+page.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">URL Slug</label>
                  <input [id]="'ps_'+page.id" type="text" [(ngModel)]="page.slug" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono">
                </div>
              </div>
              <div>
                <label [for]="'pc_'+page.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Content</label>
                <textarea [id]="'pc_'+page.id" rows="12" [(ngModel)]="page.content" placeholder="Write your page content here. You can use basic formatting." class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm leading-relaxed font-mono"></textarea>
              </div>
              <div class="flex items-center justify-between">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="page.published" class="rounded text-blue-600 focus:ring-blue-500">
                  <span class="text-sm font-bold text-gray-700">Published</span>
                </label>
                <div class="flex gap-2">
                  <button (click)="removePage(i)" class="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
                    <mat-icon class="text-[16px]">delete</mat-icon> Remove
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }

      @if (pages.length > 0) {
        <div class="flex justify-end">
          <button (click)="savePages()" class="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2">
            <mat-icon class="text-[18px]">save</mat-icon> Save Pages
          </button>
        </div>
      }
    </div>
  `
})
export class AdminPagesComponent implements OnInit {
  private dataService = inject(DataService);

  pages: ContentPage[] = [];
  expanded: string | null = null;

  ngOnInit() {
    this.pages = JSON.parse(JSON.stringify(this.dataService.getPages()));
  }

  addPage() {
    const id = 'page_' + Date.now();
    const page: ContentPage = {
      id,
      title: '',
      slug: '',
      content: '',
      published: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.pages.push(page);
    this.expanded = id;
  }

  autoSlug(page: ContentPage) {
    if (!page.slug || page.slug === this.toSlug(page.title.slice(0, -1))) {
      page.slug = this.toSlug(page.title);
    }
  }

  private toSlug(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  removePage(index: number) {
    this.pages.splice(index, 1);
  }

  savePages() {
    this.pages.forEach(p => p.updatedAt = new Date().toISOString());
    this.dataService.setPages(this.pages);
    alert('Pages saved successfully!');
  }
}
