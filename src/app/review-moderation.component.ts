import { Component, inject, output, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { OwnerApiService } from './owner-api.service';
import { Testimonial } from './types';

interface PendingReview { id: string; author: string; rating: number; text: string; role?: string; date: string }

/** Reviews waiting for approval (left by customers on the public site). */
@Component({
  selector: 'app-review-moderation',
  standalone: true,
  template: `
    <section class="bg-white border border-gray-200 rounded-xl p-4 mb-4" aria-labelledby="rev-mod-title">
      <h3 id="rev-mod-title" class="text-sm font-bold text-gray-900">Reviews waiting for approval @if (pending().length) {<span class="ml-1 text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">{{ pending().length }}</span>}</h3>
      <p class="text-xs text-gray-600 mt-1 mb-2">Customers can leave a review on your site. Nothing shows publicly until you approve it.</p>
      @if (!pending().length) { <p class="text-sm text-gray-600">No reviews waiting.</p> }
      @for (r of pending(); track r.id) {
        <div class="border-t border-gray-100 py-3">
          <p class="text-sm font-semibold text-gray-900"><span aria-label="{{ r.rating }} out of 5 stars">{{ stars(r.rating) }}</span> — {{ r.author }}{{ r.role ? ' (' + r.role + ')' : '' }}</p>
          <p class="text-sm text-gray-700 mt-1">"{{ r.text }}"</p>
          <div class="flex gap-2 mt-2">
            <button type="button" (click)="act(r, 'approve')" [disabled]="busy() === r.id" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-700 text-white disabled:opacity-50">Approve &amp; publish</button>
            <button type="button" (click)="act(r, 'reject')" [disabled]="busy() === r.id" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-900 disabled:opacity-50">Reject</button>
          </div>
        </div>
      }
      @if (error()) { <p class="text-xs text-red-700" role="alert">{{ error() }}</p> }
    </section>
  `,
})
export class ReviewModerationComponent implements OnInit {
  approved = output<Testimonial>();
  private api = inject(OwnerApiService);
  private platformId = inject(PLATFORM_ID);
  pending = signal<PendingReview[]>([]);
  busy = signal('');
  error = signal('');
  stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

  async ngOnInit() {
    if (!isPlatformBrowser(this.platformId) || !this.api.uid()) return;
    try { this.pending.set((await this.api.get<{ pending: PendingReview[] }>('/api/reviews')).pending); } catch { /* panel stays empty */ }
  }

  async act(r: PendingReview, action: 'approve' | 'reject') {
    this.busy.set(r.id); this.error.set('');
    try {
      const res = await this.api.send<{ testimonial?: Testimonial }>('POST', `/api/reviews/${r.id}/${action}`);
      this.pending.update(list => list.filter(x => x.id !== r.id));
      if (action === 'approve' && res.testimonial) this.approved.emit(res.testimonial);
    } catch (e) { this.error.set(OwnerApiService.message(e)); } finally { this.busy.set(''); }
  }
}
