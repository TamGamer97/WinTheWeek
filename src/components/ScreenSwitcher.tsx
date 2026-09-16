import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { useAppState } from '../state/AppState';
import WeekScreen from '../screens/WeekScreen';
import TodayScreen from '../screens/TodayScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';

// Whichever screen becomes active rises in slightly. This is transform-only
// so the incoming screen and its elevated cards are fully composed from the
// first frame, avoiding Android's transient dark shadow artifact.
export default function ScreenSwitcher() {
  const { activeScreen } = useAppState();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 220,
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
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
        },
      ]}
    >
      {activeScreen === 'week' && <WeekScreen />}
      {activeScreen === 'today' && <TodayScreen />}
      {activeScreen === 'settings' && <SettingsScreen />}
      {activeScreen === 'analytics' && <AnalyticsScreen />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
