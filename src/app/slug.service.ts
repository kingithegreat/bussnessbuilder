import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { DataService } from './data.service';

/**
 * Claims the friendly `/site/<slug>` URL for a site.
 *
 * Extracted from the setup wizard because the claim now has to happen in two
 * places: at publish (logged-in visitors) and straight after sign-up (visitors
 * who filled the wizard logged-out, where no token existed at publish time).
 * It is idempotent — a site that already has a slug is left alone — so it is
 * also the retry path for a claim that failed the first time, which previously
 * left the user permanently on the raw-UID URL.
 */
@Injectable({ providedIn: 'root' })
export class SlugService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private data = inject(DataService);

  /**
   * Claim a slug if the site hasn't got one yet. Never throws — a failed claim
   * only means the site keeps its `/site/<uid>` URL.
   *
   * @returns the slug now in use, or '' if none could be claimed.
   */
  async claimIfMissing(): Promise<string> {
    const existing = this.data.siteSlug();
    if (existing) return existing;

    const user = this.auth.currentUser();
    if (!user) return '';

    const name = this.data.profile().name;
    if (!name) return '';

    const token = await this.auth.getIdToken();
    if (!token) return '';

    const result = await firstValueFrom(
      this.http.post<{ slug: string }>(
        '/api/slugs/claim',
        { uid: user.uid, name },
        { headers: { Authorization: `Bearer ${token}` } }
      )
    ).catch(() => null);

    if (result?.slug) {
      this.data.setSiteSlug(result.slug);
      return result.slug;
    }
    return '';
  }

  /**
   * Claim an exact, owner-chosen address. Returns the slug on success or an
   * error message the UI can show (taken, reserved, invalid, signed out).
   */
  async claimExact(slug: string): Promise<{ slug?: string; error?: string }> {
    const user = this.auth.currentUser();
    const token = user ? await this.auth.getIdToken() : null;
    if (!user || !token) return { error: 'Please sign in again to change your address.' };
    try {
      const result = await firstValueFrom(
        this.http.post<{ slug: string }>(
          '/api/slugs/claim',
          { uid: user.uid, slug },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );
      if (result?.slug) {
        this.data.setSiteSlug(result.slug);
        return { slug: result.slug };
      }
      return { error: 'Could not save that address — try again.' };
    } catch (e: unknown) {
      const msg = (e as { error?: { error?: string } })?.error?.error;
      return { error: msg || 'Could not save that address — try again.' };
    }
  }
}
