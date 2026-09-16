import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { androidTextFix, fonts } from '../../theme/fonts';
import { ROUTINE_COLOR_IDS, routineColorHex } from '../../theme/colors';
import PressScale from '../PressScale';

export function SheetLabel({ children, noMarginTop }: { children: React.ReactNode; noMarginTop?: boolean }) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        styles.label,
        androidTextFix,
        { color: colors.inkSoft, fontFamily: fonts.bodyBold, marginTop: noMarginTop ? 0 : 14 },
      ]}
    >
      {children}
    </Text>
  );
}

export function SheetHint({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text
      numberOfLines={1}
      style={[styles.hint, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}
    >
      {children}
    </Text>
  );
}

// A small text-button-style link, for a secondary quick action inside a
// sheet (e.g. "Use usual days") that shouldn't compete with the primary
// button below it.
export function SheetLinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressScale scaleTo={0.97} onPress={onPress} style={styles.linkBtn}>
      <Text numberOfLines={1} style={[styles.linkBtnText, androidTextFix, { color: colors.accent, fontFamily: fonts.bodyBold }]}>
        {label}
      </Text>
    </PressScale>
  );
}

// Routine colors are stored and compared by id (e.g. 'blue'), not by hex —
// see theme/colors.ts's routineColorHex(), the single place that id ever
// turns into an actual color. That's what keeps every screen showing a
// routine in agreement about its color.
export function TaskColorPicker({ value, onChange }: { value: string; onChange: (colorId: string) => void }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={styles.colorPicker}>
      <Text style={[styles.colorLabel, androidTextFix, { color: colors.inkSoft, fontFamily: fonts.bodyBold }]}>Color</Text>
      <View style={styles.colorRow}>
        {ROUTINE_COLOR_IDS.map((id) => {
          const hex = routineColorHex(id, isDark);
          return (
            <PressScale key={id} scaleTo={0.9} onPress={() => onChange(id)} style={styles.colorButton}>
              <View
                style={[
                  styles.colorSwatch,
                  { backgroundColor: hex },
                  value === id && { borderColor: colors.ink, borderWidth: 2, transform: [{ scale: 1.12 }] },
                ]}
              />
            </PressScale>
          );
        })}
      </View>
    </View>
  );
}

export function SheetTextInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  const { colors, radius } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      style={[
        styles.input,
        {
          borderColor: colors.lineStrong,
          color: colors.ink,
          backgroundColor: colors.paper,
          borderRadius: radius.md,
          fontFamily: fonts.bodyRegular,
        },
      ]}
    />
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  destructive,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  const { colors, radius, shadowCard } = useTheme();
  return (
    <PressScale
      scaleTo={0.98}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.primaryBtn,
        { backgroundColor: destructive ? colors.danger : colors.accent, borderRadius: radius.md, opacity: disabled ? 0.5 : 1 },
        shadowCard,
      ]}
    >
      <Text style={[styles.primaryBtnText, androidTextFix, { fontFamily: fonts.bodySemiBold }]}>{label}</Text>
    </PressScale>
  );
}

export function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressScale scaleTo={0.98} onPress={onPress} style={styles.ghostBtn}>
      <Text style={[styles.ghostBtnText, androidTextFix, { color: colors.inkSoft, fontFamily: fonts.bodyBold }]}>{label}</Text>
    </PressScale>
  );
}

export function Stepper({ value, onChange }: { value: number; onChange: (delta: number) => void }) {
  const { colors } = useTheme();
  return (
    <View>
      <View style={styles.stepperRow}>
        <Text style={[styles.stepperLabel, androidTextFix, { color: colors.inkSoft, fontFamily: fonts.bodyBold }]}>
          Days per week
        </Text>
        <View style={styles.stepper}>
          <PressScale
            scaleTo={0.92}
            onPress={() => onChange(-1)}
            style={[styles.stepBtn, { borderColor: colors.lineStrong, backgroundColor: colors.paperRaised }]}
          >
            <Text style={[styles.stepBtnText, androidTextFix, { color: colors.ink }]}>−</Text>
          </PressScale>
          <Text style={[styles.freqValue, androidTextFix, { color: colors.ink, fontFamily: fonts.headingBold }]}>
            {value}
          </Text>
          <PressScale
            scaleTo={0.92}
            onPress={() => onChange(1)}
            style={[styles.stepBtn, { borderColor: colors.lineStrong, backgroundColor: colors.paperRaised }]}
          >
            <Text style={[styles.stepBtnText, androidTextFix, { color: colors.ink }]}>+</Text>
          </PressScale>
        </View>
      </View>
      <Text style={[styles.stepperDescription, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>
        Choose how many days each week you want to do this routine.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    marginBottom: 10,
  },
  hint: {
    fontSize: 12,
    marginTop: 8,
  },
  linkBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 4,
  },
  linkBtnText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  colorPicker: {
    marginTop: 20,
  },
  colorLabel: {
    fontSize: 13,
    marginBottom: 9,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatch: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderColor: 'transparent',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
  },
  ghostBtn: {
    width: '100%',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ghostBtnText: {
    fontSize: 14,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 4,
  },
  stepperLabel: {
    fontSize: 13,
  },
  stepperDescription: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  freqValue: {
    fontSize: 16,
    minWidth: 16,
    textAlign: 'center',
  },
});
