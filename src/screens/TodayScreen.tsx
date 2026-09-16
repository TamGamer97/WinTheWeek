import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import ScreenHeader from '../components/ScreenHeader';
import DayStrip from '../components/DayStrip';
import ProgressRow from '../components/ProgressRow';
import EmptyState from '../components/EmptyState';
import DraggableTaskList from '../components/DraggableTaskList';
import SlideDayTransition from '../components/SlideDayTransition';
import PressScale from '../components/PressScale';
import { PrimaryButton } from '../components/sheet/SheetControls';
import { CheckIcon, PlusIcon } from '../icons/Icons';
import { useAppState } from '../state/AppState';
import { formatDayHeading } from '../utils/date';

export default function TodayScreen() {
  const { colors, radius } = useTheme();
  const { currentDay, todayDirection, tasksFor, openSettings, todayWeekDays, todayWeekId, todayDayKey, openDaySheet } =
    useAppState();
  const day = todayWeekDays.find((d) => d.key === currentDay)!;
  const dayTasks = tasksFor(todayWeekId, currentDay);
  const doneCount = dayTasks.filter((t) => t.done).length;
  const allDone = dayTasks.length > 0 && doneCount === dayTasks.length;

  // Reuses the same "plan this day" sheet the Week screen's day popup opens
  // (add/remove existing routines) — always pinned to the real current week
  // (`todayWeekId`), never whatever week is being browsed on the Week
  // screen, and to whichever day is selected in the strip above.
  const addRoutineToDay = () => openDaySheet(currentDay, todayWeekId);

  const renderSection = (label: string, tasks: typeof dayTasks) => {
    if (!tasks.length) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionLabel,
              androidTextFix,
              { color: colors.accent, fontFamily: fonts.bodyBold },
            ]}
          >
            {label}
          </Text>
          <PressScale
            scaleTo={0.88}
            onPress={addRoutineToDay}
            hitSlop={8}
            style={[styles.addBtn, { backgroundColor: colors.accentSoft, borderRadius: radius.pill }]}
          >
            <PlusIcon size={12} color={colors.accent} />
          </PressScale>
        </View>
        {/* Row positions are local to a date. Remount on day changes so
            routines shared by two days cannot animate from their previous
            day's slot while the day-level slide transition is running. */}
        <DraggableTaskList key={currentDay} tasks={tasks} />
      </View>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
      overScrollMode="never"
    >
      <ScreenHeader
        title={day.label}
        subtitle={formatDayHeading(day.iso)}
        onOpenSettings={openSettings}
        paddingBottom={6}
        transitionDayKey={currentDay}
        transitionDirection={todayDirection}
      />

      <DayStrip />
      <ProgressRow done={doneCount} total={dayTasks.length} />

      <SlideDayTransition dayKey={currentDay} direction={todayDirection}>
        <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
          {dayTasks.length === 0 ? (
            <>
              <EmptyState icon="plus" title="Nothing planned" subtitle="Add something, or leave it open" />
              <PrimaryButton label="Add a routine" onPress={addRoutineToDay} />
            </>
          ) : (
            <>
              {renderSection('Routines', dayTasks)}
              {allDone ? (
                <View style={styles.completedState}>
                  <View style={[styles.completedMark, { backgroundColor: colors.accentSoft }]}>
                    <CheckIcon size={16} color={colors.accent} />
                  </View>
                  <Text
                    style={[
                      styles.completedTitle,
                      androidTextFix,
                      { color: colors.ink, fontFamily: fonts.headingSemiBold },
                    ]}
                  >
                    All done for {currentDay === todayDayKey ? 'today' : 'this day'}
                  </Text>
                  <Text
                    style={[
                      styles.completedSubtitle,
                      androidTextFix,
                      { color: colors.muted, fontFamily: fonts.bodyRegular },
                    ]}
                  >
                    Nice work
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      </SlideDayTransition>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 12.5,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  addBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedState: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 24,
  },
  completedMark: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  completedTitle: {
    fontSize: 16,
    marginBottom: 3,
  },
  completedSubtitle: {
    fontSize: 13.5,
  },
});
