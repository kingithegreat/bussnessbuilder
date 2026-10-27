import { AuthService } from './auth.service';
import { changeIntent } from './change-intent';
import { SiteChangesService } from './site-changes.service';
import { SiteChangeHistoryComponent } from './site-change-history.component';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from './data.service';
import { AiService } from './ai.service';
import { ToastService } from './toast.service';
import { ContentPage } from './types';
import {
  nzSeason, seasonalPostPrompt, parsePostResponse, templateSeasonalPost, slugify,
  deterministicPriceChanges, priceUpdatePrompt, parsePriceChanges, PriceChange,
  aboutPrompt, cleanAbout, templateAbout,
} from './ai-updates';

type Mode = 'post' | 'prices' | 'about' | null;

/** Dashboard: one-click AI updates. Nothing is saved until the owner approves the preview. */
@Component({
  selector: 'app-ai-actions',
  standalone: true,
  imports: [FormsModule, RouterLink, SiteChangeHistoryComponent],
  template: `
    <section class="bg-white border border-gray-200 rounded-2xl p-5" aria-labelledby="ai-actions-title">
      <h2 id="ai-actions-title" class="text-lg font-semibold text-gray-900">Quick updates with AI</h2>
      <p class="text-sm text-gray-600 mb-4">You'll always see a preview first. Nothing changes on your site until you press Save.</p>
      <form (ngSubmit)="runCommand()" class="mb-4 space-y-2">
        <label for="site-change-request" class="block text-sm font-semibold text-gray-900">What would you like to change?</label>
        <div class="flex flex-col sm:flex-row gap-2"><input id="site-change-request" name="siteRequest" [(ngModel)]="command" maxlength="500" [disabled]="busy() || changesService.busy() || !!changesService.pending()"
          placeholder="Raise all prices by 5%, refresh my About, or set button text to Book now" class="flex-1 rounded-xl border border-gray-300 p-3 text-sm">
          <button type="submit" [disabled]="busy() || changesService.busy() || !!changesService.pending() || !command.trim()" class="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-sm text-white disabled:opacity-50">Prepare change</button></div>
        <p class="text-xs text-gray-600">Supports About text, prices, seasonal posts, and exact headline or button text. Copy and price changes have saved approval, history and undo.</p>
      </form>
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
                <button type="button" (click)="savePrices()" [disabled]="!keep().length" class="px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white disabled:opacity-50">Review {{ keep().length }} price change{{ keep().length === 1 ? '' : 's' }}</button>
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
            <button type="button" (click)="saveAbout()" class="px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white">Review and save proposal</button>
            <button type="button" (click)="generateAbout()" class="px-4 py-2 rounded-xl text-sm font-bold text-blue-700">Try again</button>
            <button type="button" (click)="close()" class="px-4 py-2 rounded-xl text-sm font-bold text-gray-700">Cancel</button>
          </div>
        </div>
      }
      <app-site-change-history></app-site-change-history>
      @if (savedLink()) { <p class="mt-3 text-sm text-green-800" role="status">Saved. <a [routerLink]="savedLink()" class="font-bold underline">Open pages</a></p> }
    </section>
  `,
})
export class AiActionsComponent {
  readonly changesService = inject(SiteChangesService);
  private data = inject(DataService);
  private aboutBefore = '';
  private auth = inject(AuthService);
  private generation = 0;
  private ownerUid = '';
  command = '';
  constructor() {
    effect(() => {
      const uid = this.auth.currentUser()?.uid || '';
      if (uid !== this.ownerUid) { this.ownerUid = uid; this.close(); this.busy.set(false); }
    });
  }
  async runCommand(): Promise<void> {
    if (this.busy() || this.changesService.busy() || this.changesService.pending()) return;
    const intent = changeIntent(this.command);
    if (intent.kind === 'prices') { this.open('prices'); this.priceAsk = this.command; await this.previewPrices(); }
    else if (intent.kind === 'about') { this.mode.set('about'); await this.generateAbout(this.command); }
    else if (intent.kind === 'post') this.open('post');
    else if (intent.kind === 'copy') {
      await this.changesService.prepare(this.command, [{ target: 'profile', field: intent.field, before: this.data.profile()[intent.field], after: intent.value }]);
    } else this.note.set('Try refreshing your About section, updating prices, writing a seasonal post, or “set button text to Book now”. Use Website for other edits.');
  }
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
    if (this.busy() || this.changesService.busy() || this.changesService.pending()) return;
    this.mode.set(m); this.note.set(''); this.savedLink.set('');
    if (m === 'post') void this.generatePost();
    if (m === 'about') void this.generateAbout();
    if (m === 'prices') { this.changes.set(null); this.keep.set([]); }
  }
  close() { this.generation++; this.busy.set(false); this.mode.set(null); this.post.set(null); this.about.set(null); this.changes.set(null); this.note.set(''); }

  async generatePost() {
    const p = this.data.profile(); const services = this.data.services();
    const version = ++this.generation;
    this.busy.set(true); this.post.set(null);
    const { prompt, system } = seasonalPostPrompt(p, services, this.season);
    const draft = parsePostResponse(await this.ai.generateText(prompt, system));
    if (version !== this.generation) return;
    this.post.set(draft || templateSeasonalPost(p, services, this.season));
    this.note.set(draft ? 'Written by AI. Check the details before saving.' : 'AI isn\'t available on your plan right now, so this is a ready-made template. Edit it to suit.');
    this.busy.set(false);
  }

  savePost(publish: boolean) {
    const p = this.post(); if (!p || !p.title.trim() || !p.content.trim() || (publish && /\[[^\]]+\]/.test(p.content))) return;
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
    const version = ++this.generation;
    this.busy.set(true); this.changes.set(null);
    let changes = deterministicPriceChanges(this.priceAsk, services);
    if (changes) this.note.set('Calculated exactly from your instruction.');
    else {
      const { prompt, system } = priceUpdatePrompt(this.priceAsk, services);
      const text = await this.ai.generateText(prompt, system);
      if (version !== this.generation) return;
      changes = parsePriceChanges(text, services);
      this.note.set(text === null ? 'AI isn\'t available right now. Percentage changes ("raise all prices by 5%") still work without it.' : 'Suggested by AI. Check each one.');
    }
    if (version !== this.generation) return;
    this.changes.set(changes); this.keep.set(changes.map(c => c.serviceId));
    this.busy.set(false);
  }

  toggleKeep(id: string) { this.keep.update(k => (k.includes(id) ? k.filter(x => x !== id) : [...k, id])); }

  async savePrices() {
    const approved = (this.changes() || []).filter(c => this.keep().includes(c.serviceId));
    if (!approved.length) return;
    const ready = await this.changesService.prepare(this.priceAsk.trim(), approved.map(c => ({ target: 'service', field: 'price', serviceId: c.serviceId, before: c.oldPrice, after: c.newPrice })));
    if (ready) { this.toast.success('Proposal saved. Review and approve it in Website changes below.'); this.close(); }
  }

  async generateAbout(instruction = '') {
    const p = this.data.profile(); const services = this.data.services();
    this.aboutBefore = p.description;
    const version = ++this.generation;
    this.busy.set(true); this.about.set(null);
    const { prompt, system } = aboutPrompt(p, services);
    const text = cleanAbout(await this.ai.generateText(`${prompt}\nOwner request: ${instruction.slice(0, 500)}`, system));
    if (version !== this.generation) return;
    this.about.set(text || templateAbout(p, services));
    this.note.set(text ? 'Written by AI. Check it sounds like you.' : 'AI isn\'t available on your plan right now, so this is a ready-made template. Edit it to suit.');
    this.busy.set(false);
  }

  async saveAbout() {
    const text = (this.about() || '').trim(); if (!text) return;
    const ready = await this.changesService.prepare('Refresh my About section', [{ target: 'profile', field: 'description', before: this.aboutBefore, after: text }]);
    if (ready) { this.toast.success('Proposal saved. Review and approve it in Website changes below.'); this.close(); }
  }
}
