import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
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
// so the native root view (what shows through Android's transparent,
// edge-to-edge status/nav bars) is already the app's own color for the very
// first frame, instead of the OS default (commonly black) until the effect
// below gets a chance to run. The app always starts in light mode, so this
// matches; AppShell's effect then keeps it in sync if the theme changes.
SystemUI.setBackgroundColorAsync(light.paper).catch(() => {});

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
    <SafeAreaProvider>
      <ThemeProvider>
        <AppStateProvider>
          <AppShell />
        </AppStateProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppShell() {
  const { isDark, colors } = useTheme();
  const { activeScreen } = useAppState();
  const showChrome = activeScreen !== 'settings';

  // Android draws the (always-transparent, edge-to-edge) status/nav bars
  // straight over the Activity's own window background, not over our RN
  // view tree — so without this, the sliver behind them defaults to the
  // native theme's background (often black) instead of the app's own
  // color, on either theme.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.paper).catch(() => {});
  }, [colors.paper]);

  return (
    <View style={[styles.root, { backgroundColor: colors.paper }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootBackground />
      <SafeAreaView style={styles.flexNoBottom} edges={['top', 'left', 'right']}>
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
  root: {
    flex: 1,
  },
  flexNoBottom: {
    flex: 1,
  },
  // A little extra breathing room below the status bar/notch, on top of
  // whatever the safe-area inset already reserves — mainly matters on
  // Android, where the status bar can otherwise sit right against the
  // header.
  topSpacer: {
    height: Platform.select({ android: 12, default: 0 }),
  },
  chromeWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
