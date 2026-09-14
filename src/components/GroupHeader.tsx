import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import { ChevronRightIcon } from '../icons/Icons';
import PressScale from './PressScale';

export default function GroupHeader({ label, count, onPress }: { label: string; count: number; onPress: () => void }) {
  const { colors, radius, shadowCard, isDark } = useTheme();
  // In light mode the label sits on a light-blue chip and needs a darkened
  // tint (CSS `filter: brightness(0.72)`) to stay legible; dark mode uses
  // the highlight color as-is.
  const tintColor = isDark ? colors.highlight : darken(colors.highlight, 0.72);
  const countBg = isDark ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.07)';

  return (
    <PressScale scaleTo={0.98} onPress={onPress} style={[styles.wrap, { backgroundColor: colors.highlightSoft }, shadowCard]}>
      <Text numberOfLines={1} style={[styles.label, androidTextFix, { color: tintColor, fontFamily: fonts.bodyBold }]}>
        {label}
      </Text>
      <View style={[styles.count, { backgroundColor: countBg }]}>
        <Text style={[styles.countText, androidTextFix, { color: tintColor, fontFamily: fonts.bodyBold }]}>{count}</Text>
      </View>
      <View style={{ opacity: 0.75 }}>
        <ChevronRightIcon color={tintColor} />
      </View>
    </PressScale>
  );
}

function darken(hex: string, factor: number) {
  const h = hex.replace('#', '');
  const r = Math.round(parseInt(h.substring(0, 2), 16) * factor);
  const g = Math.round(parseInt(h.substring(2, 4), 16) * factor);
  const b = Math.round(parseInt(h.substring(4, 6), 16) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 24,
    marginTop: 2,
    marginBottom: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  label: {
    fontSize: 13.5,
    flex: 1,
  },
  count: {
    fontSize: 12,
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    fontSize: 12,
  },
});
