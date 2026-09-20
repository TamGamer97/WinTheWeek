# WinTheWeek — Decisions

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

**Decision:** On the Analytics screen, the headline stat row's "this month"
figure always reflects the real current month, computed from `todayIso` —
it is not tied to `ProgressRingCalendar`'s own `monthAnchor`, even though
that calendar sits directly below it and is independently browsable to any
month. The "Routines" breakdown list, by contrast, *does* track the
browsable `monthAnchor`.

**Reason:** Tying the headline figure to `monthAnchor` was the first
implementation, and it reads as a bug in practice: browsing the calendar
to a future (or otherwise data-less) month made the top-level "this month"
stat drop to 0%, silently misreporting the real current month's actual
progress. The headline row is meant to be a fixed "right now" snapshot,
matching how the streak and all-time stats beside it are never scoped to
whatever's being browsed either.

**Consequence:** Don't "simplify" the headline stat to reuse
`monthAnchor` for consistency with the calendar/breakdown below it — that
reintroduces the bug. If a future stat needs to reflect the browsed month,
it belongs in or beside the calendar card, not the headline row.

---

**Decision:** Android's system back action is handled once at the app shell.

**Reason:** The app uses app-level screen state rather than a navigation
library, so Settings and Analytics need to return to the screen recorded in
`previousScreen` when the user uses Android's back gesture or button. The
handler also closes the foremost transient surface first — confirmation
dialog, task menu, then bottom sheet — before considering screen navigation.

**Consequence:** Keep this precedence in `App.tsx` when adding another
transient surface or app-level screen. Root Today/Week screens return `false`
so Android can finish the activity normally.

---

**Decision:** Every real date strictly before `todayIso` blocks `toggleDone`,
`reorderRoutinesForDay`, adding or removing a routine on that day
(`toggleRoutineForWeekDay`, `menuRemoveRoutineDay`), and moving a task to or
from it (`confirmMoveRoutineDay`) — unconditionally, with no exceptions,
regardless of which UI path calls them or what's already scheduled there.

**Reason:** Third time settling this. The original version already blocked
everything unconditionally. A revision after that let a routine's own
schedule changes retroactively populate an already-past day mid-week — a
freshly-created or freshly-edited routine could make a past day in the
current week show a "retroactive" instance (`isRetroactiveDay`,
`RoutineInstance.retroactive`) that was visible and removable/movable even
though it was never actually planned in advance. That turned out to be more
machinery, and more exceptions to a rule that's supposed to be simple and
trustworthy, than the problem needed. The actual need was narrower: when a
routine's usual days include one that's already passed this week, don't
apply that day-set retroactively — just start the whole schedule next week
instead (see the decision below). Once schedule changes never touch the
current week at all, there's no scenario left where a past day would ever
need an exception, so the lock goes back to having none. The Week screen's
`goToPrevWeek` has no lower bound, so every past week is reachable, which is
why this has to be enforced in `AppState`, not just hidden in the UI for
the currently-browsed week.

**Consequence:** Guard any new day-specific mutation in `AppState` with a
plain, unconditional `if (iso < todayIso) return;`-style check — do not
reintroduce a carve-out for "this instance is different because of how it
got there." If a future feature seems to need one, prefer changing *when*
the schedule change takes effect (see below) over relaxing this lock again.

**`confirmRoutinePlan` still does *not* filter past days out of
`sheetMultiDays` before saving — that filter was tried once and was a bug,
not a safety net.** `useRoutinePlanContent`'s day rows disable every past
day outright (picked or not), so `sheetMultiDays` can be trusted and saved
as-is; filtering "past days" out at save time is what silently un-scheduled
real, already-locked commitments before.

---

