import React, { useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import { TodayNavIcon, WeekNavIcon } from '../icons/Icons';
import PressScale from './PressScale';
import { useAppState } from '../state/AppState';
import { ScreenName } from '../data/types';

type ItemLayout = { x: number; width: number };

export default function NavBar() {
  const { colors, shadowCard } = useTheme();
  const { activeScreen, showScreen } = useAppState();
  const [layouts, setLayouts] = useState<Record<string, ItemLayout>>({});
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorW = useRef(new Animated.Value(0)).current;
  const initialized = useRef(false);

  const active: ScreenName = activeScreen === 'settings' ? 'today' : activeScreen;

  const animateTo = (name: string) => {
    const l = layouts[name];
    if (!l) return;
    const easing = Easing.bezier(0.34, 1.56, 0.64, 1);
    if (!initialized.current) {
      indicatorX.setValue(l.x);
      indicatorW.setValue(l.width);
      initialized.current = true;
      return;
    }
    Animated.parallel([
      Animated.timing(indicatorX, { toValue: l.x, duration: 400, easing, useNativeDriver: false }),
      Animated.timing(indicatorW, { toValue: l.width, duration: 400, easing, useNativeDriver: false }),
    ]).start();
  };

  const onItemLayout = (name: string) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setLayouts((prev) => {
      const next = { ...prev, [name]: { x, width } };
      return next;
    });
  };

  React.useEffect(() => {
    animateTo(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, layouts.week?.x, layouts.today?.x]);

  return (
    <View style={[styles.bar, { backgroundColor: colors.paperRaised, borderColor: colors.line, borderRadius: 24 }, shadowCard]}>
      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor: colors.accentSoft,
            transform: [{ translateX: indicatorX }],
            width: indicatorW,
          },
        ]}
      />
      {/* onLayout sits on the direct flex child of `bar` so x/width are
          measured relative to the navbar itself (matching the original's
          `offsetLeft`/`offsetWidth` against the navbar as offsetParent). */}
      <View style={styles.item} onLayout={onItemLayout('today')}>
        <PressScale scaleTo={0.96} style={styles.itemInner} onPress={() => showScreen('today')}>
          <TodayNavIcon color={active === 'today' ? colors.accent : colors.muted} />
          <Text
            style={[
              styles.label,
              androidTextFix,
              { color: active === 'today' ? colors.accent : colors.muted, fontFamily: fonts.bodyBold },
            ]}
          >
            Today
          </Text>
        </PressScale>
      </View>
      <View style={styles.item} onLayout={onItemLayout('week')}>
        <PressScale scaleTo={0.96} style={styles.itemInner} onPress={() => showScreen('week')}>
          <WeekNavIcon color={active === 'week' ? colors.accent : colors.muted} />
          <Text
            style={[
              styles.label,
              androidTextFix,
              { color: active === 'week' ? colors.accent : colors.muted, fontFamily: fonts.bodyBold },
            ]}
          >
            Week
          </Text>
        </PressScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'relative',
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: 20,
    marginBottom: 6,
    padding: 6,
    borderWidth: 1,
  },
  indicator: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    borderRadius: 18,
  },
  item: {
    flex: 1,
  },
  itemInner: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
    paddingBottom: 7,
  },
  label: {
    fontSize: 11.5,
  },
});
