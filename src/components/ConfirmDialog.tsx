import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import { RemoveDayIcon, TrashIcon } from '../icons/Icons';
import { useAppState } from '../state/AppState';
import { GhostButton, PrimaryButton } from './sheet/SheetControls';

// A centered modal confirmation, distinct from the bottom sheet system —
// sheets are for forms/pickers, this is for a single yes/no decision
// before something destructive (or easy to trigger by accident, like a
// long-press menu) actually happens. Any part of the app asks for one via
// useAppState().requestConfirm(...); this is the one place that renders it.
export default function ConfirmDialog() {
  const { colors, radius, shadowPanel } = useTheme();
  const { confirmRequest, confirmAction, cancelConfirm } = useAppState();
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (confirmRequest) {
      setMounted(true);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
  }, [confirmRequest, progress]);

  if (!mounted || !confirmRequest) return null;

  const tint = confirmRequest.destructive ? colors.danger : colors.accent;
  const tintSoft = confirmRequest.destructive ? colors.dangerSoft : colors.accentSoft;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 40 }]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={cancelConfirm} />
      </Animated.View>
      <View style={styles.centerWrap} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.card,
            shadowPanel,
            {
              backgroundColor: colors.paperRaised,
              borderRadius: radius.lg,
              opacity: progress,
              transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
            },
          ]}
        >
          <View style={[styles.badge, { backgroundColor: tintSoft }]}>
            {confirmRequest.icon === 'trash' ? (
              <TrashIcon size={19} color={tint} />
            ) : (
              <RemoveDayIcon size={19} color={tint} />
            )}
          </View>
          <Text
            style={[styles.title, androidTextFix, { color: colors.ink, fontFamily: fonts.headingSemiBold }]}
          >
            {confirmRequest.title}
          </Text>
          <Text style={[styles.message, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>
            {confirmRequest.message}
          </Text>
          <PrimaryButton label={confirmRequest.confirmLabel} onPress={confirmAction} destructive={confirmRequest.destructive} />
          <GhostButton label={confirmRequest.cancelLabel ?? 'Cancel'} onPress={cancelConfirm} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: 'center',
  },
  badge: {
    width: 46,
    height: 46,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    marginBottom: 6,
    textAlign: 'center',
  },
  message: {
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 18,
  },
});
