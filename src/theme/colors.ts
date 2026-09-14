// Color tokens ported 1:1 from the original HTML design's CSS custom
// properties (:root and .device.theme-dark).

export type Palette = {
  paper: string;
  paperRaised: string;
  ink: string;
  inkSoft: string;
  muted: string;
  line: string;
  lineStrong: string;
  accent: string;
  accentSoft: string;
  highlight: string;
  highlightSoft: string;
  danger: string;
  dangerSoft: string;
  scrim: string;
  captionMuted: string;
  gradientTop: string;
  gradientBottom: string;
  glowTint: string;
};

export const light: Palette = {
  // A touch warmer and less saturated than the original blue-grey — keeps
  // the same cool, subtle tint (a flat neutral would feel lifeless next to
  // the accent blue) without reading as sterile/clinical.
  paper: '#F5F5FA',
  paperRaised: '#FFFFFF',
  ink: '#12141C',
  inkSoft: '#4E5361',
  muted: '#8B90A0',
  line: '#E4E8F1',
  lineStrong: '#CDD3E3',
  accent: '#3860E8',
  accentSoft: '#E9EEFD',
  highlight: '#5B8DEF',
  highlightSoft: '#EAF0FD',
  danger: '#D9483F',
  dangerSoft: '#FBEAE9',
  scrim: 'rgba(15, 18, 30, 0.45)',
  captionMuted: '#9A988F',
  gradientTop: '#FBFBFE',
  gradientBottom: '#F5F5FA',
  glowTint: 'rgba(56, 96, 232, 0.09)',
};

export const dark: Palette = {
  paper: '#0D0E11',
  paperRaised: '#17181C',
  ink: '#EEEFF2',
  inkSoft: '#A3A6AD',
  muted: '#6B6E76',
  line: '#232429',
  lineStrong: '#2E3038',
  accent: '#5A8DEE',
  accentSoft: 'rgba(90, 141, 238, 0.16)',
  highlight: '#7FA8F2',
  highlightSoft: 'rgba(127, 168, 242, 0.14)',
  danger: '#FF6B61',
  dangerSoft: 'rgba(255, 107, 97, 0.14)',
  scrim: 'rgba(0, 0, 0, 0.65)',
  captionMuted: '#5B5D63',
  gradientTop: '#131419',
  gradientBottom: '#0D0E11',
  glowTint: 'rgba(90, 141, 238, 0.12)',
};

// ---------------------------------------------------------------------------
// Routine colors — the single source of truth for "what color is this
// routine". A routine stores one of these ids (e.g. Routine.color = 'blue'),
// never a raw hex, so every screen that displays it — the Week list, the day
// popup, Manage Routines, the color picker, the Today screen — resolves the
// exact same value through routineColorHex() and can never drift apart.
//
// Each hue is tuned to work as a small dot/spine/icon accent (not as body
// text): mid-saturation, medium-weight tones in light mode so none of them
// shout louder than the app's own accent color; lightened counterparts in
// dark mode for contrast against near-black surfaces. Hues are spaced apart
// (blue, red, amber, green, violet, pink) so all six stay easy to tell apart
// at a glance, even as a 4px bar or a 9px dot.
export type RoutineColorId = 'blue' | 'red' | 'amber' | 'green' | 'violet' | 'pink';

export const ROUTINE_COLOR_IDS: RoutineColorId[] = ['blue', 'red', 'amber', 'green', 'violet', 'pink'];

const ROUTINE_COLOR_HEX: Record<RoutineColorId, { light: string; dark: string }> = {
  blue: { light: '#3860E8', dark: '#5A8DEE' },
  red: { light: '#D14B3F', dark: '#FF8A76' },
  amber: { light: '#C97A1E', dark: '#E9A15C' },
  green: { light: '#1B9C85', dark: '#3FC7AE' },
  violet: { light: '#8354E0', dark: '#A78BFA' },
  pink: { light: '#D9527A', dark: '#EF7FA0' },
};

export const DEFAULT_ROUTINE_COLOR: RoutineColorId = 'blue';

// Accepts any string (routine colors are stored loosely, and older data may
// hold something unexpected) and always returns a usable hex — unrecognized
// ids fall back to the default rather than rendering blank or crashing.
export function routineColorHex(id: string | undefined, isDark: boolean): string {
  const entry = ROUTINE_COLOR_HEX[id as RoutineColorId] ?? ROUTINE_COLOR_HEX[DEFAULT_ROUTINE_COLOR];
  return isDark ? entry.dark : entry.light;
}

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};

// react-native's shadow* props are iOS-only; elevation is used on Android.
// These approximate the CSS box-shadows from the design.
//
// Light mode's shadow tint used to be a fairly saturated navy (#38519E /
// #233778) — under every card at once that read as a cold, clinical blue
// cast rather than a soft depth cue. These are the same hue family, just
// desaturated toward a muted ink/slate so the lift still feels cool rather
// than a flat, lifeless black, without tinting everything blue.
export const shadowCard = (isDark: boolean) => ({
  shadowColor: isDark ? '#000000' : '#4C5570',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: isDark ? 0.45 : 0.14,
  shadowRadius: 12,
  elevation: 3,
});

export const shadowPanel = (isDark: boolean) => ({
  shadowColor: isDark ? '#000000' : '#383F58',
  shadowOffset: { width: 0, height: 14 },
  shadowOpacity: isDark ? 0.55 : 0.2,
  shadowRadius: 28,
  elevation: 12,
});

// A quieter lift than shadowCard — for rows that should read as gently
// separated from the page without a hard outline. No border is paired with
// this: the shadow itself (plus the paper/paperRaised tone shift) is what
// separates the row from the page, for a softer "resting on the surface"
// feel than a bordered card.
export const shadowSoft = (isDark: boolean) => ({
  shadowColor: isDark ? '#000000' : '#4C5570',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: isDark ? 0.32 : 0.07,
  shadowRadius: 10,
  elevation: 2,
});

export const glowFab = (isDark: boolean) => ({
  shadowColor: isDark ? '#5A8DEE' : '#3860E8',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: isDark ? 0.55 : 0.4,
  shadowRadius: 16,
  elevation: 8,
});
