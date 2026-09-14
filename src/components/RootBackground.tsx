import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

// Approximates the design's `--surface-gradient`: just the soft linear wash
// from top to bottom. (The original also had a faint radial glow, but
// rendered as a flat-color circle in React Native it reads as an obvious
// blob rather than a soft light source, so it's left out.)
export default function RootBackground() {
  const { colors } = useTheme();
  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.gradientBottom]}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}
