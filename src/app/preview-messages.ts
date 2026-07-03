import { PublicSiteData } from './types';

/**
 * postMessage contract between the page-builder parent
 * (admin-builder.component.ts) and the /preview-frame iframe
 * (preview-frame.component.ts). Both sides import from this single file so
 * the message shapes can never drift apart.
 */
export const PREVIEW_MSG_SOURCE = 'bfs-builder-preview';

/** Child → parent: the iframe has bootstrapped and is listening for state. */
export interface PreviewReadyMsg {
  source: typeof PREVIEW_MSG_SOURCE;
  type: 'ready';
}

/** Parent → child: full snapshot of the site data to render. */
export interface PreviewStateMsg {
  source: typeof PREVIEW_MSG_SOURCE;
  type: 'state';
  payload: PublicSiteData;
}

/**
 * Parent → child: "are you there?" probe, answered with a fresh 'ready'.
 *
 * Sent from the parent's iframe load handler. The iframe's load event waits on
 * subresources (fonts, images), so the child can bootstrap and complete the
 * ready/state handshake BEFORE load fires; the parent's defensive
 * previewReady=false reset on load would then freeze the preview forever,
 * because the child's ready retries stop after the first state arrives. The
 * ping lets the already-bootstrapped child re-announce itself; on a genuine
 * fresh (re)load the ping is harmlessly lost and the child's own ngOnInit
 * 'ready' completes the handshake instead.
 */
export interface PreviewPingMsg {
  source: typeof PREVIEW_MSG_SOURCE;
  type: 'ping';
}

/** Child → parent: an inline text edit made inside the preview. */
export interface PreviewTextEditedMsg {
  source: typeof PREVIEW_MSG_SOURCE;
  type: 'textEdited';
  payload: { target: string; field: string; value: string; id?: string };
}

export type ParentToPreviewMsg = PreviewStateMsg | PreviewPingMsg;
export type PreviewToParentMsg = PreviewReadyMsg | PreviewTextEditedMsg;
