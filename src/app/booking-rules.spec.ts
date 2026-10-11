import { defaultBookingSettings, sanitizeBookingSettings, availableSlots, isSlotBookable, zonedTimeToUtc, weekdayOf, buildIcs, busyFromBookings, Booking } from './booking-rules';

const tz = 'Pacific/Auckland';
const enabled = () => ({ ...defaultBookingSettings(), enabled: true, leadTimeHours: 0 });
const now = new Date('2026-10-01T00:00:00Z');

describe('booking rules', () => {
  it('converts NZ local time to UTC across DST', () => {
    expect(zonedTimeToUtc('2026-10-14', '09:00', tz).toISOString()).toBe('2026-10-13T20:00:00.000Z'); // NZDT +13
    expect(zonedTimeToUtc('2026-06-10', '09:00', tz).toISOString()).toBe('2026-06-09T21:00:00.000Z'); // NZST +12
  });
  it('knows weekdays', () => {
    expect(weekdayOf('2026-10-14')).toBe('wed');
    expect(weekdayOf('2026-10-18')).toBe('sun');
  });
  it('generates slots inside availability only', () => {
    const slots = availableSlots(enabled(), 'consultation', '2026-10-14', [], now);
    expect(slots).toHaveLength(15); // 9:00..16:00 every 30 min for a 60-min service
    expect(availableSlots(enabled(), 'consultation', '2026-10-18', [], now)).toEqual([]); // Sunday closed
  });
  it('honours blackout dates, disabled settings and lead time', () => {
    expect(availableSlots({ ...enabled(), blackouts: ['2026-10-14'] }, 'consultation', '2026-10-14', [], now)).toEqual([]);
    expect(availableSlots({ ...enabled(), enabled: false }, 'consultation', '2026-10-14', [], now)).toEqual([]);
    const late = new Date('2026-10-13T23:00:00Z'); // 12:00 NZ on the 14th
    expect(availableSlots({ ...enabled(), leadTimeHours: 2 }, 'consultation', '2026-10-14', [], late)[0].start).toBe('2026-10-14T01:00:00.000Z');
  });
  it('prevents double bookings by overlap', () => {
    const booked: Booking = { id: 'b1', serviceId: 'consultation', serviceName: 'C', start: '2026-10-13T20:00:00.000Z', end: '2026-10-13T21:00:00.000Z', name: 'x', email: 'x@y.z', phone: '', notes: '', status: 'pending', createdAt: '' };
    const busy = busyFromBookings([booked]);
    expect(isSlotBookable(enabled(), 'consultation', '2026-10-13T20:00:00.000Z', busy, now)).toBe(false);
    expect(isSlotBookable(enabled(), 'consultation', '2026-10-13T20:30:00.000Z', busy, now)).toBe(false);
    expect(isSlotBookable(enabled(), 'consultation', '2026-10-13T21:00:00.000Z', busy, now)).toBe(true);
    expect(isSlotBookable(enabled(), 'consultation', '2026-10-13T20:00:00.000Z', busyFromBookings([{ ...booked, status: 'declined' }]), now)).toBe(true);
    expect(isSlotBookable(enabled(), 'consultation', '2026-10-13T20:10:00.000Z', [], now)).toBe(false); // off-grid
  });
  it('sanitises untrusted settings', () => {
    const s = sanitizeBookingSettings({ enabled: true, timezone: 'Not/AZone', services: [{ name: ' Mow ', durationMin: 9999 }, { name: '' }], weekly: { mon: [{ start: '17:00', end: '09:00' }, { start: '08:00', end: '12:00' }] }, blackouts: ['2026-12-25', 'bad'] });
    expect(s.timezone).toBe(tz);
    expect(s.services).toEqual([{ id: 'svc-1', name: 'Mow', durationMin: 480 }]);
    expect(s.weekly.mon).toEqual([{ start: '08:00', end: '12:00' }]);
    expect(s.weekly.tue).toEqual([]);
    expect(s.blackouts).toEqual(['2026-12-25']);
  });
  it('builds a valid ics file', () => {
    const ics = buildIcs({ id: 'b1', serviceName: 'Lawn mow, edges', start: '2026-10-13T20:00:00.000Z', end: '2026-10-13T21:00:00.000Z', status: 'accepted' }, 'Pyes Pa Lawn Care');
    expect(ics).toContain('DTSTART:20261013T200000Z');
    expect(ics).toContain('SUMMARY:Lawn mow\\, edges — Pyes Pa Lawn Care');
    expect(ics).toContain('STATUS:CONFIRMED');
    expect(ics.endsWith('\r\n')).toBe(true);
  });
});
