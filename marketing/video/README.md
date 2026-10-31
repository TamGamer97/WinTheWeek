# WinTheWeek promotional video

The current film is **49 seconds, 1920 × 1080, 30 fps**. It uses recordings of the actual Expo app in a modern iPhone-style device frame, shifts from light to dark at 18 seconds, and uses the supplied Waves MP3. Interactions have deliberate pauses before choices and holds after results. There are no AI-generated app screens or voiceover.

The device frame is presentation graphics, not a claim of native iOS footage. App content is the real web build at 412 × 824, captured at 2× pixel density. Native iOS/Android appearance, system bars, keyboards, and gestures have not been verified.

## Run

Use Node 22.18+ (tested on Node 24). From this directory:

```powershell
npm ci
npm run studio
npm run typecheck
npm run render
npm run verify
```

Output: **`out/WinTheWeek-promo-1080p.mp4`** — H.264, CRF 14, yuv420p, BT.709 limited range, AAC stereo audio at 320 kbps. `out/WinTheWeek-thumbnail.png` is the matching thumbnail. The previous silent 30-second MP4 remains available separately.

Remotion can download Chrome Headless Shell. To use installed Chrome:

```powershell
$env:CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
```

The video has its own dependencies, lockfile, and TypeScript gate. The app's root tsconfig excludes this directory. App verification still uses `npx tsc --noEmit` at the repository root. Footage uses `Video` from `@remotion/media` for browser-based frame extraction; the older OffthreadVideo cache was unreliable on this memory-constrained Windows host. Rendering uses one worker.

## Editing

The separate YouTube thumbnail is `out/WinTheWeek-YouTube-thumbnail.png` (1920 × 1080). Its editable composition is `src/thumbnail.tsx`, using the v4 brand icon and a real captured Today screen at `public/thumbnail/today.png`. Render it independently with `npx remotion still src/thumbnail.tsx WinTheWeekThumbnail out/WinTheWeek-YouTube-thumbnail.png`; this does not modify the promo.

- **src/story.ts**: captions, durations, footage paths, in-points, soundtrack volume. Total duration is calculated automatically.
- **src/Promo.tsx**: layout, typography, colours, easing, dissolves, audio fades.
- **src/IPhoneFrame.tsx**: device shell, camera area, status bar, home indicator. The 448 × 896 footage window preserves the recording's 1:2 ratio exactly, with separate 62 px top and 38 px bottom safe areas. Nothing is stretched or cropped to fit the phone.
- **public/recordings/v2/**: current recordings. App footage stays muted; music is a separate layer.
- **scripts/demo-data.cjs**: illustrative history requested for Analytics. The real app calculates every statistic and calendar ring.
- **public/audio/waves.mp3**: unchanged copy of the supplied `marketing/Waves-Nasheed-Background-Vocals-only-Soundtrack.mp3`. Playback starts at the beginning at 65% volume, with a one-second entrance and two-second exit fade. The older generated percussion assets/script remain available but are not used in this edit.

Set soundtrack.volume to 0 for silent playback. For an MP4 without any audio stream, append `--muted` to the render command. Default verification expects the requested AAC soundtrack.

## Recording slots

Every slot is populated. Replace one MP4, or edit its path/in-point in src/story.ts. Capture the recommended duration, including transition handles and any trim.

| Timeline | Filename under public/recordings/v2/ | Capture | Action |
| --- | --- | --- | --- |
| 0–4s | 01-hero-light.mp4 | 5s | Light Today, three routines, clean hold. |
| 4–8.5s | 02-create-routine.mp4 | 5.5s | Type Morning walk into the new routine form. |
| 8.5–14s | 03-choose-days.mp4 | 6.5s | Select Mon, Wed, Fri with readable pauses; create and hold. |
| 14–18s | 04-full-week.mp4 | 5s | Light Week, hold all seven days. |
| 18–22s | 05-today.mp4 | 5s | Dark Week → Today; tap after 0.25s. |
| 22–25.5s | 06-complete.mp4 | 4.5s | Complete Morning walk after 0.95s; hold the checkmark. |
| 25.5–32.5s | 07-move-today.mp4 | 8s | Long-press Evening stretch, pause on Switch day, select Tue, pause, confirm; hold the result. |
| 32.5–37s | 08-move-week.mp4 | 5.5s | Open Week and show Evening stretch on Tuesday. |
| 37–44s | 09-progress.mp4 | 8s | Open Analytics; hold the populated September calendar and breakdown. |
| 44–49s | End card | — | Brand, description, website. |

The URL is wintheweek.tamsh.com on both opening and closing cards. Dark mode appears naturally in the footage and matching video palette, without a dedicated theme caption.

## Reproduce capture

From the repository root:

```powershell
npx expo export --platform web --output-dir marketing/video/capture/app-v2
cd marketing/video
npm run capture
```

Capture uses a fresh isolated Chrome context and localhost port 8766. The browser clock advances from **Monday 28 September 2026, 09:41 Europe/London**. The fixture loads illustrative September history for two existing routines into this disposable session only. It includes completed, partial, and missed days, followed by six consistent days. Production seed data and a user's existing stored routines are never changed.

The script creates Morning walk, picks its days, completes it, switches theme, and moves Evening stretch from Monday to Tuesday through the actual app controls. Persistence checks confirm the completion and move saved. The final example produces a 6-day streak, 79% this month, and 44 completions. These are illustrative example metrics, not customer results.

CDP screencast records actual surfaces on visual changes; timestamps preserve static holds. It encodes 824 × 1648 MP4s with half-second keyframes and saves public/recordings/v2/provenance.json. Capture screenshots are in capture/*.png. Icon coordinates depend on the 412 × 824 viewport; inspect them after app layout changes. If the original capture frames remain, `node scripts/encode-takes.cjs` re-encodes them without replaying the app actions.

Recordings, fonts/licences, soundtrack, and provenance are retained. Raw capture frames, exported app, logs, and final outputs are ignored by Git. The capture script is not part of the production app.

## Checks and delivery

`npm run verify` checks H.264, full HD, yuv420p, BT.709, 30 fps, calculated duration/frame count, and AAC audio. It fully decodes the output to check for corruption. Inspect all scenes and the moving-task sequence for fit and readable timing.

For Google Play, upload to YouTube and provide its video URL in Play Console. See Google's [preview asset guidance](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en-GB). Captions still communicate the story with playback muted. No publishing has been performed.

Remotion references: [render CLI](https://www.remotion.dev/docs/cli/render), [video and trimming](https://www.remotion.dev/docs/media/video).
