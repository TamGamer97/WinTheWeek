import React, { useRef } from 'react';
import { Animated, GestureResponderEvent, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  disabled?: boolean;
  hitSlop?: number;
};

// Layout props that have to live on the actual flex item (the Pressable)
// rather than only on the inner Animated.View — otherwise a caller passing
// e.g. `flex: 1` (to make two buttons split a row evenly, like the
// Task/Routine toggle) sees it silently ignored, because the Pressable
// (the real child of the flex container) stays content-sized while only
// its inner wrapper claims the flex. Pulling these out and applying them
// to both fixes that without changing how anything looks.
// (Margin is deliberately left out: it's only ever used on PressScale
// instances that are already sized correctly, and duplicating it onto both
// the Pressable and the inner Animated.View would double it up.)
const LAYOUT_KEYS = [
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
] as const;

function extractLayoutStyle(style: StyleProp<ViewStyle>): ViewStyle {
  const flat = StyleSheet.flatten(style) || {};
  const picked: ViewStyle = {};
  for (const key of LAYOUT_KEYS) {
    if (flat[key as keyof ViewStyle] !== undefined) {
      (picked as any)[key] = flat[key as keyof ViewStyle];
    }
  }
  return picked;
}

// Mirrors the design's `:active { transform: scale(...) }` micro-interaction
// used on icon buttons, pills, checkboxes and cards throughout the app.
export default function PressScale({ children, onPress, onLongPress, style, scaleTo = 0.94, disabled, hitSlop }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const layoutStyle = extractLayoutStyle(style);

  const pressIn = () => {
    Animated.timing(scale, { toValue: scaleTo, duration: 100, useNativeDriver: true }).start();
  };
  const pressOut = () => {
    Animated.timing(scale, { toValue: 1, duration: 140, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      style={layoutStyle}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
