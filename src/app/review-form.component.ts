import { Component, inject, input, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

/** Public "Leave a review" form. Reviews go to the owner for approval first. */
@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section id="leave-review" class="py-12" aria-labelledby="rv-title">
      <div class="max-w-2xl mx-auto px-6">
        @if (!open() && !done()) {
          <button type="button" (click)="open.set(true)" class="text-sm font-bold text-gray-900 underline">Leave a review</button>
        }
        @if (done()) {
          <p class="rounded-xl bg-green-50 border border-green-200 p-4 text-green-900 font-semibold" role="status">Thanks! Your review will appear once the business approves it.</p>
        } @else if (open()) {
          <form class="rounded-2xl bg-white border border-gray-200 p-6 space-y-4" (ngSubmit)="submit()">
            <h2 id="rv-title" class="text-xl font-bold text-gray-900">Leave a review</h2>
            <fieldset>
              <legend class="text-sm font-bold text-gray-900 mb-1">Your rating</legend>
              <div class="flex gap-1">
                @for (n of [1,2,3,4,5]; track n) {
                  <label class="cursor-pointer text-3xl leading-none" [class.text-yellow-500]="n <= rating" [class.text-gray-400]="n > rating">
                    <input type="radio" name="rating" class="sr-only" [value]="n" [(ngModel)]="rating" [attr.aria-label]="n + ' star' + (n > 1 ? 's' : '')">★
                  </label>
                }
              </div>
            </fieldset>
            <div><label for="rv-author" class="block text-sm font-bold text-gray-900 mb-1">Your name</label><input id="rv-author" name="author" [(ngModel)]="author" autocomplete="name" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"></div>
            <div><label for="rv-text" class="block text-sm font-bold text-gray-900 mb-1">Your review</label><textarea id="rv-text" name="text" rows="4" [(ngModel)]="text" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"></textarea></div>
            <input type="text" name="website" [(ngModel)]="honeypot" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
            @if (error()) { <p class="text-sm font-semibold text-red-700" role="alert">{{ error() }}</p> }
            <button type="submit" [disabled]="sending()" class="bg-gray-900 text-white font-bold px-5 py-3 rounded-xl disabled:opacity-60">{{ sending() ? 'Sending…' : 'Send review' }}</button>
          </form>
        }
      </div>
    </section>
  `,
})
export class ReviewFormComponent {
  siteId = input.required<string>();
  private http = inject(HttpClient);
  open = signal(false);
  done = signal(false);
  sending = signal(false);
  error = signal('');
  rating = 0; author = ''; text = ''; honeypot = '';

  async submit() {
    this.error.set('');
    if (!this.rating || !this.author.trim() || this.text.trim().length < 5) { this.error.set('Please pick a star rating and add your name and a few words.'); return; }
    this.sending.set(true);
    try {
      await firstValueFrom(this.http.post(`/api/site/${encodeURIComponent(this.siteId())}/review`, { rating: this.rating, author: this.author, text: this.text, website: this.honeypot }));
      this.done.set(true);
    } catch (e) {
      this.error.set((e as { error?: { error?: string } })?.error?.error || 'Sorry, your review could not be sent. Please try again.');
    } finally { this.sending.set(false); }
  }
}
