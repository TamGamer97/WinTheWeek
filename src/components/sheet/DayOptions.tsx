import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { androidTextFix, fonts } from '../../theme/fonts';
import { DAY_KEYS, DAY_SHORT } from '../../utils/date';
import { DayKey } from '../../data/types';
import PressScale from '../PressScale';

type Opt = {
  key: string;
  label: string;
  picked: boolean;
  disabled?: boolean;
  flex?: number;
  onPress?: () => void;
};

function OptChip({ opt }: { opt: Opt }) {
  const { colors } = useTheme();
  return (
    <PressScale
      disabled={opt.disabled}
      onPress={opt.onPress}
      scaleTo={0.95}
      style={[
        styles.opt,
        { flex: opt.flex ?? 1 },
        {
          borderColor: opt.picked ? colors.accent : colors.line,
          backgroundColor: opt.picked ? colors.accentSoft : 'transparent',
          opacity: opt.disabled ? 0.35 : 1,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.text,
          androidTextFix,
          { color: opt.picked ? colors.accent : colors.inkSoft, fontFamily: fonts.bodyBold },
        ]}
      >
        {opt.label}
      </Text>
    </PressScale>
  );
}

function OptionGrid({ opts }: { opts: Opt[] }) {
  const rows: Opt[][] = [];
  for (let i = 0; i < opts.length; i += 4) rows.push(opts.slice(i, i + 4));

  return (
    <View style={styles.grid}>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          {row.map((opt) => <OptChip key={opt.key} opt={opt} />)}
        </View>
      ))}
    </View>
  );
}

export function MultiDayPicker({
  selected,
  max,
  onToggle,
}: {
  selected: DayKey[];
  max: number;
  onToggle: (key: DayKey) => void;
}) {
  const opts: Opt[] = DAY_KEYS.map((key) => {
    const picked = selected.includes(key);
    const disabled = !picked && selected.length >= max;
    return { key, label: DAY_SHORT[key], picked, disabled, onPress: disabled ? undefined : () => onToggle(key) };
  });
  return <OptionGrid opts={opts} />;
}

export function RoutineDayPickerExcluding({
  takenDays,
  excludeDay,
  pickedDay,
  onPick,
  pastDays,
}: {
  takenDays: DayKey[];
  excludeDay: DayKey | null;
  pickedDay: DayKey | null;
  onPick: (key: DayKey) => void;
  // Days that are already in the past, so they can't be picked as a move
  // destination — moving into a past day would rewrite it.
  pastDays?: DayKey[];
}) {
  const opts: Opt[] = DAY_KEYS.map((key) => {
    const takenByThisRoutine = takenDays.includes(key) && key !== excludeDay;
    const isPast = pastDays?.includes(key) ?? false;
    const disabled = takenByThisRoutine || isPast;
    const picked = pickedDay === key;
    return {
      key,
      label: DAY_SHORT[key],
      picked,
      disabled,
      onPress: disabled ? undefined : () => onPick(key),
    };
  });
  return <OptionGrid opts={opts} />;
}

const styles = StyleSheet.create({
  grid: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  opt: {
    paddingVertical: 10,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 13.5,
  },
});
