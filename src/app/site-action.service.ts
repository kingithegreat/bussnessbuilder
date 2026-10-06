import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { DataService } from './data.service';
import { SiteAction } from './site-action';

interface ActionResponse { action: SiteAction }
interface AppliedActionResponse extends ActionResponse { headline: string }
interface PreparationAttempt { uid: string; id: string; request: string; expectedHeadline: string }

@Injectable({ providedIn: 'root' })
export class SiteActionService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private data = inject(DataService);
  private accountUid: string | null = null;
  private accountVersion = 0;
  private preparation: PreparationAttempt | null = null;

  private _busy = signal(false);
  private _error = signal<string | null>(null);
  private _errorCode = signal<string | null>(null);
  private _history = signal<SiteAction[]>([]);
  private _draft = signal<SiteAction | null>(null);
  private unconfirmedChange = signal<{ id: string; operation: 'approve' | 'undo' } | null>(null);
  readonly busy = this._busy.asReadonly();
  readonly error = this._error.asReadonly();
  readonly errorCode = this._errorCode.asReadonly();
  readonly history = this._history.asReadonly();
  readonly draft = this._draft.asReadonly();
  readonly recoveryPending = computed(() => this.unconfirmedChange() !== null);

  constructor() {
    effect(() => this.syncAccount(this.auth.currentUser()?.uid ?? null));
  }

  private syncAccount(uid: string | null): void {
    if (uid === this.accountUid) return;
    this.accountUid = uid;
    this.accountVersion++;
    this.preparation = null;
    this._busy.set(false);
    this._error.set(null);
    this._errorCode.set(null);
    this._history.set([]);
    this._draft.set(null);
    this.unconfirmedChange.set(null);
  }

  private isCurrent(uid: string, version: number): boolean {
    return this.auth.currentUser()?.uid === uid && this.accountUid === uid && this.accountVersion === version;
  }

  private async headers(uid: string, version: number): Promise<{ Authorization: string }> {
    const token = await this.auth.getIdToken();
    if (!token || !this.isCurrent(uid, version)) throw new Error('Sign in to your business again, then retry.');
    return { Authorization: `Bearer ${token}` };
  }

  private async perform<T>(task: (uid: string, version: number) => Promise<T>): Promise<T | null> {
    const uid = this.auth.currentUser()?.uid ?? null;
    this.syncAccount(uid);
    if (this._busy()) return null;
    if (!uid) {
      this._errorCode.set('unauthenticated');
      this._error.set('Sign in to review or change your website.');
      return null;
    }
    const version = this.accountVersion;
    this._busy.set(true);
    this._error.set(null);
    this._errorCode.set(null);
    try {
      const result = await task(uid, version);
      return this.isCurrent(uid, version) ? result : null;
    } catch (error) {
      if (this.isCurrent(uid, version)) this.showError(error);
      return null;
    } finally {
      if (this.isCurrent(uid, version)) this._busy.set(false);
    }
  }

  private showError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      const code = body && typeof body === 'object' && typeof body['code'] === 'string'
        ? body['code'] : body && typeof body === 'object' && typeof body['error'] === 'string' ? body['error'] : null;
      this._errorCode.set(code ?? (error.status === 0 ? 'network' : `http_${error.status}`));
      if (code === 'headline_conflict') this.preparation = null;
      if (error.status === 409 && code === 'action_preparing') {
        this._error.set('This proposal is still being prepared. Wait a moment, then retry the same request.');
      } else if (code === 'headline_conflict') {
        this._error.set('Your headline has changed since this proposal. Review it in Website, then request a new proposal.');
      } else if (code === 'site_not_ready') {
        this._error.set('Finish saving your business profile before preparing a headline change. Open Website to complete it.');
      } else if (code === 'unchanged_headline') {
        this._error.set('The proposal matches your current headline. Open the homepage editor for a different wording.');
      } else if (error.status === 401 || error.status === 403) {
        this._error.set('Sign in to your business again, then retry.');
      } else if (code === 'unsupported_intent') {
        this._error.set('This workflow improves homepage headlines. Ask for a headline change, or use Website for other edits.');
      } else if (error.status === 429) {
        this._error.set('Too many requests arrived together. Wait a moment, then retry the same request.');
      } else if (error.status === 0 || error.status >= 500) {
        this._error.set(this.recoveryPending()
          ? 'This change is unconfirmed. Website autosave is paused. Use Retry unconfirmed change to confirm it safely.'
          : 'We could not confirm the response. Your proposal is kept. Retry the same request or reload change history.');
      } else {
        this._error.set('This request could not be completed. Review the headline request and try again.');
      }
    } else {
      this._errorCode.set('site_sync');
      this._error.set(error instanceof Error ? error.message : 'Could not save your website edits. Retry after your connection recovers.');
    }
  }

  private remember(action: SiteAction): void {
    this._history.update(items => [action, ...items.filter(item => item.id !== action.id)]);
    if (action.status === 'prepared') this._draft.set(action);
    else if (this._draft()?.id === action.id) this._draft.set(null);
  }

  async prepare(request: string): Promise<SiteAction | null> {
    const text = request.trim();
    if (!text) {
      this._errorCode.set('invalid_request');
      this._error.set('Describe how you want to improve your homepage headline.');
      return null;
    }
    return this.perform(async (uid, version) => {
      const response = await this.data.runSiteAction(uid, async savedHeadline => {
        if (!this.preparation || this.preparation.uid !== uid || this.preparation.request !== text) {
          this.preparation = { uid, id: crypto.randomUUID(), request: text, expectedHeadline: savedHeadline };
        }
        // Reuse the full original payload after a lost response. The server's
        // stored action id prevents a retry from purchasing another generation.
        const attempt = this.preparation;
        const headers = await this.headers(uid, version);
        return firstValueFrom(this.http.post<ActionResponse>('/api/actions/headline/prepare', attempt, { headers }));
      });
      if (this.isCurrent(uid, version)) {
        this.remember(response.action);
        this.preparation = null;
      }
      return response.action;
    });
  }

  async loadHistory(): Promise<void> {
    await this.perform(async (uid, version) => {
      const response = await this.data.runSiteAction(uid, async () => {
        const headers = await this.headers(uid, version);
        return firstValueFrom(this.http.get<{ actions: SiteAction[] }>('/api/actions', { headers, params: { uid } }));
      }, () => null, { readOnly: true });
      if (this.isCurrent(uid, version)) {
        this._history.set(response.actions);
        const openId = this._draft()?.id;
        const prepared = response.actions.filter(action => action.status === 'prepared');
        this._draft.set(prepared.find(action => action.id === openId) ?? prepared[0] ?? null);
        if (this.preparation && response.actions.some(action => action.id === this.preparation?.id)) this.preparation = null;
      }
    });
  }

  private async apply(id: string, operation: 'approve' | 'undo'): Promise<boolean> {
    const result = await this.perform(async (uid, version) => {
      let requestSent = false;
      const isDefiniteRejection = (error: unknown): boolean => !requestSent || error instanceof HttpErrorResponse
        && [400, 401, 403, 404, 409, 413, 422, 429].includes(error.status);
      try {
        const response = await this.data.runSiteAction(uid, async () => {
          const headers = await this.headers(uid, version);
          requestSent = true;
          return firstValueFrom(this.http.post<AppliedActionResponse>(`/api/actions/${encodeURIComponent(id)}/${operation}`, { uid }, { headers }));
        }, response => response.headline, { mayChangeHeadline: true, operationKey: `${id}:${operation}`, isDefiniteRejection });
        if (this.isCurrent(uid, version)) {
          this.remember(response.action);
          this.unconfirmedChange.set(null);
        }
        return true;
      } catch (error) {
        if (this.isCurrent(uid, version) && requestSent && !isDefiniteRejection(error)) {
          this.unconfirmedChange.set({ id, operation });
        }
        throw error;
      }
    });
    return result === true;
  }

  approve(id: string): Promise<boolean> { return this.apply(id, 'approve'); }
  undo(id: string): Promise<boolean> { return this.apply(id, 'undo'); }

  retryUnconfirmedChange(): Promise<boolean> {
    const pending = this.unconfirmedChange();
    return pending ? this.apply(pending.id, pending.operation) : Promise.resolve(false);
  }

  review(action: SiteAction): void {
    if (action.status === 'prepared' && action.actorUid === this.auth.currentUser()?.uid) this._draft.set(action);
  }

  clearDraft(): void { this._draft.set(null); }
}
