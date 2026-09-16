import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import { ChevronLeftIcon, ChevronRightIcon } from '../icons/Icons';
import PressScale from './PressScale';
import { Routine } from '../data/types';
import { dayCompletion } from '../data/analytics';
import { formatMonthYear, getMonthGridWeeks } from '../utils/date';
import useMonthTransition from './useMonthTransition';

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const CELL = 34;
const STROKE = 3;
const RADIUS = (CELL - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = CELL / 2;

// A single day's ring: no fill at all for a day with nothing planned (past
// or future — there's nothing to judge); once something was planned, the
// circle itself becomes the readout — a soft red wash at 0%, a soft blue
// wash with a precise blue arc for anything in between, and a solid green
// disc once everything for that day is done. Today is intentionally handled
// by the calendar as an in-progress neutral day, rather than judged yet.
function DayRing({ planned, done }: { planned: number; done: number }) {
  const { colors } = useTheme();
  if (planned === 0) return null;

  const ratio = done / planned;

  if (ratio >= 1) {
    return (
      <Svg width={CELL} height={CELL} style={StyleSheet.absoluteFill}>
        <Circle cx={CENTER} cy={CENTER} r={CELL / 2 - 1} fill={colors.complete} />
      </Svg>
    );
  }

  if (ratio <= 0) {
    return (
      <Svg width={CELL} height={CELL} style={StyleSheet.absoluteFill}>
        <Circle cx={CENTER} cy={CENTER} r={CELL / 2 - 1} fill={colors.dangerSoft} />
      </Svg>
    );
  }

  return (
    <Svg width={CELL} height={CELL} style={StyleSheet.absoluteFill}>
      <Circle cx={CENTER} cy={CENTER} r={CELL / 2 - 1} fill={colors.accentSoft} />
      <Circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS}
        stroke={colors.accent}
        strokeWidth={STROKE}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${CIRCUMFERENCE}`}
        strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
        transform={`rotate(-90 ${CENTER} ${CENTER})`}
      />
    </Svg>
  );
}

export default function ProgressRingCalendar({
  monthAnchor,
  onPrevMonth,
  onNextMonth,
  routines,
  todayIso,
}: {
  monthAnchor: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  routines: Routine[];
  todayIso: string;
}) {
  const { colors, radius } = useTheme();
  const weeks = getMonthGridWeeks(monthAnchor);
  const transitionStyle = useMonthTransition(monthAnchor);

  return (
    <View>
      <View style={styles.header}>
        <PressScale scaleTo={0.9} onPress={onPrevMonth} style={styles.navBtn} hitSlop={6}>
          <ChevronLeftIcon size={15} color={colors.inkSoft} />
        </PressScale>
        <Text style={[styles.headerLabel, androidTextFix, { color: colors.ink, fontFamily: fonts.bodyBold }]}>
          {formatMonthYear(monthAnchor)}
        </Text>
        <PressScale scaleTo={0.9} onPress={onNextMonth} style={styles.navBtn} hitSlop={6}>
          <ChevronRightIcon size={15} color={colors.inkSoft} />
        </PressScale>
      </View>

      <Animated.View style={transitionStyle}>
        <View style={styles.weekdayRow}>
          {WEEKDAY_INITIALS.map((label, i) => (
            <Text key={`${label}-${i}`} style={[styles.weekdayLabel, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyBold }]}>
              {label}
            </Text>
          ))}
        </View>

        {weeks.map((week) => (
          <View key={week[0].iso} style={styles.weekRow}>
            {week.map((day) => {
              const isToday = day.iso === todayIso;
              const isFuture = day.iso > todayIso;
              const isTrackedDay = day.inMonth && !isFuture && !isToday;
              const { planned, done } = isTrackedDay ? dayCompletion(routines, day.iso) : { planned: 0, done: 0 };
              const hasNothingTracked = day.inMonth && (!isTrackedDay || planned === 0);
              return (
                <View key={day.iso} style={styles.dayCell}>
                  <View style={[styles.dayMark, { borderRadius: radius.pill }]}>
                    {day.inMonth && !isToday ? <DayRing planned={planned} done={done} /> : null}
                    <Text
                      style={[
                        styles.dayText,
                        androidTextFix,
                        {
                          color: !day.inMonth ? colors.muted : hasNothingTracked ? colors.muted : planned > 0 && done >= planned ? '#fff' : colors.ink,
                          opacity: day.inMonth ? 1 : 0.35,
                          fontFamily: isToday ? fonts.bodyBold : fonts.bodyRegular,
                        },
                      ]}
                    >
                      {day.dayOfMonth}
                    </Text>
                    {isToday ? <View style={[styles.todayUnderline, { backgroundColor: colors.accent }]} /> : null}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </Animated.View>

      <View style={styles.legend}>
        <LegendDot color={colors.complete} label="Fully done" />
        <LegendDot color={colors.accent} label="Partial" />
        <LegendDot color={colors.dangerSoft} border={colors.line} label="Missed" />
      </View>
    </View>
  );
}

function LegendDot({ color, label, border }: { color: string; label: string; border?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color, borderColor: border ?? 'transparent', borderWidth: border ? 1 : 0 }]} />
      <Text style={[styles.legendLabel, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 15,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
  dayMark: {
    width: CELL,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dayText: {
    fontSize: 12.5,
  },
  todayUnderline: {
    position: 'absolute',
    bottom: 2,
    width: 16,
    height: 2,
    borderRadius: 999,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  legendLabel: {
    fontSize: 11.5,
  },
});
