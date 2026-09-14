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
import { daysForWeek } from '../data/schedule';
import { DayKey } from '../data/types';
import { dayMeta, formatDayHeading, parseISODate, weekIdFor } from '../utils/date';
import { MultiDayPicker, RoutineDayPickerExcluding } from './sheet/DayOptions';
import {
  GhostButton,
  PrimaryButton,
  SheetHint,
  SheetLabel,
  SheetLinkButton,
  SheetTextInput,
  Stepper,
  TaskColorPicker,
} from './sheet/SheetControls';
import { AddRoutineRow, ManageRoutineRow, ScheduledRoutineRow } from './sheet/DaySheetRoutineRow';
import RoutinePendingRow from './RoutinePendingRow';
import EmptyState from './EmptyState';

const { height: SCREEN_H } = Dimensions.get('window');

export default function BottomSheet() {
  const { colors, shadowPanel } = useTheme();
  const insets = useSafeAreaInsets();
  const { sheetOpen, closeSheet } = useAppState();

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
              maxHeight: SCREEN_H * 0.82,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.lineStrong }]} />
          <SheetBody />
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

function SheetBody() {
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
      : { title: '', context: '', body: null as React.ReactNode };

  return (
    <>
      <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.headingSemiBold }]}>{title}</Text>
      {/* A sheet's context line is always exactly one clause — it truncates
          with an ellipsis rather than ever wrapping into a ragged second
          line, and the copy below is kept short enough that in practice it
          never needs to. */}
      <Text numberOfLines={1} style={[styles.context, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>
        {context}
      </Text>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" overScrollMode="never">
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
    context: 'Something you want to do regularly',
    body: (
      <View>
        <SheetTextInput value={text} onChangeText={setText} placeholder="e.g. Go to the gym" autoFocus />
        <TaskColorPicker value={sheetTaskColor} onChange={setTaskColor} />
        <Stepper value={sheetRoutineFreq} onChange={changeFreq} />
        <SheetLabel>Days (optional)</SheetLabel>
        <MultiDayPicker selected={sheetMultiDays} max={sheetMultiMax} onToggle={toggleMultiDay} />
        <SheetHint>
          {sheetMultiDays.length
            ? `${sheetMultiDays.length} of ${sheetRoutineFreq} days chosen`
            : 'Leave blank to plan a different day each week'}
        </SheetHint>
        <PrimaryButton label="Create routine" onPress={() => confirmAdd(text, sheetTaskColor)} />
        <GhostButton label="Cancel" onPress={closeSheet} />
      </View>
    ),
  };
}

// Edits the routine itself — color, weekly frequency, and its optional
// default template — reached from Manage Routines. Never touches any
// specific week's actual plan; those live only in useRoutinePlanContent.
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
  return {
    title: r?.title ?? '',
    context: "This routine's usual color and days",
    body: (
      <View>
        <TaskColorPicker value={sheetTaskColor} onChange={setTaskColor} />
        <Stepper value={sheetRoutineFreq} onChange={changeFreq} />
        <SheetLabel>Default days (optional)</SheetLabel>
        <MultiDayPicker selected={sheetMultiDays} max={sheetMultiMax} onToggle={toggleMultiDay} />
        <SheetHint>
          {sheetMultiDays.length
            ? `${sheetMultiDays.length} of ${sheetRoutineFreq} days chosen`
            : "Leave blank to plan a different day each week"}
        </SheetHint>
        <PrimaryButton label="Save changes" onPress={confirmRoutineEdit} />
        <GhostButton label="Cancel" onPress={closeSheet} />
      </View>
    ),
  };
}

