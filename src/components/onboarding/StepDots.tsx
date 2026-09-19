import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const DOT_WIDTH_ACTIVE = 18;
const DOT_WIDTH_IDLE = 6;

// Shared step-indicator dots for both the intro slides and the coach-mark
// tooltip — the active dot widens and turns accent-colored, matching the
// sliding tab indicator's animated-width idea in NavBar.tsx, just per-dot
// instead of one shared pill.
export default function StepDots({ count, activeIndex }: { count: number; activeIndex: number }) {
  const { colors } = useTheme();
  // One Animated.Value per dot, created once for the lifetime of this
  // instance — `count` never changes for either caller (fixed slide/step
  // totals), so this never needs to grow or shrink.
  const widths = useRef(Array.from({ length: count }, (_, i) => new Animated.Value(i === activeIndex ? 1 : 0))).current;

  useEffect(() => {
    Animated.parallel(
      widths.map((w, i) =>
        Animated.timing(w, {
          toValue: i === activeIndex ? 1 : 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ),
    ).start();
  }, [activeIndex, widths]);

  return (
    <View style={styles.row}>
      {widths.map((w, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              width: w.interpolate({ inputRange: [0, 1], outputRange: [DOT_WIDTH_IDLE, DOT_WIDTH_ACTIVE] }),
              backgroundColor: i === activeIndex ? colors.accent : colors.line,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 999,
  },
});
