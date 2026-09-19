import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { androidTextFix, fonts } from '../../theme/fonts';
import { useAppState, CoachTargetKey } from '../../state/AppState';
import { PrimaryButton, SheetLinkButton } from '../sheet/SheetControls';
import { ChartBarIcon, PlusIcon, WeekNavIcon } from '../../icons/Icons';
import FadeInUp from '../FadeInUp';
import StepDots from './StepDots';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Generous padding + a rounder hole than the target's own corners reads as
// a deliberate "spotlight", not a tight cutout hugging the button.
const HOLE_PADDING = 10;
const HOLE_RADIUS = 20;
const TOOLTIP_WIDTH = Math.min(300, SCREEN_W - 40);
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
    body: 'Streaks and completion stats live here — check in whenever you like.',
    Icon: ChartBarIcon,
  },
];

type Rect4 = { x: number; y: number; width: number; height: number };

// Where the tooltip card sits relative to the spotlight hole — below by
// default, flipped above when there isn't room, always clamped horizontally
// so it never runs off either edge. `top`/`bottom` (not a computed height)
// is what lets this work without knowing the card's own rendered height.
function placeTooltip(rect: Rect4) {
  const spaceBelow = SCREEN_H - (rect.y + rect.height);
  const spaceAbove = rect.y;
  const below = spaceBelow >= 190 || spaceBelow >= spaceAbove;
  const centerX = rect.x + rect.width / 2;
  const left = Math.max(16, Math.min(centerX - TOOLTIP_WIDTH / 2, SCREEN_W - TOOLTIP_WIDTH - 16));
  const caretLeft = Math.max(24, Math.min(centerX - left, TOOLTIP_WIDTH - 24));
  return below
    ? { left, top: rect.y + rect.height + TOOLTIP_MARGIN, below: true, caretLeft }
    : { left, bottom: SCREEN_H - rect.y + TOOLTIP_MARGIN, below: false, caretLeft };
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

  if (!targetRect) return null;

  const step = STEPS[stepIndex];
  const placement = placeTooltip(targetRect);
  const pulseOutset = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
  const pulseX = Animated.subtract(holeX, pulseOutset);
  const pulseY = Animated.subtract(holeY, pulseOutset);
  const pulseW = Animated.add(holeW, Animated.multiply(pulseOutset, 2));
  const pulseH = Animated.add(holeH, Animated.multiply(pulseOutset, 2));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 45, opacity }]}>
      <Svg style={StyleSheet.absoluteFill} width={SCREEN_W} height={SCREEN_H}>
        <Defs>
          <Mask id="coachmark-spotlight">
            <Rect x={0} y={0} width={SCREEN_W} height={SCREEN_H} fill="#fff" />
            <AnimatedRect x={holeX} y={holeY} width={holeW} height={holeH} rx={HOLE_RADIUS} fill="#000" />
          </Mask>
        </Defs>
        <Rect x={0} y={0} width={SCREEN_W} height={SCREEN_H} fill={scrimColor} mask="url(#coachmark-spotlight)" />
        {/* The pulse ring — drawn outside the mask, so it's unaffected by it. */}
        <AnimatedRect
          x={pulseX}
          y={pulseY}
          width={pulseW}
          height={pulseH}
          rx={HOLE_RADIUS + 10}
          fill="none"
          stroke={colors.accent}
          strokeWidth={2}
          opacity={pulseOpacity}
        />
        {/* The static ring — always-visible accent outline around the hole,
            so the highlight reads clearly even between pulses. */}
        <AnimatedRect x={holeX} y={holeY} width={holeW} height={holeH} rx={HOLE_RADIUS} fill="none" stroke={colors.accent} strokeWidth={2.5} />
      </Svg>

      <FadeInUp duration={220} distance={10} replayKey={stepIndex} style={[styles.cardWrap, { width: TOOLTIP_WIDTH, left: placement.left, ...(placement.below ? { top: placement.top } : { bottom: placement.bottom }) }]}>
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
