import { vi } from 'vitest';
import { sendSiteHit } from './stats-beacon';

describe('sendSiteHit', () => {
  afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
  it('sends one beacon per page and nothing after Decline', () => {
    const beacon = vi.fn(() => true);
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
    sendSiteHit('abc', '/s/abc');
    sendSiteHit('abc', '/s/abc');
    expect(beacon).toHaveBeenCalledTimes(1);
    localStorage.setItem('cookie-consent', 'declined');
    sendSiteHit('abc', '/s/abc/pages/x');
    expect(beacon).toHaveBeenCalledTimes(1);
  });
});
