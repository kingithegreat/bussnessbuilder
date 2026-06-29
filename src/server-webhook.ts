/**
 * Outbound enquiry webhook.
 *
 * When a new public enquiry is submitted (POST /api/site/:uid/enquiry) and the
 * site owner has opted in to new-enquiry notifications, we fire-and-forget a
 * POST to the configured ENQUIRY_WEBHOOK_URL so external systems (Zapier, a
 * CRM, Slack relays, etc.) can react in real time.
 *
 * This logic is extracted into its own module so it can be unit-tested without
 * booting Express or Firestore — the dispatcher is a pure function that takes a
 * `fetch` implementation by injection.
 */

/** The subset of NotificationPreferences this dispatcher cares about. */
export interface EnquiryWebhookPrefs {
  /** Existing opt-in flag — reused so the webhook honours the same toggle. */
  emailOnNewEnquiry?: boolean;
  [key: string]: unknown;
}

/** Shape of the enquiry data included in the webhook payload. */
export interface EnquiryWebhookEnquiry {
  id: string;
  date: string;
  status: string;
  name: string;
  email: string;
  phone: string;
  serviceInterest: string;
  message: string;
}

export interface DispatchEnquiryWebhookOptions {
  /** Value of process.env.ENQUIRY_WEBHOOK_URL (may be undefined). */
  url: string | undefined;
  /** The owner's notification preferences doc (may be missing). */
  prefs: EnquiryWebhookPrefs | null | undefined;
  /** The site owner's UID. */
  uid: string;
  /** The enquiry that was just created. */
  enquiry: EnquiryWebhookEnquiry;
  /** Injectable fetch (defaults to global fetch); lets tests assert calls. */
  fetchFn?: typeof fetch;
  /** Abort the request after this many ms (default 5000). */
  timeoutMs?: number;
}

export type DispatchSkipReason = 'no-url' | 'opted-out';

export interface DispatchEnquiryWebhookResult {
  delivered: boolean;
  /** Why we skipped, when delivered is false and no error was thrown. */
  skipped?: DispatchSkipReason;
  /** HTTP status of the webhook response, when a request was made. */
  status?: number;
}

/**
 * Build the JSON body sent to the webhook. Exported for tests / documentation.
 */
export function buildEnquiryWebhookPayload(uid: string, enquiry: EnquiryWebhookEnquiry) {
  return {
    event: 'enquiry.created',
    uid,
    enquiry: {
      id: enquiry.id,
      date: enquiry.date,
      status: enquiry.status,
      name: enquiry.name,
      email: enquiry.email,
      phone: enquiry.phone,
      serviceInterest: enquiry.serviceInterest,
      message: enquiry.message,
    },
  };
}

/**
 * Fire-and-forget POST of a new enquiry to ENQUIRY_WEBHOOK_URL.
 *
 * Gating (returns delivered:false without throwing):
 *   - no URL configured            -> { delivered: false, skipped: 'no-url' }
 *   - owner hasn't opted in         -> { delivered: false, skipped: 'opted-out' }
 *
 * Network/HTTP failures reject so the caller can log them; the caller is
 * expected to swallow the rejection (fire-and-forget).
 */
export async function dispatchEnquiryWebhook(
  opts: DispatchEnquiryWebhookOptions,
): Promise<DispatchEnquiryWebhookResult> {
  const { url, prefs, uid, enquiry } = opts;
  const fetchFn = opts.fetchFn ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 5000;

  if (!url) return { delivered: false, skipped: 'no-url' };
  if (!prefs || !prefs.emailOnNewEnquiry) return { delivered: false, skipped: 'opted-out' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BusinessFlow-Event': 'enquiry.created',
      },
      body: JSON.stringify(buildEnquiryWebhookPayload(uid, enquiry)),
      signal: controller.signal,
    });
    return { delivered: res.ok, status: res.status };
  } finally {
    clearTimeout(timer);
  }
}
