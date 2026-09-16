# Cadence — Decisions

Non-obvious decisions a future developer might otherwise "fix" without
knowing why they're there. This is not a changelog — routine bug fixes and
styling tweaks aren't recorded here.

---

**Decision:** Drag-and-drop reordering (`DraggableTaskList`) and every
other animation/gesture in the app are built on core React Native
`Animated` + `PanResponder`. No `react-native-gesture-handler` and no
`react-native-reanimated` are installed.

**Reason:** Keeps the dependency surface minimal and avoids the native
linking/config that gesture-handler and Reanimated require, in a project
that otherwise has zero native dependencies beyond what Expo ships by
default.

**Consequence:** Drag reordering is hand-rolled (measuring row heights,
manually computing target index from drag position, animating displaced
rows via JS-driven `Animated.Value`s). It's more code than a
gesture-handler-based list would be. Don't reach for gesture-handler/
Reanimated for a future gesture feature without deciding to take on that
dependency deliberately — follow the existing PanResponder pattern instead,
or raise the tradeoff explicitly if a feature genuinely needs it.

---

**Decision:** A routine's `color` field stores a small id
(`'blue'|'red'|...`), resolved to an actual hex value only at render time
via `routineColorHex(id, isDark)`.

**Reason:** Every screen that displays a routine's color must agree, and
must adapt the same routine to both light and dark palettes. Storing a raw
hex would either duplicate a light/dark pair everywhere it's used, or fix
a routine to one theme's shade.

**Consequence:** Never render `routine.color` directly as a color value.
Adding a new routine color means adding it to `ROUTINE_COLOR_IDS` and
`ROUTINE_COLOR_HEX` in `src/theme/colors.ts`, not just wherever a picker UI
happens to live.

---

**Decision:** A routine's schedule is two-layered:
`defaultDays` (its usual weekly template) plus `schedule: Record<weekId,
DayKey[]>` (explicit per-week overrides, resolved by `daysForWeek()`).
Editing one week's plan writes only into `schedule[weekId]` and never
mutates `defaultDays`.

**Reason:** Lets a routine have a "usual" rhythm while still allowing any
specific week to diverge (skip a week, move a day) without that one-off
change silently becoming the new default.

