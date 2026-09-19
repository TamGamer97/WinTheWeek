import React, { useEffect } from 'react';
import { BackHandler, Platform, StatusBar as NativeStatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import {
  useFonts as useOutfitFonts,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import {
  useFonts as useManropeFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';

import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { light } from './src/theme/colors';
import { AppStateProvider, useAppState } from './src/state/AppState';
import RootBackground from './src/components/RootBackground';
import ScreenSwitcher from './src/components/ScreenSwitcher';
import Fab from './src/components/Fab';
import NavBar from './src/components/NavBar';
import TaskMenu from './src/components/TaskMenu';
import BottomSheet from './src/components/BottomSheet';
import ConfirmDialog from './src/components/ConfirmDialog';
import IntroSlides from './src/components/onboarding/IntroSlides';
import CoachMarkOverlay from './src/components/onboarding/CoachMarkOverlay';

// expo-system-ui's own docs say to call this "outside of your component" —
// i.e. once, as soon as the JS bundle evaluates, not only from an effect —
// so the native root view is already the app's own color for the very first
// frame, instead of the OS default (commonly black) until the effect below
// gets a chance to run. The app always starts in light mode, so this matches;
// AppShell's effect then keeps it in sync if the theme changes.
SystemUI.setBackgroundColorAsync(light.gradientTop).catch(() => {});

export default function App() {
  const [outfitLoaded] = useOutfitFonts({ Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold });
  const [manropeLoaded] = useManropeFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  if (!outfitLoaded || !manropeLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#F4F6FB' }} />;
  }

  return (
    <ThemeProvider>
      <ThemedSafeAreaProvider>
        <AppStateProvider>
          <AppShell />
        </AppStateProvider>
      </ThemedSafeAreaProvider>
    </ThemeProvider>
  );
}

function ThemedSafeAreaProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();

  return (
    <SafeAreaProvider style={[styles.provider, { backgroundColor: colors.paper }]}>
      {children}
    </SafeAreaProvider>
  );
}

function AppShell() {
  const { isDark, colors } = useTheme();
  const {
    activeScreen,
    closeAnalytics,
    closeSettings,
    closeSheet,
    closeTaskMenu,
    cancelConfirm,
    confirmRequest,
    menuItemId,
    previousScreen,
    sheetOpen,
    hasHydratedOnboarding,
    seenIntro,
    seenCoachmarks,
  } = useAppState();
  const insets = useSafeAreaInsets();
  const showChrome = activeScreen !== 'settings' && activeScreen !== 'analytics';
  // The guided tour only ever runs right after the intro, on Today (its one
  // valid screen — see docs/PROJECT.md) — never re-eligible once seen, and
  // never shown before onboarding hydration confirms it's actually unseen.
  const coachmarksActive = hasHydratedOnboarding && seenIntro && !seenCoachmarks && activeScreen === 'today';
  const statusBarHeight = Math.max(insets.top, NativeStatusBar.currentHeight ?? 0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      // Back closes the foremost transient surface before navigating away
      // from the underlying screen, matching the visual stacking order.
      if (confirmRequest) {
        cancelConfirm();
        return true;
      }
      if (menuItemId) {
        closeTaskMenu();
        return true;
      }
      if (sheetOpen) {
        closeSheet();
        return true;
      }
      if (activeScreen === 'settings') {
        closeSettings();
        return true;
      }
      if (activeScreen === 'analytics') {
        closeAnalytics();
        return true;
      }

      // Let Android finish the activity from the two root screens.
      return false;
    });

    return () => subscription.remove();
  }, [
    activeScreen,
    cancelConfirm,
    closeAnalytics,
    closeSettings,
    closeSheet,
    closeTaskMenu,
    confirmRequest,
    menuItemId,
    previousScreen,
    sheetOpen,
  ]);

  // Keep the native decor/root background in sync as a fallback during
  // startup, reloads, and any frame where the React view tree is absent.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.gradientTop).catch(() => {});
  }, [colors.gradientTop]);

  return (
    <View style={[styles.root, { backgroundColor: colors.paper }]}>
      {/* `backgroundColor` handles Android builds that still expose an opaque
          native bar; `translucent` lets the underlay take over on edge-to-edge
          builds. Keeping both is the reliable cross-version behavior. */}
      <NativeStatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.gradientTop}
        translucent
      />
      <RootBackground />
      {Platform.OS === 'android' && (
        <View
          pointerEvents="none"
          style={[
            styles.statusBarUnderlay,
            { height: statusBarHeight, backgroundColor: colors.gradientTop },
          ]}
        />
      )}
      <SafeAreaView style={[styles.flexNoBottom, { paddingTop: statusBarHeight }]} edges={['left', 'right']}>
        <View style={styles.topSpacer} />
        <ScreenSwitcher />
      </SafeAreaView>

      {showChrome && <Fab />}

      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.chromeWrap} pointerEvents="box-none">
        {showChrome && <NavBar />}
      </SafeAreaView>

      <TaskMenu />
      <BottomSheet />
      <ConfirmDialog />
      {coachmarksActive && <CoachMarkOverlay />}
      <IntroSlides />
    </View>
  );
}

const styles = StyleSheet.create({
  provider: {
    flex: 1,
  },
  root: {
    flex: 1,
  },
  statusBarUnderlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // Keep the React-painted status surface above the root gradient on
    // Android's transparent, edge-to-edge status bar.
    zIndex: 1,
  },
  flexNoBottom: {
    flex: 1,
  },
  // Give every main screen a little breathing room below the status bar or
  // viewport edge. Keeping this shared means the Today, Week, and Settings
  // headers remain aligned across platforms.
  topSpacer: {
    height: 28,
  },
  chromeWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
