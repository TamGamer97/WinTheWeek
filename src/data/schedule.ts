import { DayKey, Routine } from './types';
import { DAY_KEYS, addDays, isoDate, parseISODate } from '../utils/date';

// Which regular days applied on one specific real date — walks
// `defaultDaysHistory` (oldest first) for the snapshot that was still in
// effect then, falling through to the live `defaultDays` once the date is
// at or after every recorded edit (i.e. today or later, or never edited).
function defaultDaysAt(routine: Routine, iso: string): DayKey[] {
  for (const snapshot of routine.defaultDaysHistory) {
    if (iso < snapshot.untilIso) return snapshot.days;
  }
  return routine.defaultDays;
}

// The single place that resolves "which days does this routine land on for
// this specific week" — an explicit override for that week if one exists
// (even an empty one, meaning "cleared for this week"), else each day is
// resolved independently against whichever `defaultDays` template actually
// applied on that real date (see `defaultDaysAt`). That per-day resolution
// is what lets editing a routine's regular days apply "from today onward"
// without rewriting a week that's half past, half future. Every screen that
// shows or edits a routine's days for a given week goes through this, so
// none of them can disagree.
export function daysForWeek(routine: Routine, weekId: string): DayKey[] {
  if (weekId in routine.schedule) return routine.schedule[weekId];
  return DAY_KEYS.filter((day) => {
    const iso = isoDate(addDays(parseISODate(weekId), DAY_KEYS.indexOf(day)));
    if (routine.createdIso && iso < routine.createdIso) return false;
    return defaultDaysAt(routine, iso).includes(day);
  });
}

// Days that are part of the routine's *current* regular-days template but
// didn't actually land on this week — because their real date already
// passed before the template changed to include them (see
// `defaultDaysHistory`). Without this, a person who just added, say,
// Monday as a regular day mid-week sees the week still short by one day
// with no obvious reason why, since Monday already happened before the
// edit could apply to it (see docs/DECISIONS.md). Meaningless — and
// always `[]` — for a week with an explicit `schedule[weekId]` override,
// since that replaces the template entirely for that week.
export function missedRegularDaysThisWeek(routine: Routine, weekId: string, todayIso: string): DayKey[] {
  if (weekId in routine.schedule) return [];
  const resolved = daysForWeek(routine, weekId);
  return routine.defaultDays.filter((day) => {
    const iso = isoDate(addDays(parseISODate(weekId), DAY_KEYS.indexOf(day)));
    return iso < todayIso && !resolved.includes(day);
  });
}