**Consequence:** Don't "simplify" by writing straight to `defaultDays` from
a week-specific action — that would make a single week's edit permanently
change the routine's template. An explicit empty array in `schedule[weekId]`
is meaningfully different from "no entry" (the former means "cleared for
this week," the latter falls back to the default) — don't collapse that
distinction.

---

**Decision:** A routine instance's `order` is a field independent of
`done`/completion, and completing a task never changes list order.

**Reason:** Explicit product requirement — a completed task staying in
place (rather than sorting to the bottom) was a deliberate fix to earlier
behavior where finishing a task reshuffled the list.

**Consequence:** `tasksFor()` sorts only by `order`, never by `done`. Any
new sort/filter on this list must preserve that — don't add a "move
completed items down" behavior back in.

---

**Decision:** `reorderRoutinesForDay(iso, orderedVisibleIds)` writes only
into `dayOrder[iso]`, for the routines actually present in the list that
was dragged — never the routine's default `order`, and never another
date's `dayOrder`. A routine's effective order for a given date is
`dayOrder[iso] ?? order` (see `tasksFor`/`makeRoutineInstance`).

**Reason:** This function used to reassign the routine's single global
`order` field instead. Since `order` was read by every day a routine
appeared on, reordering it on one day (e.g. Wednesday) silently reordered
every other day that happened to share it (e.g. Monday) too — reported as
a bug: dragging one day's list shouldn't touch any other day's list.
Keying the override by real calendar date, the same way `doneDates`
already does for completion, scopes a drag to the one day it actually
happened on.

**Consequence:** When adding a new place that reorders a subset of
routines for a specific day, reuse this function (and pass that day's ISO
date) rather than writing a new full-list resort or touching `order`
directly. `order` itself should now only ever be set as a routine's
default/creation-order fallback, never as a stand-in for a specific day's
arrangement.

---

**Decision:** Persisted routine data is versioned (`@cadence/routines/v2`,
with a fallback read + migration from the legacy `@cadence/routines/v1`
shape), and `restoreRoutinesV2` validates structure and returns `null`
(triggering the fallback path) rather than partially trusting malformed
data.

**Reason:** The data shape has already changed twice (flat `days` →
`defaultDays`+`schedule`; then `order` added) while keeping existing
installs' saved data intact.

**Consequence:** The next shape change should add a new version/migration
step rather than editing `restoreRoutinesV2` to just accept the new shape
in place — old installs must still load.

---

**Decision:** Android's status-bar area is painted by an explicit,
theme-aware underlay in `AppShell`, sized to the larger of the safe-area top
inset and React Native's native status-bar height. In addition,
`SystemUI.setBackgroundColorAsync` is called once at module scope in `App.tsx`
(outside any component/effect) and reactively on theme change.

**Reason:** Expo SDK 57 enforces edge-to-edge Android rendering and keeps the
native status bar transparent; its status-bar API controls the icons but no
longer paints that area. The explicit underlay therefore supplies the normal
runtime surface beneath the time/battery icons, including phones whose notch
height exceeds the reported safe-area inset. `expo-system-ui` remains the
native decor fallback for cold start, reloads, and moments when the React
tree is absent. It uses the palette's `gradientTop`, the exact color under the
status icons, rather than a near-but-not-identical page color. Calling it only
inside a `useEffect` would miss the first frame, so the module-level call is
hardcoded to light mode (the app's startup theme) and the effect keeps it in
sync afterward.

**Consequence:** The explicit underlay remains the source of truth on Expo
57's edge-to-edge Android builds. `StatusBar.backgroundColor` and
`androidStatusBar.backgroundColor` are also set as compatibility fallbacks
for devices/builds that still render an opaque native bar; do not remove them.
The screen content receives an explicit measured status-bar inset, rather than
relying on the safe-area provider to supply one on every Android version.
Don't remove the module-level `SystemUI` call as "redundant" with the effect
either — the underlay handles the mounted app, while the native fallback
covers frames outside the React render lifecycle.

---

**Decision:** Every `ScrollView` in the app sets `overScrollMode="never"`.

**Reason:** Android's default overscroll effect is a blue edge-glow that
uses the app's accent color — this was reported as an unwanted "blue flash
when loading content" and is purely a platform default, not a loading
indicator.

**Consequence:** Apply the same prop to any new scrollable view rather than
leaving Android's default glow in place.

---

**Decision:** `ConfirmDialog`'s design (centered icon badge, title,
message, then a stacked full-width confirm button and a ghost cancel
button below it) is intentionally plain rather than a more custom
layout (e.g. a colored side-spine card with side-by-side buttons).

**Reason:** A more distinctive redesign was tried and explicitly reverted
at the product owner's request in favor of this original, simpler layout.

**Consequence:** Treat this layout as the settled design, not a draft —
don't "improve" it toward a more custom look without an explicit request.

---

**Decision:** The light palette's neutrals (`paper`, `ink`, `inkSoft`, `muted`,
`line`, `lineStrong`, and the light-mode shadow tints in `src/theme/colors.ts`)
are a true warm grey with no blue lean, deliberately different in hue family
from the dark palette's blue-grey neutrals.

**Reason:** The light palette originally shared the same blue-grey hue as
`accent` across every neutral — background, borders, text, even card
shadows. With everything (chrome and accent alike) tinted the same cold
blue, the whole screen read as one flat wash rather than a UI with a
deliberate accent color, described as looking "clinical"/"doctor-office."
Making the neutrals genuinely neutral (warm grey, no hue lean) lets them
recede as a calm backdrop so `accent` reads as an intentional pop of color.
Dark mode wasn't part of this complaint and keeps its existing blue-grey
neutrals unchanged.

**Consequence:** Don't "fix" the light and dark neutral scales to match hues
for consistency — the divergence is deliberate. When adding a new light-mode
neutral, pick a warm grey (no blue/violet lean) rather than matching
`accent`'s hue, the way the existing `paper`/`ink`/`line` values do.

---

**Decision:** There is no test framework and no git repository configured
in this working copy. Verification is manual: `npx tsc --noEmit` (the one
automated gate) plus a web export (`npx expo export --platform web`)
eyeballed in a browser.

**Reason:** The project hasn't needed automated tests yet; the environment
this was originally built in had no device/emulator, only a headless
browser.

**Consequence:** Don't assume `npm test`, `git log`, or a CI pipeline
exist — check before relying on them. Android-only rendering behavior
(status bar color, overscroll glow, font-metrics alignment) cannot be
verified through a web build; say so rather than claiming it was checked.
