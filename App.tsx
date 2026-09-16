import React, { useEffect } from 'react';
import { Platform, StatusBar as NativeStatusBar, StyleSheet, View } from 'react-native';
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
  const { activeScreen } = useAppState();
  const insets = useSafeAreaInsets();
  const showChrome = activeScreen !== 'settings';
  const statusBarHeight = Math.max(insets.top, NativeStatusBar.currentHeight ?? 0);

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
