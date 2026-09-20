import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { androidTextFix, fonts } from '../../theme/fonts';
import { useAppState, CoachTargetKey } from '../../state/AppState';
import { PrimaryButton, SheetLinkButton } from '../sheet/SheetControls';
import { ChartBarIcon, PlusIcon, WeekNavIcon } from '../../icons/Icons';
import FadeInUp from '../FadeInUp';
import StepDots from './StepDots';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Generous padding reads as a deliberate "spotlight", not a tight cutout
// hugging the button.
const HOLE_PADDING = 10;
const TOOLTIP_MARGIN = 22;

const STEPS: { key: CoachTargetKey; title: string; body: string; Icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  {
    key: 'fabAdd',
    title: 'Add a routine',
    body: "Tap the plus button any time you want to create something new.",
    Icon: PlusIcon,
  },
  {
    key: 'navWeek',
    title: 'Plan your whole week',
    body: 'See every day at a glance, and drag tasks between them.',
    Icon: WeekNavIcon,
  },
  {
    key: 'headerAnalytics',
    title: 'Watch your progress',
    body: 'Streaks and completion stats live here. Check in whenever you like.',
    Icon: ChartBarIcon,
  },
];

type Rect4 = { x: number; y: number; width: number; height: number };

// Where the tooltip card sits relative to the spotlight hole — below by
// default, flipped above when there isn't room, always clamped horizontally
// so it never runs off either edge. `top`/`bottom` (not a computed height)
// is what lets this work without knowing the card's own rendered height.
function placeTooltip(rect: Rect4, screenW: number, screenH: number, tooltipWidth: number) {
  const spaceBelow = screenH - (rect.y + rect.height);
  const spaceAbove = rect.y;
  const below = spaceBelow >= 190 || spaceBelow >= spaceAbove;
  const centerX = rect.x + rect.width / 2;
  const left = Math.max(16, Math.min(centerX - tooltipWidth / 2, screenW - tooltipWidth - 16));
  const caretLeft = Math.max(24, Math.min(centerX - left, tooltipWidth - 24));
  return below
    ? { left, top: rect.y + rect.height + TOOLTIP_MARGIN, below: true, caretLeft }
    : { left, bottom: screenH - rect.y + TOOLTIP_MARGIN, below: false, caretLeft };
}

