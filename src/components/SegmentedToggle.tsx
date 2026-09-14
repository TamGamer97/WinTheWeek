import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import PressScale from './PressScale';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: React.ReactNode;
};

// A pill-shaped, multi-segment switch: a soft track with a raised, shadowed
// "lifted" pill under whichever option is active. Originally the New
// routine sheet's Task/Routine switch — reused here as the app's one
// general-purpose segmented control (e.g. the Settings theme picker) now
// that sheet no longer needs it.
export default function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors, shadowCard } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.paper }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <PressScale
            key={opt.value}
            scaleTo={0.97}
            onPress={() => onChange(opt.value)}
            style={[styles.btn, active && [{ backgroundColor: colors.paperRaised }, shadowCard]]}
          >
            {opt.icon}
            <Text
              style={[
                styles.text,
                androidTextFix,
                { color: active ? colors.ink : colors.inkSoft, fontFamily: fonts.bodyBold },
              ]}
            >
              {opt.label}
            </Text>
          </PressScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: 12,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  text: {
    fontSize: 13,
  },
});
