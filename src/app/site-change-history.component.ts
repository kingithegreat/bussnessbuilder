import { TooltipDirective } from './tooltip.directive';
import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { SiteChangesService } from './site-changes.service';
@Component({
  selector: 'app-site-change-history', standalone: true, imports: [DatePipe, TooltipDirective],
  template: `
    <section class="bg-white rounded-2xl border border-gray-200 p-5" aria-labelledby="change-history-title" [attr.aria-busy]="changes.busy()">
      <div class="flex items-center justify-between gap-3"><h2 id="change-history-title" class="text-lg font-semibold text-gray-900">Website changes and results</h2>
        <button type="button" (click)="changes.load()" [disabled]="changes.busy()" class="text-sm font-semibold text-blue-700 underline">Refresh history</button></div>
      @if (changes.error()) { <p role="alert" class="mt-3 text-sm text-red-800">{{ changes.error() }}</p> }
      @if (changes.pending()) { <button type="button" (click)="changes.retry()" [disabled]="changes.busy()" class="mt-3 font-semibold text-blue-700 underline">Retry unconfirmed change</button> }
      @if (changes.draft(); as draft) {
        <article class="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 class="font-semibold text-gray-900">Approve this saved proposal</h3><p class="text-sm text-gray-600">{{ draft.request }}</p>
          @for (field of draft.fields; track $index) {
            <div class="mt-3 grid gap-3 sm:grid-cols-2 text-sm"><p class="whitespace-pre-wrap break-words"><strong>Before:</strong> {{ field.before || '(blank)' }}</p><p class="whitespace-pre-wrap break-words"><strong>After:</strong> {{ field.after }}</p></div>
          }
          <button type="button" (click)="changes.mutate(draft, 'approve')" [disabled]="changes.busy() || !!changes.pending()" class="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Approve and update website</button>
          <button type="button" (click)="changes.draft.set(null)" [disabled]="changes.busy()" class="ml-3 text-sm font-semibold text-gray-700">Close</button>
        </article>
      }
      @if (!changes.history().length) { <p class="mt-3 text-sm text-gray-600">Approved copy and price changes will appear here, with undo and seven-day results.</p> }
      <ol class="mt-4 space-y-3">
        @for (action of changes.history(); track action.id) {
          <li class="rounded-xl border border-gray-200 p-4"><p class="text-sm font-semibold text-gray-900">{{ action.request }}</p>
            <p class="mt-1 text-xs text-gray-600">{{ action.createdAt | date:'medium' }} · {{ action.status }}</p>
            @if (action.status === 'applied') { <button type="button" (click)="changes.mutate(action, 'undo')" [disabled]="changes.busy() || !!changes.pending()" class="mt-2 text-sm font-semibold text-blue-700 underline">Undo this change</button> }
            @if (action.status === 'prepared') { <button type="button" (click)="changes.draft.set(action)" [disabled]="changes.busy()" class="mt-2 text-sm font-semibold text-blue-700 underline">Review proposal</button> }
            @if (action.outcome; as outcome) {
              @if (outcome.before && outcome.after) {
                <table class="mt-3 w-full text-left text-xs"><caption class="text-left mb-2 font-semibold">Seven full days before / after</caption><thead><tr><th>Measure</th><th>Before</th><th>After</th></tr></thead><tbody>
                  <tr><th>Views</th><td>{{ outcome.before.views }}</td><td>{{ outcome.after.views }}</td></tr>
                  <tr><th>Enquiries</th><td>{{ outcome.before.enquiries }}</td><td>{{ outcome.after.enquiries }}</td></tr>
                  <tr><th>Booking requests</th><td>{{ outcome.before.bookings }}</td><td>{{ outcome.after.bookings }}</td></tr>
                </tbody></table>
              }
              <p class="mt-2 text-xs text-gray-600">{{ outcome.message }}</p>
            }
          </li>
        }
      </ol>
    </section>`,
})
export class SiteChangeHistoryComponent implements OnInit {
  changes = inject(SiteChangesService);
  private platform = inject(PLATFORM_ID);
  ngOnInit(): void { if (isPlatformBrowser(this.platform)) void this.changes.load(); }
}
