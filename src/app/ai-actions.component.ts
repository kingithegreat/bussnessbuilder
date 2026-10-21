import { TooltipDirective } from './tooltip.directive';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from './data.service';
import { AiService } from './ai.service';
import { ToastService } from './toast.service';
import { ContentPage } from './types';
import {
  nzSeason, seasonalPostPrompt, parsePostResponse, templateSeasonalPost, slugify,
  deterministicPriceChanges, priceUpdatePrompt, parsePriceChanges, applyPriceChanges, PriceChange,
  aboutPrompt, cleanAbout, templateAbout,
} from './ai-updates';

type Mode = 'post' | 'prices' | 'about' | null;

/** Dashboard: one-click AI updates. Nothing is saved until the owner approves the preview. */
@Component({
  selector: 'app-ai-actions',
  standalone: true,
  imports: [TooltipDirective, FormsModule, RouterLink],
  template: `
    <section class="bg-white border border-gray-200 rounded-2xl p-5" aria-labelledby="ai-actions-title">
      <h2 id="ai-actions-title" class="text-lg font-semibold text-gray-900">Quick updates with AI</h2>
      <p class="text-sm text-gray-600 mb-4">You'll always see a preview first. Nothing changes on your site until you press Save.</p>
      <div class="flex flex-wrap gap-2">
        <button type="button" (click)="open('post')" [attr.aria-pressed]="mode() === 'post'" class="px-4 py-2 rounded-xl text-sm font-bold bg-blue-50 text-blue-800 hover:bg-blue-100">✍️ Write a {{ season }} special post</button>
        <button type="button" (click)="open('prices')" [attr.aria-pressed]="mode() === 'prices'" class="px-4 py-2 rounded-xl text-sm font-bold bg-blue-50 text-blue-800 hover:bg-blue-100">💲 Update my prices</button>
        <button type="button" (click)="open('about')" [attr.aria-pressed]="mode() === 'about'" class="px-4 py-2 rounded-xl text-sm font-bold bg-blue-50 text-blue-800 hover:bg-blue-100">🔄 Refresh my About section</button>
      </div>

      @if (busy()) { <p class="mt-4 text-sm text-gray-700" role="status">Writing a draft…</p> }
      @if (note()) { <p class="mt-3 text-xs text-gray-600" role="status">{{ note() }}</p> }

      @if (mode() === 'post' && post(); as p) {
        <div class="mt-4 border border-gray-200 rounded-xl p-4 space-y-3">
          <h3 class="font-bold text-gray-900">Preview: new page</h3>
          <div><label for="ai-post-title" class="text-xs font-semibold text-gray-700">Title</label><input id="ai-post-title" [(ngModel)]="p.title" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></div>
          <div><label for="ai-post-body" class="text-xs font-semibold text-gray-700">Text (you can edit it)</label><textarea id="ai-post-body" rows="10" [(ngModel)]="p.content" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"></textarea></div>
          @if (p.content.includes('[your offer here]')) { <p class="text-xs font-semibold text-amber-800">Replace "[your offer here]" with your actual offer before publishing.</p> }
          <div class="flex flex-wrap gap-2">
            <button type="button" (click)="savePost(false)" class="px-4 py-2 rounded-xl text-sm font-bold bg-gray-100 text-gray-900">Save as draft</button>
            <button type="button" (click)="savePost(true)" [disabled]="p.content.includes('[your offer here]')" class="px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white disabled:opacity-50">Save &amp; publish</button>
            <button type="button" (click)="generatePost()" class="px-4 py-2 rounded-xl text-sm font-bold text-blue-700">Try again</button>
            <button type="button" (click)="close()" class="px-4 py-2 rounded-xl text-sm font-bold text-gray-700">Cancel</button>
          </div>
        </div>
      }

      @if (mode() === 'prices') {
        <div class="mt-4 border border-gray-200 rounded-xl p-4 space-y-3">
          <form class="flex flex-col sm:flex-row gap-2" (ngSubmit)="previewPrices()">
            <label for="ai-price-ask" class="sr-only">What should change?</label>
            <input id="ai-price-ask" name="ask" [(ngModel)]="priceAsk" placeholder='e.g. "raise all prices by 5%, round to the nearest dollar" or "lawn mow is now $50"' class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <button type="submit" [disabled]="busy() || !priceAsk.trim()" class="px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white disabled:opacity-50">Preview changes</button>
          </form>
          @if (changes(); as cs) {
            @if (!cs.length) {
              <p class="text-sm text-gray-700">No price changes found for that. Try being more specific, e.g. "hedge trimming is now $70".</p>
            } @else {
              <table class="w-full text-sm">
                <caption class="text-left text-xs text-gray-600 mb-1">Untick anything you don't want to change.</caption>
                <thead><tr class="text-left text-gray-700"><th class="py-1"><span class="sr-only">Apply</span></th><th>Service</th><th>Now</th><th>New</th></tr></thead>
                <tbody>
                  @for (c of cs; track c.serviceId) {
                    <tr class="border-t border-gray-100">
                      <td class="py-2"><input type="checkbox" [checked]="keep().includes(c.serviceId)" (change)="toggleKeep(c.serviceId)" [attr.aria-label]="'Apply new price for ' + c.name"></td>
                      <td>{{ c.name }}</td>
                      <td class="text-gray-600 line-through">{{ c.oldPrice || '—' }}</td>
                      <td class="font-bold text-gray-900">{{ c.newPrice }}</td>
                    </tr>
                  }
                </tbody>
              </table>
              <div class="flex gap-2">
                <button type="button" (click)="savePrices()" [disabled]="!keep().length" class="px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white disabled:opacity-50">Save {{ keep().length }} price change{{ keep().length === 1 ? '' : 's' }}</button>
                <button type="button" (click)="close()" class="px-4 py-2 rounded-xl text-sm font-bold text-gray-700">Cancel</button>
              </div>
            }
          }
        </div>
      }

      @if (mode() === 'about' && about() !== null) {
        <div class="mt-4 border border-gray-200 rounded-xl p-4 space-y-3">
          <h3 class="font-bold text-gray-900">Preview: About section</h3>
          <div class="grid md:grid-cols-2 gap-3">
            <div><p class="text-xs font-semibold text-gray-700 mb-1">Now</p><p class="text-sm text-gray-700 whitespace-pre-line bg-gray-50 rounded-lg p-3">{{ currentAbout() || '(empty)' }}</p></div>
            <div><label for="ai-about" class="text-xs font-semibold text-gray-700">New (you can edit it)</label><textarea id="ai-about" rows="8" [ngModel]="about()" (ngModelChange)="about.set($event)" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></textarea></div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" (click)="saveAbout()" class="px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white">Save new About text</button>
            <button type="button" (click)="generateAbout()" class="px-4 py-2 rounded-xl text-sm font-bold text-blue-700">Try again</button>
            <button type="button" (click)="close()" class="px-4 py-2 rounded-xl text-sm font-bold text-gray-700">Cancel</button>
          </div>
        </div>
      }
      @if (savedLink()) { <p class="mt-3 text-sm text-green-800" role="status">Saved. <a [routerLink]="savedLink()" class="font-bold underline">Open pages</a></p> }
    </section>
  `,
})
export class AiActionsComponent {
  private data = inject(DataService);
  private ai = inject(AiService);
  private toast = inject(ToastService);
  readonly season = nzSeason(new Date());
  mode = signal<Mode>(null);
  busy = signal(false);
  note = signal('');
  post = signal<{ title: string; content: string } | null>(null);
  priceAsk = '';
  changes = signal<PriceChange[] | null>(null);
  keep = signal<string[]>([]);
  about = signal<string | null>(null);
  savedLink = signal('');
  currentAbout = () => this.data.profile().description || '';

