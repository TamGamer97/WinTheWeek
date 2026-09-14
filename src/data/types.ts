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
// `order` is the routine's position in its own manually-arranged list — the
// same order it appears in wherever its instances are shown together (e.g.
// a day's task list on Today). It starts out as creation order but can be
// rearranged by dragging a task on Today; reordering touches only the
// routines visibly involved and leaves everyone else's relative order
// untouched (see reorderRoutines in AppState).
export type Routine = {
  id: number;
  title: string;
  color: string;
  timesPerWeek: number;
  defaultDays: DayKey[];
  schedule: Record<string, DayKey[]>;
  doneDates: Record<string, boolean>;
  order: number;
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

export type ScreenName = 'week' | 'today' | 'settings';

export type SheetMode =
  | 'add'
  | 'routineManage'
  | 'routineEdit'
  | 'day'
  | 'routinePlan'
  | 'moveRoutineDay'
  | null;
