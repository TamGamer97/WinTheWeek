import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import { DayInfo } from '../data/types';
import PressScale from './PressScale';
import { useAppState } from '../state/AppState';

function DayPip({ day }: { day: DayInfo }) {
  const { colors, shadowCard } = useTheme();
  const { currentDay, selectDay, tasksFor, todayWeekId, todayDayKey } = useAppState();
  const selected = day.key === currentDay;
  const isToday = day.key === todayDayKey;
  const hasTasks = tasksFor(todayWeekId, day.key).length > 0;

  return (
    <PressScale scaleTo={0.92} onPress={() => selectDay(day.key)} style={styles.pip}>
      <Text
        style={[
          styles.label,
          androidTextFix,
          { color: isToday ? colors.highlight : colors.muted, fontFamily: fonts.bodySemiBold },
        ]}
      >
        {day.short.slice(0, 2)}
      </Text>
      <View
        style={[
          styles.number,
          { backgroundColor: selected ? colors.accent : 'transparent' },
          selected && shadowCard,
        ]}
      >
        <Text
          style={[styles.numberText, androidTextFix, { color: selected ? '#fff' : colors.ink, fontFamily: fonts.headingBold }]}
        >
          {day.date}
        </Text>
      </View>
      <View style={[styles.mark, { backgroundColor: colors.accent, opacity: hasTasks ? 1 : 0 }]} />
    </PressScale>
  );
}

export default function DayStrip() {
  const { todayWeekDays } = useAppState();
  return (
    <View style={styles.strip}>
      {todayWeekDays.map((d) => (
        <DayPip key={d.iso} day={d} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 18,
  },
  pip: {
    alignItems: 'center',
    gap: 7,
    padding: 4,
  },
  label: {
    fontSize: 12,
  },
  number: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    // Android can briefly render an elevated view's shadow as a rectangular
    // silhouette instead of clipping it to borderRadius when elevation is
    // toggled on/off between renders (e.g. selecting a different day) —
    // forcing the clip here keeps this badge a circle through that.
    overflow: 'hidden',
  },
  numberText: {
    fontSize: 14,
  },
  mark: {
    width: 4,
    height: 4,
    borderRadius: 999,
    marginTop: -3,
  },
});
