import React, { createContext, useContext, useMemo, useState } from 'react';
import { light, dark, Palette, radius, shadowCard, shadowPanel, shadowSoft, glowFab } from './colors';

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
