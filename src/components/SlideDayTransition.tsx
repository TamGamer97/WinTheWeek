import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

// Mirrors `@keyframes slideInRight` / `slideInLeft`, replayed whenever the
// selected day changes on the Today screen.
export default function SlideDayTransition({
  children,
  dayKey,
  direction,
}: {
  children: React.ReactNode;
  dayKey: string;
  direction: 'left' | 'right' | null;
}) {
  const progress = useRef(new Animated.Value(direction ? 0 : 1)).current;

  useEffect(() => {
    if (!direction) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey]);

  const fromX = direction === 'left' ? -26 : 26;

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [fromX, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}
