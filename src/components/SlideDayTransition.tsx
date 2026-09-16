import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

// Replay a short lateral movement whenever the selected day changes. The
// content deliberately remains opaque: fading mounted cards with Android
// elevation can produce a one-frame dark shadow flash.
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
        transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [fromX, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}
