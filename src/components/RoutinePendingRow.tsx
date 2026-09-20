import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import { Routine } from '../data/types';
import { daysForWeek } from '../data/schedule';
import { routineColorHex } from '../theme/colors';
import { PlusIcon, RepeatIcon } from '../icons/Icons';
import FadeInUp from './FadeInUp';
import PressScale from './PressScale';
import { useAppState } from '../state/AppState';

// The unscheduled popup uses the same quiet spine-row language as scheduled
// and available routines in the day popup. Its second metadata line answers
// the only extra question this state has: how many days still need planning.
export default function RoutinePendingRow({ routine, weekId }: { routine: Routine; weekId: string }) {
  const { colors, radius, isDark } = useTheme();
  const { openRoutinePlanner } = useAppState();
  const planned = daysForWeek(routine, weekId).length;
  const remaining = routine.timesPerWeek - planned;
  const complete = remaining <= 0;
  const hex = routineColorHex(routine.color, isDark);
  return (
    <FadeInUp duration={240}>
      <View style={[styles.row, { backgroundColor: colors.paper, borderRadius: radius.lg }]}>
        <View style={[styles.spine, { backgroundColor: hex, borderRadius: radius.sm }]} />
        <View style={styles.body}>
          <Text numberOfLines={1} style={[styles.title, androidTextFix, { color: colors.ink, fontFamily: fonts.bodySemiBold }]}>
            {routine.title}
          </Text>
          <View style={styles.metaRow}>
            <RepeatIcon size={10} color={colors.muted} />
            <Text numberOfLines={1} style={[styles.metaText, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyMedium }]}>
              {routine.timesPerWeek}×/week · {planned} planned
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={[styles.status, androidTextFix, { color: complete ? colors.accent : colors.muted, fontFamily: fonts.bodyMedium }]}
          >
            {complete ? 'Target met' : `Choose ${remaining} more`}
          </Text>
        </View>
        <PressScale
          scaleTo={0.88}
          onPress={() => openRoutinePlanner(routine.id)}
          style={[styles.actionBtn, { backgroundColor: colors.accentSoft }]}
        >
          <PlusIcon size={13} color={colors.accent} />
        </PressScale>
      </View>
    </FadeInUp>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  spine: {
    width: 4,
    height: 32,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  metaText: {
    fontSize: 12,
  },
  status: {
    fontSize: 12,
    marginTop: 2,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
