import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function Switch({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  const { colors, shadowCard } = useTheme();
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: 280,
      easing: Easing.bezier(0.34, 1.56, 0.64, 1),
      useNativeDriver: false,
    }).start();
  }, [value, progress]);

  const backgroundColor = progress.interpolate({ inputRange: [0, 1], outputRange: [colors.lineStrong, colors.accent] });
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [3, 22] });

  return (
    <Pressable onPress={() => onValueChange(!value)}>
      <Animated.View style={[styles.track, { backgroundColor }]}>
        <Animated.View style={[styles.knob, shadowCard, { transform: [{ translateX }] }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 46,
    height: 27,
    borderRadius: 999,
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute',
    top: 3,
    width: 21,
    height: 21,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
});
