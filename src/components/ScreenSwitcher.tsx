import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { useAppState } from '../state/AppState';
import WeekScreen from '../screens/WeekScreen';
import TodayScreen from '../screens/TodayScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Mirrors `.screen.active { animation: rise ... }`: whichever screen becomes
// active rises in slightly. Keeping the screen opaque during this transition
// avoids exposing the native surface behind the app for a frame.
export default function ScreenSwitcher() {
  const { activeScreen } = useAppState();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [activeScreen, progress]);

  return (
    <Animated.View
      style={[
        styles.fill,
        {
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
      ]}
    >
      {activeScreen === 'week' && <WeekScreen />}
      {activeScreen === 'today' && <TodayScreen />}
      {activeScreen === 'settings' && <SettingsScreen />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