**Decision:** Whether a routine's regular days take effect "this week" or
"next week" is an explicit choice in the add/edit form's UI (a segmented
toggle at the bottom of `ScheduleSection`, in `BottomSheet.tsx`), not an
automatic rule explained after the fact by a confirmation popup. "This
week" greys out — and the effective choice is forced to "next week" — only
when it's actually impossible: for creation, any picked day already past
this week; for an edit, only a *newly-added* day (not already in the
routine's existing `defaultDays`) that's already past this week. No new
field was added to represent the outcome: `confirmRoutineEdit`'s existing
`defaultDaysHistory` snapshot uses either `todayIso` or `nextWeekId` as its
`untilIso` boundary depending on the effective choice, and `confirmAdd`
sets the existing `createdIso` the same way.

**Reason:** An earlier version of this forced every edit to next week
unconditionally and a fresh creation to next week only on conflict, each
explained by a confirmation popup right before saving. Product feedback was
that this should instead be a visible, proactive choice up front — seeing
and picking "This week" / "Next week" while still filling out the form,
rather than being told the consequence in a popup after tapping Save. Once
the choice is explicit and up front, a confirmation popup restating it back
is redundant, so `ConfirmRequest.icon`'s `'calendar'` variant and both
`requestConfirm(...)` call sites were removed along with it. Picking "This
week" on an *edit* can therefore now apply mid-week (from today onward) —
a deliberate reversal of the previous "never mid-week" rule, made safe by
`untilIso: todayIso` still keeping every already-past day of the current
week on the old snapshot (`defaultDaysAt`'s `iso < untilIso` check) — the
past-day lock itself is untouched, only *which day the new template starts
applying from* is now the person's choice instead of always next Monday.

**Consequence:** `AppState.tsx`'s `sheetStartsNextWeek` holds the raw
stored preference; both `confirmAdd` and `confirmRoutineEdit`, and the
`useAddContent`/`useRoutineEditContent` hooks that render the toggle, each
independently fold in the same conflict check to get the *effective* value
— don't read `sheetStartsNextWeek` alone as "what will actually happen."
Don't compute "next Monday" ad hoc elsewhere — reuse `AppState.tsx`'s
`nextWeekId` (`isoDate(addDays(parseISODate(todayWeekId), 7))`). Don't
reintroduce a same-instant confirmation popup for this — the toggle itself
is the confirmation.

---

**Decision:** `Routine.defaultDaysHistory: { untilIso, days }[]` records
superseded `defaultDays` values, and `daysForWeek()` resolves each day of a
week *independently* against whichever snapshot actually applied on that
day's real date (walking the history oldest-first for the one whose
`untilIso` is after that date, else the live `defaultDays`) — rather than
resolving a whole week at once from the current `defaultDays`.

**Reason:** Editing a routine's regular days used to rewrite history:
`daysForWeek()` fell back to the live `defaultDays` for any week with no
explicit `schedule` override, so an edit today silently changed what every
past (and current, and future) unoverridden week resolved to — which could
even make a genuinely-completed day (`doneDates[iso] = true`) disappear
from its own history, since `tasksFor` only renders a day's instance when
`daysForWeek(...).includes(day)`. Snapshotting at *week* granularity was
considered and rejected: the day an edit happens on always splits its own
week into an already-passed portion (must keep resolving against the old
value) and a today-onward portion (must pick up the new one), so anything
coarser than per-day resolution can't represent the week the edit actually
happens in without a separate mixed-week special case.

**Consequence:** Don't "simplify" `daysForWeek()` back to a single
week-level lookup — that reintroduces the history-rewriting bug for the
week straddling an edit. A history entry is appended (never mutated) only
when a routine edit actually changes the day-set (order-independent
comparison — see `sameDayKeySet` in `AppState.tsx`); re-saving the same
days must not grow the array. `schedule[weekId]` (manual per-week planning)
is a separate, higher-priority mechanism and this history never writes to
it or reads from it.

New routines also carry an optional `createdIso` boundary. `daysForWeek()`
excludes dates before that boundary, so a routine created midweek with Monday
as a regular day begins on the next Monday rather than appearing on the
already-passed Monday. The field is optional so older saved routines remain
backwards-compatible.

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

---

**Decision:** The onboarding coach-mark tour's spotlight "hole" is a
`react-native-svg` `Mask` with its cut-out `Rect`'s `x/y/width/height`
animated via `Animated.createAnimatedComponent(Rect)` — not a new animation
dependency, and not four separate dimming rectangles hand-positioned around
the hole.

**Reason:** The project deliberately has no `react-native-reanimated`,
gesture-handler, or Lottie — everything animated is built from core RN's
`Animated` plus `react-native-svg` (already a dependency, already how every
icon in `src/icons/Icons.tsx` is drawn), and AGENTS.md says not to add a
dependency without justification. An SVG luminance mask is the standard,
well-supported way to get a real rounded-rect spotlight cutout from what's
already installed. The one real constraint it comes with — animating raw
`x/y/width/height` attributes needs `useNativeDriver: false`, since the
native driver only understands `transform`/`opacity` — already has direct
precedent in this codebase: `NavBar.tsx`'s sliding tab indicator animates
`translateX`/`width` the same JS-driven way, for the same reason.

**Consequence:** Don't reach for a four-rectangle hand-rolled cutout (no
rounded corners, more layout math) or a new dependency for this — the mask
approach is already proven at `src/components/onboarding/CoachMarkOverlay.tsx`.
If a future spotlight-style UI needs the same trick, reuse that pattern.

---

**Decision:** The coach-mark tour ends itself (calls `completeCoachmarks()`,
marking it permanently seen) if it's torn down for *any* reason — not just
an explicit "Got it"/"Skip tour" tap, but also being unmounted because the
user navigated off Today mid-tour — rather than pausing and trying to
resume, or re-anchoring its steps to a different screen.

