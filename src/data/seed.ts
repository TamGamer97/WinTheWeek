import { Routine } from './types';

// Routines: recurring commitments with a weekly frequency. `defaultDays` is
// this routine's usual rhythm — real per-week dates and any week-specific
// overrides are computed at runtime (see utils/date.ts and data/schedule.ts),
// not stored as fixed mock dates.
export const initialRoutines: Routine[] = [
  {
    id: 1,
    title: 'Go to the gym',
    color: 'blue',
    timesPerWeek: 3,
    defaultDays: ['mon', 'wed'],
    schedule: {},
    doneDates: {},
    order: 0,
  },
];

export const initialRoutineIdCounter = 2;
