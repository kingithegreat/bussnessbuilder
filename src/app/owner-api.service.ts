import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

/** Small helper for the signed-in owner's feature APIs (adds uid + Bearer token). */
@Injectable({ providedIn: 'root' })
export class OwnerApiService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  uid(): string {
    return this.auth.currentUser()?.uid || '';
  }

  private async headers(): Promise<HttpHeaders> {
    const token = await this.auth.getIdToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const q = new URLSearchParams({ uid: this.uid(), ...params }).toString();
    return firstValueFrom(this.http.get<T>(`${path}?${q}`, { headers: await this.headers() }));
  }

  async send<T>(method: 'POST' | 'PUT' | 'DELETE', path: string, body: Record<string, unknown> = {}): Promise<T> {
    return firstValueFrom(this.http.request<T>(method, path, { body: { uid: this.uid(), ...body }, headers: await this.headers() }));
  }

  /** Best-effort readable error message from an HttpErrorResponse. */
  static message(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
    const err = (e as { error?: { error?: string } })?.error?.error;
    return typeof err === 'string' && err ? err : fallback;
  }
}
