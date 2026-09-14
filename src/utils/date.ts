// Real calendar-date arithmetic for the app's week-planning model. No date
// library needed — just a handful of pure helpers around the native Date.
// Weeks always run Monday → Sunday; a "week id" is the ISO date ('YYYY-MM-DD')
// of that week's Monday, used as the key into a routine's per-week schedule.

import { DayInfo, DayKey } from '../data/types';

export const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_LABEL: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export const DAY_SHORT: Record<DayKey, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Parses an 'YYYY-MM-DD' string as a local-time midnight Date (never UTC —
// avoids the classic off-by-one-day bug when the device isn't at UTC+0).
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

// JS's Date#getDay() is 0=Sunday..6=Saturday; DAY_KEYS is Monday-first, so
// this remaps one to the other.
export function dayKeyOf(d: Date): DayKey {
  return DAY_KEYS[(d.getDay() + 6) % 7];
}

export function startOfWeek(d: Date): Date {
  const day = startOfDay(d);
  const jsDay = day.getDay();
  const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay;
  return addDays(day, diffToMonday);
}

export function weekIdFor(d: Date): string {
  return isoDate(startOfWeek(d));
}

// The 7 real DayInfo entries (weekday, short label, day-of-month, full ISO
// date) for the week starting on `weekStart` (must already be a Monday).
export function getWeekDayInfos(weekStart: Date): DayInfo[] {
  return DAY_KEYS.map((key, i) => {
    const date = addDays(weekStart, i);
    return { key, label: DAY_LABEL[key], short: DAY_SHORT[key], date: String(date.getDate()), iso: isoDate(date) };
  });
}

// Weekday name/abbreviation for a DayKey, with no date attached — for
// contexts that only care which weekday, not which calendar instance of it
// (e.g. "currently Wednesday" in the move-day sheet).
export function dayMeta(key: DayKey): { key: DayKey; label: string; short: string } {
  return { key, label: DAY_LABEL[key], short: DAY_SHORT[key] };
}

// "14 – 20 September" within a month; "28 Sep – 4 Oct" across months;
// "29 Dec 2025 – 4 Jan 2026" across years.
export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth() && weekStart.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${weekStart.getDate()} – ${end.getDate()} ${MONTHS[weekStart.getMonth()]}`;
  }
  const sameYear = weekStart.getFullYear() === end.getFullYear();
  const startLabel = `${weekStart.getDate()} ${MONTHS_SHORT[weekStart.getMonth()]}`;
  const endLabel = sameYear
    ? `${end.getDate()} ${MONTHS_SHORT[end.getMonth()]}`
    : `${end.getDate()} ${MONTHS_SHORT[end.getMonth()]} ${end.getFullYear()}`;
  return `${startLabel} – ${endLabel}`;
}

// "16 September" for a specific day, e.g. a day-sheet's context line.
export function formatDayHeading(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// Whole weeks between two Mondays (positive = b is later), for turning
// "how far is this week from today" into "Last week" / "Next week" labels.
export function weeksBetween(aWeekStart: Date, bWeekStart: Date): number {
  return Math.round((bWeekStart.getTime() - aWeekStart.getTime()) / (7 * 86400000));
}
