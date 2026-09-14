import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import { ChevronLeftIcon, ChevronRightIcon, TodayNavIcon } from '../icons/Icons';
import PressScale from './PressScale';
import { useAppState } from '../state/AppState';

// Sits directly under the Week screen's header: the week's own date range,
// front and center, with a chevron on either side to browse — one clear
// control instead of a row of separate small buttons. "Jump to this week"
// appears beside it only once you've actually navigated away.
export default function WeekNav() {
  const { colors, radius } = useTheme();
  const { isThisWeek, goToPrevWeek, goToNextWeek, goToThisWeek, weekLabel } = useAppState();

  return (
    <View style={styles.row}>
      <View style={[styles.bar, { backgroundColor: colors.paperRaised, borderColor: colors.line, borderRadius: radius.pill }]}>
        <PressScale scaleTo={0.9} onPress={goToPrevWeek} style={styles.navBtn} hitSlop={6}>
          <ChevronLeftIcon size={15} color={colors.inkSoft} />
        </PressScale>
        <Text
          numberOfLines={1}
          style={[styles.label, androidTextFix, { color: colors.ink, fontFamily: fonts.bodyBold }]}
        >
          {weekLabel}
        </Text>
        <PressScale scaleTo={0.9} onPress={goToNextWeek} style={styles.navBtn} hitSlop={6}>
          <ChevronRightIcon size={15} color={colors.inkSoft} />
        </PressScale>
      </View>

      {!isThisWeek ? (
        <PressScale
          scaleTo={0.9}
          onPress={goToThisWeek}
          style={[styles.todayBtn, { backgroundColor: colors.accentSoft, borderRadius: radius.pill }]}
          hitSlop={4}
        >
          <TodayNavIcon size={16} color={colors.accent} />
        </PressScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 24,
    marginBottom: 14,
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 4,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14.5,
  },
  todayBtn: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
