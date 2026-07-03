import { Component, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DataService } from './data.service';
import { CustomizationSettings } from './types';
import { PublicPageComponent } from './public-page.component';
import {
  PREVIEW_MSG_SOURCE,
  ParentToPreviewMsg,
  PreviewReadyMsg,
  PreviewTextEditedMsg,
} from './preview-messages';

/**
 * The content of the page builder's live-preview <iframe>.
 *
 * Loaded at /preview-frame inside a real iframe from /admin/builder, so it is
 * a fully separate browsing context with its own viewport — Tailwind's
 * responsive md:/lg: classes in the public page evaluate against the iframe's
 * pixel width, which is exactly what fixes the "mobile preview renders the
 * desktop layout" bug. State arrives from the parent via postMessage; inline
 * text edits are posted back up.
 */
@Component({
  selector: 'app-preview-frame',
  standalone: true,
  imports: [PublicPageComponent],
  template: `
    @if (cust(); as c) {
      <app-public-page
        [previewCustomization]="c"
        [editable]="true"
        (textEdited)="onTextEdited($event)">
      </app-public-page>
    }
  `,
})
export class PreviewFrameComponent implements OnInit, OnDestroy {
  // SAFETY INVARIANT: this component must NEVER call dataService.init(), only
  // loadPublicSite() — init() is the sole thing that arms the Firestore
  // autosave effect, so as long as it is never called here this iframe's own
  // DataService instance can never write preview state to Firestore.
  private dataService = inject(DataService);
  private platformId = inject(PLATFORM_ID);

  cust = signal<CustomizationSettings | null>(null);

  private stateReceived = false;
  private retryTimers: ReturnType<typeof setTimeout>[] = [];
  private boundOnMessage = (e: MessageEvent) => this.onMessage(e);

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    window.addEventListener('message', this.boundOnMessage);
    this.postReady();
    // Re-announce readiness a few times in case of bootstrap-ordering hiccups
    // (parent listener not yet attached); stop once the first state arrives.
    for (const delay of [150, 450, 900, 1500]) {
      this.retryTimers.push(setTimeout(() => {
        if (!this.stateReceived) this.postReady();
      }, delay));
    }
  }

  ngOnDestroy() {
    if (!isPlatformBrowser(this.platformId)) return;
    window.removeEventListener('message', this.boundOnMessage);
    this.retryTimers.forEach(t => clearTimeout(t));
  }

  private postReady() {
    const msg: PreviewReadyMsg = { source: PREVIEW_MSG_SOURCE, type: 'ready' };
    window.parent.postMessage(msg, window.location.origin);
  }

  private onMessage(event: MessageEvent) {
    // Only accept same-origin messages carrying our source tag — reject
    // anything else (other frames, browser extensions, unrelated postMessage).
    if (event.origin !== window.location.origin) return;
    const data = event.data as ParentToPreviewMsg | null | undefined;
    if (!data || data.source !== PREVIEW_MSG_SOURCE) return;
    if (data.type === 'ping') {
      // The parent resets its previewReady flag whenever the iframe's load
      // event fires and pings us to re-handshake. That load event can arrive
      // AFTER we already bootstrapped and received state (subresources like
      // fonts/images delay it past Angular bootstrap), by which point our
      // timed 'ready' retries are spent — so always answer a ping with a
      // fresh 'ready' or the preview would stay frozen on the last snapshot.
      this.postReady();
      return;
    }
    if (data.type !== 'state' || !data.payload) return;
    this.stateReceived = true;
    this.dataService.loadPublicSite('preview', data.payload);
    this.cust.set(data.payload.customization ?? null);
  }

  onTextEdited(event: { target: string; field: string; value: string; id?: string }) {
    // The parent owns state: post the edit up and wait for it to push back an
    // updated snapshot — never apply the edit locally.
    if (!isPlatformBrowser(this.platformId)) return;
    const msg: PreviewTextEditedMsg = { source: PREVIEW_MSG_SOURCE, type: 'textEdited', payload: event };
    window.parent.postMessage(msg, window.location.origin);
  }
}
