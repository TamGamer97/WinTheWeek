import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { CheckIcon } from '../icons/Icons';
import PressScale from './PressScale';

// A circular "target ring" rather than an outlined square/checkbox: idle
// state reads as a soft, tinted ring waiting to be hit, not a form
// checkbox. On completion it fills solid with the task's own color, pops
// with a spring bounce, and sends out a brief soft burst ring behind it —
// a small, encouraging "you did it" beat instead of a plain instant swap.
export default function Check({
  done,
  onPress,
  size = 28,
  color,
  variant = 'default',
  disabled = false,
}: {
  done: boolean;
  onPress: () => void;
  size?: number;
  color?: string;
  variant?: 'default' | 'today';
  // A past day's checkmark is a historical record, not a control — dims it
  // and, via PressScale's own `disabled`, drops the press entirely rather
  // than just leaving `onPress` a no-op (which would still show the squish).
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const ringColor = disabled ? colors.muted : color ?? colors.ink;
  const checkProgress = useRef(new Animated.Value(done ? 1 : 0)).current;
  const bounce = useRef(new Animated.Value(1)).current;
  const burst = useRef(new Animated.Value(1)).current;
  const wasDone = useRef(done);

  useEffect(() => {
    if (wasDone.current === done) return;
    wasDone.current = done;

    checkProgress.stopAnimation();
    bounce.stopAnimation();
    burst.stopAnimation();
    Animated.timing(checkProgress, {
      toValue: done ? 1 : 0,
      duration: done ? 160 : 110,
      useNativeDriver: true,
    }).start();

    if (done) {
      bounce.setValue(0.88);
      Animated.spring(bounce, { toValue: 1, friction: 6, tension: 220, useNativeDriver: true }).start();
      burst.setValue(0);
      Animated.timing(burst, { toValue: 1, duration: 360, useNativeDriver: true }).start();
    } else {
      bounce.setValue(1);
      burst.setValue(1);
    }
  }, [done, checkProgress, bounce, burst]);

  const backgroundColor = done ? ringColor : variant === 'today' ? 'transparent' : ringColor + '17';
  const borderColor = done ? ringColor : variant === 'today' ? ringColor + '73' : ringColor + '4D';
  const burstScale = burst.interpolate({ inputRange: [0, 1], outputRange: [1, 2.3] });
  const burstOpacity = burst.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0.14, 0] });

  return (
    <PressScale scaleTo={0.88} onPress={onPress} disabled={disabled}>
      <View style={[styles.wrap, { width: size, height: size, opacity: disabled ? 0.5 : 1 }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.burst,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: ringColor,
              opacity: burstOpacity,
              transform: [{ scale: burstScale }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.check,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor,
              borderColor,
              transform: [{ scale: bounce }],
            },
          ]}
        >
          <Animated.View style={{ opacity: checkProgress, transform: [{ scale: checkProgress }] }}>
            <CheckIcon size={13.5} color={colors.paper} />
          </Animated.View>
        </Animated.View>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  burst: {
    position: 'absolute',
  },
  check: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
