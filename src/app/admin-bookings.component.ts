import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OwnerApiService } from './owner-api.service';
import { BookingRequestsComponent } from './booking-requests.component';
import { BookingSettings, WEEKDAYS, WEEKDAY_LABELS, Weekday, defaultBookingSettings } from './booking-rules';

/** Owner page: turn bookings on, set services, weekly hours and days off. */
@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [FormsModule, BookingRequestsComponent],
  template: `
    <div class="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 class="text-2xl font-semibold text-gray-900">Online bookings</h1>
        <p class="text-sm text-gray-600 mt-1">Let customers book a time on your site. You accept or decline each request.</p>
      </div>
      <app-booking-requests></app-booking-requests>
      @if (s(); as st) {
        <form class="bg-white border border-gray-200 rounded-2xl p-5 space-y-6" (ngSubmit)="save()">
          <label class="flex items-center gap-3 text-sm font-bold text-gray-900">
            <input type="checkbox" name="enabled" [(ngModel)]="st.enabled" class="w-5 h-5"> Show a booking form on my site
          </label>

          <fieldset class="space-y-3">
            <legend class="font-bold text-gray-900">Services people can book</legend>
            @for (svc of st.services; track $index; let i = $index) {
              <div class="grid grid-cols-12 gap-2 items-end">
                <div class="col-span-12 sm:col-span-6"><label [for]="'svc-n-' + i" class="text-xs font-semibold text-gray-700">Name</label><input [id]="'svc-n-' + i" [name]="'svcn' + i" [(ngModel)]="svc.name" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></div>
                <div class="col-span-5 sm:col-span-2"><label [for]="'svc-d-' + i" class="text-xs font-semibold text-gray-700">Minutes</label><input [id]="'svc-d-' + i" [name]="'svcd' + i" type="number" min="5" step="5" [(ngModel)]="svc.durationMin" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></div>
                <div class="col-span-5 sm:col-span-3"><label [for]="'svc-p-' + i" class="text-xs font-semibold text-gray-700">Price (optional)</label><input [id]="'svc-p-' + i" [name]="'svcp' + i" [(ngModel)]="svc.price" placeholder="e.g. $45" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></div>
                <button type="button" (click)="st.services.splice(i, 1)" class="col-span-2 sm:col-span-1 py-2 text-sm font-bold text-red-700" [attr.aria-label]="'Remove ' + (svc.name || 'service')">✕</button>
              </div>
            }
            <button type="button" (click)="st.services.push({ id: 'svc-' + (st.services.length + 1) + '-' + now(), name: '', durationMin: 60 })" class="text-sm font-bold text-blue-700">+ Add a service</button>
          </fieldset>

          <fieldset>
            <legend class="font-bold text-gray-900 mb-2">Weekly availability</legend>
            <div class="space-y-2">
              @for (day of days; track day) {
                <div class="flex flex-wrap items-center gap-2">
                  <label class="w-32 flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <input type="checkbox" [name]="'open-' + day" [ngModel]="st.weekly[day].length > 0" (ngModelChange)="toggleDay(day, $event)"> {{ labels[day] }}
                  </label>
                  @if (st.weekly[day].length) {
                    <label class="sr-only" [for]="'from-' + day">{{ labels[day] }} from</label>
                    <input [id]="'from-' + day" [name]="'from-' + day" type="time" [(ngModel)]="st.weekly[day][0].start" class="px-2 py-1.5 border border-gray-200 rounded-lg text-sm">
                    <span class="text-sm text-gray-600">to</span>
                    <label class="sr-only" [for]="'to-' + day">{{ labels[day] }} to</label>
                    <input [id]="'to-' + day" [name]="'to-' + day" type="time" [(ngModel)]="st.weekly[day][0].end" class="px-2 py-1.5 border border-gray-200 rounded-lg text-sm">
                  } @else { <span class="text-sm text-gray-600">Closed</span> }
                </div>
              }
            </div>
          </fieldset>

          <div class="grid sm:grid-cols-3 gap-4">
            <div><label for="bk-step" class="text-xs font-semibold text-gray-700">Start times every (min)</label><input id="bk-step" name="step" type="number" min="5" step="5" [(ngModel)]="st.slotStepMin" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></div>
            <div><label for="bk-lead" class="text-xs font-semibold text-gray-700">Minimum notice (hours)</label><input id="bk-lead" name="lead" type="number" min="0" [(ngModel)]="st.leadTimeHours" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></div>
            <div><label for="bk-ahead" class="text-xs font-semibold text-gray-700">Book up to (days ahead)</label><input id="bk-ahead" name="ahead" type="number" min="1" [(ngModel)]="st.maxDaysAhead" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></div>
          </div>

          <fieldset>
            <legend class="font-bold text-gray-900 mb-2">Days off (blackout dates)</legend>
            <div class="flex flex-wrap gap-2 mb-2">
              @for (d of st.blackouts; track d) {
                <span class="inline-flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1 text-sm">{{ d }}
                  <button type="button" (click)="removeBlackout(d)" [attr.aria-label]="'Remove ' + d" class="font-bold text-gray-700">✕</button></span>
              }
              @if (!st.blackouts.length) { <span class="text-sm text-gray-600">None</span> }
            </div>
            <label for="bk-off" class="sr-only">Add a day off</label>
            <input id="bk-off" name="off" type="date" [(ngModel)]="newBlackout" class="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <button type="button" (click)="addBlackout()" class="ml-2 text-sm font-bold text-blue-700">Add day off</button>
          </fieldset>

          @if (error()) { <p class="text-sm font-semibold text-red-700" role="alert">{{ error() }}</p> }
          @if (saved()) { <p class="text-sm font-semibold text-green-800" role="status">Saved.</p> }
          <button type="submit" [disabled]="saving()" class="bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl disabled:opacity-60">{{ saving() ? 'Saving…' : 'Save booking settings' }}</button>
        </form>
      } @else {
        <p class="text-sm text-gray-600">Loading…</p>
      }
    </div>
  `,
})
export class AdminBookingsComponent implements OnInit {
  private api = inject(OwnerApiService);
  private platformId = inject(PLATFORM_ID);
  readonly days = WEEKDAYS;
  readonly labels = WEEKDAY_LABELS;
  s = signal<BookingSettings | null>(null);
  saving = signal(false);
  saved = signal(false);
  error = signal('');
  newBlackout = '';
  now = () => Date.now().toString(36);

