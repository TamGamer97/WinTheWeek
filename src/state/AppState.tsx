import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { View } from 'react-native';
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
import { daysForWeek, isRetroactiveDay } from '../data/schedule';
import { DEFAULT_ROUTINE_COLOR } from '../theme/colors';
import {
  DAY_KEYS,
  addDays,
  addMonths,
  dayKeyOf,
  formatWeekRange,
  getWeekDayInfos,
  isoDate,
  isoForWeekDay,
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
const ONBOARDING_STORAGE_KEY = '@cadence/onboarding/v1';

// A coach-mark target key — one per real UI element the guided tour can
// point at. Shared between AppState's ref registry and whichever component
// owns that element, so the string isn't duplicated loosely at each call site.
export type CoachTargetKey = 'fabAdd' | 'navWeek' | 'headerAnalytics';

function isDayKey(v: unknown): v is DayKey {
  return typeof v === 'string' && (DAY_KEYS as string[]).includes(v);
}

// Order-independent equality — used to detect whether a routine edit
// actually changed `defaultDays` (and so needs a `defaultDaysHistory`
// snapshot), not just re-saved the same set in a different toggle order.
function sameDayKeySet(a: DayKey[], b: DayKey[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((d) => setA.has(d));
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

    // `dayOrder` is newer still — data saved before per-day reordering
    // existed won't have it, so it just starts empty (every day falls back
    // to `order` until manually reordered).
    let dayOrder: Record<string, number> = {};
    if (record.dayOrder && typeof record.dayOrder === 'object') {
      dayOrder = Object.fromEntries(
        Object.entries(record.dayOrder as Record<string, unknown>).filter(
          (entry): entry is [string, number] => typeof entry[1] === 'number',
        ),
      );
    }

    // `defaultDaysHistory` is newer still too — data saved before past-day
    // locking existed won't have it, so it just starts empty (every past
    // week falls back to the live `defaultDays`, same as it always used to).
    let defaultDaysHistory: { untilIso: string; days: DayKey[] }[] = [];
    if (Array.isArray(record.defaultDaysHistory)) {
      defaultDaysHistory = record.defaultDaysHistory.filter(
        (entry): entry is { untilIso: string; days: DayKey[] } =>
          !!entry &&
          typeof entry === 'object' &&
          typeof (entry as Record<string, unknown>).untilIso === 'string' &&
          Array.isArray((entry as Record<string, unknown>).days) &&
          ((entry as Record<string, unknown>).days as unknown[]).every(isDayKey),
      );
    }

    restored.push({
      id: record.id,
      ...(typeof record.createdIso === 'string' ? { createdIso: record.createdIso } : null),
      title: record.title,
      color: resolveColor(record.color),
      timesPerWeek: record.timesPerWeek,
      defaultDays: record.defaultDays,
      schedule,
      doneDates,
      order,
      dayOrder,
      defaultDaysHistory,
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
      dayOrder: {},
      defaultDaysHistory: [],
    });
  }

  return restored;
}

// A day's list sorts by this — the routine's rank for that specific date if
// it's ever been reordered there, else its default `order`. Keeping the
// per-date override separate from the default is what stops reordering one
// day from reordering every other day that happens to share a routine.
function effectiveOrder(r: Routine, iso: string): number {
  return r.dayOrder[iso] ?? r.order;
}

function makeRoutineInstance(r: Routine, iso: string, retroactive: boolean): RoutineInstance {
  return {
    id: `${r.id}::${iso}`,
    title: r.title,
    color: r.color,
    done: !!r.doneDates[iso],
    isRoutine: true,
    timesPerWeek: r.timesPerWeek,
    order: effectiveOrder(r, iso),
    retroactive,
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
  openAnalytics: () => void;
  closeAnalytics: () => void;

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

  // month-view popup (opened from the week selector's calendar button) —
  // lets the person browse a full month grid and jump the week browser to
  // any date, independent of which week is currently shown behind it.
  monthViewAnchor: Date;
  monthViewGoToPrevMonth: () => void;
  monthViewGoToNextMonth: () => void;
  openMonthView: () => void;
  goToWeekOf: (iso: string) => void;
  monthViewGoToToday: () => void;

  // fab
  fabSquishTick: number;
  fabPressed: () => void;
  openRoutineManager: () => void;
  toggleRoutineForWeekDay: (routineId: number, weekId: string, day: DayKey) => void;
  deleteRoutine: (id: number) => void;
  // Reorders one specific real day's task list only — see `dayOrder` on
  // `Routine` in data/types.ts.
  reorderRoutinesForDay: (iso: string, orderedVisibleIds: number[]) => void;

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
  // The week the 'day' sheet is planning — explicit rather than read from
  // `weekId`, since it can be opened for the real current week (Today
  // screen's quick-add) while a different week is being browsed on the Week
  // screen; the two must never be conflated (see docs/PROJECT.md).
  sheetDayWeekId: string | null;
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
  clearMultiDays: () => void;
  openDaySheet: (dayKey: DayKeyOrUnscheduled, weekId: string) => void;
  openRoutinePlanner: (id: number) => void;
  openRoutineEdit: (id: number) => void;
  applyUsualDaysToPlan: () => void;
  pickDay: (key: DayKey | null) => void;
  setTaskColor: (color: string) => void;

  confirmAdd: (title: string, color: string) => void;
  confirmRoutinePlan: () => void;
  confirmRoutineEdit: (title: string) => void;
  confirmMoveRoutineDay: () => void;
  closeSheet: () => void;

  // onboarding: a one-time intro (full-screen slides) followed by a short
  // coach-mark tour, gated on their own persisted flags (see docs/PROJECT.md)
  hasHydratedOnboarding: boolean;
  seenIntro: boolean;
  seenCoachmarks: boolean;
  completeIntro: () => void;
  completeCoachmarks: () => void;
  replayTutorial: () => void;
  // Lets a target element (the FAB, a nav tab, a header icon) register
  // itself so the coach-mark overlay can measure its on-screen position —
  // refs, not state, since registering one shouldn't trigger a re-render.
  registerCoachTarget: (key: CoachTargetKey, node: View | null) => void;
  measureCoachTarget: (key: CoachTargetKey) => Promise<{ x: number; y: number; width: number; height: number } | null>;
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
  // Passed to daysForWeek() wherever a result should include this week's
  // *retroactive* days (see data/schedule.ts) — stable for the session,
  // like todayIso/todayWeekId themselves.
  const todayContext = useMemo(() => ({ iso: todayIso, weekId: todayWeekId }), [todayIso, todayWeekId]);

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

  // Onboarding: both flags default to `false` (never seen) until hydration
  // confirms otherwise, and nothing that reads them is allowed to render
  // before `hasHydratedOnboarding` flips true — see IntroSlides' own gate —
  // so a returning user never sees a one-frame flash of the intro.
  const [seenIntro, setSeenIntro] = useState(false);
  const [seenCoachmarks, setSeenCoachmarks] = useState(false);
  const [hasHydratedOnboarding, setHasHydratedOnboarding] = useState(false);

  useEffect(() => {
    let active = true;

    const hydrateOnboarding = async () => {
      try {
        const raw = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          if (active) {
            if (typeof parsed.seenIntro === 'boolean') setSeenIntro(parsed.seenIntro);
            if (typeof parsed.seenCoachmarks === 'boolean') setSeenCoachmarks(parsed.seenCoachmarks);
          }
        }
      } catch {
        // Invalid or unavailable storage should never prevent the app from opening.
      } finally {
        if (active) setHasHydratedOnboarding(true);
      }
    };

    void hydrateOnboarding();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedOnboarding) return;
    void AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ seenIntro, seenCoachmarks })).catch(() => {});
  }, [hasHydratedOnboarding, seenIntro, seenCoachmarks]);

  const completeIntro = useCallback(() => setSeenIntro(true), []);
  const completeCoachmarks = useCallback(() => setSeenCoachmarks(true), []);

  // A ref registry, not state — a target registering/unregistering itself
  // (e.g. on mount/unmount) shouldn't trigger a re-render of everything that
  // reads AppState. `measureCoachTarget` resolves `null` for an unregistered
  // key so the coach-mark overlay can skip a step gracefully instead of
  // crashing if a target hasn't mounted yet.
  const coachTargets = useRef<Map<CoachTargetKey, View | null>>(new Map());
  const registerCoachTarget = useCallback((key: CoachTargetKey, node: View | null) => {
    if (node) coachTargets.current.set(key, node);
    else coachTargets.current.delete(key);
  }, []);
  const measureCoachTarget = useCallback((key: CoachTargetKey) => {
    const node = coachTargets.current.get(key);
    if (!node) return Promise.resolve(null);
    return new Promise<{ x: number; y: number; width: number; height: number } | null>((resolve) => {
      node.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
    });
  }, []);

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
  const [sheetDayWeekId, setSheetDayWeekId] = useState<string | null>(null);
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
        .filter((r) => daysForWeek(r, wId, todayContext).includes(dayKey))
        .map((r) => makeRoutineInstance(r, iso, isRetroactiveDay(r, wId, dayKey, todayContext)))
        // Always in the routines' own arranged order (drag-reorderable on
        // Today) — independent of completion state, so finishing a task
        // never shuffles the list.
        .sort((a, b) => a.order - b.order);
    },
    [routines, todayContext],
  );

  const pendingRoutines = useCallback(
    (wId: string) => routines.filter((r) => daysForWeek(r, wId, todayContext).length < r.timesPerWeek),
    [routines, todayContext],
  );

  const showScreen = useCallback(
    (name: ScreenName) => {
      setActiveScreen(name);
      if (name === 'today') setCurrentDay(todayDayKey);
      setTodayDirection(null);
    },
    [todayDayKey],
  );

  // Resets onboarding to its just-installed state and lands on Today — the
  // tour's one valid screen — so "replay" behaves exactly like first launch,
  // whichever screen it was triggered from (in practice, Settings).
  const replayTutorial = useCallback(() => {
    setSeenIntro(false);
    setSeenCoachmarks(false);
    showScreen('today');
  }, [showScreen]);

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

  // The month a month-view popup is currently showing — independent of
  // `currentWeekStart` so browsing months doesn't move the week behind it
  // until a date is actually picked.
  const [monthViewAnchor, setMonthViewAnchor] = useState<Date>(() => todayWeekStartRef.current);
  const monthViewGoToPrevMonth = useCallback(() => setMonthViewAnchor((d) => addMonths(d, -1)), []);
  const monthViewGoToNextMonth = useCallback(() => setMonthViewAnchor((d) => addMonths(d, 1)), []);
  const openMonthView = useCallback(() => {
    setMonthViewAnchor(currentWeekStart);
    setSheetMode('monthView');
    setSheetOpen(true);
  }, [currentWeekStart]);

  const openSettings = useCallback(() => {
    setPreviousScreen(activeScreen);
    setActiveScreen('settings');
  }, [activeScreen]);

  const closeSettings = useCallback(() => {
    showScreen(previousScreen);
  }, [previousScreen, showScreen]);

  const openAnalytics = useCallback(() => {
    setPreviousScreen(activeScreen);
    setActiveScreen('analytics');
  }, [activeScreen]);

  const closeAnalytics = useCallback(() => {
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

  // Toggles `routineId` on/off `day` for an explicit week (the caller
  // decides which — the browsed week or the real current one — since this
  // is shared by the Week screen's day popup and the Today screen's quick
  // add) — always writes an explicit override for that one week, and never
  // touches the routine's default template.
  //
  // A past day is a real historical record — adding to one is always
  // blocked (manual retroactive scheduling only ever happens by editing or
  // creating a routine's regular days, never by hand-picking a past day
  // here — see data/schedule.ts's isRetroactiveDay). Removing from a past
  // day is only allowed when it's retroactive in that sense; a genuinely
  // real pre-existing entry stays a no-op, since removing it would erase
  // actual history. See docs/DECISIONS.md.
  const toggleRoutineForWeekDay = useCallback(
    (routineId: number, wId: string, day: DayKey) => {
      const iso = isoForWeekDay(wId, day);
      const isPast = iso < todayIso;
      setRoutines((prev) =>
        prev.map((r) => {
          if (r.id !== routineId) return r;
          const current = daysForWeek(r, wId, todayContext);
          const included = current.includes(day);
          if (included) {
            if (isPast && !isRetroactiveDay(r, wId, day, todayContext)) return r; // real history — protected
            const days = current.filter((d) => d !== day);
            return { ...r, schedule: { ...r.schedule, [wId]: days } };
          }
          if (isPast) return r; // no manual add to a past day, ever
          const days = [...current, day];
          return { ...r, schedule: { ...r.schedule, [wId]: days } };
        }),
      );
    },
    [todayIso, todayContext],
  );

  const deleteRoutine = useCallback((id: number) => {
    setRoutines((prev) => prev.filter((routine) => routine.id !== id));
  }, []);

  // Reorders one real day's task list — `iso` is that specific date,
  // `orderedVisibleIds` its routines' ids in their new order. Writes each
  // routine's rank into `dayOrder[iso]` only, exactly like a per-week
  // schedule override: it fully replaces that one date's order and never
  // touches the routine's default `order`, or any other date's `dayOrder`.
  // That's what keeps a routine shared by two days from having reordering
  // one day reorder the other.
  const reorderRoutinesForDay = useCallback(
    (iso: string, orderedVisibleIds: number[]) => {
      if (iso < todayIso) return;
      setRoutines((prev) =>
        prev.map((r) => {
          const idx = orderedVisibleIds.indexOf(r.id);
          if (idx === -1 || r.dayOrder[iso] === idx) return r;
          return { ...r, dayOrder: { ...r.dayOrder, [iso]: idx } };
        }),
      );
    },
    [todayIso],
  );

  const toggleDone = useCallback(
    (id: string) => {
      if (!id.includes('::')) return;
      const [rid, iso] = id.split('::');
      if (iso < todayIso) return;
      setRoutines((prev) =>
        prev.map((r) => (String(r.id) === rid ? { ...r, doneDates: { ...r.doneDates, [iso]: !r.doneDates[iso] } } : r)),
      );
    },
    [todayIso],
  );

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
  const menuRemoveRoutineDay = useCallback(
    (id: string) => {
      const [ridStr, iso] = id.split('::');
      const wId = weekIdFor(parseISODate(iso));
      const day = dayKeyOf(parseISODate(iso));
      setRoutines((prev) =>
        prev.map((r) => {
          if (String(r.id) !== ridStr) return r;
          // Same retroactive-aware protection as toggleRoutineForWeekDay —
          // a real past entry can't be removed this way either.
          if (iso < todayIso && !isRetroactiveDay(r, wId, day, todayContext)) return r;
          const days = daysForWeek(r, wId, todayContext).filter((d) => d !== day);
          const doneDates = { ...r.doneDates };
          delete doneDates[iso];
          return { ...r, schedule: { ...r.schedule, [wId]: days }, doneDates };
        }),
      );
    },
    [todayIso, todayContext],
  );

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

  // Switching a routine's schedule from "fixed days" to "choose each week"
  // must actually empty the picked days, not just hide the picker — an
  // empty `defaultDays` is what makes a week start unscheduled for it.
  const clearMultiDays = useCallback(() => {
    setSheetMultiDays([]);
  }, []);

  const openDaySheet = useCallback((dayKey: DayKeyOrUnscheduled, wId: string) => {
    setSheetMode('day');
    setSheetDayKey(dayKey);
    setSheetDayWeekId(wId);
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
        setSheetMultiDays([...daysForWeek(r, weekId, todayContext)]);
        setSheetMultiMax(r.timesPerWeek);
      }
      setSheetOpen(true);
    },
    [routines, weekId, todayContext],
  );

  const applyUsualDaysToPlan = useCallback(() => {
    const r = routines.find((r) => r.id === sheetRoutineId);
    if (!r) return;
    // A real (non-retroactive) past day already in the picker is a locked
    // commitment (the picker itself never lets it be toggled off) — "usual
    // days" protects those first, then fills the rest from the routine's
    // template as-is. A past day in the template is legitimately pickable
    // now (it becomes a retroactive instance), so unlike before, it's no
    // longer skipped here.
    setSheetMultiDays(() => {
      const realPast = daysForWeek(r, weekId).filter((d) => isoForWeekDay(weekId, d) < todayIso);
      const usual = r.defaultDays.filter((d) => !realPast.includes(d));
      const room = Math.max(0, sheetMultiMaxRef.current - realPast.length);
      return [...realPast, ...usual.slice(0, room)];
    });
  }, [routines, sheetRoutineId, weekId, todayIso]);

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

  // Tapping any date in the month-view grid jumps the week browser straight
  // to that date's week and dismisses the popup.
  const goToWeekOf = useCallback(
    (iso: string) => {
      setCurrentWeekStart(startOfWeek(parseISODate(iso)));
      closeSheet();
    },
    [closeSheet],
  );

  const monthViewGoToToday = useCallback(() => {
    setCurrentWeekStart(todayWeekStartRef.current);
    closeSheet();
  }, [closeSheet]);

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
          createdIso: todayIso,
          title: trimmed,
          color,
          timesPerWeek: sheetRoutineFreq,
          defaultDays: [...sheetMultiDays],
          schedule: {},
          doneDates: {},
          order,
          dayOrder: {},
          defaultDaysHistory: [],
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
    // The day picker (useRoutinePlanContent) only ever lets a past day be
    // toggled *off* (never freshly picked — see disabled there), so the
    // picker's own selection can be trusted for everything except: force-
    // keep any real (non-retroactive) past day regardless of what the
    // picker shows, protecting history the same way toggleRoutineForWeekDay
    // does. daysForWeek() here is the 2-arg, pure-historical call —
    // deliberately not today-aware, since it's answering "was this day
    // already real" rather than "what should show".
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.id !== sheetRoutineId) return r;
        const historical = daysForWeek(r, weekId);
        const days = [...sheetMultiDays];
        for (const day of historical) {
          if (isoForWeekDay(weekId, day) < todayIso && !days.includes(day)) days.push(day);
        }
        return { ...r, schedule: { ...r.schedule, [weekId]: days } };
      }),
    );
    closeSheet();
  }, [sheetRoutineId, sheetMultiDays, weekId, todayIso, closeSheet]);

  const confirmRoutineEdit = useCallback(
    (title: string) => {
      if (sheetRoutineId == null) {
        closeSheet();
        return;
      }
      const trimmed = title.trim();
      const newDefaultDays = [...sheetMultiDays];
      setRoutines((prev) =>
        prev.map((r) => {
          if (r.id !== sheetRoutineId) return r;
          // Changing the regular days must never rewrite what already-past
          // days resolved to — snapshot the days being replaced, tagged
          // with today, before applying the new ones. daysForWeek() then
          // resolves any date before today against this snapshot (or an
          // earlier one) and today-or-later dates against the new value.
          const defaultDaysHistory = sameDayKeySet(r.defaultDays, newDefaultDays)
            ? r.defaultDaysHistory
            : [...r.defaultDaysHistory, { untilIso: todayIso, days: r.defaultDays }];
          return {
            ...r,
            ...(trimmed ? { title: trimmed } : null),
            color: sheetTaskColor,
            timesPerWeek: sheetRoutineFreq,
            defaultDays: newDefaultDays,
            defaultDaysHistory,
          };
        }),
      );
      closeSheet();
    },
    [sheetRoutineId, sheetTaskColor, sheetRoutineFreq, sheetMultiDays, todayIso, closeSheet],
  );

  const confirmMoveRoutineDay = useCallback(() => {
    if (!sheetPickedDay || !sheetRoutineFromIso || sheetRoutineId == null) {
      closeSheet();
      return;
    }
    const fromIso = sheetRoutineFromIso;
    const toDay = sheetPickedDay;
    const wId = weekIdFor(parseISODate(fromIso));
    const toIso = isoDate(addDays(parseISODate(wId), DAY_KEYS.indexOf(toDay)));
    // The day it's moving to may never be in the past — moving into one
    // would rewrite it. The day being moved *from* may be in the past only
    // if it's retroactive (see data/schedule.ts) — moving away from a real
    // past day would erase its record.
    if (toIso < todayIso) {
      closeSheet();
      return;
    }
    if (fromIso < todayIso) {
      const r = routines.find((r) => r.id === sheetRoutineId);
      if (!r || !sheetRoutineFromDay || !isRetroactiveDay(r, wId, sheetRoutineFromDay, todayContext)) {
        closeSheet();
        return;
      }
    }
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.id !== sheetRoutineId) return r;
        const current = daysForWeek(r, wId, todayContext);
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
  }, [sheetPickedDay, sheetRoutineFromIso, sheetRoutineFromDay, sheetRoutineId, routines, todayIso, todayContext, closeSheet]);

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
      openAnalytics,
      closeAnalytics,
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
      monthViewAnchor,
      monthViewGoToPrevMonth,
      monthViewGoToNextMonth,
      openMonthView,
      goToWeekOf,
      monthViewGoToToday,
      fabSquishTick,
      fabPressed,
      openRoutineManager,
      toggleRoutineForWeekDay,
      deleteRoutine,
      reorderRoutinesForDay,
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
      sheetDayWeekId,
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
      clearMultiDays,
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
      hasHydratedOnboarding,
      seenIntro,
      seenCoachmarks,
      completeIntro,
      completeCoachmarks,
      replayTutorial,
      registerCoachTarget,
      measureCoachTarget,
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
      openAnalytics,
      closeAnalytics,
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
      monthViewAnchor,
      monthViewGoToPrevMonth,
      monthViewGoToNextMonth,
      openMonthView,
      goToWeekOf,
      monthViewGoToToday,
      fabSquishTick,
      fabPressed,
      openRoutineManager,
      toggleRoutineForWeekDay,
      deleteRoutine,
      reorderRoutinesForDay,
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
      sheetDayWeekId,
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
      clearMultiDays,
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
      hasHydratedOnboarding,
      seenIntro,
      seenCoachmarks,
      completeIntro,
      completeCoachmarks,
      replayTutorial,
      registerCoachTarget,
      measureCoachTarget,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within an AppStateProvider');
  return ctx;
}
