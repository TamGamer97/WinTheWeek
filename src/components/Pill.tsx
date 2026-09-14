import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import { RoutineInstance } from '../data/types';
import { RepeatIcon } from '../icons/Icons';
import PressScale from './PressScale';
import FadeInUp from './FadeInUp';

export function TaskPill({ task, onPress }: { task: RoutineInstance; onPress: () => void }) {
  const { colors } = useTheme();
  const done = task.done;

  return (
    <FadeInUp duration={200} distance={4}>
      <PressScale
        scaleTo={0.94}
        onPress={onPress}
        style={[
          styles.pill,
          {
            backgroundColor: done ? 'transparent' : colors.paper,
            borderColor: done ? colors.lineStrong : colors.line,
            borderStyle: done ? 'dashed' : 'solid',
          },
        ]}
      >
        <RepeatIcon size={12} color={done ? colors.muted : task.color} />
        <Text
          numberOfLines={1}
          style={[
            styles.text,
            androidTextFix,
            {
              color: done ? colors.muted : task.color,
              fontFamily: fonts.bodySemiBold,
              textDecorationLine: done ? 'line-through' : 'none',
              textDecorationColor: colors.lineStrong,
            },
          ]}
        >
          {task.title}
        </Text>
      </PressScale>
    </FadeInUp>
  );
}

export function MorePill({ count, onPress }: { count: number; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <FadeInUp duration={200} distance={4}>
      <PressScale
        scaleTo={0.94}
        onPress={onPress}
        style={[styles.pill, styles.more, { backgroundColor: colors.paper, borderColor: colors.line }]}
      >
        <Text style={[styles.text, androidTextFix, { color: colors.inkSoft, fontFamily: fonts.bodyBold }]}>+{count}</Text>
      </PressScale>
    </FadeInUp>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
    maxWidth: 108,
  },
  more: {
    borderStyle: 'dashed',
    maxWidth: undefined,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  text: {
    fontSize: 12,
    flexShrink: 1,
  },
});
