import { DayKey, Routine } from './types';
import { DAY_KEYS, isoForWeekDay } from '../utils/date';

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

// Whether `day`'s real date is part of the routine's regular-days template,
// purely by historical resolution — never consulting `routine.schedule`.
// This is "real" history: what actually applied on that date, honoring
// `defaultDaysHistory` and the `createdIso` boundary. Both `daysForWeek()`
// and `isRetroactiveDay()` are built on this.
function templateIncludes(routine: Routine, iso: string, day: DayKey): boolean {
  if (routine.createdIso && iso < routine.createdIso) return false;
  return defaultDaysAt(routine, iso).includes(day);
}

// A real, already-past date (within the real *current* week — `today.weekId`
// — never a week merely being browsed) where the routine's *current*
// `defaultDays` includes `day`, but `templateIncludes()` above does not —
// i.e. this date only "has" the routine because of a schedule change (a
// fresh creation, or a `defaultDays` edit) that happened after the date
// itself had already passed. Deliberately never looks at `routine.schedule`:
// any toggle already always freezes a whole week into an explicit override,
// and if this checked that override, removing one retroactive day would
// make every *other* still-retroactive day on the same week look "real"
// afterward (no longer removable) — the override can't tell "real" from
// "retroactive in origin" apart once it exists. Keeping this a pure function
// of the routine's template keeps each day's status stable regardless of
// how many other edits touch that week's override. See docs/DECISIONS.md.
export function isRetroactiveDay(
  routine: Routine,
  weekId: string,
  day: DayKey,
  today: { iso: string; weekId: string },
): boolean {
  if (weekId !== today.weekId) return false;
  const iso = isoForWeekDay(weekId, day);
  if (iso >= today.iso) return false;
  if (!routine.defaultDays.includes(day)) return false;
  return !templateIncludes(routine, iso, day);
}

// The single place that resolves "which days does this routine land on for
// this specific week" — an explicit override for that week if one exists
// (even an empty one, meaning "cleared for this week") always wins outright,
// exactly as before. Otherwise each day is resolved independently against
// whichever `defaultDays` template actually applied on that real date
// (`templateIncludes`) — what lets editing a routine's regular days apply
// "from today onward" without rewriting a week that's half past, half
// future.
//
// Pass `today` (the real current date/week — never whatever week the Week
// screen happens to be browsing) to additionally include this week's
// *retroactive* days on top of that historical resolution, but only when
// `weekId` really is the current week and there's no explicit override (an
// override, even one written by removing a retroactive day, always fully
// decides the week from then on — see `isRetroactiveDay`). Every screen
// that plans or displays a routine's days for a given week goes through
// this — with `today` where it should reflect retroactive days (Today/Week
// display, planning), without it where it needs the pure historical record
// (analytics, and anywhere checking whether a day was already *real*).
export function daysForWeek(routine: Routine, weekId: string, today?: { iso: string; weekId: string }): DayKey[] {
  if (weekId in routine.schedule) return routine.schedule[weekId];
  const historical = DAY_KEYS.filter((day) => templateIncludes(routine, isoForWeekDay(weekId, day), day));
  if (!today) return historical;
  const retro = DAY_KEYS.filter((day) => !historical.includes(day) && isRetroactiveDay(routine, weekId, day, today));
  return retro.length ? [...historical, ...retro] : historical;
}
