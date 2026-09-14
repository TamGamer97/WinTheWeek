import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// Mirrors `@keyframes ringPulse`: a one-shot expanding, fading ring behind
// the "today" dot, settling into a permanent soft glow halo.
export default function TodayDot() {
  const { colors } = useTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 1400,
      delay: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 3.2] });
  const opacity = progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.55, 0.35, 0] });

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.ring,
          { backgroundColor: colors.highlightSoft, opacity, transform: [{ scale }] },
        ]}
      />
      <View style={[styles.dot, { backgroundColor: colors.highlight, shadowColor: colors.highlight }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 5,
    height: 5,
    marginTop: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
});
