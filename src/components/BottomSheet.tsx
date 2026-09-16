import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/fonts';
import { useAppState } from '../state/AppState';
import { daysForWeek, missedRegularDaysThisWeek } from '../data/schedule';
import { routineColorHex } from '../theme/colors';
import { DayKey } from '../data/types';
import { DAY_KEYS, addDays, dayMeta, formatDayHeading, isoDate, isoForWeekDay, parseISODate, weekIdFor } from '../utils/date';
import { MultiDayPicker, RoutineDayPickerExcluding } from './sheet/DayOptions';
import RoutinePlanDayRow from './sheet/RoutinePlanDayRow';
import {
  GhostButton,
  PrimaryButton,
  SheetDescription,
  SheetHint,
  SheetLabel,
  SheetLinkButton,
  SheetTextInput,
  Stepper,
  TaskColorPicker,
} from './sheet/SheetControls';
import { AddRoutineRow, ManageRoutineRow, ScheduledRoutineRow } from './sheet/DaySheetRoutineRow';
import DraggableTaskList from './DraggableTaskList';
import RoutinePendingRow from './RoutinePendingRow';
import EmptyState from './EmptyState';
import MonthCalendar from './MonthCalendar';
import IconButton from './IconButton';
import { CloseIcon } from '../icons/Icons';

// The two form-based sheet modes ('add' and 'routineEdit') are substantial
// enough — name, color, frequency, schedule — to deserve a full page rather
// than the usual half-height sheet the other (simpler) modes use.
const FULL_PAGE_MODES = new Set(['add', 'routineEdit']);

// Routines are recurring habits, not one-off tasks — "Gym" reads better
// every time it repeats than "Go to the gym" does. These rotate through
// the Name field's placeholder to nudge that without a wall of copy.
const ROUTINE_NAME_EXAMPLES = ['Gym', 'Reading', 'Meditation', 'Journaling'];

const { height: SCREEN_H } = Dimensions.get('window');

export default function BottomSheet() {
  const { colors, shadowPanel } = useTheme();
  const insets = useSafeAreaInsets();
  const { sheetOpen, sheetMode, closeSheet } = useAppState();
  const isFullPage = FULL_PAGE_MODES.has(sheetMode ?? '');

  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(sheetOpen);

  useEffect(() => {
    if (sheetOpen) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SCREEN_H, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [sheetOpen, translateY, backdrop]);

  if (!mounted) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 20 }]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            shadowPanel,
            {
              backgroundColor: colors.paperRaised,
              paddingBottom: Math.max(insets.bottom, 20) + 6,
              paddingTop: isFullPage ? insets.top + 10 : 10,
              borderTopLeftRadius: isFullPage ? 0 : 28,
              borderTopRightRadius: isFullPage ? 0 : 28,
              height: isFullPage ? SCREEN_H : undefined,
              maxHeight: isFullPage ? SCREEN_H : SCREEN_H * 0.82,
              transform: [{ translateY }],
            },
          ]}
        >
          {isFullPage ? (
            <View style={styles.pageHeader}>
              <IconButton onPress={closeSheet}>
                <CloseIcon size={16} color={colors.ink} />
              </IconButton>
            </View>
          ) : (
            <View style={[styles.grabber, { backgroundColor: colors.lineStrong }]} />
          )}
          <SheetBody isFullPage={isFullPage} />
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

