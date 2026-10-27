import { changeIntent } from './change-intent';
describe('Website chat intents', () => {
  it('routes supported requests into a finite action vocabulary', () => {
    expect(changeIntent('Raise all prices by 5%')).toEqual({ kind: 'prices' });
    expect(changeIntent('Refresh my About section')).toEqual({ kind: 'about' });
    expect(changeIntent('Write a spring post')).toEqual({ kind: 'post' });
    expect(changeIntent('set button text to Book now')).toEqual({ kind: 'copy', field: 'ctaText', value: 'Book now' });
    expect(changeIntent('Change headline to "Local lawn care"')).toEqual({ kind: 'copy', field: 'tagline', value: 'Local lawn care' });
    expect(changeIntent('Delete all customers')).toEqual({ kind: 'unsupported' });
  });
});