  open(m: Exclude<Mode, null>) {
    this.mode.set(m); this.note.set(''); this.savedLink.set('');
    if (m === 'post') void this.generatePost();
    if (m === 'about') void this.generateAbout();
    if (m === 'prices') { this.changes.set(null); this.keep.set([]); }
  }
  close() { this.mode.set(null); this.post.set(null); this.about.set(null); this.changes.set(null); this.note.set(''); }

  async generatePost() {
    const p = this.data.profile(); const services = this.data.services();
    this.busy.set(true); this.post.set(null);
    const { prompt, system } = seasonalPostPrompt(p, services, this.season);
    const draft = parsePostResponse(await this.ai.generateText(prompt, system));
    this.post.set(draft || templateSeasonalPost(p, services, this.season));
    this.note.set(draft ? 'Written by AI. Check the details before saving.' : 'AI isn\'t available on your plan right now, so this is a ready-made template. Edit it to suit.');
    this.busy.set(false);
  }

  savePost(publish: boolean) {
    const p = this.post(); if (!p || !p.title.trim()) return;
    const pages = this.data.getPages();
    let slug = slugify(p.title); let i = 2;
    while (pages.some(x => x.slug === slug)) slug = `${slugify(p.title)}-${i++}`;
    const now = new Date().toISOString();
    const page: ContentPage = { id: `page-${Date.now().toString(36)}`, title: p.title.trim(), slug, content: p.content, published: publish, createdAt: now, updatedAt: now };
    this.data.setPages([...pages, page]);
    this.toast.success(publish ? 'Post published.' : 'Saved as a draft page.');
    this.close(); this.savedLink.set('/admin/pages');
  }

  async previewPrices() {
    const services = this.data.services();
    this.busy.set(true); this.changes.set(null);
    let changes = deterministicPriceChanges(this.priceAsk, services);
    if (changes) this.note.set('Calculated exactly from your instruction.');
    else {
      const { prompt, system } = priceUpdatePrompt(this.priceAsk, services);
      const text = await this.ai.generateText(prompt, system);
      changes = parsePriceChanges(text, services);
      this.note.set(text === null ? 'AI isn\'t available right now. Percentage changes ("raise all prices by 5%") still work without it.' : 'Suggested by AI. Check each one.');
    }
    this.changes.set(changes); this.keep.set(changes.map(c => c.serviceId));
    this.busy.set(false);
  }

  toggleKeep(id: string) { this.keep.update(k => (k.includes(id) ? k.filter(x => x !== id) : [...k, id])); }

  savePrices() {
    const approved = (this.changes() || []).filter(c => this.keep().includes(c.serviceId));
    if (!approved.length) return;
    this.data.setServices(applyPriceChanges(this.data.services(), approved));
    this.toast.success(`Updated ${approved.length} price${approved.length === 1 ? '' : 's'}.`);
    this.close();
  }

  async generateAbout() {
    const p = this.data.profile(); const services = this.data.services();
    this.busy.set(true); this.about.set(null);
    const { prompt, system } = aboutPrompt(p, services);
    const text = cleanAbout(await this.ai.generateText(prompt, system));
    this.about.set(text || templateAbout(p, services));
    this.note.set(text ? 'Written by AI. Check it sounds like you.' : 'AI isn\'t available on your plan right now, so this is a ready-made template. Edit it to suit.');
    this.busy.set(false);
  }

  saveAbout() {
    const text = (this.about() || '').trim(); if (!text) return;
    this.data.updateProfile({ description: text });
    this.toast.success('About section updated.');
    this.close();
  }
}
