import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { androidTextFix, fonts } from '../../theme/fonts';
import { routineColorHex } from '../../theme/colors';
import { DayInfo, RoutineInstance } from '../../data/types';
import { CheckIcon } from '../../icons/Icons';
import PressScale from '../PressScale';
import FadeInUp from '../FadeInUp';

// Why a disabled row can't be picked — shown in place of the "what else is
// planned" line, since that's the more useful fact once a day is off-limits
// at all. A past day is the only reason today; kept as its own component
// (rather than inlining the string) so a future second reason has somewhere
// to go without restructuring the row again.
function DisabledReason({ reason }: { reason: string }) {
  const { colors } = useTheme();
  return (
    <Text numberOfLines={1} style={[styles.meta, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>
      {reason}
    </Text>
  );
}

// What else is already on this day, read-only — the same color-coded inline
// list WeekBoard uses, but without its tap-to-toggle (this row's own tap
// target is the whole card, for the routine being planned, not these).
function OtherTasksLine({ tasks }: { tasks: RoutineInstance[] }) {
  const { colors, isDark } = useTheme();
  if (!tasks.length) {
    return (
      <Text
        numberOfLines={1}
        style={[styles.meta, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}
      >
        Nothing else planned
      </Text>
    );
  }
  return (
    <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.meta, androidTextFix, { fontFamily: fonts.bodyMedium }]}>
      {tasks.map((t, i) => (
        <Text key={t.id}>
          <Text
            style={{
              color: routineColorHex(t.color, isDark),
              opacity: t.done ? 0.55 : 1,
              textDecorationLine: t.done ? 'line-through' : 'none',
            }}
          >
            {t.title}
          </Text>
          {i < tasks.length - 1 ? <Text style={{ color: colors.muted }}>{', '}</Text> : null}
        </Text>
      ))}
    </Text>
  );
}

// One day of the week-plan sheet: the day's own badge/name (same language as
// WeekBoard's rows) plus what's already scheduled that day, so choosing
// which days a routine lands on means seeing the week's real shape instead
// of a bare grid of weekday abbreviations. The toggle on the right adds or
// removes just this routine from this day; `otherTasks` never includes it.
export default function RoutinePlanDayRow({
  day,
  index,
  picked,
  disabled,
  isPast,
  isToday,
  otherTasks,
  routineColor,
  onToggle,
}: {
  day: DayInfo;
  index: number;
  picked: boolean;
  // True for any past day, picked or not — past days are fully locked here,
  // no exceptions. See docs/DECISIONS.md. Also true once the routine's
  // weekly frequency is already fully picked elsewhere (an unpicked day is
  // disabled without being past) — `isPast` distinguishes which reason to
  // show, since only one of them needs explaining on the row itself.
  disabled: boolean;
  isPast: boolean;
  isToday: boolean;
  otherTasks: RoutineInstance[];
  routineColor: string;
  onToggle: () => void;
}) {
  const { colors, radius, shadowCard } = useTheme();

  return (
    <FadeInUp delay={Math.min(index, 6) * 25} duration={240}>
      <PressScale
        scaleTo={0.99}
        onPress={disabled ? undefined : onToggle}
        disabled={disabled}
        style={[
          styles.row,
          {
            backgroundColor: colors.paperRaised,
            borderColor: picked ? routineColor : isToday ? colors.accent : colors.line,
            borderWidth: picked || isToday ? 1.5 : 1,
            borderRadius: radius.md,
            opacity: disabled ? 0.45 : 1,
          },
          shadowCard,
        ]}
      >
        <View
          style={[styles.badge, { backgroundColor: isToday ? colors.accent : colors.paper, borderRadius: radius.sm }]}
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
          <Text style={[styles.dayName, androidTextFix, { color: colors.ink, fontFamily: fonts.headingSemiBold }]}>
            {day.label}
          </Text>
          {isPast ? <DisabledReason reason="This day has passed" /> : <OtherTasksLine tasks={otherTasks} />}
        </View>

        <View
          style={[
            styles.toggle,
            picked
              ? { backgroundColor: routineColor }
              : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.lineStrong },
          ]}
        >
          {picked ? <CheckIcon size={13} color="#fff" /> : null}
        </View>
      </PressScale>
    </FadeInUp>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  badge: {
    width: 44,
    height: 40,
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
    fontSize: 15,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  dayName: {
    fontSize: 14,
  },
  meta: {
    fontSize: 12,
  },
  toggle: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
