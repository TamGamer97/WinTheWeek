export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type DayKeyOrUnscheduled = DayKey | 'unscheduled';

export type DayInfo = {
  key: DayKey;
  label: string;
  short: string;
  date: string; // day-of-month for a specific week, e.g. "16" — see utils/date.ts
  iso: string; // full 'YYYY-MM-DD' for that same specific day
};

// A routine's schedule has two layers:
//  - `defaultDays` is its optional weekly template ("every Wed", say). Leave
//    it empty for a routine with no fixed rhythm — every week then starts
//    unscheduled for it, under "Not scheduled yet".
//  - `schedule` holds explicit per-week overrides, keyed by week id (the
//    ISO date of that week's Monday). A week with no entry here simply
//    falls back to `defaultDays`; editing a single week's plan only ever
//    writes an entry here and never touches the default.
// `doneDates` tracks completion per real calendar day (ISO date), not per
// weekday — so marking this Wednesday's gym done never affects any other
// Wednesday, past or future.
// `order` is the routine's default position, used as a fallback wherever it
// hasn't been manually reordered — new routines start at the end of it. It
// is NOT itself where drag-reordering lives: dragging on a specific day's
// list (Today, or the day-planning sheet) writes into `dayOrder` instead.
// `dayOrder` keys a routine's rank by real calendar day (ISO date), exactly
// like `doneDates` — so reordering, say, this Wednesday's list can never
// reshuffle Monday's, even when the two days share a routine. A date with
// no entry falls back to `order` (see the effective-order resolver in
// AppState's `tasksFor`/`makeRoutineInstance`).
// `defaultDaysHistory` is what keeps editing `defaultDays` from rewriting
// the past: each entry means "before `untilIso`, the regular days were
// `days`". Appended (never mutated) whenever a routine edit actually
// changes `defaultDays`, so `daysForWeek()` can resolve any past day
// against whichever template really applied to it, while today-and-later
// days pick up the new one. See `docs/DECISIONS.md`.
// `createdIso`, when present, prevents a newly-created routine from
// appearing on dates before it. Normally that's just today (a routine
// starts the day it's made) — but if one of its chosen regular days has
// already happened this week, `createdIso` is set to next Monday instead,
// deferring the whole schedule to next week rather than showing up
// mid-week. See docs/DECISIONS.md. It is optional for backwards
// compatibility with routines saved before creation dates were recorded.
export type Routine = {
  id: number;
  createdIso?: string;
  title: string;
  color: string;
  timesPerWeek: number;
  defaultDays: DayKey[];
  schedule: Record<string, DayKey[]>;
  doneDates: Record<string, boolean>;
  order: number;
  dayOrder: Record<string, number>;
  defaultDaysHistory: { untilIso: string; days: DayKey[] }[];
};

// A routine instance rendered on a specific real day — a task-shaped object
// with a composite id of `${routineId}::${iso}`, carrying enough to derive
// its own week id and weekday back out (see utils/date.ts) without a
// separate week parameter.
export type RoutineInstance = {
  id: string;
  title: string;
  color: string;
  done: boolean;
  isRoutine: true;
  timesPerWeek: number;
  order: number;
};

export type TaskLike = RoutineInstance;

export function isRoutineInstance(task: TaskLike): task is RoutineInstance {
  return task.isRoutine === true;
}

export type ScreenName = 'week' | 'today' | 'settings' | 'analytics';

export type SheetMode =
  | 'add'
  | 'routineManage'
  | 'routineEdit'
  | 'day'
  | 'routinePlan'
  | 'moveRoutineDay'
  | 'monthView'
  | null;
