import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

const TRANSITION_DISTANCE = 20;

// Gives a newly selected month a small directional slide and fade. The month
// value remains owned by the caller; this only animates the rendered calendar
// contents after that value changes.
export default function useMonthTransition(monthAnchor: Date) {
  const monthKey = monthAnchor.getFullYear() * 12 + monthAnchor.getMonth();
  const previousMonthKey = useRef(monthKey);
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (monthKey === previousMonthKey.current) return;

    const direction = monthKey > previousMonthKey.current ? 1 : -1;
    previousMonthKey.current = monthKey;
    translateX.setValue(direction * TRANSITION_DISTANCE);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [monthKey, opacity, translateX]);

  return {
    opacity,
    transform: [{ translateX }],
  };
}