**Reason:** It's a 3-step tour meant to run once, immediately, on the one
screen (Today) all three of its targets live on. A general resume/re-anchor
system for an arbitrary interruption is real complexity this doesn't need —
if someone genuinely navigates away mid-tour, the simplest correct behavior
is "the tour is over," not "the tour is still owed to them later."

**Consequence:** `CoachMarkOverlay`'s finish path is guarded by a single
`finishedRef` checked both in the explicit-finish handler and in the
mount effect's unmount cleanup, so `completeCoachmarks()` fires exactly
once regardless of which path triggers it. Don't add a "resume where it
left off" mode without deciding this trade-off again on purpose.

---

**Decision:** `CoachMarkOverlay` sizes its full-screen SVG scrim/spotlight
from its own `onLayout` measurement, not `Dimensions.get('window')` (nor
the equivalent `useWindowDimensions()` hook).

**Reason:** Reported as an Android-only bug: the dark scrim left parts of
the screen undimmed — not reproducible on web. The component sized its SVG
canvas from a module-scope `Dimensions.get('window')` snapshot; on Android
specifically that can report a shorter window than the true screen
(edge-to-edge system bars aren't accounted for consistently), undersizing
the SVG and leaving a strip of it uncovered. `onLayout` measures the
component's own actual rendered size directly, so it can't be wrong the
way a separate, platform-inconsistent dimensions API can.

**Consequence:** Don't reintroduce `Dimensions.get('window')` /
`useWindowDimensions()` as the source of truth for this component's own
screen size — measure the actual rendered root instead. Note this fixed
the scrim's *coverage*, not the spotlight's *position* — that was a
separate bug, see below.

---

**Decision:** The spotlight hole's corner radius is computed per step
(`Math.min(width, height) / 2` on the padded target rect — a circle for a
square-ish target, a pill for a wide one) instead of a single fixed
constant. Measuring a coach target also now waits two `requestAnimationFrame`
callbacks before calling `measureInWindow`.

**Reason:** Still reported as an Android-only bug after the `onLayout`
sizing fix above: the spotlight highlighted a visibly wrong, offset
position around the "+" FAB, with a rounded-square hole sitting off to one
side of the actual round button rather than centered on it — not
reproducible on web. Two compounding causes: (1) a fixed corner radius on
the hole never matched a circular target's own roundness, which alone
would look like a mismatched shape even if perfectly centered; (2) the
first measurement fires the instant this overlay mounts, which is itself
the instant the intro screen finishes and this one takes over — on a
slower Android device, `measureInWindow` called at exactly that transition
boundary can win a race against the target's own layout still settling and
return a stale position. Waiting two animation frames first ensures at
least one full native layout/commit pass has actually happened before
trusting the measurement.

**Consequence:** Don't go back to a fixed hole radius — derive it from the
measured target every time, the same way the padding already is. Don't
remove the two-frame wait from `measureStep` to "simplify" it, and apply
the same wait if another spot ever measures a target immediately on mount
rather than in response to a stable, already-settled screen.

---

**Decision:** `IntroSlides.tsx`'s onboarding slides show looping GIFs of
real app footage instead of static screenshots or an embedded video player.
The GIFs are converted, one time via a local `ffmpeg` binary (not as part
of any app build step), from the marketing project's own real screen
recordings (`marketing/video/public/recordings/v2/*.mp4`) into
`assets/onboarding/*.gif`.

**Reason:** The app has an explicit minimal-dependency stance (see the
PanResponder/`Animated`-only decision above) — adding `expo-video`/`expo-av`
just to play a handful of few-second onboarding clips is real dependency
weight for something React Native's existing `Image` component already
does for free: it plays animated GIFs on both platforms from a bundled
asset exactly like the PNGs this replaced. Reusing the marketing project's
existing real-interaction recordings (rather than re-capturing new footage
inside the app itself) means the in-app tour and the public promo video
demonstrate literally identical interactions, and needed no new tooling —
`ffmpeg-static`'s binary was already a devDependency of `marketing/video`.

**Consequence:** Don't add a video-playback dependency for this — if a
future onboarding need genuinely requires real video (audio, seeking,
longer clips), that's a deliberate trade-off to make on purpose, not a
default reach. If a demonstrated screen changes enough that its GIF goes
stale, regenerate it from fresh footage the same way (two-pass palette
encode: `palettegen` then `paletteuse`, scaled to ~360px wide, ~15fps —
keeps each clip well under 1MB) rather than hand-editing the GIF or
re-adding static screenshots for just that one slide.

---

**Decision:** V4 Icon is the latest use this as the main icon