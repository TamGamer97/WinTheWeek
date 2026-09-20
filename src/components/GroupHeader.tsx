import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import { ChevronRightIcon } from '../icons/Icons';
import PressScale from './PressScale';

export default function GroupHeader({ label, count, onPress }: { label: string; count: number; onPress: () => void }) {
  const { colors, isDark } = useTheme();
  // Light mode uses a darkened highlight tint for legibility against the
  // page surface; dark mode can use the highlight color as-is.
  const tintColor = isDark ? colors.highlight : darken(colors.highlight, 0.72);
  const countBg = isDark ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.07)';
  // Nothing to do isn't something to flag — the colored/bold pill is meant
  // to draw the eye toward a real pending count, so an empty one drops to a
  // quiet, neutral-filled row (not the highlight tint, but not fully
  // transparent either — a bare row with no fill at all reads as broken)
  // instead of reading like a standing alert. Still tappable (opens the
  // same "All caught up" sheet); only the weight changes.
  const isEmpty = count === 0;

  return (
    <PressScale
      scaleTo={0.98}
      onPress={onPress}
      style={[styles.wrap, { backgroundColor: isEmpty ? colors.line : colors.highlightSoft }]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          androidTextFix,
          { color: isEmpty ? colors.muted : tintColor, fontFamily: isEmpty ? fonts.bodyMedium : fonts.bodyBold },
        ]}
      >
        {label}
      </Text>
      {isEmpty ? null : (
        <View style={[styles.count, { backgroundColor: countBg }]}>
          <Text style={[styles.countText, androidTextFix, { color: tintColor, fontFamily: fonts.bodyBold }]}>{count}</Text>
        </View>
      )}
      <View style={{ opacity: isEmpty ? 0.5 : 0.75 }}>
        <ChevronRightIcon color={isEmpty ? colors.muted : tintColor} />
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
    // Keep the soft blue grouping tint, but no elevation/shadow: this is a
    // lightweight navigation row rather than a floating card.
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
