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

// The real calendar date a specific weekday falls on within a given week —
// e.g. "Wednesday of the week starting 2026-09-14" → '2026-09-16'. Used
// wherever a weekId+DayKey pair needs to be compared against a real date
// (chiefly: is this day in the past).
export function isoForWeekDay(weekId: string, day: DayKey): string {
  return isoDate(addDays(parseISODate(weekId), DAY_KEYS.indexOf(day)));
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

// --- Month-view calendar helpers -------------------------------------------
// Used by the month-view popup opened from the week selector: a full month
// grid the person can browse and tap a date/week from.

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Shifts by whole calendar months. Only ever called with a start-of-month
// anchor in this app, so there's no day-of-month overflow to worry about
// (e.g. Jan 31 + 1 month landing on Mar 3).
export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
}

// "September 2026"
export function formatMonthYear(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export type MonthDayInfo = {
  iso: string;
  dayOfMonth: number;
  inMonth: boolean;
};

// Full Monday-start weeks covering the month `monthAnchor` falls in, padded
// with the tail of the previous month and the head of the next so every row
// is a complete 7-day week (4–6 rows depending on the month).
export function getMonthGridWeeks(monthAnchor: Date): MonthDayInfo[][] {
  const som = startOfMonth(monthAnchor);
  const eom = new Date(som.getFullYear(), som.getMonth() + 1, 0);
  const gridStart = startOfWeek(som);
  const gridEnd = startOfWeek(eom);
  const weekCount = weeksBetween(gridStart, gridEnd) + 1;

  const weeks: MonthDayInfo[][] = [];
  for (let w = 0; w < weekCount; w++) {
    const week: MonthDayInfo[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(gridStart, w * 7 + i);
      week.push({ iso: isoDate(date), dayOfMonth: date.getDate(), inMonth: date.getMonth() === som.getMonth() });
    }
    weeks.push(week);
  }
  return weeks;
}
