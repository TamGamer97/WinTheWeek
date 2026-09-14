import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { androidTextFix, fonts } from '../theme/fonts';
import { RemoveDayIcon, TrashIcon } from '../icons/Icons';
import { useAppState } from '../state/AppState';
import PressScale from './PressScale';

// A centered modal confirmation, distinct from the bottom sheet system —
// sheets are for forms and pickers, this is for a single yes/no decision
// before something destructive (or easy to trigger by accident, like a
// long-press menu) actually happens. Any part of the app asks for one via
// useAppState().requestConfirm(...); this is the one place that renders it.
//
// Deliberately not the standard "big centered icon badge, stacked full-width
// buttons" template: it borrows the app's own card language instead — the
// same colored spine used on task rows — and puts Cancel/Confirm side by
// side, so it reads as part of this app rather than a generic dialog.
export default function ConfirmDialog() {
  const { colors, radius, shadowPanel } = useTheme();
  const { confirmRequest, confirmAction, cancelConfirm } = useAppState();
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (confirmRequest) {
      setMounted(true);
      progress.setValue(0);
      Animated.spring(progress, {
        toValue: 1,
        friction: 10,
        tension: 145,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 170,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
  }, [confirmRequest, progress]);

  if (!mounted || !confirmRequest) return null;

  const tint = confirmRequest.destructive ? colors.danger : colors.accent;
  const Icon = confirmRequest.icon === 'trash' ? TrashIcon : RemoveDayIcon;

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
              transform: [
                { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
              ],
            },
          ]}
        >
          <View style={styles.headRow}>
            <View style={[styles.spine, { backgroundColor: tint, borderRadius: radius.sm }]} />
            <View style={styles.textCol}>
              <View style={styles.titleRow}>
                <Icon size={15} color={tint} />
                <Text
                  numberOfLines={2}
                  style={[styles.title, androidTextFix, { color: colors.ink, fontFamily: fonts.headingSemiBold }]}
                >
                  {confirmRequest.title}
                </Text>
              </View>
              <Text style={[styles.message, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>
                {confirmRequest.message}
              </Text>
            </View>
          </View>

          <View style={styles.btnRow}>
            <PressScale
              scaleTo={0.96}
              onPress={cancelConfirm}
              style={[styles.cancelBtn, { borderColor: colors.lineStrong, borderRadius: radius.md }]}
            >
              <Text style={[styles.cancelText, androidTextFix, { color: colors.inkSoft, fontFamily: fonts.bodyBold }]}>
                {confirmRequest.cancelLabel ?? 'Cancel'}
              </Text>
            </PressScale>
            <PressScale
              scaleTo={0.96}
              onPress={confirmAction}
              style={[styles.confirmBtn, { backgroundColor: tint, borderRadius: radius.md }]}
            >
              <Text style={[styles.confirmText, androidTextFix, { fontFamily: fonts.bodyBold }]}>
                {confirmRequest.confirmLabel}
              </Text>
            </PressScale>
          </View>
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
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    padding: 20,
  },
  headRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  spine: {
    width: 4,
    alignSelf: 'stretch',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 16.5,
  },
  message: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14.5,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: 14.5,
    color: '#fff',
  },
});
