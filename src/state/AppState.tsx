import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  DayKey,
  DayKeyOrUnscheduled,
  DayInfo,
  Routine,
  RoutineInstance,
  ScreenName,
  SheetMode,
} from '../data/types';
import { initialRoutineIdCounter, initialRoutines } from '../data/seed';
import { daysForWeek } from '../data/schedule';
import { DEFAULT_ROUTINE_COLOR } from '../theme/colors';
import {
  DAY_KEYS,
  addDays,
  dayKeyOf,
  formatWeekRange,
  getWeekDayInfos,
  isoDate,
  parseISODate,
  startOfWeek,
  weekIdFor,
} from '../utils/date';

export type MenuAnchor = { x: number; y: number; width: number; height: number };

export type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  // 'trash' reads as a hard, permanent removal (red); 'remove' reads as a
  // lighter, easily-undone one (accent-colored) — see ConfirmDialog.
  icon: 'trash' | 'remove';
  destructive?: boolean;
  onConfirm: () => void;
};

const ROUTINES_STORAGE_KEY = '@cadence/routines/v2';
const LEGACY_ROUTINES_STORAGE_KEY = '@cadence/routines/v1';

function isDayKey(v: unknown): v is DayKey {
  return typeof v === 'string' && (DAY_KEYS as string[]).includes(v);
}

function resolveColor(storedColor: unknown): string {
  // Routine colors are stored as an id (e.g. 'blue'), resolved to an actual
  // hex only at render time via routineColorHex() — the single source of
  // truth every screen reads from. A raw '#...' value here means data saved
  // before that change; fall back to the default rather than carry a
  // now-meaningless hex forward.
  return typeof storedColor === 'string' && !storedColor.startsWith('#') ? storedColor : DEFAULT_ROUTINE_COLOR;
}

function restoreRoutinesV2(value: unknown): Routine[] | null {
  if (!Array.isArray(value)) return null;
  const restored: Routine[] = [];

  for (let index = 0; index < value.length; index++) {
    const item = value[index];
    if (!item || typeof item !== 'object') return null;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== 'number' || typeof record.title !== 'string' || typeof record.timesPerWeek !== 'number') {
      return null;
    }
    if (!Array.isArray(record.defaultDays) || !record.defaultDays.every(isDayKey)) return null;
    if (!record.schedule || typeof record.schedule !== 'object') return null;

    const schedule: Record<string, DayKey[]> = {};
    for (const [weekId, days] of Object.entries(record.schedule as Record<string, unknown>)) {
      if (!Array.isArray(days) || !days.every(isDayKey)) return null;
      schedule[weekId] = days;
    }

    if (!record.doneDates || typeof record.doneDates !== 'object') return null;
    const doneDates = Object.fromEntries(
      Object.entries(record.doneDates as Record<string, unknown>).filter(([, done]) => typeof done === 'boolean'),
    ) as Record<string, boolean>;

    // `order` is new — data saved before drag-reorder existed won't have it,
    // so fall back to the position it was already stored in (i.e. leave its
    // relative order exactly as it was).
    const order = typeof record.order === 'number' ? record.order : index;

    restored.push({
      id: record.id,
      title: record.title,
      color: resolveColor(record.color),
      timesPerWeek: record.timesPerWeek,
      defaultDays: record.defaultDays,
      schedule,
      doneDates,
      order,
    });
  }

  return restored;
}

// One-time upgrade path from the pre-week-planning data shape: a routine's
// old flat `days` list (the only schedule it ever had) becomes its default
// template, and any "done" flags it had are carried onto this real week's
// matching weekdays — the closest meaningful mapping from "done on
// Wednesdays" to an actual date, so existing progress isn't silently lost.
function migrateLegacyRoutines(value: unknown, thisWeekStart: Date): Routine[] | null {
  if (!Array.isArray(value)) return null;
  const restored: Routine[] = [];

  for (let index = 0; index < value.length; index++) {
    const item = value[index];
    if (!item || typeof item !== 'object') return null;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== 'number' || typeof record.title !== 'string' || typeof record.timesPerWeek !== 'number') {
      return null;
    }
    if (!Array.isArray(record.days) || !record.days.every(isDayKey)) return null;
    if (!record.doneMap || typeof record.doneMap !== 'object') return null;

    const doneDates: Record<string, boolean> = {};
    for (const [day, done] of Object.entries(record.doneMap as Record<string, unknown>)) {
      if (isDayKey(day) && done === true) {
        doneDates[isoDate(addDays(thisWeekStart, DAY_KEYS.indexOf(day)))] = true;
      }
    }

    restored.push({
      id: record.id,
      title: record.title,
      color: resolveColor(record.color),
      timesPerWeek: record.timesPerWeek,
      defaultDays: record.days,
      schedule: {},
      doneDates,
      order: index,
    });
  }

  return restored;
}

