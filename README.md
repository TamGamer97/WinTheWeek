# WinTheWeek — weekly planning app

A React Native (Expo) weekly planning mobile app,
converted 1:1 from the original HTML/CSS/JS mockup: same screens, same
layout, same colors and typography, and the same set of micro-interactions
and animations.

## Getting started

```bash
npm install
npx expo start
```

Then press `i` for the iOS simulator, `a` for an Android emulator, or scan
the QR code with the Expo Go app on your phone.

## What's implemented

- **Week screen** — a board of the 7 days with task/routine pills, an
  unscheduled-items group header, staggered row entrance animation, and a
  pulsing "today" indicator dot.
- **Today screen** — a horizontally-scannable day strip, a progress bar,
  an empty state, and a task list with animated checkboxes, tags (time,
  routine frequency) and a slide transition when switching
  days.
- **Settings screen** — light/dark theme switcher and two notification
  toggles, opened from the gear icon on either main screen.
- **Add / Move / Day-detail / Routine-planning bottom sheet** — a single
  sliding sheet component that renders different content depending on
  what triggered it, exactly like the original `renderSheet()` logic.
- **Task options popover**, a **floating "+" button** with a liquid squish
  press animation, and a **floating pill nav bar** with an animated sliding
  highlight between "Week" and "Today".
- Full **light/dark theme** support, matching the original's CSS custom
  properties for both palettes.
- **Outfit** (headings) and **Manrope** (body) fonts, loaded via
  `@expo-google-fonts`.

All app data (tasks, routines, sheet/menu state, current screen, current
day) lives in-memory in `src/state/AppState.tsx`, ported function-for-function
from the original `<script>` block — it resets on app reload, same as the
original demo.

## Project structure

```
App.tsx                   Root: font loading, providers, screen chrome
src/
  theme/                  Color tokens (light/dark), fonts, ThemeContext
  data/                   Types + seed data (tasks, routines, days)
  state/AppState.tsx      All app logic/state, ported from the original JS
  icons/Icons.tsx         Every SVG icon used in the design (react-native-svg)
  components/             Reusable UI pieces (rows, pills, sheet, nav bar, ...)
  screens/                WeekScreen, TodayScreen, SettingsScreen
```

## Notes on the conversion

- The original HTML wrapped the UI in a fake iPhone frame (notch, status
  bar, home indicator) for presentation purposes in the browser. That
  device chrome isn't part of the app itself, so it's not reproduced —
  the app uses the real device's status bar/safe areas instead. Everything
  else — screens, components, colors, copy, spacing, and animations — is
  carried over.
- CSS `box-shadow` doesn't exist in React Native; shadows are approximated
  with `shadowColor/shadowOffset/shadowOpacity/shadowRadius` (iOS) and
  `elevation` (Android) tuned to look close to the originals.
- Animations use React Native's built-in `Animated` API (no extra native
  dependencies needed) and closely follow the original's keyframes:
  `fadeUp`, `slideInLeft/Right`, `popCheck`, `liquidSquish`, `ringPulse`,
  and `menuPop`.
