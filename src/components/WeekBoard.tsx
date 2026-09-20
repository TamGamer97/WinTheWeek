import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import { DayInfo, RoutineInstance } from '../data/types';
import { routineColorHex } from '../theme/colors';
import FadeInUp from './FadeInUp';
import PressScale from './PressScale';
import { useAppState } from '../state/AppState';

// Color-codes each task by coloring its own title text in the routine's
// color (rather than a small leading dot) — the color still always comes
// from routineColorHex(), so this line, the day popup, and Manage Routines
// never disagree about what color a task is. The comma between titles
// stays a neutral, muted tone so it reads as punctuation rather than
// picking up whichever task's color happens to be nearest. Read-only, on
// purpose — this whole row's own tap target opens the day-planning sheet
// (see WeekRow below), so a task name here doing something else entirely
// (marking it done) would be a confusing nested tap target; completing a
// task is a Today-screen action.
function TaskInline({ tasks, todayIso }: { tasks: RoutineInstance[]; todayIso: string }) {
  const { colors, isDark } = useTheme();

  return (
    <Text
      numberOfLines={1}
      ellipsizeMode="tail"
      style={[styles.taskLine, androidTextFix, { fontFamily: fonts.bodyMedium }]}
    >
      {tasks.map((t, i) => {
        // A past day's tasks are a read-only record — dimmed (rather than
        // the done styling, which would misleadingly read as "completed")
        // so an untouched past task doesn't look live.
        const locked = String(t.id).split('::')[1] < todayIso;
        return (
          <Text key={t.id}>
            <Text
              style={{
                color: t.done ? colors.muted : routineColorHex(t.color, isDark),
                textDecorationLine: t.done ? 'line-through' : 'none',
                opacity: locked && !t.done ? 0.5 : 1,
              }}
            >
              {t.title}
            </Text>
            {i < tasks.length - 1 ? <Text style={{ color: colors.muted }}>{', '}</Text> : null}
          </Text>
        );
      })}
    </Text>
  );
}

function WeekRow({ day, weekId, index }: { day: DayInfo; weekId: string; index: number }) {
  const { colors, radius, shadowCard } = useTheme();
  const { tasksFor, openDaySheet, todayIso } = useAppState();
  const isToday = day.iso === todayIso;
  const dayTasks = tasksFor(weekId, day.key);

  return (
    <FadeInUp delay={Math.min(index, 6) * 30} duration={280}>
      <PressScale
        scaleTo={0.99}
        onPress={() => openDaySheet(day.key, weekId)}
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
          {dayTasks.length ? <TaskInline tasks={dayTasks} todayIso={todayIso} /> : null}
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