function SheetBody({ isFullPage }: { isFullPage: boolean }) {
  const { colors } = useTheme();
  const { sheetMode } = useAppState();

  // Rules-of-hooks safe: every content hook runs on every render (each is
  // cheap — plain useState/useContext reads), and we simply pick the one
  // that matches the active sheet mode. Conditionally calling a *different*
  // subset of hooks per mode would break hook ordering across re-renders.
  const add = useAddContent();
  const routineManage = useRoutineManageContent();
  const routineEdit = useRoutineEditContent();
  const day = useDayContent();
  const routinePlan = useRoutinePlanContent();
  const moveRoutineDay = useMoveRoutineDayContent();
  const monthView = useMonthViewContent();

  const { title, context, body } =
    sheetMode === 'add'
      ? add
      : sheetMode === 'routineManage'
      ? routineManage
      : sheetMode === 'routineEdit'
      ? routineEdit
      : sheetMode === 'day'
      ? day
      : sheetMode === 'routinePlan'
      ? routinePlan
      : sheetMode === 'moveRoutineDay'
      ? moveRoutineDay
      : sheetMode === 'monthView'
      ? monthView
      : { title: '', context: '', body: null as React.ReactNode };

  return (
    <>
      <Text style={[styles.title, isFullPage && styles.pageTitle, { color: colors.ink, fontFamily: fonts.headingSemiBold }]}>
        {title}
      </Text>
      {/* A sheet's context line is always exactly one clause — it truncates
          with an ellipsis rather than ever wrapping into a ragged second
          line, and the copy below is kept short enough that in practice it
          never needs to. */}
      <Text numberOfLines={1} style={[styles.context, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>
        {context}
      </Text>
      <ScrollView
        style={isFullPage ? styles.pageScroll : undefined}
        contentContainerStyle={isFullPage ? styles.pageScrollContent : undefined}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        overScrollMode="never"
      >
        {body}
      </ScrollView>
    </>
  );
}

function useRoutineManageContent() {
  const { routines, openAdd, openRoutineEdit, deleteRoutine, requestConfirm, closeSheet } = useAppState();
  const confirmDelete = (routine: (typeof routines)[number]) =>
    requestConfirm({
      title: `Delete "${routine.title}"?`,
      message: "This removes it from every week, including its history. This can't be undone.",
      confirmLabel: 'Delete',
      icon: 'trash',
      destructive: true,
      onConfirm: () => deleteRoutine(routine.id),
    });
  return {
    title: 'Manage routines',
    context: routines.length ? 'Edit a routine, or remove it' : 'Create a routine to build a weekly rhythm',
    body: (
      <View>
        {routines.length ? (
          routines.map((routine) => (
            <ManageRoutineRow
              key={routine.id}
              title={routine.title}
              color={routine.color}
              timesPerWeek={routine.timesPerWeek}
              defaultDays={routine.defaultDays}
              onEdit={() => openRoutineEdit(routine.id)}
              onDelete={() => confirmDelete(routine)}
            />
          ))
        ) : (
          <EmptyState icon="plus" title="No routines yet" subtitle="Create one to start building a weekly rhythm" />
        )}
        <PrimaryButton label="Add routine" onPress={() => openAdd('unscheduled')} />
        <GhostButton label="Close" onPress={closeSheet} />
      </View>
    ),
  };
}

// The "Schedule" section on both the add and edit forms. A routine's
// `defaultDays` doesn't have to be all-or-nothing: picking fewer days than
// `timesPerWeek` is a valid, deliberate state — those picked days repeat
// every week, and whatever's left over is chosen fresh each week (see the
// two-layer schedule model in docs/PROJECT.md). So this is a single day
// picker, not a fixed/flexible mode switch — forcing that choice would hide
// the useful in-between case (e.g. 2 fixed days, a 3rd that moves around).
function ScheduleSection({
  selectedDays,
  max,
  onToggleDay,
}: {
  selectedDays: DayKey[];
  max: number;
  onToggleDay: (key: DayKey) => void;
}) {
  return (
    <View style={styles.scheduleSection}>
      <SheetLabel>Regular days</SheetLabel>
      <MultiDayPicker selected={selectedDays} max={max} onToggle={onToggleDay} />
      <SheetHint>Select the days this usually happens.</SheetHint>
    </View>
  );
}

function useAddContent() {
  const {
    sheetRoutineFreq,
    sheetTaskColor,
    setTaskColor,
    changeFreq,
    sheetMultiDays,
    sheetMultiMax,
    toggleMultiDay,
    confirmAdd,
    closeSheet,
  } = useAppState();
  const [text, setText] = useState('');

  return {
    title: 'New routine',
    context: 'Set the basics for your routine',
    body: (
      <View>
        <SheetLabel noMarginTop>Name</SheetLabel>
        <SheetTextInput value={text} onChangeText={setText} examples={ROUTINE_NAME_EXAMPLES} />
        <SheetDescription>Keep it short and to the point - e.g. Gym or Reading.</SheetDescription>

        <TaskColorPicker value={sheetTaskColor} onChange={setTaskColor} />
        <Stepper value={sheetRoutineFreq} onChange={changeFreq} />

        <ScheduleSection
          selectedDays={sheetMultiDays}
          max={sheetMultiMax}
          onToggleDay={toggleMultiDay}
        />

        <PrimaryButton label="Create routine" onPress={() => confirmAdd(text, sheetTaskColor)} disabled={!text.trim()} />
        <GhostButton label="Cancel" onPress={closeSheet} />
      </View>
    ),
  };
}

// Edits the routine itself — name, color, weekly frequency, and its
// optional default template — reached from Manage Routines. Never touches
// any specific week's actual plan; those live only in useRoutinePlanContent.
function useRoutineEditContent() {
  const {
    routines,
    sheetRoutineId,
    sheetRoutineFreq,
    sheetTaskColor,
    setTaskColor,
    changeFreq,
    sheetMultiDays,
    sheetMultiMax,
    toggleMultiDay,
    confirmRoutineEdit,
    closeSheet,
  } = useAppState();
  const r = routines.find((r) => r.id === sheetRoutineId);
  const [text, setText] = useState(r?.title ?? '');

  // Opening this mode from Manage Routines is a mode switch within an
  // already-open sheet, not a fresh mount (see the "every content hook
  // runs on every render" note in docs/PROJECT.md) — so this hook's local
  // `text` state can already exist from an earlier render with a stale (or
  // no) routine. Re-sync it explicitly whenever which routine is being
  // edited changes, rather than relying on useState's initializer alone.
  useEffect(() => {
    setText(r?.title ?? '');
    // Only when the *routine being edited* changes — not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetRoutineId]);

  return {
    title: 'Edit routine',
    context: "Update its name, color, and weekly schedule",
    body: (
      <View>
        <SheetLabel noMarginTop>Name</SheetLabel>
        <SheetTextInput value={text} onChangeText={setText} examples={ROUTINE_NAME_EXAMPLES} />
        <SheetDescription>Keep it short and to the point - e.g. Gym or Reading.</SheetDescription>

        <TaskColorPicker value={sheetTaskColor} onChange={setTaskColor} />
        <Stepper value={sheetRoutineFreq} onChange={changeFreq} />

        <ScheduleSection
          selectedDays={sheetMultiDays}
          max={sheetMultiMax}
          onToggleDay={toggleMultiDay}
        />

        <PrimaryButton label="Save changes" onPress={() => confirmRoutineEdit(text)} disabled={!text.trim()} />
        <GhostButton label="Cancel" onPress={closeSheet} />
      </View>
    ),
  };
}

// This popup is about planning a day, not marking work done — so unlike the
// Today screen, there's no checkbox here at all. Instead: routines already
// on this day get a "remove" row, and routines that aren't get an "add"
// row, both driven by the same toggleRoutineForWeekDay used by Manage
// Routines. `sheetDayWeekId` (set by openDaySheet) says which week this
// plans — the week being browsed on the Week screen, or the real current
// week when opened from the Today screen's quick add — never assumed from
// context, so this never accidentally edits the wrong one.
//
// A day (or, for "Not scheduled yet", a whole week) that's already passed
// is a read-only record — see docs/DECISIONS.md. `locked` drives every
// add/remove/reorder affordance below; today itself is never locked.
function useDayContent() {
  const { colors } = useTheme();
  const {
    sheetDayKey,
    sheetDayWeekId,
    tasksFor,
    pendingRoutines,
    routines,
    toggleRoutineForWeekDay,
    openAdd,
    closeSheet,
    todayIso,
    todayWeekId,
  } = useAppState();
  const isUnsched = sheetDayKey === 'unscheduled';
  const wId = sheetDayWeekId ?? '';
  const dayKey = isUnsched ? null : (sheetDayKey as DayKey);
  const d = isUnsched ? null : dayMeta(sheetDayKey as DayKey);
  const dayIso = dayKey ? isoDate(addDays(parseISODate(wId), DAY_KEYS.indexOf(dayKey))) : '';
  const locked = isUnsched ? wId < todayWeekId : dayIso !== '' && dayIso < todayIso;

  let listItems: React.ReactNode;
  if (isUnsched) {
    const pending = pendingRoutines(wId);
    listItems = pending.length ? (
      pending.map((r) => <RoutinePendingRow key={r.id} routine={r} weekId={wId} locked={locked} />)
    ) : (
      <Text style={[styles.empty, { color: colors.muted }]}>{locked ? 'Nothing left unscheduled' : 'All caught up'}</Text>
    );
  } else {
    const key = dayKey as DayKey;
    const scheduled = tasksFor(wId, key);
    const available = routines.filter((r) => !daysForWeek(r, wId).includes(key));

    listItems = (
      <>
        {scheduled.length ? (
          <DraggableTaskList
            tasks={scheduled}
            rowGap={8}
            locked={locked}
            renderTask={(t) => (
              <ScheduledRoutineRow
                title={t.title}
                color={t.color}
                timesPerWeek={t.timesPerWeek}
                onRemove={
                  locked ? undefined : () => toggleRoutineForWeekDay(Number(String(t.id).split('::')[0]), wId, key)
                }
                compact
              />
            )}
          />
        ) : (
          <Text style={[styles.empty, { color: colors.muted }]}>{locked ? 'Nothing was planned' : 'Nothing here yet'}</Text>
        )}

        {locked ? null : !routines.length ? (
          <PrimaryButton label="Create a routine" onPress={() => openAdd(key)} />
        ) : available.length ? (
          <>
            <SheetLabel>Add a routine</SheetLabel>
            {available.map((r) => (
              <AddRoutineRow
                key={r.id}
                title={r.title}
                color={r.color}
                timesPerWeek={r.timesPerWeek}
                onAdd={() => toggleRoutineForWeekDay(r.id, wId, key)}
              />
            ))}
          </>
        ) : null}
      </>
    );
  }

  return {
    title: isUnsched ? 'Not scheduled yet' : d?.label ?? '',
    context: isUnsched
      ? locked
        ? "This week has passed, so it can't be edited"
        : 'Routines with no day chosen yet'
      : `${dayIso ? formatDayHeading(dayIso) : ''} · ${locked ? "Passed — can't be edited" : 'Plan this day'}`,
    body: (
      <View>
        <View style={styles.taskList}>{listItems}</View>
        <PrimaryButton label="Close" onPress={closeSheet} />
      </View>
    ),
  };
}

// Plans a routine's remaining days for the week currently being browsed —
// only ever writes that one week's schedule, never the routine's color,
// frequency, or default template. Each day is shown as a full row (badge,
// day name, and — read-only — whatever else is already on it that week)
// rather than a bare grid of weekday letters, so picking days means seeing
// the week's actual shape instead of guessing at it blind.
function useRoutinePlanContent() {
  const { isDark } = useTheme();
  const {
    routines,
    sheetRoutineId,
    sheetMultiDays,
    sheetMultiMax,
    toggleMultiDay,
    confirmRoutinePlan,
    applyUsualDaysToPlan,
    openRoutineEdit,
    closeSheet,
    weekId,
    weekDays,
    weekLabel,
    isThisWeek,
    todayIso,
    tasksFor,
  } = useAppState();
  const r = routines.find((r) => r.id === sheetRoutineId);
  const usualDays = r?.defaultDays ?? [];
  const matchesUsual =
    usualDays.length === sheetMultiDays.length && usualDays.every((d) => sheetMultiDays.includes(d));
  const routineColor = routineColorHex(r?.color, isDark);
  // See docs/DECISIONS.md: a regular day added mid-week can't retroactively
  // apply to its own already-passed date — flag those rows so the picker
  // explains the shortfall instead of leaving it looking like a mistake.
  const missedRegular = r && isThisWeek ? missedRegularDaysThisWeek(r, weekId, todayIso) : [];
  // Which of the usual days "Use usual days" would try to add are already
  // past this week (and not already locked in) — applyUsualDaysToPlan
  // silently leaves these out (see docs/DECISIONS.md), so flag them here
  // rather than letting the click look like it just didn't work.
  const usualDaysPastSkip = usualDays.filter(
    (d) => isoForWeekDay(weekId, d) < todayIso && !sheetMultiDays.includes(d),
  );

  return {
    title: r?.title ?? '',
    context: `Choose ${r?.timesPerWeek ?? 0} days ${isThisWeek ? 'this week' : `for ${weekLabel}`}`,
    body: (
      <View>
        <SheetLabel noMarginTop>Days</SheetLabel>
        {weekDays.map((day, index) => {
          const picked = sheetMultiDays.includes(day.key);
          // Only the current week can have already-passed days within it —
          // a past week is never reachable here at all (its "Not scheduled
          // yet" section has no add button — see useDayContent).
          const isPast = isThisWeek && day.iso < todayIso;
          const disabled = isPast || (!picked && sheetMultiDays.length >= sheetMultiMax);
          const otherTasks = tasksFor(weekId, day.key).filter(
            (t) => Number(String(t.id).split('::')[0]) !== sheetRoutineId,
          );
          return (
            <RoutinePlanDayRow
              key={day.iso}
              day={day}
              index={index}
              picked={picked}
              disabled={disabled}
              isToday={day.iso === todayIso}
              otherTasks={otherTasks}
              missedRegular={missedRegular.includes(day.key)}
              routineColor={routineColor}
              onToggle={() => toggleMultiDay(day.key)}
            />
          );
        })}
        <SheetHint>
          {sheetMultiDays.length} of {r?.timesPerWeek ?? 0} days chosen
        </SheetHint>
        <View style={styles.usualDaysRow}>
          {usualDays.length && !matchesUsual ? (
            <SheetLinkButton label="Use usual days" onPress={applyUsualDaysToPlan} />
          ) : null}
          {r ? <SheetLinkButton label="Edit usual days" onPress={() => openRoutineEdit(r.id)} /> : null}
        </View>
        {usualDays.length && !matchesUsual && usualDaysPastSkip.length ? (
          <SheetHint>
            {usualDaysPastSkip.length === 1
              ? `${dayMeta(usualDaysPastSkip[0]).label} already passed, so it won't be added`
              : "Some usual days already passed, so they won't be added"}
          </SheetHint>
        ) : null}
        <PrimaryButton label="Save" onPress={confirmRoutinePlan} />
        <GhostButton label="Cancel" onPress={closeSheet} />
      </View>
    ),
  };
}

function useMoveRoutineDayContent() {
  const {
    routines,
    sheetRoutineId,
    sheetRoutineFromDay,
    sheetRoutineFromIso,
    sheetPickedDay,
    pickDay,
    confirmMoveRoutineDay,
    closeSheet,
    todayIso,
    todayWeekId,
  } = useAppState();
  const r = routines.find((r) => r.id === sheetRoutineId);
  const fromLabel = sheetRoutineFromDay ? dayMeta(sheetRoutineFromDay).label : '';
  const takenDays = r && sheetRoutineFromIso ? daysForWeek(r, weekIdFor(parseISODate(sheetRoutineFromIso))) : [];
  // This sheet is only ever reached from the Today screen's task menu (see
  // TaskMenu.tsx, which already hides "Switch day" for a past-day task), so
  // the source is always this real week — excluding its already-passed days
  // as destinations is what stops moving a task backward into the past.
  const pastDays = DAY_KEYS.filter((day) => isoForWeekDay(todayWeekId, day) < todayIso);
  return {
    title: 'Move this day',
    context: `${r?.title ?? ''} — currently ${fromLabel}`,
    body: (
      <View>
        <RoutineDayPickerExcluding
          takenDays={takenDays}
          excludeDay={sheetRoutineFromDay}
          pickedDay={sheetPickedDay}
          onPick={(k) => pickDay(k)}
          pastDays={pastDays}
        />
        <PrimaryButton label="Move to this day" onPress={confirmMoveRoutineDay} />
        <GhostButton label="Cancel" onPress={closeSheet} />
      </View>
    ),
  };
}

// The week selector's calendar button opens this — a full month grid to
// browse and jump the week browser from, independent of the small handful
// of weeks reachable by chevron-tapping.
function useMonthViewContent() {
  const { closeSheet, monthViewGoToToday } = useAppState();
  return {
    title: 'Jump to a week',
    context: 'Tap any date to browse its week',
    body: (
      <View>
        <MonthCalendar />
        <SheetLinkButton label="Jump to today" onPress={monthViewGoToToday} />
        <GhostButton label="Close" onPress={closeSheet} />
      </View>
    ),
  };
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 16,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 24,
    marginTop: 4,
  },
  context: {
    fontSize: 13.5,
    marginBottom: 16,
  },
  pageScroll: {
    flex: 1,
  },
  pageScrollContent: {
    paddingBottom: 24,
  },
  taskList: {
    marginTop: 2,
    marginBottom: 2,
  },
  scheduleSection: {
    marginTop: 8,
  },
  usualDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 16,
  },
  empty: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 24,
  },
});
