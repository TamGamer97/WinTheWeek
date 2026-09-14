import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { PlusIcon, RepeatIcon } from '../icons/Icons';
import { useAppState } from '../state/AppState';

// Mirrors `.fab` + `@keyframes liquidSquish`.
export default function Fab() {
  const { colors, glowFab } = useTheme();
  const { fabPressed, fabSquishTick, openRoutineManager } = useAppState();
  const insets = useSafeAreaInsets();
  const scaleX = useRef(new Animated.Value(1)).current;
  const scaleY = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (fabSquishTick === 0) return;
    scaleX.setValue(1);
    scaleY.setValue(1);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scaleX, { toValue: 0.82, duration: 126, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scaleY, { toValue: 1.18, duration: 126, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(scaleX, { toValue: 1.1, duration: 126, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scaleY, { toValue: 0.9, duration: 126, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(scaleX, { toValue: 1, duration: 168, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(scaleY, { toValue: 1, duration: 168, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabSquishTick]);

  return (
    <>
      <Pressable onPress={openRoutineManager} style={[styles.routineWrap, { bottom: insets.bottom + 106 }]} hitSlop={8}>
        <Animated.View style={[styles.routineFab, { backgroundColor: colors.paperRaised, borderColor: colors.lineStrong }]}>
          <RepeatIcon size={17} color={colors.accent} />
        </Animated.View>
      </Pressable>
      <Pressable onPress={fabPressed} style={[styles.wrap, { bottom: insets.bottom + 100 }]} hitSlop={8}>
      <Animated.View
        style={[
          styles.fab,
          { backgroundColor: colors.accent, transform: [{ scaleX }, { scaleY }] },
          glowFab,
        ]}
      >
        <PlusIcon />
      </Animated.View>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 22,
    zIndex: 5,
  },
  routineWrap: {
    position: 'absolute',
    right: 88,
    zIndex: 5,
  },
  routineFab: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
