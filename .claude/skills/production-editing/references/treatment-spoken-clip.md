# Treatment: spoken-clip

For `clip.json.lens == "spoken-clip"` — podcast / interview / talk. **The words ARE the
content**, so the edit makes every word legible and keeps the talking head energetic. This
is the **validated house style**; all numbers are calibrated in `CLAUDE.md` (repo root)
— read it for the exact values. This profile is the routing summary, not a second source
of truth.

## Character

Words lead. The viewer reads along; motion punctuates the *meaning* of what's said. High
density, high energy, tight pacing.

## 1. Captions — full neon karaoke (core element)

- `buildCaptions(tl, WORDS, [CLIP_STARTS])` from `transcript.json`, every word.
- Neon Accent: base `#FFFFFF`, active `#FFD60A`, Anton 56px, 8-word groups, instant cut.
  **No green.** Position per CLAUDE.md (caption-neon.css).
- Captions are mandatory here — transcription in step 3 always runs.

## 2. Zoom — full word-keyed hierarchy

- `zoomHook()` once at t=0 (2.5s pull-back, undisturbed).
- Then `zoomPush` / `zoomPushStrong` on key words (money amounts, brand names, strong
  emotion, numbers), `zoomRelease()` ~1s after every peak; `zoomNewThought` on clip
  changes. Derive key words from `verbal_hook` / `body_arc`. Full hierarchy + rules per
  CLAUDE.md ("Zoom-Choreographie").

## 3. Hook overlay — white-box title (3rd person)

- The candidate's `hook_title` verbatim in `#hook-title`; black on white, top:175px,
  Anton 58px; visible t=0→3.2s, fade out by 3.5s.
- **No first person** in `hook_title` (clipping-page voice) — the clip-analysis lens
  already enforces this; keep it.

## 4. Audio mix

- Voice = −19 LUFS reference at `data-volume="1.0"`.
- Optional background music preprocessed per the CLAUDE.md FFmpeg recipe, then
  `data-volume="0.14"`.
- Optional glitch-SFX `data-volume="0.20"`, 200–250 ms, 50 ms before a cut. Optional
  polish — a clean voice-only reel is valid.

## 5. Speed-up

- **3% (SPEED=1.03)** — the standard talking-head tightening, via `rebuild.mjs`.

## Templates used

`caption-neon.css` + `caption-neon.js` + `zoom-engine.js` (all three).
