import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import { ChevronLeftIcon, ChevronRightIcon } from '../icons/Icons';
import PressScale from './PressScale';
import { useAppState } from '../state/AppState';
import { formatMonthYear, getMonthGridWeeks } from '../utils/date';

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// The month-view popup's calendar itself: a month header with prev/next
// navigation, a weekday-initials row, and a grid of every day in that month
// (padded with the tail/head of the neighboring months so every row is a
// full week). Tapping any date jumps the week browser straight to its week;
// the currently-browsed week's whole row gets a soft highlight band so it's
// clear which week is "selected" even before tapping anything, and today
// gets its own outlined marker.
export default function MonthCalendar() {
  const { colors, radius } = useTheme();
  const { monthViewAnchor, monthViewGoToPrevMonth, monthViewGoToNextMonth, weekId, todayIso, goToWeekOf } =
    useAppState();

  const weeks = getMonthGridWeeks(monthViewAnchor);

  return (
    <View>
      <View style={styles.header}>
        <PressScale scaleTo={0.9} onPress={monthViewGoToPrevMonth} style={styles.navBtn} hitSlop={6}>
          <ChevronLeftIcon size={15} color={colors.inkSoft} />
        </PressScale>
        <Text
          style={[styles.headerLabel, androidTextFix, { color: colors.ink, fontFamily: fonts.bodyBold }]}
        >
          {formatMonthYear(monthViewAnchor)}
        </Text>
        <PressScale scaleTo={0.9} onPress={monthViewGoToNextMonth} style={styles.navBtn} hitSlop={6}>
          <ChevronRightIcon size={15} color={colors.inkSoft} />
        </PressScale>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_INITIALS.map((label, i) => (
          <Text
            key={`${label}-${i}`}
            style={[styles.weekdayLabel, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyBold }]}
          >
            {label}
          </Text>
        ))}
      </View>

      {weeks.map((week) => {
        const isCurrentWeek = week[0].iso === weekId;
        return (
          <View
            key={week[0].iso}
            style={[
              styles.weekRow,
              { borderRadius: radius.md },
              isCurrentWeek && { backgroundColor: colors.accentSoft },
            ]}
          >
            {week.map((day) => {
              const isToday = day.iso === todayIso;
              return (
                <PressScale
                  key={day.iso}
                  scaleTo={0.88}
                  onPress={() => goToWeekOf(day.iso)}
                  style={styles.dayCell}
                >
                  <View
                    style={[
                      styles.dayMark,
                      { borderRadius: radius.pill },
                      isToday && { borderWidth: 1.5, borderColor: colors.accent },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        androidTextFix,
                        {
                          color: !day.inMonth ? colors.muted : isToday ? colors.accent : colors.ink,
                          opacity: day.inMonth ? 1 : 0.4,
                          fontFamily: isToday ? fonts.bodyBold : fonts.bodyRegular,
                        },
                      ]}
                    >
                      {day.dayOfMonth}
                    </Text>
                  </View>
                </PressScale>
              );
            })}
          </View>
        );
      })}
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
    marginBottom: 4,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
  },
  weekRow: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dayMark: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 13.5,
  },
});
