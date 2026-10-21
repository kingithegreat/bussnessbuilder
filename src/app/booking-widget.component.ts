import { Component, inject, input, signal, computed, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { BookableService, formatSlot, localDate } from './booking-rules';

interface Availability { enabled: boolean; timezone?: string; services?: BookableService[]; maxDaysAhead?: number; slots?: { start: string; end: string }[] }

/** Public booking widget. Renders nothing unless the owner turned bookings on. */
@Component({
  selector: 'app-booking-widget',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (info()?.enabled) {
      <section id="book" class="py-16 md:py-20" aria-labelledby="book-title">
        <div class="max-w-3xl mx-auto px-6">
          <h2 id="book-title" class="text-2xl md:text-3xl font-black text-gray-900 mb-2">Book online</h2>
          <p class="text-gray-600 mb-6">Pick a service and a time. {{ emailOn() ? "We'll confirm by email." : "We'll be in touch to confirm." }}</p>
          @if (done(); as d) {
            <div class="rounded-2xl bg-green-50 border border-green-200 p-6" role="status">
              <p class="font-bold text-green-900">Thanks, {{ name }} — your request is in.</p>
              <p class="text-green-900 mt-1">{{ d.serviceName }}, {{ fmt(d.start) }}. {{ emailOn() ? "We'll email you to confirm." : "We'll be in touch to confirm." }}</p>
              <a [href]="d.icsUrl" download="booking.ics" class="inline-block mt-3 font-bold text-green-900 underline">Add to my calendar (.ics)</a>
            </div>
          } @else {
            <form class="rounded-2xl bg-white border border-gray-200 p-6 space-y-5" (ngSubmit)="submit()">
              <div class="grid sm:grid-cols-2 gap-4">
                <div>
                  <label for="bk-service" class="block text-sm font-bold text-gray-900 mb-1">Service</label>
                  <select id="bk-service" name="service" [(ngModel)]="serviceId" (ngModelChange)="loadSlots()" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                    @for (s of info()!.services; track s.id) {
                      <option [value]="s.id">{{ s.name }} ({{ s.durationMin }} min{{ s.price ? ', ' + s.price : '' }})</option>
                    }
                  </select>
                </div>
                <div>
                  <label for="bk-date" class="block text-sm font-bold text-gray-900 mb-1">Date</label>
                  <input id="bk-date" name="date" type="date" [(ngModel)]="date" (ngModelChange)="loadSlots()" [min]="minDate" [max]="maxDate()" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                </div>
              </div>
              <fieldset>
                <legend class="block text-sm font-bold text-gray-900 mb-2">Time</legend>
                @if (loadingSlots()) {
                  <p class="text-sm text-gray-600">Checking availability…</p>
                } @else if (!date) {
                  <p class="text-sm text-gray-600">Choose a date to see free times.</p>
                } @else if (slots().length === 0) {
                  <p class="text-sm text-gray-700">No free times that day — try another date.</p>
                } @else {
                  <div class="flex flex-wrap gap-2">
                    @for (s of slots(); track s.start) {
                      <button type="button" (click)="chosen.set(s.start)" [attr.aria-pressed]="chosen() === s.start"
                        class="px-3 py-2 rounded-lg text-sm font-semibold border"
                        [class.bg-blue-600]="chosen() === s.start" [class.text-white]="chosen() === s.start" [class.border-blue-600]="chosen() === s.start"
                        [class.bg-white]="chosen() !== s.start" [class.text-gray-900]="chosen() !== s.start" [class.border-gray-300]="chosen() !== s.start">{{ time(s.start) }}</button>
                    }
                  </div>
                }
              </fieldset>
              <div class="grid sm:grid-cols-2 gap-4">
                <div><label for="bk-name" class="block text-sm font-bold text-gray-900 mb-1">Your name</label><input id="bk-name" name="name" [(ngModel)]="name" autocomplete="name" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"></div>
                <div><label for="bk-email" class="block text-sm font-bold text-gray-900 mb-1">Email</label><input id="bk-email" name="email" type="email" [(ngModel)]="email" autocomplete="email" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"></div>
                <div><label for="bk-phone" class="block text-sm font-bold text-gray-900 mb-1">Phone <span class="font-normal text-gray-600">(optional)</span></label><input id="bk-phone" name="phone" type="tel" [(ngModel)]="phone" autocomplete="tel" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"></div>
                <div><label for="bk-notes" class="block text-sm font-bold text-gray-900 mb-1">Notes <span class="font-normal text-gray-600">(optional)</span></label><input id="bk-notes" name="notes" [(ngModel)]="notes" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"></div>
              </div>
              <input type="text" name="website" [(ngModel)]="honeypot" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
              @if (error()) { <p class="text-sm font-semibold text-red-700" role="alert">{{ error() }}</p> }
              <button type="submit" [disabled]="submitting()" class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-60">{{ submitting() ? 'Sending…' : 'Request booking' }}</button>
            </form>
          }
        </div>
      </section>
    }
  `,
})
export class BookingWidgetComponent implements OnInit {
  siteId = input.required<string>();
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  info = signal<Availability | null>(null);
  slots = signal<{ start: string; end: string }[]>([]);
  loadingSlots = signal(false);
  chosen = signal('');
  submitting = signal(false);
  /** Only promise an email when the server can actually send one. */
  emailOn = signal(false);
  error = signal('');
  done = signal<{ serviceName: string; start: string; icsUrl: string } | null>(null);
  serviceId = '';
  date = '';
  name = ''; email = ''; phone = ''; notes = ''; honeypot = '';
  minDate = '';
  maxDate = computed(() => {
    const days = this.info()?.maxDaysAhead || 60;
    return localDate(new Date(Date.now() + days * 86400_000), this.tz());
  });
  private tz = () => this.info()?.timezone || 'Pacific/Auckland';

  async ngOnInit() {
    if (!isPlatformBrowser(this.platformId) || !this.siteId()) return;
    firstValueFrom(this.http.get<{ enabled?: boolean }>('/api/email-alerts/status')).then(j => this.emailOn.set(j?.enabled === true)).catch(() => undefined);
    try {
      const info = await firstValueFrom(this.http.get<Availability>(`/api/site/${encodeURIComponent(this.siteId())}/booking`));
      this.info.set(info);
      this.serviceId = info.services?.[0]?.id || '';
      this.minDate = localDate(new Date(), this.tz());
    } catch {
      this.info.set(null);
    }
  }

  fmt(iso: string) { return formatSlot(iso, this.tz()); }
  time(iso: string) { return new Intl.DateTimeFormat('en-NZ', { timeZone: this.tz(), hour: 'numeric', minute: '2-digit' }).format(new Date(iso)); }

  async loadSlots() {
    this.chosen.set('');
    if (!this.date || !this.serviceId) { this.slots.set([]); return; }
    this.loadingSlots.set(true);
    try {
      const res = await firstValueFrom(this.http.get<Availability>(`/api/site/${encodeURIComponent(this.siteId())}/booking`, { params: { date: this.date, service: this.serviceId } }));
      this.slots.set(res.slots || []);
    } catch {
      this.slots.set([]);
      this.error.set("Couldn't load times. Please try again.");
    } finally {
      this.loadingSlots.set(false);
    }
  }

  async submit() {
    this.error.set('');
    if (!this.chosen()) { this.error.set('Please pick a time.'); return; }
    if (!this.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) { this.error.set('Please enter your name and a valid email.'); return; }
    this.submitting.set(true);
    try {
      const res = await firstValueFrom(this.http.post<{ booking: { serviceName: string; start: string }; icsUrl: string }>(
        `/api/site/${encodeURIComponent(this.siteId())}/booking`,
        { serviceId: this.serviceId, start: this.chosen(), name: this.name, email: this.email, phone: this.phone, notes: this.notes, website: this.honeypot },
      ));
      this.done.set({ serviceName: res.booking.serviceName, start: res.booking.start, icsUrl: res.icsUrl });
    } catch (e) {
      const msg = (e as { error?: { error?: string } })?.error?.error;
      this.error.set(msg || 'Sorry, that booking could not be made. Please try again.');
      void this.loadSlots();
    } finally {
      this.submitting.set(false);
    }
  }
}
