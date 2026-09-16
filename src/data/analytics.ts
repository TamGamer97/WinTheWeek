// Pure derived-stat helpers for the Analytics screen — no state of their
// own, just functions of `routines` (+ a date/month) — following the same
// pattern as data/schedule.ts's daysForWeek(). Every completion figure here
// resolves "planned" the same way tasksFor() does (via daysForWeek), so the
// Analytics screen can never disagree with what Today/Week actually show.

import { Routine } from './types';
import { daysForWeek } from './schedule';
import { addDays, dayKeyOf, isoDate, parseISODate, startOfMonth, weekIdFor } from '../utils/date';

export type DayCompletion = { planned: number; done: number };

// Which routines are scheduled on this specific real date, and how many of
// those are actually marked done.
export function dayCompletion(routines: Routine[], iso: string): DayCompletion {
  const date = parseISODate(iso);
  const wId = weekIdFor(date);
  const dKey = dayKeyOf(date);
  let planned = 0;
  let done = 0;
  for (const r of routines) {
    if (daysForWeek(r, wId).includes(dKey)) {
      planned++;
      if (r.doneDates[iso]) done++;
    }
  }
  return { planned, done };
}

// All-time count of completed routine instances, across every routine.
export function totalCompleted(routines: Routine[]): number {
  let total = 0;
  for (const r of routines) {
    for (const done of Object.values(r.doneDates)) if (done) total++;
  }
  return total;
}

// A day only "counts" toward a streak once it's actually happened and had
// something planned: a day with nothing planned is transparently skipped
// (it neither breaks nor extends a streak, since there was nothing to keep
// up), and null distinguishes that from an actual miss.
function dayOutcome(routines: Routine[], iso: string): boolean | null {
  const { planned, done } = dayCompletion(routines, iso);
  if (planned === 0) return null;
  return done === planned;
}

export type Streaks = { current: number; best: number };

// `current` walks backward from today (today itself only adds to it once
// actually complete, but an unfinished today doesn't break it — the day
// isn't over). `best` slides the same rule across the trailing `windowDays`
// days, which is plenty for a personal tracker without an unbounded scan.
export function computeStreaks(routines: Routine[], todayIso: string, windowDays = 180): Streaks {
  const today = parseISODate(todayIso);

  let current = 0;
  if (dayOutcome(routines, todayIso) === true) current++;
  let cursor = addDays(today, -1);
  for (let i = 0; i < windowDays; i++) {
    const outcome = dayOutcome(routines, isoDate(cursor));
    if (outcome === null) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (!outcome) break;
    current++;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  const windowStart = addDays(today, -(windowDays - 1));
  for (let i = 0; i < windowDays; i++) {
    const outcome = dayOutcome(routines, isoDate(addDays(windowStart, i)));
    if (outcome === null) continue;
    if (outcome) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  return { current, best: Math.max(best, current) };
}

export type MonthSummary = { planned: number; done: number; percent: number };

// Sums completion across `monthAnchor`'s month, stopping at today so an
// in-progress current month isn't dragged down by days that simply haven't
// happened yet (a past month sums in full).
export function monthSummary(routines: Routine[], monthAnchor: Date, todayIso: string): MonthSummary {
  const som = startOfMonth(monthAnchor);
  const daysInMonth = new Date(som.getFullYear(), som.getMonth() + 1, 0).getDate();
  const today = parseISODate(todayIso);

  let planned = 0;
  let done = 0;
  for (let d = 0; d < daysInMonth; d++) {
    const date = addDays(som, d);
    if (date.getTime() > today.getTime()) break;
    const c = dayCompletion(routines, isoDate(date));
    planned += c.planned;
    done += c.done;
  }
  return { planned, done, percent: planned === 0 ? 0 : Math.round((done / planned) * 100) };
}

// Same per-day resolution as monthSummary, scoped to a single routine — for
// the per-routine breakdown list ("9 of 12 days this month").
export function routineMonthStats(routine: Routine, monthAnchor: Date, todayIso: string): DayCompletion {
  const som = startOfMonth(monthAnchor);
  const daysInMonth = new Date(som.getFullYear(), som.getMonth() + 1, 0).getDate();
  const today = parseISODate(todayIso);

  let planned = 0;
  let done = 0;
  for (let d = 0; d < daysInMonth; d++) {
    const date = addDays(som, d);
    if (date.getTime() > today.getTime()) break;
    if (daysForWeek(routine, weekIdFor(date)).includes(dayKeyOf(date))) {
      planned++;
      if (routine.doneDates[isoDate(date)]) done++;
    }
  }
  return { planned, done };
}
