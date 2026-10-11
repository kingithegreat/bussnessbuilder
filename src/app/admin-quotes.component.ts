import { Component, inject, signal, computed, OnInit, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OwnerApiService } from './owner-api.service';
import { DataService } from './data.service';
import { Quote, QuoteStatus, quoteTotals, MAX_QUOTE_LINES } from './quote-rules';
import { quotePdf } from './quote-pdf';
import { pdfBytes } from './pdf-lite';
import { formatMoney, SiteCurrency } from './money';

type Draft = Omit<Quote, 'id' | 'number' | 'status' | 'createdAt' | 'updatedAt'> & { id?: string; number?: string; status?: QuoteStatus };

/** Quotes & invoices: line items, NZ GST 15%, PDF download, email, status. */
@Component({
  selector: 'app-admin-quotes',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="max-w-5xl mx-auto space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-gray-900">Quotes &amp; invoices</h1>
          <p class="text-sm text-gray-600 mt-1">Build a quote or invoice, download the PDF or email it, and track whether it's accepted.</p>
        </div>
        <div class="flex gap-2">
          <button type="button" (click)="startNew('quote')" class="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-sm">New quote</button>
          <button type="button" (click)="startNew('invoice')" class="bg-gray-900 text-white font-bold px-4 py-2 rounded-xl text-sm">New invoice</button>
        </div>
      </div>

      @if (draft(); as d) {
        <form class="bg-white border border-gray-200 rounded-2xl p-5 space-y-5" (ngSubmit)="save()">
          <h2 class="font-bold text-gray-900">{{ d.number ? d.number : (d.kind === 'invoice' ? 'New invoice' : 'New quote') }}</h2>
          <div class="grid sm:grid-cols-2 gap-4">
            <div><label for="q-name" class="text-xs font-semibold text-gray-700">Customer name</label><input id="q-name" name="cn" [(ngModel)]="d.customerName" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></div>
            <div><label for="q-email" class="text-xs font-semibold text-gray-700">Customer email</label><input id="q-email" name="ce" type="email" [(ngModel)]="d.customerEmail" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></div>
            <div><label for="q-issue" class="text-xs font-semibold text-gray-700">Date</label><input id="q-issue" name="issue" type="date" [(ngModel)]="d.issueDate" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></div>
            <div><label for="q-due" class="text-xs font-semibold text-gray-700">{{ d.kind === 'invoice' ? 'Due date' : 'Valid until' }}</label><input id="q-due" name="due" type="date" [(ngModel)]="d.dueDate" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></div>
          </div>
          <fieldset>
            <legend class="font-bold text-gray-900 text-sm mb-2">Line items</legend>
            @for (l of d.lines; track $index; let i = $index) {
              <div class="grid grid-cols-12 gap-2 mb-2 items-end">
                <div class="col-span-12 sm:col-span-6"><label [for]="'ql-d' + i" class="text-xs text-gray-700">Description</label><input [id]="'ql-d' + i" [name]="'qld' + i" [(ngModel)]="l.description" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></div>
                <div class="col-span-3 sm:col-span-2"><label [for]="'ql-q' + i" class="text-xs text-gray-700">Qty</label><input [id]="'ql-q' + i" [name]="'qlq' + i" type="number" min="0" step="any" [(ngModel)]="l.quantity" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></div>
                <div class="col-span-5 sm:col-span-2"><label [for]="'ql-p' + i" class="text-xs text-gray-700">Unit price</label><input [id]="'ql-p' + i" [name]="'qlp' + i" type="number" step="0.01" [(ngModel)]="l.unitPrice" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></div>
                <p class="col-span-3 sm:col-span-1 text-sm text-gray-900 py-2 text-right">{{ money((l.quantity || 0) * (l.unitPrice || 0)) }}</p>
                <button type="button" (click)="d.lines.splice(i, 1)" class="col-span-1 py-2 text-red-700 font-bold" [attr.aria-label]="'Remove line ' + (i + 1)">✕</button>
              </div>
            }
            @if (d.lines.length < maxLines) {
              <button type="button" (click)="d.lines.push({ description: '', quantity: 1, unitPrice: 0 })" class="text-sm font-bold text-blue-700">+ Add line</button>
            } @else {
              <p class="text-xs text-gray-700">Up to {{ maxLines }} lines per quote. Group smaller items together.</p>
            }
          </fieldset>
          <div class="grid sm:grid-cols-2 gap-4">
            <div [hidden]="d.currency !== 'NZD'">
              <label for="q-gst" class="text-xs font-semibold text-gray-700">GST</label>
              <select id="q-gst" name="gst" [(ngModel)]="d.gstMode" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="exclusive">Prices exclude GST — add 15%</option>
                <option value="inclusive">Prices include GST (15%)</option>
                <option value="none">No GST (not GST-registered)</option>
              </select>
            </div>
            <div><label for="q-notes" class="text-xs font-semibold text-gray-700">Notes / payment details</label><textarea id="q-notes" name="notes" rows="2" [(ngModel)]="d.notes" placeholder="e.g. Bank account 12-3456-7890123-00, ref Q-0001" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></textarea></div>
          </div>
          <dl class="ml-auto max-w-xs text-sm space-y-1">
            @if (d.gstMode !== 'none') {
              <div class="flex justify-between"><dt class="text-gray-700">Subtotal (excl. GST)</dt><dd>{{ money(totals().subtotal) }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-700">GST 15%</dt><dd>{{ money(totals().gst) }}</dd></div>
            }
            <div class="flex justify-between font-bold text-gray-900"><dt>Total{{ d.gstMode !== 'none' ? ' (incl. GST)' : '' }}</dt><dd>{{ money(totals().total) }}</dd></div>
          </dl>
          @if (message()) { <p class="text-sm font-semibold" [class.text-red-700]="isError()" [class.text-green-800]="!isError()" role="status">{{ message() }}</p> }
          <div class="flex flex-wrap gap-2">
            <button type="submit" [disabled]="busy()" class="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-60">Save</button>
            <button type="button" (click)="download(d)" class="bg-gray-100 text-gray-900 font-bold px-4 py-2 rounded-xl text-sm">Download PDF</button>
            @if (d.id) { <button type="button" (click)="email(d)" [disabled]="busy()" class="bg-gray-100 text-gray-900 font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-60">Email to customer</button> }
            <button type="button" (click)="draft.set(null)" class="text-sm font-bold text-gray-700 px-3">Close</button>
          </div>
        </form>
      }

      <section class="bg-white border border-gray-200 rounded-2xl overflow-hidden" aria-label="Your quotes and invoices">
        @if (!quotes().length) {
          <p class="p-6 text-sm text-gray-600">No quotes or invoices yet. Start one with the buttons above.</p>
        } @else {
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-left text-gray-700"><tr><th class="p-3">No.</th><th class="p-3">Customer</th><th class="p-3 hidden sm:table-cell">Date</th><th class="p-3 text-right">Total</th><th class="p-3">Status</th><th class="p-3"><span class="sr-only">Actions</span></th></tr></thead>
            <tbody>
              @for (q of quotes(); track q.id) {
                <tr class="border-t border-gray-100">
                  <td class="p-3 font-mono">{{ q.number }}</td>
                  <td class="p-3">{{ q.customerName || '—' }}</td>
                  <td class="p-3 hidden sm:table-cell">{{ q.issueDate }}</td>
                  <td class="p-3 text-right">{{ totalOf(q) }}</td>
                  <td class="p-3">
                    <label class="sr-only" [for]="'qs-' + q.id">Status of {{ q.number }}</label>
                    <select [id]="'qs-' + q.id" [ngModel]="q.status" (ngModelChange)="setStatus(q, $event)" class="px-2 py-1 border border-gray-200 rounded-lg text-xs">
                      <option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">{{ q.kind === 'invoice' ? 'Paid / accepted' : 'Accepted' }}</option>
                    </select>
                  </td>
                  <td class="p-3 text-right whitespace-nowrap">
                    <button type="button" (click)="edit(q)" class="text-blue-700 font-bold text-xs px-2">Open</button>
                    <button type="button" (click)="download(q)" class="text-blue-700 font-bold text-xs px-2">PDF</button>
                    <button type="button" (click)="remove(q)" class="text-red-700 font-bold text-xs px-2" [attr.aria-label]="'Delete ' + q.number">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    </div>
  `,
})
export class AdminQuotesComponent implements OnInit {
  private api = inject(OwnerApiService);
  private data = inject(DataService);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);
  readonly maxLines = MAX_QUOTE_LINES;
  quotes = signal<Quote[]>([]);
  draft = signal<Draft | null>(null);
  busy = signal(false);
  message = signal('');
  isError = signal(false);
  private tick = signal(0);
  totals = computed(() => { this.tick(); const d = this.draft(); return d ? quoteTotals(d) : { subtotal: 0, gst: 0, total: 0 }; });

  private currency(): SiteCurrency {
    const c = this.data.profile().currency;
    return (c || 'NZD') as SiteCurrency;
  }
  money(n: number) { this.tick(); return formatMoney(n, this.draft()?.currency || this.currency()); }
  totalOf(q: Quote) { return formatMoney(quoteTotals(q).total, q.currency); }

  async ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    // Recompute totals as the owner types (ngModel mutates the draft in place).
    const timer = setInterval(() => this.tick.update(n => n + 1), 400);
    this.destroyRef.onDestroy(() => clearInterval(timer));
    try { this.quotes.set((await this.api.get<{ quotes: Quote[] }>('/api/quotes')).quotes); } catch { this.flash("Couldn't load your quotes.", true); }
  }

  private flash(msg: string, error = false) { this.message.set(msg); this.isError.set(error); }

  startNew(kind: 'quote' | 'invoice') {
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + (kind === 'invoice' ? 20 : 30) * 86400_000).toISOString().slice(0, 10);
    const p = this.data.profile();
    this.message.set('');
    this.draft.set({ kind, customerName: '', customerEmail: '', lines: [{ description: '', quantity: 1, unitPrice: 0 }],
      gstMode: this.currency() !== 'NZD' ? 'none' : p.pricesIncludeGst !== false ? 'inclusive' : 'exclusive', currency: this.currency(), notes: '', issueDate: today, dueDate: due });
  }

  edit(q: Quote) { this.message.set(''); this.draft.set(JSON.parse(JSON.stringify(q))); }

  async save(): Promise<Quote | null> {
    const d = this.draft(); if (!d) return null;
    this.busy.set(true);
    try {
      const { quote } = await this.api.send<{ quote: Quote }>('POST', '/api/quotes/save', { quote: d as unknown as Record<string, unknown> });
      this.quotes.update(list => [quote, ...list.filter(x => x.id !== quote.id)]);
      this.draft.set(JSON.parse(JSON.stringify(quote)));
      this.flash(`Saved ${quote.number}.`);
      return quote;
    } catch (e) { this.flash(OwnerApiService.message(e), true); return null; } finally { this.busy.set(false); }
  }

  download(q: Draft | Quote) {
    const p = this.data.profile();
    const full = { id: '', number: q.number || 'DRAFT', status: q.status || 'draft', createdAt: '', updatedAt: '', ...q } as Quote;
    const pdf = quotePdf(full, { name: p.name, email: p.email, phone: p.phone, address: p.address, gstNumber: p.gstNumber });
    const url = URL.createObjectURL(new Blob([pdfBytes(pdf) as BlobPart], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${full.number}.pdf`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async email(d: Draft) {
    const saved = await this.save(); if (!saved) return;
    this.busy.set(true);
    try {
      const res = await this.api.send<{ sent: boolean; reason?: string; quote?: Quote }>('POST', `/api/quotes/${saved.id}/email`);
      if (res.sent && res.quote) {
        this.quotes.update(list => list.map(x => (x.id === res.quote!.id ? res.quote! : x)));
        this.draft.set(JSON.parse(JSON.stringify(res.quote)));
        this.flash(`Emailed to ${d.customerEmail}.`);
      } else if (res.reason === 'not_configured') {
        this.flash('Email sending is switched off on this server. Download the PDF and send it yourself, then set the status to Sent.', true);
      } else {
        this.flash("The email couldn't be sent. Check the address, or download the PDF instead.", true);
      }
    } catch (e) { this.flash(OwnerApiService.message(e), true); } finally { this.busy.set(false); }
  }

  async setStatus(q: Quote, status: QuoteStatus) {
    try {
      const { quote } = await this.api.send<{ quote: Quote }>('POST', `/api/quotes/${q.id}/status`, { status });
      this.quotes.update(list => list.map(x => (x.id === quote.id ? quote : x)));
    } catch (e) { this.flash(OwnerApiService.message(e), true); }
  }

  async remove(q: Quote) {
    if (!confirm(`Delete ${q.number}? This can't be undone.`)) return;
    try {
      await this.api.send('POST', `/api/quotes/${q.id}/delete`);
      this.quotes.update(list => list.filter(x => x.id !== q.id));
      if (this.draft()?.id === q.id) this.draft.set(null);
    } catch (e) { this.flash(OwnerApiService.message(e), true); }
  }
}
