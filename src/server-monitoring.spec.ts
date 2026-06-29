import { initServerMonitoring, isMonitoringActive, captureServerError } from './server-monitoring';

describe('server monitoring (no DSN)', () => {
  const original = process.env['SENTRY_DSN'];
  beforeAll(() => {
    delete process.env['SENTRY_DSN'];
  });
  afterAll(() => {
    if (original !== undefined) process.env['SENTRY_DSN'] = original;
  });

  it('does not activate when SENTRY_DSN is unset', async () => {
    const active = await initServerMonitoring();
    expect(active).toBe(false);
    expect(isMonitoringActive()).toBe(false);
  });

  it('captureServerError is a safe no-op when inactive', () => {
    expect(() => captureServerError(new Error('boom'))).not.toThrow();
    expect(() => captureServerError('not-an-error', { foo: 'bar' })).not.toThrow();
  });
});
