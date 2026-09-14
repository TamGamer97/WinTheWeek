import React, { useRef } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import { TaskLike } from '../data/types';
import { routineColorHex } from '../theme/colors';
import { RepeatIcon } from '../icons/Icons';
import Check from './Check';
import FadeInUp from './FadeInUp';
import PressScale from './PressScale';
import { useAppState } from '../state/AppState';

type MetaPart = { key: string; icon?: React.ReactNode; label: string };

function MetaRow({
  parts,
  tint,
  muted,
  plain = false,
}: {
  parts: MetaPart[];
  tint: string;
  muted: string;
  plain?: boolean;
}) {
  if (!parts.length) return null;
  return (
    <View style={[styles.meta, plain && styles.metaPlain]}>
      <View style={[styles.metaChip, plain ? styles.metaChipPlain : { backgroundColor: tint + '15' }]}>
        {parts.map((m, i) => (
          <View key={m.key} style={styles.metaItem}>
            {i > 0 && (
              <Text style={[styles.metaDot, androidTextFix, { color: muted }]} accessible={false}>
                ·
              </Text>
            )}
            {m.icon}
            <Text style={[styles.metaText, androidTextFix, { color: muted, fontFamily: fonts.bodyMedium }]}>
              {m.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function TaskRow({
  task,
  animate = true,
  todayStyle = false,
  style,
}: {
  task: TaskLike;
  animate?: boolean;
  todayStyle?: boolean;
  // Lets a caller that manages its own inter-row spacing (the draggable
  // list on Today) cancel out the card's built-in marginBottom instead of
  // double-spacing rows.
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, radius, shadowSoft, isDark } = useTheme();
  const { toggleDone, openTaskMenu } = useAppState();
  const wrapRef = useRef<View>(null);
  // The routine's own chosen color (routineColorHex is the single place this
  // ever resolves), not a hash of the id — so a task shows the same color
  // here as it does on the Week page, the day popup, and Manage Routines.
  const taskColor = routineColorHex(task.color, isDark);
  const spineColor = task.done ? colors.line : taskColor;

  const metaParts: MetaPart[] = [];
  metaParts.push({
    key: 'routine',
    icon: todayStyle ? undefined : <RepeatIcon size={10.5} color={taskColor} />,
    label: `${task.timesPerWeek}×/week`,
  });

  const openMenu = () => {
    wrapRef.current?.measureInWindow((x, y, width, height) => {
      openTaskMenu(String(task.id), { x, y, width, height });
    });
  };

  const content = (
    <View ref={wrapRef} collapsable={false}>
      <PressScale
        scaleTo={0.985}
        onLongPress={openMenu}
        style={[
          styles.card,
          todayStyle && styles.todayCard,
          {
            backgroundColor: colors.paperRaised,
            borderRadius: radius.lg,
            opacity: task.done ? 0.62 : 1,
          },
          shadowSoft,
          style,
        ]}
      >
        <View style={[styles.spine, { backgroundColor: spineColor, borderRadius: radius.sm }]} />

        <View style={styles.body}>
          <Text
            numberOfLines={2}
            style={[
              styles.title,
              androidTextFix,
              {
                color: task.done ? colors.muted : colors.ink,
                fontFamily: fonts.bodySemiBold,
                textDecorationLine: task.done && !todayStyle ? 'line-through' : 'none',
                textDecorationColor: colors.lineStrong,
              },
            ]}
          >
            {task.title}
          </Text>
          <MetaRow parts={metaParts} tint={taskColor} muted={colors.muted} plain={todayStyle} />
        </View>

        <Check
          done={task.done}
          onPress={() => toggleDone(String(task.id))}
          color={taskColor}
          variant={todayStyle ? 'today' : 'default'}
        />
      </PressScale>
    </View>
  );

  if (!animate) return content;
  return <FadeInUp duration={240}>{content}</FadeInUp>;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  spine: {
    width: 4,
    height: 32,
    alignSelf: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 6,
  },
  metaPlain: {
    marginTop: 2,
  },
  metaChip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  metaChipPlain: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaDot: {
    fontSize: 13,
    marginHorizontal: 6,
  },
  metaText: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  todayCard: {
    gap: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
});
