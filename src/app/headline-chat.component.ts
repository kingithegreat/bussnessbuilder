import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from './data.service';
import { AuthService } from './auth.service';
import { SiteActionService } from './site-action.service';
import { SiteAction } from './site-action';

@Component({
  selector: 'app-headline-chat',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  template: `
    <section class="rounded-2xl border border-gray-200 bg-white p-5 md:p-6" aria-labelledby="headline-chat-title" [attr.aria-busy]="actions.busy()">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-blue-700">Website assistant</p>
          <h2 id="headline-chat-title" class="mt-1 text-xl font-semibold text-gray-900">Improve your homepage headline</h2>
          <p id="headline-chat-help" class="mt-2 max-w-2xl text-sm text-gray-600">Ask for a clearer headline, review the proposal, then choose whether to update your website.</p>
        </div>
        <a routerLink="/admin/website" class="rounded-lg px-2 py-1 text-sm font-semibold text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600">Open in Website</a>
      </div>

      @if (!setupComplete()) {
        <p class="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Complete website setup before preparing or applying a headline change. <a routerLink="/setup" class="font-semibold text-blue-700 underline">Continue setup and preview</a></p>
      }

      <form (ngSubmit)="prepare()" class="mt-5 space-y-3">
        <label for="headline-request" class="block text-sm font-semibold text-gray-900">What would you like to change?</label>
        <textarea id="headline-request" name="headlineRequest" [(ngModel)]="request" rows="2" maxlength="500"
          aria-describedby="headline-chat-help headline-scope" [disabled]="actions.busy() || actions.recoveryPending() || !setupComplete()"
          placeholder="Improve my homepage headline. Make it warm and clear."
          class="block w-full rounded-xl border border-gray-300 p-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-2 focus:outline-blue-500 disabled:opacity-60"></textarea>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p id="headline-scope" class="max-w-lg text-xs text-gray-500">This assistant changes your homepage headline. Use the Website editors for other changes.</p>
          <button type="submit" [disabled]="actions.busy() || actions.recoveryPending() || !setupComplete() || !request.trim()"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {{ actions.busy() ? 'Working…' : 'Prepare a proposal' }}
          </button>
        </div>
      </form>

      @if (actions.error() || actions.recoveryPending()) {
        <div role="alert" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p>{{ actions.error() || 'The previous headline change has not been confirmed. Retry it before making another change.' }}</p>
          <div class="mt-3 flex flex-wrap gap-4">
            @if (actions.recoveryPending()) {
              <button type="button" (click)="retryUnconfirmedChange()" [disabled]="actions.busy()" class="font-semibold underline disabled:opacity-50">Retry unconfirmed change</button>
            }
            <button type="button" (click)="reloadHistory()" [disabled]="actions.busy()" class="font-semibold underline disabled:opacity-50">Reload change history</button>
            <a routerLink="/admin/builder" class="font-semibold underline">Open homepage editor</a>
          </div>
        </div>
      }
      <p role="status" aria-live="polite" class="mt-3 text-sm text-gray-600">{{ status() }}</p>

      @if (actions.draft(); as proposal) {
        <article class="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 md:p-5" aria-labelledby="headline-proposal-title" data-testid="headline-proposal">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 id="headline-proposal-title" class="font-semibold text-gray-900">Review the proposed change</h3>
            <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">{{ proposal.source === 'ai' ? 'AI proposal' : 'Template proposal' }}</span>
          </div>
          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <div class="rounded-lg border border-gray-200 bg-white p-4">
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Before</p>
              <p class="mt-2 break-words text-gray-900" data-testid="headline-before">{{ displayedHeadline(proposal.before.tagline) }}</p>
              @if (!proposal.before.tagline) {
                <p class="mt-2 text-xs text-gray-500">Your current site uses this default headline.</p>
              }
            </div>
            <div class="rounded-lg border border-blue-200 bg-white p-4">
              <p class="text-xs font-semibold uppercase tracking-wide text-blue-700">After</p>
              <p class="mt-2 break-words font-medium text-gray-900" data-testid="headline-after">{{ proposal.after.tagline }}</p>
            </div>
          </div>
          <p class="mt-3 text-sm text-gray-700">{{ proposal.reason }}</p>
          @if (setupComplete()) {
            <p class="mt-3 text-sm font-medium text-gray-900">Approving replaces the headline on your currently published homepage. You can undo this change from the history below.</p>
          }
          <div class="mt-4 flex flex-wrap gap-3">
            <button type="button" (click)="approve(proposal.id)" [disabled]="actions.busy() || actions.recoveryPending() || !setupComplete()"
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              Approve and update live headline
            </button>
            <button type="button" (click)="dismissProposal()" [disabled]="actions.busy()" class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">Close proposal</button>
          </div>
        </article>
      }

      <div class="mt-5 border-t border-gray-100 pt-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 class="font-semibold text-gray-900">Headline change history</h3>
          <button type="button" (click)="reloadHistory()" [disabled]="actions.busy()" class="text-sm font-semibold text-blue-700 hover:underline disabled:opacity-50">Reload history</button>
        </div>
        @if (actions.history().length === 0) {
          <p class="mt-2 text-sm text-gray-500">Your proposals and approved changes will appear here.</p>
        } @else {
          <ol class="mt-3 space-y-3" aria-label="Homepage headline changes">
            @for (action of actions.history(); track action.id) {
              <li class="rounded-xl border border-gray-200 p-4" [attr.data-action-id]="action.id">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-gray-900">{{ action.status === 'applied' ? 'Headline updated' : action.status === 'undone' ? 'Change undone' : 'Proposal awaiting approval' }}</p>
                    <p class="mt-1 text-xs text-gray-500">{{ action.createdAt | date:'medium' }} · {{ action.source === 'ai' ? 'AI proposal' : 'Template proposal' }}</p>
                  </div>
                  @if (action.status === 'applied') {
                    <button type="button" (click)="undo(action.id)" [disabled]="actions.busy() || actions.recoveryPending() || !setupComplete()" class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Undo headline change</button>
                  } @else if (action.status === 'prepared') {
                    <button type="button" (click)="review(action)" [disabled]="actions.busy()" class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-gray-50 disabled:opacity-50">Review proposal</button>
                  }
                </div>
                <p class="mt-3 break-words text-sm text-gray-500"><strong>Before:</strong> {{ displayedHeadline(action.before.tagline) }}</p>
                <p class="mt-1 break-words text-sm text-gray-900"><strong>After:</strong> {{ action.after.tagline }}</p>
                <p class="mt-2 text-xs text-gray-500">{{ action.reason }}</p>
              </li>
            }
          </ol>
        }
        @if (setupComplete()) {
          <a [href]="siteUrl()" target="_blank" rel="noopener" class="mt-4 inline-flex text-sm font-semibold text-blue-700 hover:underline">View live website</a>
        } @else {
          <a routerLink="/setup" class="mt-4 inline-flex text-sm font-semibold text-blue-700 hover:underline">Finish website setup</a>
        }
      </div>
    </section>
  `,
})
export class HeadlineChatComponent implements OnInit {
  readonly actions = inject(SiteActionService);
  private readonly data = inject(DataService);
  private readonly auth = inject(AuthService);
  readonly setupComplete = this.data.isSetupComplete;
  readonly status = signal('');
  readonly siteUrl = computed(() => {
    const identity = this.data.siteSlug() || this.auth.currentUser()?.uid;
    return identity ? `/site/${encodeURIComponent(identity)}` : '/public';
  });
  request = 'Improve my homepage headline';

