import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import { Routine } from '../data/types';
import { daysForWeek } from '../data/schedule';
import { routineColorHex } from '../theme/colors';
import { RepeatIcon } from '../icons/Icons';
import FadeInUp from './FadeInUp';
import PressScale from './PressScale';
import { useAppState } from '../state/AppState';

// The two-line sub text below the title is always exactly two fixed lines —
// the count, then the status — rather than one "X of Y days planned this
// week · target met" string left to wrap wherever it runs out of room.
export default function RoutinePendingRow({ routine, weekId }: { routine: Routine; weekId: string }) {
  const { colors, radius, shadowCard, isDark } = useTheme();
  const { openRoutinePlanner } = useAppState();
  const planned = daysForWeek(routine, weekId).length;
  const remaining = routine.timesPerWeek - planned;
  const complete = remaining <= 0;
  const hex = routineColorHex(routine.color, isDark);

  return (
    <FadeInUp duration={240}>
      <View
        style={[styles.card, { backgroundColor: colors.paperRaised, borderRadius: radius.md }, shadowCard]}
      >
        <View style={[styles.badge, { backgroundColor: hex + '17', borderRadius: radius.sm }]}>
          <RepeatIcon size={16} color={hex} />
        </View>
        <View style={styles.body}>
          <Text numberOfLines={1} style={[styles.title, androidTextFix, { color: colors.ink, fontFamily: fonts.bodySemiBold }]}>
            {routine.title}
          </Text>
          <Text numberOfLines={1} style={[styles.sub, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>
            {planned} of {routine.timesPerWeek} days planned
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.sub, androidTextFix, { color: complete ? colors.accent : colors.muted, fontFamily: fonts.bodyRegular }]}
          >
            {complete ? 'Target met' : `Choose ${remaining} more`}
          </Text>
        </View>
        <PressScale scaleTo={0.95} onPress={() => openRoutinePlanner(routine.id)} style={styles.planBtn}>
          <Text style={[styles.planText, androidTextFix, { color: colors.accent, fontFamily: fonts.bodyBold }]}>
            Plan
          </Text>
        </PressScale>
      </View>
    </FadeInUp>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 10,
  },
  badge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    lineHeight: 21,
  },
  sub: {
    fontSize: 12.5,
    marginTop: 2,
  },
  planBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  planText: {
    fontSize: 13.5,
  },
});
