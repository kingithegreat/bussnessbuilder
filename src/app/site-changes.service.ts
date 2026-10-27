import { Injectable, effect, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { OwnerApiService } from './owner-api.service';
import { AuthService } from './auth.service';
import { DataService } from './data.service';
import { SiteChange, SiteChangeField } from './site-change';
interface MutationResponse { action: SiteChange; fields: SiteChangeField[] }
@Injectable({ providedIn: 'root' })
export class SiteChangesService {
  private api = inject(OwnerApiService);
  private auth = inject(AuthService);
  private data = inject(DataService);
  busy = signal(false);
  error = signal('');
  history = signal<SiteChange[]>([]);
  draft = signal<SiteChange | null>(null);
  pending = signal<{ action: SiteChange; operation: 'approve' | 'undo' } | null>(null);
  private attempt: { id: string; request: string; fields: SiteChangeField[] } | null = null;
  private version = 0;
  private accountUid: string | null = null;
  constructor() {
    effect(() => this.syncAccount(this.auth.currentUser()?.uid || ''));
  }
  private syncAccount(uid: string): void {
    if (uid === this.accountUid) return;
    this.accountUid = uid; this.version++; this.history.set([]); this.draft.set(null); this.pending.set(null); this.attempt = null; this.busy.set(false); this.error.set('');
  }
  private async run<T>(work: (uid: string) => Promise<T>): Promise<T | null> {
    if (this.busy()) return null;
    const uid = this.api.uid(); this.syncAccount(uid);
    const version = this.version;
    if (!uid) { this.error.set('Sign in to change your website.'); return null; }
    this.busy.set(true); this.error.set('');
    try { const result = await work(uid); return version === this.version && uid === this.api.uid() ? result : null; }
    catch (e) { if (version === this.version) this.error.set(e instanceof Error && !(e instanceof HttpErrorResponse) ? e.message : OwnerApiService.message(e)); return null; }
    finally { if (version === this.version) this.busy.set(false); }
  }
  async load(): Promise<void> {
    const result = await this.run(uid => this.data.runSiteAction(uid, () => this.api.get<{ actions: SiteChange[] }>('/api/changes'), () => null, { readOnly: true }));
    if (result) this.history.set(result.actions);
  }
  async prepare(request: string, fields: SiteChangeField[]): Promise<boolean> {
    if (this.pending()) { this.error.set('Retry the unconfirmed change first.'); return false; }
    const result = await this.run(uid => this.data.runSiteAction(uid, () => {
      if (!this.attempt || this.attempt.request !== request || JSON.stringify(this.attempt.fields) !== JSON.stringify(fields)) this.attempt = { id: crypto.randomUUID(), request, fields };
      return this.api.send<{ action: SiteChange }>('POST', '/api/changes/prepare', { ...this.attempt });
    }));
    if (!result) return false;
    this.draft.set(result.action); this.attempt = null;
    this.remember(result.action); return true;
  }
  private remember(action: SiteChange) { this.history.update(h => [action, ...h.filter(a => a.id !== action.id)].slice(0, 20)); }
  async mutate(action: SiteChange, operation: 'approve' | 'undo'): Promise<boolean> {
    this.syncAccount(this.api.uid());
    if (this.pending() && (this.pending()!.action.id !== action.id || this.pending()!.operation !== operation)) return false;
    const version = this.version;
    const result = await this.run(async uid => {
      let sent = false;
      const definite = (e: unknown) => !sent || e instanceof HttpErrorResponse && [400,401,403,404,409,413,422,429].includes(e.status);
      try {
        return await this.data.runSiteAction(uid, () => {
          sent = true;
          return this.api.send<MutationResponse>('POST', `/api/changes/${action.id}/${operation}`);
        }, () => null, { mayChangeHeadline: true, operationKey: `${action.id}:${operation}`, isDefiniteRejection: definite,
          siteFieldsOf: result => result.fields, fieldsToReconcile: action.fields });
      } catch (e) {
        if (version === this.version && sent && !definite(e)) this.pending.set({ action, operation });
        throw e;
      }
    });
    if (!result) return false;
    this.pending.set(null); this.draft.set(null); this.remember(result.action); return true;
  }
  retry(): Promise<boolean> { const p = this.pending(); return p ? this.mutate(p.action, p.operation) : Promise.resolve(false); }
}
