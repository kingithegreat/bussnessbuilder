import { buildEnquiryWebhookPayload, dispatchEnquiryWebhook, EnquiryWebhookEnquiry } from './server-webhook';

const enquiry: EnquiryWebhookEnquiry = {
  id: 'enq-1',
  date: '2026-06-29T00:00:00.000Z',
  status: 'New',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '555-0100',
  serviceInterest: 'Consultation',
  message: 'Please call me',
};

describe('buildEnquiryWebhookPayload', () => {
  it('wraps the enquiry with an event type and uid', () => {
    const payload = buildEnquiryWebhookPayload('uid-123', enquiry);
    expect(payload.event).toBe('enquiry.created');
    expect(payload.uid).toBe('uid-123');
    expect(payload.enquiry).toEqual(enquiry);
  });
});

describe('dispatchEnquiryWebhook', () => {
  function mockFetch(status = 200) {
    return (async () => ({ ok: status >= 200 && status < 300, status }) as Response) as unknown as typeof fetch;
  }

  it('skips when no URL is configured', async () => {
    const fetchFn = mockFetch();
    const res = await dispatchEnquiryWebhook({
      url: undefined,
      prefs: { emailOnNewEnquiry: true },
      uid: 'u',
      enquiry,
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(res).toEqual({ delivered: false, skipped: 'no-url' });
  });

  it('skips when the owner has not opted in', async () => {
    const res = await dispatchEnquiryWebhook({
      url: 'https://hook.example.com',
      prefs: { emailOnNewEnquiry: false },
      uid: 'u',
      enquiry,
      fetchFn: mockFetch() as unknown as typeof fetch,
    });
    expect(res).toEqual({ delivered: false, skipped: 'opted-out' });
  });

  it('skips when prefs are missing', async () => {
    const res = await dispatchEnquiryWebhook({
      url: 'https://hook.example.com',
      prefs: null,
      uid: 'u',
      enquiry,
      fetchFn: mockFetch() as unknown as typeof fetch,
    });
    expect(res).toEqual({ delivered: false, skipped: 'opted-out' });
  });

  it('POSTs JSON to the URL when opted in and reports delivered', async () => {
    let captured: { url: unknown; init: RequestInit } | null = null;
    const fetchFn = (async (url: unknown, init: RequestInit) => {
      captured = { url, init };
      return { ok: true, status: 202 } as Response;
    }) as unknown as typeof fetch;

    const res = await dispatchEnquiryWebhook({
      url: 'https://hook.example.com/path',
      prefs: { emailOnNewEnquiry: true },
      uid: 'uid-9',
      enquiry,
      fetchFn,
    });

    expect(res.delivered).toBe(true);
    expect(res.status).toBe(202);
    expect(captured!.url).toBe('https://hook.example.com/path');
    expect(captured!.init.method).toBe('POST');
    const headers = captured!.init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(captured!.init.body as string);
    expect(body.event).toBe('enquiry.created');
    expect(body.enquiry.email).toBe('ada@example.com');
  });

  it('reports not-delivered on a non-2xx response', async () => {
    const fetchFn = (async () => ({ ok: false, status: 500 }) as Response) as unknown as typeof fetch;
    const res = await dispatchEnquiryWebhook({
      url: 'https://hook.example.com',
      prefs: { emailOnNewEnquiry: true },
      uid: 'u',
      enquiry,
      fetchFn,
    });
    expect(res.delivered).toBe(false);
    expect(res.status).toBe(500);
  });
});
