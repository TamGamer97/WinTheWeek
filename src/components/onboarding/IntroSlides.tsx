import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { androidTextFix, fonts } from '../../theme/fonts';
import { useAppState } from '../../state/AppState';
import { PrimaryButton, SheetLinkButton } from '../sheet/SheetControls';
import FadeInUp from '../FadeInUp';
import StepDots from './StepDots';
import {
  InsightsIllustration,
  PlanIllustration,
  TrackIllustration,
  WelcomeIllustration,
} from './OnboardingIllustrations';

const { width: SCREEN_W } = Dimensions.get('window');

type IllustrationComponent = React.ComponentType<{
  size?: number;
  color?: string;
  accentColor?: string;
  accentSoftColor?: string;
}>;

const SLIDES: { Illustration: IllustrationComponent; title: string; body: string }[] = [
  {
    Illustration: WelcomeIllustration,
    title: 'Welcome to WinTheWeek',
    body: 'Plan your routines once, then just check them off.',
  },
  {
    Illustration: PlanIllustration,
    title: 'Set your rhythm',
    body: 'Add a routine, pick how many days a week — WinTheWeek fits it into your schedule.',
  },
  {
    Illustration: TrackIllustration,
    title: 'One tap, done',
    body: 'Check things off as you go. Nothing to fill in, nothing to overthink.',
  },
  {
    Illustration: InsightsIllustration,
    title: 'See it add up',
    body: "Your Week view and Analytics show how you're actually doing.",
  },
];

// The one-time, full-screen intro — the first thing a fresh install shows,
// above everything else in the app (even ConfirmDialog's zIndex 40). Reads
// its own visibility straight from AppState, same self-contained pattern as
// TaskMenu/BottomSheet/ConfirmDialog, rather than being told when to show.
export default function IntroSlides() {
  const { colors, radius, shadowPanel } = useTheme();
  const insets = useSafeAreaInsets();
  const { hasHydratedOnboarding, seenIntro, completeIntro } = useAppState();
  // Gated on hydration too, not just `!seenIntro` — otherwise a returning
  // user could see a one-frame flash of the intro before storage resolves.
  const visible = hasHydratedOnboarding && !seenIntro;

  const [mounted, setMounted] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const [pageIndex, setPageIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setPageIndex(0);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      // Only animate out if we were actually showing — on first mount,
      // `visible` starts false for one render (before onboarding hydration
      // resolves), and `mounted` is already false then too, so there's
      // nothing to animate out. Skipping this avoids a real race: without
      // this guard, that first render schedules a 180ms exit animation
      // ending in `setMounted(false)`, and if hydration resolves (flipping
      // `visible` true) before that timer fires, the stale callback still
      // fires afterward and stomps the `true` back to `false`.
      Animated.timing(progress, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, progress]);

  if (!mounted) return null;

  const isLast = pageIndex === SLIDES.length - 1;

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPageIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
  };

  const goNext = () => {
    if (isLast) {
      completeIntro();
      return;
    }
    const next = pageIndex + 1;
    scrollRef.current?.scrollTo({ x: next * SCREEN_W, animated: true });
    setPageIndex(next);
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 50, backgroundColor: colors.paper, opacity: progress }]}>
      <View style={[styles.skipWrap, { top: insets.top + 8 }]}>
        <SheetLinkButton label="Skip" onPress={completeIntro} />
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        style={styles.pager}
      >
        {SLIDES.map(({ Illustration, title, body }, i) => (
          <View key={i} style={[styles.slide, { width: SCREEN_W }]}>
            <FadeInUp duration={420} distance={14} replayKey={pageIndex}>
              <View style={[styles.illustrationWrap, shadowPanel, { backgroundColor: colors.accentSoft, borderRadius: radius.pill }]}>
                <View style={[styles.illustrationRing, { borderColor: colors.paperRaised }]} />
                <Illustration size={120} color={colors.line} accentColor={colors.accent} accentSoftColor={colors.paperRaised} />
              </View>
            </FadeInUp>
            <Text style={[styles.title, androidTextFix, { color: colors.ink, fontFamily: fonts.headingBold }]}>
              {title}
            </Text>
            <Text style={[styles.body, androidTextFix, { color: colors.inkSoft, fontFamily: fonts.bodyRegular }]}>
              {body}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <StepDots count={SLIDES.length} activeIndex={pageIndex} />
        <PrimaryButton label={isLast ? 'Get started' : 'Next'} onPress={goNext} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  skipWrap: {
    position: 'absolute',
    right: 20,
    zIndex: 1,
    alignItems: 'flex-end',
  },
  pager: {
    flex: 1,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  illustrationWrap: {
    width: 208,
    height: 208,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  illustrationRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    borderWidth: 10,
    opacity: 0.5,
  },
  title: {
    fontSize: 23,
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 14.5,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 300,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 4,
    gap: 18,
  },
});
