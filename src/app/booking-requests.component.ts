import { Component, inject, input, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OwnerApiService } from './owner-api.service';
import { Booking, BookingSettings, buildIcs, formatSlot } from './booking-rules';

/** Booking requests list with Accept / Decline. Used in the inbox and on the Bookings page. */
@Component({
  selector: 'app-booking-requests',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (loaded() && compact() && !bookings().length) {
      <p class="text-sm text-gray-700 pb-2"><a routerLink="/admin/bookings" class="font-bold text-blue-700 hover:underline">Take bookings online →</a> Let customers pick a time on your site.</p>
    }
    @if (loaded() && (bookings().length || !compact())) {
      <section class="bg-white border border-gray-200 rounded-2xl p-5" aria-labelledby="bk-req-title">
        <div class="flex items-center justify-between mb-3">
          <h2 id="bk-req-title" class="font-bold text-gray-900">Booking requests @if (pendingCount()) {<span class="ml-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{{ pendingCount() }} new</span>}</h2>
          @if (compact()) { <a routerLink="/admin/bookings" class="text-sm font-bold text-blue-700 hover:underline">Booking settings</a> }
        </div>
        @if (!bookings().length) {
          <p class="text-sm text-gray-600">No bookings yet. When customers book on your site they'll show up here.</p>
        }
        <ul class="divide-y divide-gray-100">
          @for (b of shown(); track b.id) {
            <li class="py-3 flex flex-col sm:flex-row sm:items-center gap-2">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900">{{ b.serviceName }} · {{ fmt(b.start) }}</p>
                <p class="text-xs text-gray-600 truncate">{{ b.name }} · {{ b.email }}{{ b.phone ? ' · ' + b.phone : '' }}{{ b.notes ? ' — ' + b.notes : '' }}</p>
              </div>
              <span class="text-xs font-bold px-2 py-1 rounded-full shrink-0"
                [class.bg-amber-100]="b.status === 'pending'" [class.text-amber-900]="b.status === 'pending'"
                [class.bg-green-100]="b.status === 'accepted'" [class.text-green-900]="b.status === 'accepted'"
                [class.bg-gray-100]="b.status === 'declined'" [class.text-gray-700]="b.status === 'declined'">{{ label(b.status) }}</span>
              <div class="flex gap-2 shrink-0">
                @if (b.status !== 'accepted') {
                  <button type="button" (click)="setStatus(b, 'accepted')" [disabled]="busy() === b.id" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-700 text-white hover:bg-green-800 disabled:opacity-50">Accept<span class="sr-only"> booking for {{ b.name }}</span></button>
                }
                @if (b.status !== 'declined') {
                  <button type="button" (click)="setStatus(b, 'declined')" [disabled]="busy() === b.id" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:opacity-50">Decline<span class="sr-only"> booking for {{ b.name }}</span></button>
                }
                <a [href]="icsHref(b)" download="booking.ics" class="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 hover:bg-blue-50">.ics</a>
              </div>
            </li>
          }
        </ul>
        @if (message()) { <p class="text-xs text-gray-700 mt-2" role="status">{{ message() }}</p> }
      </section>
    }
  `,
})
export class BookingRequestsComponent implements OnInit {
  compact = input(false);
  private api = inject(OwnerApiService);
  private platformId = inject(PLATFORM_ID);
  bookings = signal<Booking[]>([]);
  settings = signal<BookingSettings | null>(null);
  loaded = signal(false);
  busy = signal('');
  message = signal('');
  pendingCount = () => this.bookings().filter(b => b.status === 'pending').length;
  shown = () => (this.compact() ? this.bookings().filter(b => b.status === 'pending').slice(0, 5) : this.bookings());

  async ngOnInit() {
    if (!isPlatformBrowser(this.platformId) || !this.api.uid()) return;
    await this.reload();
  }

  async reload() {
    try {
      const res = await this.api.get<{ settings: BookingSettings; bookings: Booking[] }>('/api/bookings');
      this.settings.set(res.settings);
      this.bookings.set([...res.bookings].sort((a, b) => a.start.localeCompare(b.start)));
    } catch {
      this.bookings.set([]);
    } finally {
      this.loaded.set(true);
    }
  }

  fmt(iso: string) { return formatSlot(iso, this.settings()?.timezone || 'Pacific/Auckland'); }
  label(s: string) { return s === 'pending' ? 'Waiting' : s === 'accepted' ? 'Accepted' : 'Declined'; }
  icsHref(b: Booking) { return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(buildIcs(b, 'Booking')); }

  async setStatus(b: Booking, status: 'accepted' | 'declined') {
    this.busy.set(b.id);
    this.message.set('');
    try {
      const res = await this.api.send<{ booking: Booking; emailSent: boolean }>('POST', `/api/bookings/${b.id}/status`, { status });
      this.bookings.update(list => list.map(x => (x.id === b.id ? res.booking : x)));
      this.message.set(res.emailSent ? 'Saved — the customer has been emailed.' : 'Saved. Email alerts are off, so let the customer know yourself.');
    } catch (e) {
      this.message.set(OwnerApiService.message(e));
    } finally {
      this.busy.set('');
    }
  }
}
