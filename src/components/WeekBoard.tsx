import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import { DayInfo, RoutineInstance } from '../data/types';
import { routineColorHex } from '../theme/colors';
import FadeInUp from './FadeInUp';
import PressScale from './PressScale';
import { useAppState } from '../state/AppState';

// Color-codes each task with a small leading dot in the routine's own
// color, rather than coloring the task's title text itself — a handful of
// different-colored words crammed into one small comma-joined line reads
// poorly (low, inconsistent contrast at 12.5px). A dot keeps every title in
// the same easy-to-read ink tone while still carrying the routine's color.
// The color itself always comes from routineColorHex(), so this dot, the
// day popup, and Manage Routines never disagree about what color a task is.
function TaskInline({ tasks, onToggle }: { tasks: RoutineInstance[]; onToggle: (id: string) => void }) {
  const { colors, isDark } = useTheme();

  return (
    <Text
      numberOfLines={1}
      ellipsizeMode="tail"
      style={[styles.taskLine, androidTextFix, { fontFamily: fonts.bodyMedium }]}
    >
      {tasks.map((t, i) => (
        <Text key={t.id} onPress={() => onToggle(String(t.id))}>
          <Text style={{ color: t.done ? colors.line : routineColorHex(t.color, isDark) }}>{'•'}</Text>
          <Text
            style={{
              color: t.done ? colors.muted : colors.inkSoft,
              textDecorationLine: t.done ? 'line-through' : 'none',
            }}
          >
            {' '}
            {t.title}
            {i < tasks.length - 1 ? ', ' : ''}
          </Text>
        </Text>
      ))}
    </Text>
  );
}

function WeekRow({ day, weekId, index }: { day: DayInfo; weekId: string; index: number }) {
  const { colors, radius, shadowCard } = useTheme();
  const { tasksFor, toggleDone, openDaySheet, todayIso } = useAppState();
  const isToday = day.iso === todayIso;
  const dayTasks = tasksFor(weekId, day.key);

  return (
    <FadeInUp delay={Math.min(index, 6) * 30} duration={280}>
      <PressScale
        scaleTo={0.99}
        onPress={() => openDaySheet(day.key)}
        style={[
          styles.row,
          {
            backgroundColor: colors.paperRaised,
            borderColor: isToday ? colors.accent : colors.line,
            borderWidth: isToday ? 1.5 : 1,
            borderRadius: radius.md,
          },
          shadowCard,
        ]}
      >
        <View
          style={[
            styles.badge,
            { backgroundColor: isToday ? colors.accent : colors.paper, borderRadius: radius.sm },
          ]}
        >
          <Text
            style={[
              styles.badgeDay,
              androidTextFix,
              { color: isToday ? 'rgba(255,255,255,0.8)' : colors.muted, fontFamily: fonts.bodySemiBold },
            ]}
          >
            {day.short.toUpperCase()}
          </Text>
          <Text
            style={[
              styles.badgeDate,
              androidTextFix,
              { color: isToday ? '#fff' : colors.ink, fontFamily: fonts.headingBold },
            ]}
          >
            {day.date}
          </Text>
        </View>

        <View style={styles.body}>
          <Text
            style={[
              styles.dayName,
              androidTextFix,
              { color: colors.ink, fontFamily: fonts.headingSemiBold },
            ]}
          >
            {day.label}
          </Text>
          {dayTasks.length ? <TaskInline tasks={dayTasks} onToggle={toggleDone} /> : null}
        </View>
      </PressScale>
    </FadeInUp>
  );
}

export default function WeekBoard() {
  const { weekDays, weekId } = useAppState();
  return (
    <View style={styles.board}>
      {weekDays.map((d, i) => (
        <WeekRow key={d.iso} day={d} weekId={weekId} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    marginHorizontal: 24,
    marginBottom: 14,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  badge: {
    width: 46,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    flexShrink: 0,
  },
  badgeDay: {
    fontSize: 9,
    letterSpacing: 0.4,
  },
  badgeDate: {
    fontSize: 15.5,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  dayName: {
    fontSize: 14,
  },
  taskLine: {
    fontSize: 12.5,
  },
});
