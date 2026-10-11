import { vi } from 'vitest';
import { sendSiteHit } from './stats-beacon';

describe('sendSiteHit', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
  it('sends one beacon per page and nothing after Decline', () => {
    const beacon = vi.fn(() => true);
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
    sendSiteHit('beacon-test', '/s/once');
    sendSiteHit('beacon-test', '/s/once');
    expect(beacon).toHaveBeenCalledTimes(1);
    localStorage.setItem('cookie-consent', 'declined');
    sendSiteHit('beacon-test', '/s/once/pages/x');
    expect(beacon).toHaveBeenCalledTimes(1);
  });
});
