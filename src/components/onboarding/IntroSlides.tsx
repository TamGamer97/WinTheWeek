import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { androidTextFix, fonts } from '../../theme/fonts';
import { useAppState } from '../../state/AppState';
import { PrimaryButton, SheetLinkButton } from '../sheet/SheetControls';
import FadeInUp from '../FadeInUp';
import StepDots from './StepDots';

const { width: SCREEN_W } = Dimensions.get('window');

// Real screen recordings of the actual app, not illustrations — NN/g's
// research on onboarding flags "feature-based" tours (showing what an app
// can do before someone has used it) as reading like marketing rather than
// help, so every slide is still a screen the person will actually land on,
// shown as a short looping clip of the real action rather than a static
// frame or a mocked-up demo. The clips are the same footage the marketing
// site's promo video uses (marketing/video/public/recordings/v2/*.mp4,
// converted to GIF — see marketing/video/src/story.ts for the source list),
// so the in-app tour and the site show identical, real interactions. There's
// still no separate "watch your progress" slide — that's what the
// coach-mark tour's Analytics step is for, once there's something to
// actually show. See docs/DECISIONS.md.
const SLIDES: {
  source: ImageSourcePropType;
  title: string;
  body: string;
}[] = [
  {
    source: require('../../../assets/onboarding/today.gif'),
    title: 'Welcome to WinTheWeek',
    body: "Here's your day: a simple checklist. Check things off as you go. Nothing to fill in.",
  },
  {
    source: require('../../../assets/onboarding/complete.gif'),
    title: 'Mark it done',
    body: 'One tap on a routine finishes it for the day — no notes, no forms.',
  },
  {
    source: require('../../../assets/onboarding/week.gif'),
    title: 'See your whole week',
    body: 'Every day at a glance, so you always know what’s coming up and what’s already done.',
  },
  {
    source: require('../../../assets/onboarding/create.gif'),
    title: 'Create a routine',
    body: 'Give it a name, a color, and pick how often it happens.',
  },
  {
    source: require('../../../assets/onboarding/days.gif'),
    title: 'Choose the days',
    body: 'WinTheWeek fits it into your week from there.',
  },
  {
    source: require('../../../assets/onboarding/move.gif'),
    title: 'Plans change',
    body: "Didn't get to something? Move it to another day, no penalty.",
  },
];

const PHONE_WIDTH = 196;
const PHONE_ASPECT = 824 / 1648; // the recorded clips' own width:height
const BEZEL_PAD = 7;
const NOTCH_ZONE = 30;
const HOME_ZONE = 16;
const SCREEN_INNER_W = PHONE_WIDTH - BEZEL_PAD * 2;
const SCREEN_INNER_H = SCREEN_INNER_W / PHONE_ASPECT;

// A small device mockup around each real screenshot — reusing the exact
// frame/notch/home-indicator treatment the marketing website already uses
// for its own screenshots (website/styles.css's `.phone-frame`), so the
// in-app tour and the site read as the same product. The screenshots
// themselves have no status bar baked in, so this frame reserves that
// space itself (`NOTCH_ZONE`/`HOME_ZONE`) rather than cropping or covering
// any real content.
function PhoneMockup({ source, paper }: { source: ImageSourcePropType; paper: string }) {
  return (
    <LinearGradient colors={['#303034', '#1a1a1d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.phoneFrame}>
      <View style={[styles.phoneScreen, { backgroundColor: paper }]}>
        <View style={styles.phoneNotch} />
        <Image source={source} style={styles.phoneImage} resizeMode="cover" />
        <View style={styles.phoneHome} />
      </View>
    </LinearGradient>
  );
}

// The one-time, full-screen intro — the first thing a fresh install shows,
// above everything else in the app (even ConfirmDialog's zIndex 40). Reads
// its own visibility straight from AppState, same self-contained pattern as
// TaskMenu/BottomSheet/ConfirmDialog, rather than being told when to show.
export default function IntroSlides() {
  const { colors, shadowPanel } = useTheme();
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
        {SLIDES.map(({ source, title, body }, i) => (
          <View key={i} style={[styles.slide, { width: SCREEN_W }]}>
            <FadeInUp duration={420} distance={14} replayKey={pageIndex}>
              <View style={[styles.phoneShadowWrap, shadowPanel]}>
                <PhoneMockup source={source} paper={colors.paper} />
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
  phoneShadowWrap: {
    marginBottom: 28,
    borderRadius: 30,
  },
  phoneFrame: {
    width: PHONE_WIDTH,
    padding: BEZEL_PAD,
    borderRadius: 30,
  },
  phoneScreen: {
    width: SCREEN_INNER_W,
    height: SCREEN_INNER_H + NOTCH_ZONE + HOME_ZONE,
    borderRadius: 23,
    overflow: 'hidden',
  },
  phoneImage: {
    width: SCREEN_INNER_W,
    height: SCREEN_INNER_H,
    marginTop: NOTCH_ZONE,
  },
  phoneNotch: {
    position: 'absolute',
    top: 8,
    left: '50%',
    transform: [{ translateX: -22 }],
    width: 44,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#1a1a1d',
    zIndex: 2,
  },
  phoneHome: {
    position: 'absolute',
    bottom: 6,
    left: '50%',
    transform: [{ translateX: -24 }],
    width: 48,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#8C8681',
    opacity: 0.4,
    zIndex: 2,
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
