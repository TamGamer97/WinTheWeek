import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  style?: ViewStyle | ViewStyle[];
  // bump this to replay the animation (e.g. when the list is re-shown)
  replayKey?: string | number;
};

// Keep elevated content fully opaque while it enters. On Android, fading a
// newly-mounted elevated view can briefly composite its shadow as a dark
// rectangle before the native layer has settled. The small upward movement
// still gives lists a calm entrance without exposing that artifact.
export default function FadeInUp({ children, delay = 0, duration = 260, distance = 8, style, replayKey }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayKey]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            {
              translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
