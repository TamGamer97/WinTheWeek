import { Routine } from './types';

// Fresh installs start with no routines. Existing routines are restored from
// AsyncStorage by AppStateProvider; this empty value is only the pre-hydration
// and no-saved-data fallback.
export const initialRoutines: Routine[] = [];

export const initialRoutineIdCounter = 1;
