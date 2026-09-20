# App icon pack — v4

Source: `marketing/v4-logo.png` (the glow mark — same interwoven W +
diagonal checkmark stroke, black background, white W with a soft glow,
blue diagonal stroke with a soft glow). Copied unchanged into
`icon-master.png` here — every other file in this folder is a resize of
that exact master, nothing about the artwork itself was altered.

Contents:
- `icon-master.png` — the exact source, untouched, 1254×1254.
- `appstore.png` (1024×1024) / `playstore.png` (512×512) — store marketing sizes.
- `Assets.xcassets/AppIcon.appiconset/` — Xcode asset catalog (`Contents.json`
  + all 19 required iOS sizes in `_/`).
- `android/mipmap-*/ic_launcher.png` — legacy Android launcher sizes
  (mdpi 48, hdpi 72, xhdpi 96, xxhdpi 144, xxxhdpi 192).
- `android/adaptive-foreground.png` (1024×1024) — the master scaled to 682px
  (~66.6%, Android's adaptive-icon safe zone) and padded with real
  transparency to fill the canvas, so the launcher's circle/squircle mask
  never clips the mark.

Every file here was generated with the local `ffmpeg-static` binary
(`marketing/video/node_modules/ffmpeg-static/ffmpeg.exe`) via
`scale=…:…:flags=lanczos` (and `pad=…:color=0x00000000` for the adaptive
foreground's transparent border) — a plain resize/pad, no redraw.

Wired into the app as: `assets/icon.png` and `assets/splash-icon.png` ←
`appstore.png`; `assets/android-adaptive-foreground.png` ←
`android/adaptive-foreground.png`; `assets/favicon.png` ← a 48×48 resize of
`appstore.png`. `app.json`'s `android.adaptiveIcon.backgroundColor` was
updated to `#000000` to match this pack's true-black background.

(Supersedes the first `v4/` pack generated earlier from
`v2/icon-original-mark-refined.png` — that was the wrong source, this one
is the correct/current logo.)
