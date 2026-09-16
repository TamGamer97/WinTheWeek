import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { androidTextFix, fonts } from '../../theme/fonts';
import { routineColorHex } from '../../theme/colors';
import { DAY_KEYS, DAY_SHORT } from '../../utils/date';
import { DayKey } from '../../data/types';
import { EditIcon, PlusIcon, RemoveDayIcon, RepeatIcon, TrashIcon } from '../../icons/Icons';
import PressScale from '../PressScale';

// The day-detail popup is deliberately its own, calmer design — not a reuse
// of the Today screen's TaskRow/Check. There is no "mark done" affordance
// here at all: this popup is about *planning* a day (which routines land on
// it), so the only actions are add/remove. Rows sit in the page's base
// "paper" tone (not paperRaised) since they're nested inside an already-
// raised sheet — a soft recessed slot rather than another floating card.
//
// `color` is always a routine color id (e.g. 'blue'), resolved to a hex via
// routineColorHex() right here — callers just pass the routine's own color
// straight through, so there's only one place this ever turns into a hex.

function Meta({ timesPerWeek, muted }: { timesPerWeek: number; muted: string }) {
  return (
    <View style={styles.metaRow}>
      <RepeatIcon size={10} color={muted} />
      <Text numberOfLines={1} style={[styles.metaText, androidTextFix, { color: muted, fontFamily: fonts.bodyMedium }]}>
        {timesPerWeek}×/week
      </Text>
    </View>
  );
}

export function ScheduledRoutineRow({
  title,
  color,
  timesPerWeek,
  onRemove,
  compact,
}: {
  title: string;
  color: string;
  timesPerWeek: number;
  // Omitted entirely (rather than a disabled button) for a past day's
  // read-only record — there's nothing to undo about something that already
  // happened.
  onRemove?: () => void;
  compact?: boolean;
}) {
  const { colors, radius, isDark } = useTheme();
  const hex = routineColorHex(color, isDark);
  return (
    <View style={[styles.row, compact && styles.compactRow, { backgroundColor: colors.paper, borderRadius: radius.lg }]}>
      <View style={[styles.spine, { backgroundColor: hex, borderRadius: radius.sm }]} />
      <View style={styles.body}>
        <Text
          numberOfLines={1}
          style={[styles.title, androidTextFix, { color: colors.ink, fontFamily: fonts.bodySemiBold }]}
        >
          {title}
        </Text>
        <Meta timesPerWeek={timesPerWeek} muted={colors.muted} />
      </View>
      {onRemove ? (
        <PressScale
          scaleTo={0.88}
          onPress={onRemove}
          style={[styles.actionBtn, { backgroundColor: colors.paperRaised, borderColor: colors.line }]}
        >
          <RemoveDayIcon size={15} color={colors.muted} />
        </PressScale>
      ) : null}
    </View>
  );
}

export function AddRoutineRow({
  title,
  color,
  timesPerWeek,
  onAdd,
}: {
  title: string;
  color: string;
  timesPerWeek: number;
  onAdd: () => void;
}) {
  const { colors, radius, isDark } = useTheme();
  const hex = routineColorHex(color, isDark);
  return (
    <PressScale
      scaleTo={0.985}
      onPress={onAdd}
      style={[styles.row, styles.addRow, { borderColor: colors.lineStrong, borderRadius: radius.lg }]}
    >
      <View style={[styles.dot, { backgroundColor: hex }]} />
      <View style={styles.body}>
        <Text
          numberOfLines={1}
          style={[styles.title, androidTextFix, { color: colors.inkSoft, fontFamily: fonts.bodyMedium }]}
        >
          {title}
        </Text>
        <Meta timesPerWeek={timesPerWeek} muted={colors.muted} />
      </View>
      <View style={[styles.actionBtn, styles.addBtn, { backgroundColor: colors.accentSoft }]}>
        <PlusIcon size={13} color={colors.accent} />
      </View>
    </PressScale>
  );
}

function sortedShortDays(days: DayKey[]): string {
  return [...days]
    .sort((a, b) => DAY_KEYS.indexOf(a) - DAY_KEYS.indexOf(b))
    .map((d) => DAY_SHORT[d])
    .join(', ');
}

// Manage Routines list row — same spine-card language as the day popup's
// rows above, so the two sheets read as one design system instead of two.
// This shows the routine's own template (its default days), not any one
// week's actual plan — editing here changes what future weeks start from,
// never a specific week's schedule. Swaps the old bordered "Edit"/"Delete"
// text buttons for small icon buttons, matching the task menu's pattern.
//
// Frequency belongs with the routine name; the single line beneath it is
// reserved for the useful planning detail (its usual days). This keeps the
// management cards compact while preserving their scan-friendly hierarchy.
export function ManageRoutineRow({
  title,
  color,
  timesPerWeek,
  defaultDays,
  onEdit,
  onDelete,
}: {
  title: string;
  color: string;
  timesPerWeek: number;
  defaultDays: DayKey[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors, radius, isDark } = useTheme();
  const hex = routineColorHex(color, isDark);
  const defaultSummary = defaultDays.length ? `Usually ${sortedShortDays(defaultDays)}` : 'Choose days weekly';

  return (
    <View style={[styles.row, styles.manageRow, { backgroundColor: colors.paper, borderRadius: radius.lg }]}>
      <View style={[styles.spine, { backgroundColor: hex, borderRadius: radius.sm }]} />
      <View style={styles.body}>
        <View style={styles.manageTitleRow}>
          <Text
            numberOfLines={1}
            style={[styles.title, styles.manageTitle, androidTextFix, { color: colors.ink, fontFamily: fonts.bodySemiBold }]}
          >
            {title}
          </Text>
          <Text style={[styles.frequency, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyMedium }]}>
            {timesPerWeek}×/week
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={[styles.manageMeta, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyMedium }]}
        >
          {defaultSummary}
        </Text>
      </View>
      <View style={styles.manageActions}>
        <PressScale
          scaleTo={0.88}
          onPress={onEdit}
          style={[styles.actionBtn, { backgroundColor: colors.paperRaised, borderColor: colors.line }]}
        >
          <EditIcon size={15} color={colors.inkSoft} />
        </PressScale>
        <PressScale
          scaleTo={0.88}
          onPress={onDelete}
          style={[styles.actionBtn, { backgroundColor: colors.paperRaised, borderColor: colors.dangerSoft }]}
        >
          <TrashIcon size={15} color={colors.danger} />
        </PressScale>
      </View>
    </View>
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
  compactRow: {
    marginBottom: 0,
  },
  addRow: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  manageRow: {
    paddingVertical: 10,
    marginBottom: 6,
  },
  spine: {
    width: 4,
    height: 28,
    flexShrink: 0,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14.5,
    lineHeight: 19,
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
  manageMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  manageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  manageTitle: {
    flexShrink: 1,
  },
  frequency: {
    fontSize: 12,
    flexShrink: 0,
  },
  manageActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addBtn: {
    borderWidth: 0,
  },
});
