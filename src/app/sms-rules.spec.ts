import { normalizeMobile, smsText, enquiryAlert, bookingAlert } from './sms-rules';

describe('sms rules', () => {
  it('normalises NZ and international numbers', () => {
    expect(normalizeMobile('021 123 4567')).toBe('+64211234567');
    expect(normalizeMobile('+64 27 555 0000')).toBe('+64275550000');
    expect(normalizeMobile('0064211234567')).toBe('+64211234567');
    expect(normalizeMobile('abc')).toBe('');
    expect(normalizeMobile('021')).toBe('');
  });
  it('keeps alerts to one plain segment', () => {
    expect(smsText(['“Hi” — ok…'])).toBe('"Hi" - ok...');
    expect(smsText(['x'.repeat(200)])).toHaveLength(160);
    expect(enquiryAlert('Pyes Pa Lawn Care', 'Kim', 'Lawn mowing')).toBe('New enquiry for Pyes Pa Lawn Care: Kim (Lawn mowing). Open BusinessFlow to reply.');
    expect(bookingAlert('Biz', 'Kim', 'Mow', 'Wed 14 Oct, 9:00 am').length).toBeLessThanOrEqual(160);
  });
});