function makeRoutineInstance(r: Routine, iso: string): RoutineInstance {
  return {
    id: `${r.id}::${iso}`,
    title: r.title,
    color: r.color,
    done: !!r.doneDates[iso],
    isRoutine: true,
    timesPerWeek: r.timesPerWeek,
    order: r.order,
  };
}

type AppStateValue = {
  // data
  routines: Routine[];
  tasksFor: (weekId: string, dayKey: DayKey) => RoutineInstance[];
  pendingRoutines: (weekId: string) => Routine[];

  // navigation
  activeScreen: ScreenName;
  previousScreen: ScreenName;
  currentDay: DayKey;
  todayDirection: 'left' | 'right' | null;
  showScreen: (name: ScreenName) => void;
  selectDay: (key: DayKey) => void;
  openSettings: () => void;
  closeSettings: () => void;

  // today (the Today screen always shows the real current week, regardless
  // of which week is being browsed on the Week screen)
  todayIso: string;
  todayWeekId: string;
  todayDayKey: DayKey;
  todayWeekDays: DayInfo[];

  // week browsing (the Week screen's own, independently navigable week)
  currentWeekStart: Date;
  weekId: string;
  weekDays: DayInfo[];
  weekLabel: string;
  isThisWeek: boolean;
  goToPrevWeek: () => void;
  goToNextWeek: () => void;
  goToThisWeek: () => void;

  // fab
  fabSquishTick: number;
  fabPressed: () => void;
  openRoutineManager: () => void;
  toggleRoutineForDay: (routineId: number, day: DayKey) => void;
  deleteRoutine: (id: number) => void;
  reorderRoutines: (orderedVisibleIds: number[]) => void;

  // task actions
  toggleDone: (id: string) => void;

  // task options popover
  menuItemId: string | null;
  menuAnchor: MenuAnchor | null;
  openTaskMenu: (id: string, anchor: MenuAnchor) => void;
  closeTaskMenu: () => void;
  menuMoveRoutineDay: () => void;
  menuRemoveRoutineDay: (id: string) => void;
  menuEditRoutine: () => void;

  // confirmation dialogs (used for anything destructive or hard to notice
  // if triggered by accident — a full modal, distinct from the sheet system,
  // which is for forms/pickers rather than yes/no prompts)
  confirmRequest: ConfirmRequest | null;
  requestConfirm: (request: ConfirmRequest) => void;
  confirmAction: () => void;
  cancelConfirm: () => void;

  // bottom sheet
  sheetOpen: boolean;
  sheetMode: SheetMode;
  sheetDayKey: DayKeyOrUnscheduled | null;
  sheetPickedDay: DayKey | null;
  sheetTaskColor: string;
  sheetRoutineFreq: number;
  sheetMultiDays: DayKey[];
  sheetMultiMax: number;
  sheetRoutineId: number | null;
  sheetRoutineFromDay: DayKey | null;
  sheetRoutineFromIso: string | null;

  openAdd: (defaultDay: DayKeyOrUnscheduled) => void;
  changeFreq: (delta: number) => void;
  toggleMultiDay: (key: DayKey) => void;
  openDaySheet: (dayKey: DayKeyOrUnscheduled) => void;
  openRoutinePlanner: (id: number) => void;
  openRoutineEdit: (id: number) => void;
  applyUsualDaysToPlan: () => void;
  pickDay: (key: DayKey | null) => void;
  setTaskColor: (color: string) => void;

  confirmAdd: (title: string, color: string) => void;
  confirmRoutinePlan: () => void;
  confirmRoutineEdit: () => void;
  confirmMoveRoutineDay: () => void;
  closeSheet: () => void;
};

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [routines, setRoutines] = useState<Routine[]>(initialRoutines);
  const routineIdCounter = useRef(initialRoutineIdCounter);
  // Every newly-created routine goes to the end of everyone's list, so its
  // `order` just needs to keep counting up past whatever's already there.
  const nextOrderRef = useRef(initialRoutines.length);
  const [hasHydratedRoutines, setHasHydratedRoutines] = useState(false);

  // "Today" is computed once, for the lifetime of this session — real, not
  // mocked, but stable so the UI doesn't shift under someone's finger if a
  // session happens to straddle midnight.
  const todayRef = useRef(new Date());
  const todayWeekStartRef = useRef(startOfWeek(todayRef.current));
  const todayIso = useMemo(() => isoDate(todayRef.current), []);
  const todayWeekId = useMemo(() => isoDate(todayWeekStartRef.current), []);
  const todayDayKey = useMemo(() => dayKeyOf(todayRef.current), []);
  const todayWeekDays = useMemo(() => getWeekDayInfos(todayWeekStartRef.current), []);

  useEffect(() => {
    let active = true;

    const hydrateRoutines = async () => {
      try {
        const rawV2 = await AsyncStorage.getItem(ROUTINES_STORAGE_KEY);
        if (rawV2) {
          const restored = restoreRoutinesV2(JSON.parse(rawV2));
          if (restored) {
            if (active) {
              setRoutines(restored);
              routineIdCounter.current = Math.max(initialRoutineIdCounter, ...restored.map((r) => r.id + 1));
              nextOrderRef.current = Math.max(restored.length, ...restored.map((r) => r.order + 1));
            }
            return;
          }
        }
        const rawV1 = await AsyncStorage.getItem(LEGACY_ROUTINES_STORAGE_KEY);
        if (rawV1) {
          const migrated = migrateLegacyRoutines(JSON.parse(rawV1), todayWeekStartRef.current);
          if (migrated && active) {
            setRoutines(migrated);
            routineIdCounter.current = Math.max(initialRoutineIdCounter, ...migrated.map((r) => r.id + 1));
            nextOrderRef.current = Math.max(migrated.length, ...migrated.map((r) => r.order + 1));
          }
        }
      } catch {
        // Invalid or unavailable storage should never prevent the app from opening.
      } finally {
        if (active) setHasHydratedRoutines(true);
      }
    };

    void hydrateRoutines();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedRoutines) return;
    void AsyncStorage.setItem(ROUTINES_STORAGE_KEY, JSON.stringify(routines)).catch(() => {});
  }, [hasHydratedRoutines, routines]);

  const [activeScreen, setActiveScreen] = useState<ScreenName>('today');
  const [previousScreen, setPreviousScreen] = useState<ScreenName>('today');
  const [currentDay, setCurrentDay] = useState<DayKey>(todayDayKey);
  const [todayDirection, setTodayDirection] = useState<'left' | 'right' | null>(null);

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => todayWeekStartRef.current);
  const weekId = useMemo(() => isoDate(currentWeekStart), [currentWeekStart]);
  const weekDays = useMemo(() => getWeekDayInfos(currentWeekStart), [currentWeekStart]);
  const weekLabel = useMemo(() => formatWeekRange(currentWeekStart), [currentWeekStart]);
  const isThisWeek = weekId === todayWeekId;

  const [fabSquishTick, setFabSquishTick] = useState(0);

  const [menuItemId, setMenuItemId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [sheetDayKey, setSheetDayKey] = useState<DayKeyOrUnscheduled | null>(null);
  const [sheetPickedDay, setSheetPickedDay] = useState<DayKey | null>(null);
  const [sheetTaskColor, setSheetTaskColor] = useState<string>(DEFAULT_ROUTINE_COLOR);
  const [sheetRoutineFreq, setSheetRoutineFreq] = useState(3);
  const [sheetMultiDays, setSheetMultiDays] = useState<DayKey[]>([]);
  const [sheetMultiMax, setSheetMultiMax] = useState(3);
  const [sheetRoutineId, setSheetRoutineId] = useState<number | null>(null);
  const [sheetRoutineFromDay, setSheetRoutineFromDay] = useState<DayKey | null>(null);
  // The exact date (not just weekday) a "Move to another day" action started
  // from — lets confirmMoveRoutineDay compute the right week and carry the
  // done-state of that specific day over to its new one.
  const [sheetRoutineFromIso, setSheetRoutineFromIso] = useState<string | null>(null);

  const sheetMultiMaxRef = useRef(sheetMultiMax);
  sheetMultiMaxRef.current = sheetMultiMax;

  const tasksFor = useCallback(
    (wId: string, dayKey: DayKey): RoutineInstance[] => {
      const iso = isoDate(addDays(parseISODate(wId), DAY_KEYS.indexOf(dayKey)));
      return routines
        .filter((r) => daysForWeek(r, wId).includes(dayKey))
        .map((r) => makeRoutineInstance(r, iso))
        // Always in the routines' own arranged order (drag-reorderable on
        // Today) — independent of completion state, so finishing a task
        // never shuffles the list.
        .sort((a, b) => a.order - b.order);
    },
    [routines],
  );

  const pendingRoutines = useCallback(
    (wId: string) => routines.filter((r) => daysForWeek(r, wId).length < r.timesPerWeek),
    [routines],
  );

  const showScreen = useCallback(
    (name: ScreenName) => {
      setActiveScreen(name);
      if (name === 'today') setCurrentDay(todayDayKey);
      setTodayDirection(null);
    },
    [todayDayKey],
  );

  const selectDay = useCallback((key: DayKey) => {
    setCurrentDay((prev) => {
      if (key === prev) return prev;
      const oldIndex = DAY_KEYS.indexOf(prev);
      const newIndex = DAY_KEYS.indexOf(key);
      setTodayDirection(newIndex > oldIndex ? 'right' : 'left');
      return key;
    });
  }, []);

  const goToPrevWeek = useCallback(() => setCurrentWeekStart((d) => addDays(d, -7)), []);
  const goToNextWeek = useCallback(() => setCurrentWeekStart((d) => addDays(d, 7)), []);
  const goToThisWeek = useCallback(() => setCurrentWeekStart(todayWeekStartRef.current), []);

  const openSettings = useCallback(() => {
    setPreviousScreen(activeScreen);
    setActiveScreen('settings');
  }, [activeScreen]);

  const closeSettings = useCallback(() => {
    showScreen(previousScreen);
  }, [previousScreen, showScreen]);

  const openAdd = useCallback((defaultDay: DayKeyOrUnscheduled) => {
    setSheetMode('add');
    setSheetTaskColor(DEFAULT_ROUTINE_COLOR);
    const picked = defaultDay === 'unscheduled' ? null : (defaultDay as DayKey);
    setSheetPickedDay(picked);
    setSheetRoutineFreq(3);
    // Opened from a specific day (e.g. the Today screen's quick-add) —
    // pre-check that day so "Create routine" plans it there right away,
    // rather than leaving the new routine unscheduled.
    setSheetMultiDays(picked ? [picked] : []);
    setSheetMultiMax(3);
    setSheetOpen(true);
  }, []);

  const fabPressed = useCallback(() => {
    setFabSquishTick((n) => n + 1);
    openAdd(activeScreen === 'week' ? 'unscheduled' : currentDay);
  }, [activeScreen, currentDay, openAdd]);

  const openRoutineManager = useCallback(() => {
    setSheetMode('routineManage');
    setSheetOpen(true);
  }, []);

  // Toggles `routineId` on/off `day` for the week currently being browsed —
  // always writes an explicit override for that one week, and never touches
  // the routine's default template.
  const toggleRoutineForWeekDay = useCallback((routineId: number, wId: string, day: DayKey) => {
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.id !== routineId) return r;
        const current = daysForWeek(r, wId);
        const included = current.includes(day);
        const days = included ? current.filter((d) => d !== day) : [...current, day];
        return { ...r, schedule: { ...r.schedule, [wId]: days } };
      }),
    );
  }, []);

  const toggleRoutineForDay = useCallback(
    (routineId: number, day: DayKey) => toggleRoutineForWeekDay(routineId, weekId, day),
    [toggleRoutineForWeekDay, weekId],
  );

  const deleteRoutine = useCallback((id: number) => {
    setRoutines((prev) => prev.filter((routine) => routine.id !== id));
  }, []);

  // Applies a new relative order for just the routines visible in one drag
  // (e.g. the handful shown in a day's list on Today) — `orderedVisibleIds`
  // is that subset's routine ids, in their new order. Every other routine
  // keeps the exact slot it already held, so reordering one day's list never
  // reshuffles routines that don't appear in it.
  const reorderRoutines = useCallback((orderedVisibleIds: number[]) => {
    setRoutines((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const visible = new Set(orderedVisibleIds);
      const slots: number[] = [];
      sorted.forEach((r, i) => {
        if (visible.has(r.id)) slots.push(i);
      });
      if (slots.length !== orderedVisibleIds.length) return prev;
      const byId = new Map(sorted.map((r) => [r.id, r]));
      const result = [...sorted];
      orderedVisibleIds.forEach((id, i) => {
        const routine = byId.get(id);
        if (routine) result[slots[i]] = routine;
      });
      return result.map((r, i) => (r.order === i ? r : { ...r, order: i }));
    });
  }, []);

  const toggleDone = useCallback((id: string) => {
    if (!id.includes('::')) return;
    const [rid, iso] = id.split('::');
    setRoutines((prev) =>
      prev.map((r) => (String(r.id) === rid ? { ...r, doneDates: { ...r.doneDates, [iso]: !r.doneDates[iso] } } : r)),
    );
  }, []);

  const openTaskMenu = useCallback((id: string, anchor: MenuAnchor) => {
    setMenuItemId(id);
    setMenuAnchor(anchor);
  }, []);

  const closeTaskMenu = useCallback(() => {
    setMenuItemId(null);
    setMenuAnchor(null);
  }, []);

  const requestConfirm = useCallback((request: ConfirmRequest) => {
    setConfirmRequest(request);
  }, []);

  const confirmAction = useCallback(() => {
    setConfirmRequest((current) => {
      current?.onConfirm();
      return null;
    });
  }, []);

  const cancelConfirm = useCallback(() => {
    setConfirmRequest(null);
  }, []);

  const menuMoveRoutineDay = useCallback(() => {
    if (!menuItemId) return;
    const [ridStr, iso] = menuItemId.split('::');
    closeTaskMenu();
    setSheetMode('moveRoutineDay');
    setSheetRoutineId(Number(ridStr));
    setSheetRoutineFromDay(dayKeyOf(parseISODate(iso)));
    setSheetRoutineFromIso(iso);
    setSheetPickedDay(null);
    setSheetOpen(true);
  }, [menuItemId, closeTaskMenu]);

  // Takes the instance id explicitly (rather than reading menuItemId) so it
  // can be handed to requestConfirm as the deferred action, and still work
  // correctly after the task menu popover — and its menuItemId — has
  // already closed while the confirmation dialog is up.
  const menuRemoveRoutineDay = useCallback((id: string) => {
    const [ridStr, iso] = id.split('::');
    const wId = weekIdFor(parseISODate(iso));
    const day = dayKeyOf(parseISODate(iso));
    setRoutines((prev) =>
      prev.map((r) => {
        if (String(r.id) !== ridStr) return r;
        const days = daysForWeek(r, wId).filter((d) => d !== day);
        const doneDates = { ...r.doneDates };
        delete doneDates[iso];
        return { ...r, schedule: { ...r.schedule, [wId]: days }, doneDates };
      }),
    );
  }, []);

  const changeFreq = useCallback((delta: number) => {
    setSheetRoutineFreq((freq) => {
      const next = Math.min(7, Math.max(1, freq + delta));
      setSheetMultiMax(next);
      setSheetMultiDays((days) => (days.length > next ? days.slice(0, next) : days));
      return next;
    });
  }, []);

  const toggleMultiDay = useCallback((key: DayKey) => {
    setSheetMultiDays((prev) => {
      const idx = prev.indexOf(key);
      if (idx >= 0) return prev.filter((d) => d !== key);
      if (prev.length < sheetMultiMaxRef.current) return [...prev, key];
      return prev;
    });
  }, []);

  const openDaySheet = useCallback((dayKey: DayKeyOrUnscheduled) => {
    setSheetMode('day');
    setSheetDayKey(dayKey);
    setSheetOpen(true);
  }, []);

  // Plans a routine's remaining days for the week currently being browsed —
  // never touches its color, frequency, or default template.
  const openRoutinePlanner = useCallback(
    (id: number) => {
      setSheetMode('routinePlan');
      setSheetRoutineId(id);
      const r = routines.find((r) => r.id === id);
      if (r) {
        setSheetMultiDays([...daysForWeek(r, weekId)]);
        setSheetMultiMax(r.timesPerWeek);
      }
      setSheetOpen(true);
    },
    [routines, weekId],
  );

  const applyUsualDaysToPlan = useCallback(() => {
    const r = routines.find((r) => r.id === sheetRoutineId);
    if (!r) return;
    setSheetMultiDays([...r.defaultDays].slice(0, sheetMultiMaxRef.current));
  }, [routines, sheetRoutineId]);

  // Edits the routine itself — its color, weekly frequency, and default
  // template — never a specific week's plan.
  const openRoutineEdit = useCallback(
    (id: number) => {
      setSheetMode('routineEdit');
      setSheetRoutineId(id);
      const r = routines.find((r) => r.id === id);
      if (r) {
        setSheetMultiDays([...r.defaultDays]);
        setSheetMultiMax(r.timesPerWeek);
        setSheetRoutineFreq(r.timesPerWeek);
        setSheetTaskColor(r.color);
      }
      setSheetOpen(true);
    },
    [routines],
  );

  // The task menu's "Edit" action — opens the same routine-edit sheet as
  // Manage Routines, for whichever routine the menu's task belongs to.
  const menuEditRoutine = useCallback(() => {
    if (!menuItemId) return;
    const [ridStr] = menuItemId.split('::');
    closeTaskMenu();
    openRoutineEdit(Number(ridStr));
  }, [menuItemId, closeTaskMenu, openRoutineEdit]);

  const pickDay = useCallback((key: DayKey | null) => {
    setSheetPickedDay(key);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
  }, []);

  const confirmAdd = useCallback(
    (title: string, color: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      const id = routineIdCounter.current++;
      const order = nextOrderRef.current++;
      setRoutines((prev) => [
        ...prev,
        {
          id,
          title: trimmed,
          color,
          timesPerWeek: sheetRoutineFreq,
          defaultDays: [...sheetMultiDays],
          schedule: {},
          doneDates: {},
          order,
        },
      ]);
      closeSheet();
    },
    [sheetMultiDays, sheetRoutineFreq, closeSheet],
  );

  const confirmRoutinePlan = useCallback(() => {
    if (sheetRoutineId == null) {
      closeSheet();
      return;
    }
    const days = [...sheetMultiDays];
    setRoutines((prev) =>
      prev.map((r) => (r.id === sheetRoutineId ? { ...r, schedule: { ...r.schedule, [weekId]: days } } : r)),
    );
    closeSheet();
  }, [sheetRoutineId, sheetMultiDays, weekId, closeSheet]);

  const confirmRoutineEdit = useCallback(() => {
    if (sheetRoutineId == null) {
      closeSheet();
      return;
    }
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === sheetRoutineId
          ? { ...r, color: sheetTaskColor, timesPerWeek: sheetRoutineFreq, defaultDays: [...sheetMultiDays] }
          : r,
      ),
    );
    closeSheet();
  }, [sheetRoutineId, sheetTaskColor, sheetRoutineFreq, sheetMultiDays, closeSheet]);

  const confirmMoveRoutineDay = useCallback(() => {
    if (!sheetPickedDay || !sheetRoutineFromIso || sheetRoutineId == null) {
      closeSheet();
      return;
    }
    const fromIso = sheetRoutineFromIso;
    const toDay = sheetPickedDay;
    const wId = weekIdFor(parseISODate(fromIso));
    const toIso = isoDate(addDays(parseISODate(wId), DAY_KEYS.indexOf(toDay)));
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.id !== sheetRoutineId) return r;
        const current = daysForWeek(r, wId);
        let days = sheetRoutineFromDay ? current.filter((d) => d !== sheetRoutineFromDay) : current;
        if (!days.includes(toDay)) days = [...days, toDay];
        const doneVal = r.doneDates[fromIso] || false;
        const doneDates = { ...r.doneDates };
        delete doneDates[fromIso];
        doneDates[toIso] = doneVal;
        return { ...r, schedule: { ...r.schedule, [wId]: days }, doneDates };
      }),
    );
    closeSheet();
  }, [sheetPickedDay, sheetRoutineFromIso, sheetRoutineFromDay, sheetRoutineId, closeSheet]);

  const value = useMemo<AppStateValue>(
    () => ({
      routines,
      tasksFor,
      pendingRoutines,
      activeScreen,
      previousScreen,
      currentDay,
      todayDirection,
      showScreen,
      selectDay,
      openSettings,
      closeSettings,
      todayIso,
      todayWeekId,
      todayDayKey,
      todayWeekDays,
      currentWeekStart,
      weekId,
      weekDays,
      weekLabel,
      isThisWeek,
      goToPrevWeek,
      goToNextWeek,
      goToThisWeek,
      fabSquishTick,
      fabPressed,
      openRoutineManager,
      toggleRoutineForDay,
      deleteRoutine,
      reorderRoutines,
      toggleDone,
      menuItemId,
      menuAnchor,
      openTaskMenu,
      closeTaskMenu,
      menuMoveRoutineDay,
      menuRemoveRoutineDay,
      menuEditRoutine,
      confirmRequest,
      requestConfirm,
      confirmAction,
      cancelConfirm,
      sheetOpen,
      sheetMode,
      sheetDayKey,
      sheetPickedDay,
      sheetTaskColor,
      sheetRoutineFreq,
      sheetMultiDays,
      sheetMultiMax,
      sheetRoutineId,
      sheetRoutineFromDay,
      sheetRoutineFromIso,
      openAdd,
      changeFreq,
      toggleMultiDay,
      openDaySheet,
      openRoutinePlanner,
      openRoutineEdit,
      applyUsualDaysToPlan,
      pickDay,
      setTaskColor: setSheetTaskColor,
      confirmAdd,
      confirmRoutinePlan,
      confirmRoutineEdit,
      confirmMoveRoutineDay,
      closeSheet,
    }),
    [
      routines,
      tasksFor,
      pendingRoutines,
      activeScreen,
      previousScreen,
      currentDay,
      todayDirection,
      showScreen,
      selectDay,
      openSettings,
      closeSettings,
      todayIso,
      todayWeekId,
      todayDayKey,
      todayWeekDays,
      currentWeekStart,
      weekId,
      weekDays,
      weekLabel,
      isThisWeek,
      goToPrevWeek,
      goToNextWeek,
      goToThisWeek,
      fabSquishTick,
      fabPressed,
      openRoutineManager,
      toggleRoutineForDay,
      deleteRoutine,
      reorderRoutines,
      toggleDone,
      menuItemId,
      menuAnchor,
      openTaskMenu,
      closeTaskMenu,
      menuMoveRoutineDay,
      menuRemoveRoutineDay,
      menuEditRoutine,
      confirmRequest,
      requestConfirm,
      confirmAction,
      cancelConfirm,
      sheetOpen,
      sheetMode,
      sheetDayKey,
      sheetPickedDay,
      sheetTaskColor,
      sheetRoutineFreq,
      sheetMultiDays,
      sheetMultiMax,
      sheetRoutineId,
      sheetRoutineFromDay,
      sheetRoutineFromIso,
      openAdd,
      changeFreq,
      toggleMultiDay,
      openDaySheet,
      openRoutinePlanner,
      openRoutineEdit,
      applyUsualDaysToPlan,
      pickDay,
      setSheetTaskColor,
      confirmAdd,
      confirmRoutinePlan,
      confirmRoutineEdit,
      confirmMoveRoutineDay,
      closeSheet,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within an AppStateProvider');
  return ctx;
}
