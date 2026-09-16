# Cadence — Project overview

Cadence is a weekly routine-planning mobile app: a React Native (Expo) port
of an HTML/CSS/JS mockup, kept visually and behaviorally close to that
original design (same screens, colors, typography, copy, and
micro-interactions).

## Stack

- Expo SDK 57, React Native 0.86, React 19, TypeScript (`strict: true`).
- No navigation library — screen switching is app-level state
  (`ScreenName = 'week' | 'today' | 'settings'`), not a router.
- No backend, no auth, single-user, local-only. State lives in memory for
  the session and is persisted to `@react-native-async-storage/async-storage`
  on-device.
- No Reanimated / react-native-gesture-handler — all animation and gesture
  handling (including drag-and-drop reordering) is built on core RN
  `Animated` + `PanResponder`. See `docs/DECISIONS.md`.
- `react-native-svg` for all icons (`src/icons/Icons.tsx`), no icon font/lib.
- Fonts: Outfit (headings) and Manrope (body), loaded via
  `@expo-google-fonts/*` in `App.tsx`.

## What the app does

The core object is a **routine**: a recurring commitment with a weekly
frequency (`timesPerWeek`) and a color. A routine either follows a default
weekly template (`defaultDays`) or is planned week-by-week ("Not scheduled
yet" → pick which days it lands on for a given week). Two screens present
the same underlying data differently:

- **Week screen** — the 7 days of a browsable week, each showing which
  routines are scheduled that day, plus an "unscheduled" group for routines
  that haven't been planned into the current week yet.
- **Today screen** — a single real day (the actual current date, not
  whatever week is being browsed on the Week screen) with a checklist of
  that day's routine instances, each completable and drag-reorderable.
- **Settings screen** — theme (light/dark) and notification toggles, plus
  "Manage routines" (edit color/frequency/default days, or delete).

## Data model (`src/data/types.ts`)

```
Routine {
  id, title, color (a RoutineColorId, not a hex — see below)
  timesPerWeek: number
  defaultDays: DayKey[]              // the routine's usual weekly rhythm
  schedule: Record<weekId, DayKey[]> // explicit per-week overrides
  doneDates: Record<isoDate, boolean> // completion, keyed by real calendar date
  order: number                      // default display order, used as a fallback (see below)
  dayOrder: Record<isoDate, number>  // per-day reorder overrides (see below)
}

RoutineInstance {                    // a routine rendered on one specific real day
  id: `${routineId}::${iso}`, title, color, done, isRoutine: true,
  timesPerWeek, order
}
```

**`daysForWeek(routine, weekId)`** (`src/data/schedule.ts`) is the single
resolver for "which days does this routine land on this week": if
`weekId in routine.schedule` (even an empty array — "cleared this week"),
use that; otherwise fall back to `defaultDays`. Every screen that shows or
edits a routine's days for a given week goes through this function, so they
can never disagree with each other. Editing a specific week's plan writes
only into `schedule[weekId]`; it never touches `defaultDays`.

A `weekId` is always the ISO date (`YYYY-MM-DD`) of that week's **Monday**
— weeks are Monday-start throughout (`src/utils/date.ts`). Completion
(`doneDates`) is keyed by the real calendar ISO date, not by weekday, so
marking one Wednesday done never affects any other Wednesday.

`order` and `dayOrder` together decide a routine's position in whichever
list it's shown alongside other routines (currently: a day's task list on
Today, or the day-planning sheet). `order` is the routine's default rank,
used as a fallback for any date it hasn't been reordered on; `dayOrder` is
keyed by real calendar date (ISO date), like `doneDates`, and holds an
explicit per-day override once a person actually drags that day's list.
The effective order for a given date is `dayOrder[iso] ?? order` (see
`tasksFor`/`makeRoutineInstance` in `AppState`). This split is what keeps
reordering one day from also reordering another day that happens to share
a routine. It's independent of completion — finishing a task must never
move it in the list — and of scheduling. Reordering
(`reorderRoutinesForDay` in `AppState`) writes `dayOrder` only for the one
date being dragged, for the routines actually visible in that day's list;
it never touches `order`, another date's `dayOrder`, or routines not shown
in that list.

## Colors: id-based, not hex

