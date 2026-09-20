import { DayKey, Routine } from './types';
import { DAY_KEYS, isoForWeekDay } from '../utils/date';

// Which regular days applied on one specific real date — walks
// `defaultDaysHistory` (oldest first) for the snapshot that was still in
// effect then, falling through to the live `defaultDays` once the date is
// at or after every recorded edit.
function defaultDaysAt(routine: Routine, iso: string): DayKey[] {
  for (const snapshot of routine.defaultDaysHistory) {
    if (iso < snapshot.untilIso) return snapshot.days;
  }
  return routine.defaultDays;
}

// Whether `day`'s real date is part of the routine's regular-days template,
// by historical resolution — honoring `defaultDaysHistory` and the
// `createdIso` boundary (see data/types.ts for what each edit/create writes
// there — an edit's snapshot boundary is always next Monday, so this can
// never show a day-set change mid-week; a fresh creation's boundary is
// today, or also next Monday if a picked day had already passed).
function templateIncludes(routine: Routine, iso: string, day: DayKey): boolean {
  if (routine.createdIso && iso < routine.createdIso) return false;
  return defaultDaysAt(routine, iso).includes(day);
}

// The single place that resolves "which days does this routine land on for
// this specific week" — an explicit override for that week if one exists
// (even an empty one, meaning "cleared for this week") always wins outright.
// Otherwise each day is resolved independently against whichever
// `defaultDays` template actually applied on that real date
// (`templateIncludes`) — what lets editing a routine's regular days apply
// from a clean week boundary without rewriting a week that's already
// underway. Every screen that plans or displays a routine's days for a
// given week goes through this, so none of them can disagree.
export function daysForWeek(routine: Routine, weekId: string): DayKey[] {
  if (weekId in routine.schedule) return routine.schedule[weekId];
  return DAY_KEYS.filter((day) => templateIncludes(routine, isoForWeekDay(weekId, day), day));
}
