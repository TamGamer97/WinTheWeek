import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { light, dark, Palette, radius, shadowCard, shadowPanel, shadowSoft, glowFab } from './colors';

const THEME_STORAGE_KEY = '@cadence/theme/v1';

type ThemeContextValue = {
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  colors: Palette;
  radius: typeof radius;
  shadowCard: ReturnType<typeof shadowCard>;
  shadowPanel: ReturnType<typeof shadowPanel>;
  shadowSoft: ReturnType<typeof shadowSoft>;
  glowFab: ReturnType<typeof glowFab>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  // Guards the save effect below from firing (and overwriting the real
  // saved value with the default `false`) before hydration has actually
  // read it back — same pattern as AppState's routines/onboarding hydration.
  const hasHydrated = useRef(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((raw) => {
        if (active && (raw === 'dark' || raw === 'light')) setIsDark(raw === 'dark');
      })
      .catch(() => {})
      .finally(() => {
        if (active) hasHydrated.current = true;
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated.current) return;
    void AsyncStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light').catch(() => {});
  }, [isDark]);

  const value = useMemo<ThemeContextValue>(() => {
    const colors = isDark ? dark : light;
    return {
      isDark,
      setIsDark,
      colors,
      radius,
      shadowCard: shadowCard(isDark),
      shadowPanel: shadowPanel(isDark),
      shadowSoft: shadowSoft(isDark),
      glowFab: glowFab(isDark),
    };
  }, [isDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