  async ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const res = await this.api.get<{ settings: BookingSettings }>('/api/bookings');
      this.s.set(res.settings);
    } catch {
      this.s.set(defaultBookingSettings());
      this.error.set("Couldn't load your booking settings — showing defaults.");
    }
  }

  toggleDay(day: Weekday, open: boolean) {
    const st = this.s(); if (!st) return;
    st.weekly[day] = open ? [{ start: '09:00', end: '17:00' }] : [];
  }

  removeBlackout(d: string) {
    const st = this.s(); if (st) st.blackouts = st.blackouts.filter(x => x !== d);
  }

  addBlackout() {
    const st = this.s(); if (!st || !this.newBlackout) return;
    if (!st.blackouts.includes(this.newBlackout)) st.blackouts = [...st.blackouts, this.newBlackout].sort();
    this.newBlackout = '';
  }

  async save() {
    const st = this.s(); if (!st) return;
    this.error.set(''); this.saved.set(false);
    if (st.enabled && !st.services.some(x => x.name.trim())) { this.error.set('Add at least one service before turning bookings on.'); return; }
    this.saving.set(true);
    try {
      const res = await this.api.send<{ settings: BookingSettings }>('PUT', '/api/bookings/settings', { settings: st as unknown as Record<string, unknown> });
      this.s.set(res.settings);
      this.saved.set(true);
    } catch (e) {
      this.error.set(OwnerApiService.message(e));
    } finally {
      this.saving.set(false);
    }
  }
}
