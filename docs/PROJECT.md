# WinTheWeek — Project overview

WinTheWeek is a weekly routine-planning mobile app: a React Native (Expo) port
of an HTML/CSS/JS mockup, kept visually and behaviorally close to that
original design (same screens, colors, typography, copy, and
micro-interactions).

## Stack

- Expo SDK 57, React Native 0.86, React 19, TypeScript (`strict: true`).
- No navigation library — screen switching is app-level state
  (`ScreenName = 'week' | 'today' | 'settings' | 'analytics'`), not a router.
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
- **Analytics screen** — a progress overview: a fixed "right now" stat row
  (current streak, this real month's completion rate, all-time completed
  count), a navigable month calendar where each day is a progress ring
  (empty/no-plan, soft red at 0%, soft blue with a precise arc for partial,
  solid green at 100%), and a per-routine completion breakdown scoped to
  whichever month the calendar is currently browsing. Opened via its own
  header icon (left of the settings gear on Today/Week), using the same
  `openX`/`closeX` + `previousScreen` pattern as Settings (see State below).
  All of its figures are derived, not stored — see `src/data/analytics.ts`.

## Data model (`src/data/types.ts`)

```
Routine {
  id, title, color (a RoutineColorId, not a hex — see below)
  timesPerWeek: number
  defaultDays: DayKey[]              // the routine's usual weekly rhythm (current/live value)
  defaultDaysHistory: { untilIso, days }[] // superseded defaultDays values (see below)
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
use that. Otherwise each day of that week is resolved *independently*
against whichever `defaultDays` value actually applied on that day's real
date — walking `defaultDaysHistory` (oldest first) for a snapshot whose
`untilIso` is after that date, else falling through to the live
`defaultDays`. This per-day (not per-week) resolution is what lets editing
a routine's regular days apply "from today onward" without rewriting a
week that's half past, half future — see `docs/DECISIONS.md`. Every screen
that shows or edits a routine's days for a given week goes through this
function, so they can never disagree with each other. Editing a specific
week's plan writes only into `schedule[weekId]`; it never touches
`defaultDays`.

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
array index when it's missing (data saved before drag-reorder existed),
`dayOrder` to `{}` when missing (data saved before per-day reordering
existed), and `defaultDaysHistory` to `[]` when missing (data saved before
past-day locking existed) — all three fields were added to
`restoreRoutinesV2` as optional, defaulted reads rather than a version
bump, and any future field addition should follow that same precedent
unless the shape change is actually incompatible with old data.
Fresh installs have no routines; the empty in-memory initial state is only
used until storage hydration completes or when no saved data exists.
New routines record their creation date, and the schedule resolver excludes
all dates before that boundary. Older saved routines without this field keep
their existing behavior.

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

Settings and Analytics are both reached the same way: `openSettings`/
`openAnalytics` stash the current screen into a single shared
`previousScreen`, then `closeSettings`/`closeAnalytics` return to it via
`showScreen`. Android's system back action is handled at the app shell and
uses those same close actions, so it returns to the originating Today/Week
screen; transient overlays (confirm dialog, task menu, or bottom sheet) close
first. This is safe only because the two can't be opened from within each
other; a third such screen would need to confirm that's still true before
reusing `previousScreen` again.

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

## Onboarding: intro slides and coach-mark tour (`src/components/onboarding/`)

Two independent, sequentially-gated pieces, both self-mounted in `App.tsx`'s
`AppShell` alongside `TaskMenu`/`BottomSheet`/`ConfirmDialog`, at the top of
the app's fixed `zIndex` stack (`BottomSheet` 20, `TaskMenu` 30,
`ConfirmDialog` 40, `CoachMarkOverlay` 45, `IntroSlides` 50 — highest wins,
keep new overlays consistent with this order):

- **`IntroSlides.tsx`** — a one-time, full-screen, opaque set of 4 paged
  slides (`ScrollView` + `pagingEnabled`, no dependency needed) shown before
  anything else on first launch. Self-contained like `ConfirmDialog` — reads
  its own visibility from `AppState` (`hasHydratedOnboarding && !seenIntro`)
  rather than being told when to show.
- **`CoachMarkOverlay.tsx`** — a 3-step spotlight tour that runs immediately
  after, pointing at the "+" FAB, the Week nav tab, and the header's
  Analytics icon in turn. Unlike the other overlays, this one is
  conditionally *mounted* by `AppShell` (`{coachmarksActive && <CoachMarkOverlay />}`)
  rather than always-mounted-but-self-hiding, since it only ever makes sense
  on Today. The spotlight "hole" is a `react-native-svg` `Mask`/`Rect` (a
  luminance mask — a black rect subtracts from a white one) with its
  `x/y/width/height` driven by `Animated.Value`s via
  `Animated.createAnimatedComponent(Rect)`, necessarily `useNativeDriver:
  false` (raw x/y/width/height aren't native-driver-eligible — same
  constraint `NavBar.tsx`'s sliding tab indicator already works around). The
  scrim itself is a dedicated, deliberately dark color local to this
  component — not the app's own `colors.scrim` (tuned much lighter, for a
  backdrop behind a centered dialog), which read as barely-there when first
  tried here. Two more `AnimatedRect`s track the hole outside the mask (so
  they're unaffected by it): a static accent-colored ring outline, and a
  looping "radar ping" ring (`pulse`, an `Animated.loop`) that expands and
  fades — the one cue that reliably reads as "look here" versus just a
  brighter patch of screen. Ending the tour (via "Got it"/"Skip tour", navigating away from Today, or
  any other way the component gets unmounted) always calls
  `completeCoachmarks()` exactly once, guarded by a `finishedRef` — see the
  component for why an explicit finish plays a local fade before flipping
  the flag (so `AppShell` unmounting it a moment later is never a visible
  pop) while an unexpected unmount (e.g. mid-tour navigation) marks it seen
  from the unmount cleanup instead, with no fade.

**Target measurement**: the three coach-mark targets (`Fab.tsx`'s "+",
`NavBar.tsx`'s Week item, `ScreenHeader.tsx`'s Analytics icon) each wrap in a
bare `<View ref={...} collapsable={false}>` and register themselves via
`AppState`'s `registerCoachTarget(key, node)` on mount /
`registerCoachTarget(key, null)` on unmount. `collapsable={false}` is
required — without it Android's view-flattening can drop the wrapper from
the native tree and `measureInWindow` (what `measureCoachTarget(key)`
resolves through) silently fails in a release build. This ref registry
lives in a plain `useRef` map, not the state object, since registering a
target shouldn't trigger a re-render of everything reading `AppState`.

**Persistence**: `@cadence/onboarding/v1` stores `{ seenIntro,
seenCoachmarks }`, hydrated/saved with the same guarded
hydrate-then-save-gated-on-a-flag pattern routines use (see "Persistence and
migration" above) — its own `hasHydratedOnboarding` flag gates both the save effect
and whether `IntroSlides` is allowed to render, so a returning user never
sees a one-frame flash of the intro before storage confirms they've already
seen it. Settings' "Replay tutorial" row calls `replayTutorial()`, which
resets both flags and calls `showScreen('today')` — enough to close
Settings (it's just whichever `ScreenName` is active) and put the tour back
on a valid screen, so replaying looks identical to first launch.

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

## Past days: real history vs. retroactive scheduling

A real date strictly before `todayIso` is read-only, today itself always
excepted — *mark done*, *reorder*, *move to another day*, and *manually add
a routine* are all unconditionally blocked for it, regardless of which UI
path reaches them. The one exception: a day can still show a routine it
never had, if that's the direct result of creating a routine, or editing an
existing one's regular days (`defaultDays`), with the day already past when
the create/edit happened. Such an instance renders exactly like any other
past task (dimmed, non-completable — the ordinary past-day styling already
covers this, no separate treatment needed) but, unlike a genuinely
pre-existing entry, it can still be removed or moved for that one occurrence.
This is called a *retroactive* instance (`RoutineInstance.retroactive`,
`data/schedule.ts`'s `isRetroactiveDay()`) and it is never something a user
picks by hand — only editing/creating a routine's `defaultDays` produces
one. Analytics (`src/data/analytics.ts`) never counts one, for the same
reason it must never be completable: it wasn't actually planned in advance.

**It's derived, not stored.** `isRetroactiveDay(routine, weekId, day, today)`
is a pure function of the routine's own template (`defaultDays`,
`defaultDaysHistory`, `createdIso`) — true when the day is past, in the
*current* `defaultDays`, but the historical per-day resolution (what
`defaultDaysAt`/`daysForWeek` already used for past-day locking) does *not*
include it. It deliberately never looks at `routine.schedule`: see
`docs/DECISIONS.md` for why checking the override there would make removing
one retroactive day silently turn every *other* retroactive day on the same
week into a locked one.

`daysForWeek(routine, weekId, today?)` gained an optional 3rd argument,
`{ iso: todayIso, weekId: todayWeekId }` — the *real* current date/week,
never whatever week is being browsed. Passing it merges in this week's
retroactive days on top of the historical resolution (only when `weekId`
really is the current week, and only when there's no explicit `schedule`
override — an override, however it came to exist, always fully decides the
week). Every read that should reflect retroactive days (`tasksFor`,
`pendingRoutines`, the routine-plan sheet's seeding and "planned" counts)
passes `today`; everything that needs the pure historical record instead —
analytics, and any check for whether a day was already *real* before some
in-progress edit — uses the plain 2-arg call and gets exactly today's
behavior unchanged.

**Enforcement**: `toggleDone`, `reorderRoutinesForDay` still no-op
unconditionally for a past date. `confirmMoveRoutineDay` still always
blocks a past *destination*; its past *source* is blocked unless
`isRetroactiveDay` is true. `toggleRoutineForWeekDay` and
`menuRemoveRoutineDay` always block adding to a past day, and only allow
removing a retroactive one. `confirmRoutinePlan` force-keeps only *real*
past days (2-arg `daysForWeek`) regardless of what the routine-plan
picker's selection says; a past day in that picker (`useRoutinePlanContent`)
can only ever be toggled *off*, never freshly picked — `RoutinePlanDayRow`'s
`disabled` prop reflects that, its `retroactive` prop drives the "won't
count" caption. `TaskMenu` gates both "Switch day" and "Remove this day" on
the same `!isPast || isRetroactive` check. The day-planning sheet
(`BottomSheet.tsx`'s `useDayContent`) hides its "Add a routine" section
outright for any past day, and `ScheduledRoutineRow`'s remove button only
appears for a non-past or retroactive entry.

**Past weeks** (`weekId < todayWeekId`, not just a past day within the
current week) get no planning affordance at all — `WeekScreen.tsx` hides
the "Not scheduled yet" row entirely when browsing one, which is also the
only path to the routine-plan sheet, so that's fully closed off too. No
separate "is this week past" check is needed anywhere else: `isRetroactiveDay`
is false by construction for any week that isn't the current one, so every
day in a past week is simply an ordinary locked past day.

## Month-view calendar (`src/components/MonthCalendar.tsx`)

Opened from the Week screen's nav bar (`WeekNav.tsx`) via an always-visible
calendar button (`AppState.openMonthView`, `sheetMode: 'monthView'`). Shows
a full Monday-start month grid (`getMonthGridWeeks` in `src/utils/date.ts`),
padded with adjacent-month days so every row is a complete week. The
month currently displayed (`monthViewAnchor`) is independent of
`currentWeekStart` — browsing months in the popup does not move the actual
browsed week until a date is tapped (`goToWeekOf`) or "Jump to today"
(`monthViewGoToToday`) is used, both of which also close the sheet.

## Analytics (`src/screens/AnalyticsScreen.tsx`, `src/data/analytics.ts`)

All figures are computed on demand from `routines` — nothing is persisted
specifically for analytics. `src/data/analytics.ts` mirrors `daysForWeek`'s
role: pure functions of `(routines, iso/month)`, resolving "planned" the
same way `tasksFor()` does, so this screen can never disagree with what
Today/Week actually show.

- `dayCompletion(routines, iso)` — `{ planned, done }` for one real date.
- `computeStreaks(routines, todayIso)` — walks backward from today for the
  current streak (an unfinished today doesn't break it, since the day
  isn't over; a day with nothing planned is skipped rather than breaking
  or extending anything), and slides the same rule across a trailing
  180-day window for the best streak — a bounded scan rather than an
  unbounded all-time one.
- `monthSummary` / `routineMonthStats` — sum completion across a month, up
  to today for the current month (so an in-progress month isn't dragged
  down by days that haven't happened yet), in full for a past month.

The screen has two independently-scoped notions of "month," deliberately
not sharing state: the headline stat row's "this month" figure always
uses the real current month (`todayIso`), while `ProgressRingCalendar`'s
own `monthAnchor` (a plain `useState<Date>`, its own prev/next navigation)
is freely browsable — and the "Routines" breakdown list below it tracks
that same browsable `monthAnchor`, not the fixed headline figure. Tying
the headline stat to the browsable anchor was tried and reads as a bug:
navigating to a future empty month made the top-level "this month" stat
drop to 0%, misreporting the real current month's progress.

`ProgressRingCalendar` reuses `MonthCalendar`'s grid skeleton
(`getMonthGridWeeks`, header, weekday row) but replaces its plain
today/selected day mark with a completion-ratio readout per day: nothing
rendered for a day with no plan (past or future), a soft red disc at 0%, a
soft blue disc with a precise SVG arc for partial, and a solid green disc
at 100% — `colors.danger`/`accent`/`complete` throughout, never invented
colors. Today additionally gets the same accent outline ring
`MonthCalendar` already uses to mark "today."

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
src/data/schedule.ts            daysForWeek() — the one schedule resolver, including creation boundaries
src/data/analytics.ts           Pure stat helpers (streaks, month/day completion)
src/data/seed.ts                Empty fresh-install initial state
src/state/AppState.tsx          All app state/logic (single context)
src/utils/date.ts               Pure date helpers: weeks, month grid, formatting
src/icons/Icons.tsx              All SVG icons
src/components/                 Reusable UI (rows, sheet, nav, dialogs, drag list, ...)
  BottomSheet.tsx                The multi-mode sheet system
  ConfirmDialog.tsx              Yes/no + destructive confirmation modal
  DraggableTaskList.tsx          Today's drag-to-reorder list
  MonthCalendar.tsx              Month grid used by the month-view sheet mode
  ProgressRingCalendar.tsx      Month grid with per-day completion rings (Analytics)
  WeekNav.tsx                    Week screen's week selector + calendar button
  sheet/                         Shared sheet building blocks (inputs, pickers, rows)
src/screens/                    WeekScreen, TodayScreen, SettingsScreen, AnalyticsScreen
```

## Build / run

```
npm install
npx expo start        # press i / a / w, or scan the QR code
npm run build:android:preview  # EAS internal APK build
```

The `preview` EAS profile in `eas.json` produces an installable Android APK.
The `production` profile produces a Google Play-ready Android App Bundle
(`.aab`). Both require an authenticated EAS CLI session and a configured EAS
project; the app release version is defined in `app.json` and currently
displays as `0.0.1` in Settings.

There is no CI and no automated test suite; see `AGENTS.md` for how to
verify a change in this repo.