// This popup is about planning a day, not marking work done — so unlike the
// Today screen, there's no checkbox here at all. Instead: routines already
// on this day get a "remove" row, and routines that aren't get an "add"
// row, both driven by the same toggleRoutineForDay used by Manage Routines.
// It always operates on the week currently being browsed on the Week screen.
function useDayContent() {
  const { colors } = useTheme();
  const { sheetDayKey, tasksFor, pendingRoutines, routines, toggleRoutineForDay, openAdd, closeSheet, weekId, weekDays } =
    useAppState();
  const isUnsched = sheetDayKey === 'unscheduled';
  const dayKey = isUnsched ? null : (sheetDayKey as DayKey);
  const d = isUnsched ? null : dayMeta(sheetDayKey as DayKey);
  const dayInfo = isUnsched ? null : weekDays.find((w) => w.key === sheetDayKey);

  let listItems: React.ReactNode;
  if (isUnsched) {
    const pending = pendingRoutines(weekId);
    listItems = pending.length ? (
      pending.map((r) => <RoutinePendingRow key={r.id} routine={r} weekId={weekId} />)
    ) : (
      <Text style={[styles.empty, { color: colors.muted }]}>All caught up</Text>
    );
  } else {
    const key = dayKey as DayKey;
    const scheduled = tasksFor(weekId, key);
    const available = routines.filter((r) => !daysForWeek(r, weekId).includes(key));

    listItems = (
      <>
        {scheduled.length ? (
          scheduled.map((t) => (
            <ScheduledRoutineRow
              key={t.id}
              title={t.title}
              color={t.color}
              timesPerWeek={t.timesPerWeek}
              onRemove={() => toggleRoutineForDay(Number(String(t.id).split('::')[0]), key)}
            />
          ))
        ) : (
          <Text style={[styles.empty, { color: colors.muted }]}>Nothing here yet</Text>
        )}

        {!routines.length ? (
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
                onAdd={() => toggleRoutineForDay(r.id, key)}
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
      ? 'Routines with no day chosen yet'
      : `${dayInfo ? formatDayHeading(dayInfo.iso) : ''} · Plan this day`,
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
// frequency, or default template.
function useRoutinePlanContent() {
  const {
    routines,
    sheetRoutineId,
    sheetMultiDays,
    sheetMultiMax,
    toggleMultiDay,
    confirmRoutinePlan,
    applyUsualDaysToPlan,
    closeSheet,
    weekId,
    weekLabel,
    isThisWeek,
  } = useAppState();
  const r = routines.find((r) => r.id === sheetRoutineId);
  const usualDays = r?.defaultDays ?? [];
  const matchesUsual =
    usualDays.length === sheetMultiDays.length && usualDays.every((d) => sheetMultiDays.includes(d));

  return {
    title: r?.title ?? '',
    context: `Choose ${r?.timesPerWeek ?? 0} days ${isThisWeek ? 'this week' : `for ${weekLabel}`}`,
    body: (
      <View>
        <SheetLabel noMarginTop>Days</SheetLabel>
        <MultiDayPicker selected={sheetMultiDays} max={sheetMultiMax} onToggle={toggleMultiDay} />
        <SheetHint>
          {sheetMultiDays.length} of {r?.timesPerWeek ?? 0} days chosen
        </SheetHint>
        {usualDays.length && !matchesUsual ? (
          <SheetLinkButton label="Use usual days" onPress={applyUsualDaysToPlan} />
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
  } = useAppState();
  const r = routines.find((r) => r.id === sheetRoutineId);
  const fromLabel = sheetRoutineFromDay ? dayMeta(sheetRoutineFromDay).label : '';
  const takenDays = r && sheetRoutineFromIso ? daysForWeek(r, weekIdFor(parseISODate(sheetRoutineFromIso))) : [];
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
        />
        <PrimaryButton label="Move to this day" onPress={confirmMoveRoutineDay} />
        <GhostButton label="Cancel" onPress={closeSheet} />
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
  title: {
    fontSize: 18,
    marginBottom: 4,
  },
  context: {
    fontSize: 13.5,
    marginBottom: 16,
  },
  taskList: {
    marginTop: 2,
    marginBottom: 2,
  },
  empty: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 24,
  },
});