A routine's `color` field stores an id (`'blue' | 'red' | 'amber' | 'green'
| 'violet' | 'pink'`), never a raw hex value. `routineColorHex(id, isDark)`
in `src/theme/colors.ts` is the single place that resolves an id to an
actual color for the current theme. Every screen that renders a routine's
color (Today, Week, day popup, Manage Routines, the color picker) goes
through this function. Do not render `routine.color` directly as a CSS/RN
color value.

## Persistence and migration

Routines are persisted to AsyncStorage under `@cadence/routines/v2`, with a
validating parser (`restoreRoutinesV2`) that rejects anything malformed
rather than partially trusting it. There's a one-time fallback migration
from an older shape at `@cadence/routines/v1` (`migrateLegacyRoutines`) for
data saved before the week-planning model existed (flat `days` → 
`defaultDays`, `doneMap` keyed by weekday → `doneDates` keyed by real date
mapped onto the current week). Both restore paths backfill `order` from
array index when it's missing (data saved before drag-reorder existed), and
`dayOrder` to `{}` when missing (data saved before per-day reordering
existed) — both fields were added to `restoreRoutinesV2` as optional,
defaulted reads rather than a version bump, and any future field addition
should follow that same precedent unless the shape change is actually
incompatible with old data.

## State (`src/state/AppState.tsx`)

One context (`AppStateProvider` / `useAppState()`) owns all app state:
routines, navigation, the Today/Week week-browsing state, the bottom
sheet, the task options popover, and confirmation dialogs. There's no
Redux/Zustand/etc. — everything is `useState`/`useCallback`/`useMemo` in
this one file, with a single memoized `value` object (every field must be
added to both the object and its dependency array — TypeScript will not
catch a value present in the type but missing from the object).

Two independent "current week" concepts exist and must stay independent:
- `todayWeekId` / `todayDayKey` — the real current date, computed once at
  session start, used by the Today screen. Never changes during a session.
- `currentWeekStart` / `weekId` — whatever week is being *browsed* on the
  Week screen (and the month-view popup). Changes via `goToPrevWeek` /
  `goToNextWeek` / `goToWeekOf` / `monthViewGoToToday`.

Today screen logic must always use `todayWeekId`/`todayDayKey`, never
`weekId` — conflating the two would make Today follow whatever week the
Week screen happens to be browsing.

## The bottom sheet system (`src/components/BottomSheet.tsx`)

One sliding sheet component renders different content depending on
`sheetMode` (`SheetMode` in `src/data/types.ts`): `'add' | 'routineManage' |
'routineEdit' | 'day' | 'routinePlan' | 'moveRoutineDay' | 'monthView'`.
Each mode has a `use<Mode>Content()` hook returning `{ title, context,
body }`. **Every content hook runs on every render** regardless of the
active mode (rules-of-hooks safety) — `SheetBody` just picks which result
to use. Adding a new sheet mode means: add it to `SheetMode`, add a
`use<Mode>Content()` hook following the existing pattern, and add a branch
in `SheetBody`'s mode selection.

This is a distinct system from `ConfirmDialog` (below) — sheets are for
forms and pickers; a plain yes/no or destructive confirmation always goes
through `requestConfirm()` / `ConfirmDialog`, not a sheet.

## Confirmation dialogs (`src/components/ConfirmDialog.tsx`)

A single always-mounted centered modal, driven by `AppState`'s
`confirmRequest` / `requestConfirm()` / `confirmAction()` / `cancelConfirm()`.
Used for anything destructive or easy to trigger by accident (deleting a
routine, removing a day). Design is deliberately plain: centered icon
badge, title, message, then a stacked full-width primary button and a
ghost cancel button underneath — see `docs/DECISIONS.md` before changing
this look.

## Drag-and-drop reordering (`src/components/DraggableTaskList.tsx`)

Today's task list supports press-and-drag reordering via a long press on
the task card, built entirely on `PanResponder` + `Animated` (no
gesture/animation library beyond core RN). Each row has an `Animated.Value`
"top" that eases into its slot when the order changes; the row actively
being dragged instead tracks the finger directly via a JS-driven
`translateY`. Native-driven pickup scale and wiggle transforms live on a
nested animated view so they never share an animated props node with the
JS-driven position values. On drop, the new order is committed through
`AppState.reorderRoutinesForDay(iso, orderedIds)` — every task in one list
shares the same real date (derived from each instance's
`${routineId}::${iso}` id), and that date's `dayOrder` is the only thing
written; routines not shown in the dragged list, and every other date, keep
their existing order untouched. This same component (and the same
per-day-only write) is reused by the day-planning sheet's list.

## Month-view calendar (`src/components/MonthCalendar.tsx`)

Opened from the Week screen's nav bar (`WeekNav.tsx`) via an always-visible
calendar button (`AppState.openMonthView`, `sheetMode: 'monthView'`). Shows
a full Monday-start month grid (`getMonthGridWeeks` in `src/utils/date.ts`),
padded with adjacent-month days so every row is a complete week. The
month currently displayed (`monthViewAnchor`) is independent of
`currentWeekStart` — browsing months in the popup does not move the actual
browsed week until a date is tapped (`goToWeekOf`) or "Jump to today"
(`monthViewGoToToday`) is used, both of which also close the sheet.

## Theming (`src/theme/`)

`ThemeContext` exposes `colors` (a full `Palette`, light or dark),
`radius`, and theme-aware shadow helpers (`shadowCard`, `shadowPanel`,
`shadowSoft`, `glowFab` — all functions of `isDark`, since RN shadow
opacity/color needs to differ by theme to look right). There is no default
export of "the" palette — always read `colors` from `useTheme()`, never
import `light`/`dark` directly in a component (the one exception is
`App.tsx`'s pre-mount `SystemUI` call, which by definition runs before
theme context exists — see `docs/DECISIONS.md`).

## Android-specific rendering quirks (apply proactively)

RN-on-Android has a handful of recurring rendering issues this codebase
already works around; follow the existing pattern rather than
reintroducing the bug in new code:

- **Text next to an icon, or inside a tight button/pill**: spread
  `androidTextFix` (`src/theme/fonts.ts`) into the `Text` style. Android
  adds extra font-metric padding that iOS doesn't, throwing off vertical
  centering.
- **A circular badge that toggles `elevation`/shadow between renders**
  (e.g. selected vs. not): add `overflow: 'hidden'` on the circular view.
  Otherwise Android can render the shadow as a rectangular silhouette for
  a frame instead of clipping it to `borderRadius`.
- **`ScrollView`**: always pass `overScrollMode="never"`. Android's default
  overscroll edge-glow uses the app's accent blue, which reads as an
  unwanted "loading" flash.
- Android status-bar background: Expo SDK 57 makes the system bar transparent,
  so `App.tsx` renders an explicit theme-aware underlay at the top of the React
  view, sized from the safe-area inset and native status-bar height. The native
  decor fallback is also set via `expo-system-ui` both before first paint and
  reactively on theme change — see `docs/DECISIONS.md` for why both layers are
  needed.

None of these can be visually verified from a non-device environment (no
emulator/device here) — web/Playwright testing does not exercise Android's
renderer. Say so explicitly rather than claiming an Android-only fix was
confirmed.

## Key file map

```
App.tsx                        Root: font loading, providers, screen chrome, status bar
src/theme/                     colors.ts (palettes, routineColorHex, shadows),
                                fonts.ts (font names, androidTextFix), ThemeContext.tsx
src/data/types.ts               Routine, RoutineInstance, DayKey, SheetMode, ScreenName
src/data/schedule.ts            daysForWeek() — the one schedule resolver
src/data/seed.ts                Initial/default routine data
src/state/AppState.tsx          All app state/logic (single context)
src/utils/date.ts               Pure date helpers: weeks, month grid, formatting
src/icons/Icons.tsx              All SVG icons
src/components/                 Reusable UI (rows, sheet, nav, dialogs, drag list, ...)
  BottomSheet.tsx                The multi-mode sheet system
  ConfirmDialog.tsx              Yes/no + destructive confirmation modal
  DraggableTaskList.tsx          Today's drag-to-reorder list
  MonthCalendar.tsx              Month grid used by the month-view sheet mode
  WeekNav.tsx                    Week screen's week selector + calendar button
  sheet/                         Shared sheet building blocks (inputs, pickers, rows)
src/screens/                    WeekScreen, TodayScreen, SettingsScreen
```

## Build / run

```
npm install
npx expo start        # press i / a / w, or scan the QR code
```

There is no CI and no automated test suite; see `AGENTS.md` for how to
verify a change in this repo.
