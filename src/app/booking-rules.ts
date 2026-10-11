/**
 * Online bookings: pure rules shared by the server (authoritative checks) and
 * the public widget / owner settings (display). No Angular, no Firestore.
 */

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const WEEKDAY_LABELS: Record<Weekday, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

export interface TimeRange { start: string; end: string } // 'HH:MM' local time
export interface BookableService { id: string; name: string; durationMin: number; price?: string }

export interface BookingSettings {
  enabled: boolean;
  timezone: string;
  services: BookableService[];
  weekly: Record<Weekday, TimeRange[]>;
  blackouts: string[]; // 'YYYY-MM-DD' local dates
  slotStepMin: number;
  leadTimeHours: number;
  maxDaysAhead: number;
}

export type BookingStatus = 'pending' | 'accepted' | 'declined';

export interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  start: string; // ISO UTC
  end: string;   // ISO UTC
  name: string;
  email: string;
  phone: string;
  notes: string;
  status: BookingStatus;
  createdAt: string;
}

export interface BusyInterval { start: string; end: string }

export function defaultBookingSettings(): BookingSettings {
  const day: TimeRange[] = [{ start: '09:00', end: '17:00' }];
  return {
    enabled: false,
    timezone: 'Pacific/Auckland',
    services: [{ id: 'consultation', name: 'Consultation', durationMin: 60 }],
    weekly: { mon: day, tue: day, wed: day, thu: day, fri: day, sat: [], sun: [] },
    blackouts: [],
    slotStepMin: 30,
    leadTimeHours: 2,
    maxDaysAhead: 60,
  };
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const clampInt = (v: unknown, min: number, max: number, d: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Coerce untrusted input into valid settings (drops anything malformed). */
export function sanitizeBookingSettings(raw: unknown): BookingSettings {
  const d = defaultBookingSettings();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  const services = (Array.isArray(r['services']) ? r['services'] : []).slice(0, 30).map((s, i) => {
    const o = (s || {}) as Record<string, unknown>;
    const name = str(o['name'], 80);
    return {
      id: (str(o['id'], 40).replace(/[^a-z0-9-]/gi, '') || `svc-${i + 1}`).toLowerCase(),
      name,
      durationMin: clampInt(o['durationMin'], 5, 8 * 60, 60),
      ...(str(o['price'], 30) ? { price: str(o['price'], 30) } : {}),
    };
  }).filter(s => s.name);
  const weeklyRaw = (r['weekly'] || {}) as Record<string, unknown>;
  const weekly = Object.fromEntries(WEEKDAYS.map(day => {
    const ranges = (Array.isArray(weeklyRaw[day]) ? weeklyRaw[day] as unknown[] : []).slice(0, 4)
      .map(x => (x || {}) as Record<string, unknown>)
      .filter(x => TIME.test(String(x['start'])) && TIME.test(String(x['end'])) && toMinutes(String(x['start'])) < toMinutes(String(x['end'])))
      .map(x => ({ start: String(x['start']), end: String(x['end']) }));
    return [day, ranges];
  })) as Record<Weekday, TimeRange[]>;
  const blackouts = [...new Set((Array.isArray(r['blackouts']) ? r['blackouts'] : []).filter(b => typeof b === 'string' && DATE.test(b)) as string[])].sort().slice(0, 200);
  let timezone = str(r['timezone'], 60) || d.timezone;
  try { new Intl.DateTimeFormat('en-NZ', { timeZone: timezone }); } catch { timezone = d.timezone; }
  return {
    enabled: r['enabled'] === true,
    timezone,
    services,
    weekly,
    blackouts,
    slotStepMin: clampInt(r['slotStepMin'], 5, 240, 30),
    leadTimeHours: clampInt(r['leadTimeHours'], 0, 24 * 14, 2),
    maxDaysAhead: clampInt(r['maxDaysAhead'], 1, 365, 60),
  };
}

/** Offset (ms) of `timeZone` from UTC at instant `date`. */
function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - (date.getTime() - date.getMilliseconds());
}

/** Local wall-clock date+time in `timeZone` → UTC Date (DST-safe for normal hours). */
export function zonedTimeToUtc(dateStr: string, time: string, timeZone: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let utc = guess - tzOffsetMs(new Date(guess), timeZone);
  utc = guess - tzOffsetMs(new Date(utc), timeZone);
  return new Date(utc);
}

/** Local calendar date 'YYYY-MM-DD' of an instant in `timeZone`. */
export function localDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function weekdayOf(dateStr: string): Weekday {
  const [y, m, d] = dateStr.split('-').map(Number);
  return WEEKDAYS[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7];
}

const overlaps = (aS: number, aE: number, bS: number, bE: number) => aS < bE && bS < aE;

/** Active bookings block time; declined ones free it again. */
export function busyFromBookings(bookings: readonly Booking[]): BusyInterval[] {
  return bookings.filter(b => b.status !== 'declined').map(b => ({ start: b.start, end: b.end }));
}

/** Bookable start times for a service on a local date. */
export function availableSlots(settings: BookingSettings, serviceId: string, dateStr: string, busy: readonly BusyInterval[], now: Date): { start: string; end: string }[] {
  const service = settings.services.find(s => s.id === serviceId);
  if (!settings.enabled || !service || !DATE.test(dateStr) || settings.blackouts.includes(dateStr)) return [];
  const earliest = now.getTime() + settings.leadTimeHours * 3600_000;
  const latest = now.getTime() + settings.maxDaysAhead * 86400_000;
  const busyMs = busy.map(b => [Date.parse(b.start), Date.parse(b.end)] as const);
  const out: { start: string; end: string }[] = [];
  for (const range of settings.weekly[weekdayOf(dateStr)] || []) {
    for (let m = toMinutes(range.start); m + service.durationMin <= toMinutes(range.end); m += settings.slotStepMin) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      const start = zonedTimeToUtc(dateStr, `${hh}:${mm}`, settings.timezone).getTime();
      const end = start + service.durationMin * 60_000;
      if (start < earliest || start > latest) continue;
      if (busyMs.some(([s, e]) => overlaps(start, end, s, e))) continue;
      out.push({ start: new Date(start).toISOString(), end: new Date(end).toISOString() });
    }
  }
  return out;
}

/** Authoritative server check: is this exact start a free, valid slot? */
export function isSlotBookable(settings: BookingSettings, serviceId: string, startIso: string, busy: readonly BusyInterval[], now: Date): boolean {
  const t = Date.parse(startIso);
  if (!Number.isFinite(t)) return false;
  const dateStr = localDate(new Date(t), settings.timezone);
  return availableSlots(settings, serviceId, dateStr, busy, now).some(s => Date.parse(s.start) === t);
}

const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** RFC 5545 calendar file for a booking. */
export function buildIcs(b: Pick<Booking, 'id' | 'serviceName' | 'start' | 'end' | 'status'>, businessName: string, location = ''): string {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BusinessFlow Studio//Bookings//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${b.id}@businessflow`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(b.start)}`,
    `DTEND:${icsDate(b.end)}`,
    `SUMMARY:${icsEscape(`${b.serviceName} — ${businessName}`)}`,
    ...(location ? [`LOCATION:${icsEscape(location)}`] : []),
    `STATUS:${b.status === 'accepted' ? 'CONFIRMED' : b.status === 'declined' ? 'CANCELLED' : 'TENTATIVE'}`,
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}

/** Human-friendly local time, e.g. "Tue 14 Oct, 9:30 am". */
export function formatSlot(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-NZ', { timeZone, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}