  ngOnInit(): void {
    void this.actions.loadHistory();
  }

  displayedHeadline(headline: string): string {
    return headline || 'Professional services you can trust.';
  }

  async prepare(): Promise<void> {
    if (this.actions.busy() || this.actions.recoveryPending() || !this.setupComplete() || !this.request.trim()) return;
    this.status.set('Preparing a proposal for you to review.');
    const proposal = await this.actions.prepare(this.request.trim());
    this.status.set(proposal ? 'Proposal ready. Your live headline has not changed.' : '');
  }

  async approve(id: string): Promise<void> {
    if (this.actions.busy() || this.actions.recoveryPending() || !this.setupComplete()) return;
    this.status.set('Updating the headline you approved.');
    const applied = await this.actions.approve(id);
    this.status.set(applied ? 'Your live headline has been updated. The change is saved in your history.' : '');
  }

  async undo(id: string): Promise<void> {
    if (this.actions.busy() || this.actions.recoveryPending() || !this.setupComplete()) return;
    this.status.set('Restoring the previous headline.');
    const undone = await this.actions.undo(id);
    this.status.set(undone ? 'Your previous headline has been restored.' : '');
  }

  dismissProposal(): void {
    if (this.actions.busy()) return;
    this.actions.clearDraft();
    this.status.set('Proposal closed. Saved changes remain in your history.');
  }

  review(action: SiteAction): void {
    if (this.actions.busy()) return;
    this.actions.review(action);
    this.status.set('Review this saved proposal before approving it.');
  }

  async reloadHistory(): Promise<void> {
    if (this.actions.busy()) return;
    this.status.set('Loading your saved headline changes.');
    await this.actions.loadHistory();
    this.status.set(this.actions.error() ? '' : 'Change history loaded.');
  }

  async retryUnconfirmedChange(): Promise<void> {
    if (this.actions.busy() || !this.actions.recoveryPending()) return;
    this.status.set('Confirming the previous headline change.');
    const confirmed = await this.actions.retryUnconfirmedChange();
    this.status.set(confirmed ? 'The previous headline change is confirmed. Check your saved history.' : '');
  }
}
