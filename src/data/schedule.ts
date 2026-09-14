import { DayKey, Routine } from './types';

// The single place that resolves "which days does this routine land on for
// this specific week" — an explicit override for that week if one exists
// (even an empty one, meaning "cleared for this week"), else the routine's
// default template. Every screen that shows or edits a routine's days for a
// given week goes through this, so none of them can disagree.
export function daysForWeek(routine: Routine, weekId: string): DayKey[] {
  return weekId in routine.schedule ? routine.schedule[weekId] : routine.defaultDays;
}