// The 3-step guided tour: a dark spotlight scrim with an animated hole (an
// SVG luminance mask, the black cut-out rect driven by Animated.Values —
// see docs/DECISIONS.md for why this is the right amount of complexity here)
// ringed in the app's accent color with a soft looping pulse, plus a small
// icon-led tooltip beside it. Only ever mounted by AppShell while eligible
// (`hydrated && seenIntro && !seenCoachmarks && activeScreen === 'today'`),
// so this component can assume it's meant to be visible for its entire
// lifetime — it just has to leave gracefully.
export default function CoachMarkOverlay() {
  const { colors, radius, shadowPanel, isDark } = useTheme();
  const { measureCoachTarget, completeCoachmarks } = useAppState();

  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect4 | null>(null);
  // A circular target (the FAB) wants a fully round hole, not a fixed
  // corner radius that reads as a mismatched rounded square around it; a
  // wide one (a nav item, a header icon button) wants a pill. Half of
  // whichever side is shorter gives both for free, computed per step
  // alongside the measured rect below.
  const [holeRadius, setHoleRadius] = useState(20);
  // Measured via onLayout on this component's own full-screen root, rather
  // than `Dimensions.get('window')` (or the `useWindowDimensions` hook,
  // which is the same underlying value): on Android specifically, that API
  // and `measureInWindow` (what the coach targets are measured with, below)
  // don't reliably agree — `Dimensions`' window size can come up shorter
  // than the true screen, undersizing the SVG canvas and leaving a strip of
  // the scrim untouched, while a coordinate-origin mismatch between the two
  // APIs throws off the hole's actual position. onLayout and measureInWindow
  // both come from the same native layout tree, so they can't disagree —
  // this is what actually fixed the spotlight being misaligned and the dim
  // not fully covering the screen on Android (unreproducible on web, where
  // no such split exists, which is why this only ever showed up there).
  const [screenSize, setScreenSize] = useState<{ width: number; height: number } | null>(null);
  const onRootLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setScreenSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);
  const opacity = useRef(new Animated.Value(0)).current;
  const holeX = useRef(new Animated.Value(0)).current;
  const holeY = useRef(new Animated.Value(0)).current;
  const holeW = useRef(new Animated.Value(0)).current;
  const holeH = useRef(new Animated.Value(0)).current;
  const holeInitialized = useRef(false);
  const finishedRef = useRef(false);
  const pulse = useRef(new Animated.Value(0)).current;

  // A dedicated, deliberately dark overlay — not the app's own (much
  // lighter) modal `colors.scrim`, which is tuned for a backdrop behind a
  // centered dialog, not for making a specific control visibly "pop" out of
  // a full-screen dim. A spotlight only reads as one with real contrast.
  const scrimColor = isDark ? 'rgba(3, 4, 10, 0.86)' : 'rgba(10, 11, 18, 0.78)';

  // Ends the tour for good — either from an explicit "Got it"/"Skip tour"
  // tap (fades itself out first, then flips the persisted flag once
  // invisible so AppShell unmounting it a moment later is never a visible
  // pop) or, via the unmount cleanup below, from being torn down some other
  // way (e.g. the user navigating off Today mid-tour) — either path still
  // has to mark the tour seen so it doesn't try to run again later.
  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 150,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => completeCoachmarks());
  }, [opacity, completeCoachmarks]);

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    return () => {
      if (!finishedRef.current) completeCoachmarks();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A slow, continuous "radar ping" around the hole — the one cue that
  // reliably reads as "look here" at a glance, rather than relying on the
  // static ring alone.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: false }),
        Animated.delay(350),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const measureStep = useCallback(
    async (index: number) => {
      // This fires the instant a step becomes active — for step 0, that's
      // the instant this whole overlay mounts, which is itself the instant
      // the intro finishes (see `coachmarksActive` in App.tsx). On a slower
      // Android device, `measureInWindow` called right there can win a race
      // against the target's own layout still settling from that screen
      // transition and return a stale position — reported as the spotlight
      // landing in the wrong place. Waiting two frames first ensures at
      // least one full native layout/commit pass has actually happened.
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const rect = await measureCoachTarget(STEPS[index].key);
      if (!rect || rect.width === 0) {
        // Target never registered/measured — skip it rather than spotlight
        // nothing, and end the tour cleanly if it was the last step.
        if (index < STEPS.length - 1) setStepIndex(index + 1);
        else finish();
        return;
      }
      const next = {
        x: rect.x - HOLE_PADDING,
        y: rect.y - HOLE_PADDING,
        width: rect.width + HOLE_PADDING * 2,
        height: rect.height + HOLE_PADDING * 2,
      };
      setTargetRect(rect);
      setHoleRadius(Math.min(next.width, next.height) / 2);
      if (!holeInitialized.current) {
        holeX.setValue(next.x);
        holeY.setValue(next.y);
        holeW.setValue(next.width);
        holeH.setValue(next.height);
        holeInitialized.current = true;
      } else {
        Animated.parallel(
          [
            [holeX, next.x],
            [holeY, next.y],
            [holeW, next.width],
            [holeH, next.height],
          ].map(([v, toValue]) =>
            Animated.timing(v as Animated.Value, {
              toValue: toValue as number,
              duration: 380,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: false,
            }),
          ),
        ).start();
      }
    },
    [measureCoachTarget, finish, holeX, holeY, holeW, holeH],
  );

  useEffect(() => {
    void measureStep(stepIndex);
  }, [stepIndex, measureStep]);

  const isLast = stepIndex === STEPS.length - 1;
  const goNext = () => {
    if (isLast) finish();
    else setStepIndex((i) => i + 1);
  };

  const step = STEPS[stepIndex];
  const tooltipWidth = screenSize ? Math.min(300, screenSize.width - 40) : 0;
  const placement =
    targetRect && screenSize ? placeTooltip(targetRect, screenSize.width, screenSize.height, tooltipWidth) : null;
  const pulseOutset = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
  const pulseX = Animated.subtract(holeX, pulseOutset);
  const pulseY = Animated.subtract(holeY, pulseOutset);
  const pulseW = Animated.add(holeW, Animated.multiply(pulseOutset, 2));
  const pulseH = Animated.add(holeH, Animated.multiply(pulseOutset, 2));

  return (
    <Animated.View onLayout={onRootLayout} style={[StyleSheet.absoluteFill, { zIndex: 45, opacity }]}>
      {targetRect && screenSize && placement ? (
        <>
          <Svg style={StyleSheet.absoluteFill} width={screenSize.width} height={screenSize.height}>
            <Defs>
              <Mask id="coachmark-spotlight">
                <Rect x={0} y={0} width={screenSize.width} height={screenSize.height} fill="#fff" />
                <AnimatedRect x={holeX} y={holeY} width={holeW} height={holeH} rx={holeRadius} fill="#000" />
              </Mask>
            </Defs>
            <Rect x={0} y={0} width={screenSize.width} height={screenSize.height} fill={scrimColor} mask="url(#coachmark-spotlight)" />
            {/* The pulse ring — drawn outside the mask, so it's unaffected by it. */}
            <AnimatedRect
              x={pulseX}
              y={pulseY}
              width={pulseW}
              height={pulseH}
              rx={holeRadius + 10}
              fill="none"
              stroke={colors.accent}
              strokeWidth={2}
              opacity={pulseOpacity}
            />
            {/* The static ring — always-visible accent outline around the hole,
                so the highlight reads clearly even between pulses. */}
            <AnimatedRect x={holeX} y={holeY} width={holeW} height={holeH} rx={holeRadius} fill="none" stroke={colors.accent} strokeWidth={2.5} />
          </Svg>

          <FadeInUp duration={220} distance={10} replayKey={stepIndex} style={[styles.cardWrap, { width: tooltipWidth, left: placement.left, ...(placement.below ? { top: placement.top } : { bottom: placement.bottom }) }]}>
            <View style={[styles.card, shadowPanel, { backgroundColor: colors.paperRaised, borderRadius: radius.lg }]}>
              <View
                style={[
                  styles.caret,
                  placement.below
                    ? { top: -7, borderBottomColor: colors.paperRaised, borderBottomWidth: 7, borderTopWidth: 0 }
                    : { bottom: -7, borderTopColor: colors.paperRaised, borderTopWidth: 7, borderBottomWidth: 0 },
                  { left: placement.caretLeft - 7 },
                ]}
              />
              <View style={styles.headRow}>
                <View style={[styles.iconBadge, { backgroundColor: colors.accentSoft, borderRadius: radius.pill }]}>
                  <step.Icon size={16} color={colors.accent} />
                </View>
                <StepDots count={STEPS.length} activeIndex={stepIndex} />
              </View>
              <Text style={[styles.title, androidTextFix, { color: colors.ink, fontFamily: fonts.headingSemiBold }]}>
                {step.title}
              </Text>
              <Text style={[styles.body, androidTextFix, { color: colors.muted, fontFamily: fonts.bodyRegular }]}>
                {step.body}
              </Text>
              <PrimaryButton label={isLast ? 'Got it' : 'Next'} onPress={goNext} />
              <SheetLinkButton label="Skip tour" onPress={finish} />
            </View>
          </FadeInUp>
        </>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    position: 'absolute',
  },
  card: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  caret: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBadge: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 3,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
});
