import { launchItems, launchProgress, LaunchState } from './launch-checklist';

const empty: LaunchState = { openingHours: '', logoUrl: '', photoUrls: [], customDomainActive: false, hasShortAddress: false, enquiryCount: 0 };

describe('launch checklist', () => {
  it('starts with nothing done', () => {
    const items = launchItems(empty);
    expect(items.map(i => i.id)).toEqual(['hours', 'logo', 'photos', 'domain', 'enquiry']);
    expect(launchProgress(items)).toEqual({ done: 0, total: 5, percent: 0 });
  });

  it('ticks items from real state', () => {
    const items = launchItems({ openingHours: 'Mon–Fri 8–5', logoUrl: 'x.png', photoUrls: [undefined, 'a.jpg'], customDomainActive: false, hasShortAddress: true, enquiryCount: 1 });
    expect(items.every(i => i.done)).toBe(true);
    expect(launchProgress(items).percent).toBe(100);
  });

  it('ignores whitespace-only values', () => {
    const items = launchItems({ ...empty, openingHours: '  ', logoUrl: ' ', photoUrls: [' '] });
    expect(launchProgress(items).done).toBe(0);
  });
});
