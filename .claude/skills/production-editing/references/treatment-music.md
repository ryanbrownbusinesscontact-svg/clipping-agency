# Treatment: music

For `clip.json.lens == "music"` — artist / live / concert / fancam. **The performance IS
the content** and **the original audio IS the track.** The hook is a *fan reaction* laid
over the beat, not a description.

> **Calibration status: STARTER DEFAULTS.** Format-routed profile (Juni 2026). The base
> values are not yet ear/eye-validated — refine on the first real music campaign and
> promote validated numbers into `CLAUDE.md`.

## How this profile routes — read `clip.json.format` FIRST

Step 3 (clip-analysis) assigns each music candidate **one of six formats** (the
`format` field). The format is the whole point of the edit: a `ranked_countdown` and a
`vocal_showcase` are different videos. **Read `clip.json.format`, then apply the matching
section below.** The format names and what each is *for* are defined in
`clip-analysis/references/lens-music.md` (the finding half) — this file is the building
half. Same six names, two halves.

If `format` is missing (older candidates), treat it as `pure_moment`.

## The one rule that beats every format: the FIRST FRAME

The cut from step 3 is built so second 0 is the scroll-stopper. **Do not add anything that
delays or weakens frame 1** — no fade-from-black, no slow logo, no caption that wipes in
over the hook image. The image hits at t=0; the caption is already on screen at t=0
(`opacity:1`), it does not animate in. If you ever feel the urge to "ease in" the opening,
stop — that is the failure this whole system exists to prevent.

---

## Shared base (all formats inherit, then the format overrides)

- **Frame layout:** native crop, no upscale — `crop=1080:<H>:<x>:<y>` (no `scale=`),
  full-width, bottom-aligned; the remaining top strip becomes the **black hook bar** that
  holds the caption. (See `CLAUDE.md` → "Music-Lens (statische Caption + schwarze
  Hook-Bar)".)
- **Audio:** the clip's own concert audio at `data-volume="1.0"` is the mix. **No
  background-music layer, no glitch-SFX over the music.** (Per-format exceptions below are
  explicit and few: a riser into a drop, a rewind SFX.)
- **Captions:** the default is **one static fan-voice line** = `hook_title`
  (`buildStaticCaption`), white bold + strong shadow, present at t=0, drifts slightly,
  fades after the peak. First-person collective ("she gave **us** …") is allowed; the
  artist's own "I" is not. Karaoke (`caption-neon.*`) **only** for a real crowd-talk
  segment (transcribe just that part).
- **Motion:** beat-synced zoom (`zoom-engine.js`) — punch on the drop/belt/hit, release
  after. Never zoom on words (there are none to key on).
- **Speed:** OFF (`SPEED=1.0`) by default. The **only** format allowed to speed-ramp is
  `aesthetic_showcase`, and only as a localized slow-mo on a wordless move (never an
  `atempo` over a vocal — that detunes it).

`peak_at` (when present in `clip.json`) is the anchor instant for motion/caption timing.
For stitch formats, `segments[]` are the ordered picks and `source-916.mp4` already
contains them concatenated in order.

---

## 1. `vocal_showcase` — make the voice the event
- **Goal:** the viewer waits to hear if the note lands. Everything points at `peak_at`.
- **Captions:** the static fan line at t=0. Optionally a **second, bigger word** that lands
  on `peak_at` (e.g. "LIVE." / "no autotune") to mark the note — instant cut, no fade.
- **Motion:** soft `zoomHook` open on the face; one `zoomPushStrong` exactly on `peak_at`
  (the note), `zoomRelease` ~1s after. Hold the face tight through the note.
- **Audio:** original at 1.0. **No stem manipulation** (we do not separate vocals) — pick
  carried it; the edit just frames it. A subtle widen/normalize is fine, never a vocal boost.
- **Speed:** off. **Effects:** none.

## 2. `ranked_countdown` — the Top-N chain
- **Source:** `source-916.mp4` is the `segments[]` concatenated in countdown order
  (the cutter did this). Each segment is one rank, 3–4s, already cut on its peak.
- **Overlay:** a **fixed top title** persistent the whole clip (e.g. "TOP 5 TOUR MOMENTS")
  + a **per-segment number/label** from `segments[i].label` ("5. …") that swaps exactly on
  each segment boundary (compute boundaries by accumulating segment durations). Swaps are
  instant cuts, not fades.
- **Motion:** one `zoomPushStrong` on each segment's beat-drop, `zoomRelease` before the
  next cut. Keep it driving.
- **Audio:** original 1.0. A single short **riser** into segment 1 is the one allowed
  accent (measure it; ~`data-volume 0.4`, track 4) — optional.
- **Speed:** off. **Effects:** none beyond the title/number overlay.
- **Capability:** fully buildable today (concat + two text layers).

## 3. `aesthetic_showcase` — hypnotic visual
- **Goal:** pure dopamine; the look/sync holds the eye.
- **Captions:** static fan line, kept minimal (the image leads). Consider fading it earlier
  so it never covers the move.
- **Motion:** the signature is **speed-ramp** into `peak_at` — normal → slow-mo on the
  hardest move → snap back. Pre-process the ramp on `source-916.mp4` with ffmpeg
  (`setpts` for video; mute or keep ambient — there are no vocals to detune) and use the
  ramped file as the composition source. Add a colour push (contrast/saturation) via CSS
  filter or in the same ffmpeg pass.
- **Audio:** original 1.0 (a wordless move tolerates the time-stretch).
- **Speed:** **ramp allowed here only.** **Effects:** colour grade.
- **Capability:** ffmpeg speed-ramp + grade is a `_work` pre-process step — buildable,
  needs a small helper; verify the ramp reads cleanly before render.

## 4. `crowd_takeover` — the room loses it
- **Source:** a single intercut stretch, or `segments[]` of separate crowd shots concatenated.
- **Captions:** static fan line ("80,000 people singing it back" style), t=0.
- **Motion:** keep cuts/zooms tight to the energy; if not stitched, lean on the film's own
  artist↔crowd intercut and punch the swell.
- **Audio:** original 1.0. We **cannot** isolate the crowd (no stems) — so the *selection*
  must already have the crowd loud in the mix; the edit just preserves it. Do not try to
  duck the music.
- **Speed:** off. **Effects:** none.

## 5. `climax_rewind` — shock first, then why  *(the flagship open loop, two variants)*
Two source situations, same structure: an **event** variant (cause→effect shock) and a
**pose** variant (a frozen jaw-drop apex — a lift, backbend, prop apex). Check
`clip.json.hook_title`/`why_viral` to tell which one this candidate is; the edit recipe is
identical either way, since both are "tease the peak, then reveal what leads to it."
- **Structure (this is the whole format):**
  1. **Teaser (t=0):** open on `peak_at` — the shock instant or the apex pose — playing
     ~1–1.5s. This is the scroll-stopper; the hook caption is already on it.
  2. **Rewind:** a short **VCR-rewind transition** (scanline/skew overlay + a rewind SFX,
     optionally a fast reversed flash of the teaser).
  3. **Body:** cut to `start` and play the clip **chronologically through to `peak_at`
     again** — the cause (event variant) or the choreo run-up (pose variant) that explains
     the shock/apex, landing back on it as the payoff.
- **Build:** the cutter outputs the full `[start,end]` window (which contains `peak_at`).
  In the composition use one source with `data-media-start` to show the teaser slice first,
  then a second placement playing from `start`. Verify `peak_at` ∈ window (step 3
  guarantees it).
- **Captions:** the open-loop hook line on the teaser; can drop during the body so the
  story reads.
- **Audio:** original 1.0; the **rewind SFX** is the one allowed non-music sound, only
  across the transition.
- **Speed:** off (except the optional fast reverse inside the transition).
- **Capability:** needs a **rewind transition asset** (overlay + SFX, and optionally a
  pre-rendered reversed snippet via `ffmpeg -vf reverse`). New asset — build once, reuse.

## 6. `pure_moment` — the clean single beat  *(fallback)*
- The current validated music edit: static fan-voice caption at t=0 + beat-synced zoom,
  original audio 1.0, no speed-up, no effects. Use when `format` is `pure_moment` or absent.

---

## Capability summary (what each format needs)

| format | buildable today | needs a new asset / step |
|---|---|---|
| vocal_showcase | ✅ | — |
| ranked_countdown | ✅ | per-segment number overlay timing |
| aesthetic_showcase | ✅* | ffmpeg speed-ramp + grade pre-pass |
| crowd_takeover | ✅ | — (selection carries the crowd; no stems) |
| climax_rewind | ⚠️ | **rewind transition overlay + SFX** (build once) |
| pure_moment | ✅ | — |

We deliberately do **not** do vocal/stem separation — `vocal_showcase` and `crowd_takeover`
rely on selecting footage where the target is already dominant in the live mix.

## Templates used

- **`templates/styles/caption-static.css`** + **`templates/scripts/caption-static.js`** —
  the static fan-voice line. `buildStaticCaption(tl, FAN_LINE, { appear: 0.0 })` with
  `FAN_LINE` = `hook_title`. (`{ hold: <t> }` to fade after the peak.)
- **`templates/scripts/zoom-engine.js`** — beat-synced motion.
- **`templates/styles/caption-neon.*`** — only for a crowd-talk segment (karaoke that part).
- Format-specific overlays (countdown number, rewind transition) are built per clip until
  they are promoted into shared templates.

> Static-caption starter defaults: top:360px, 64px Anton, white + strong shadow. Calibrate
> position/size on the first real music clip and promote into `CLAUDE.md`.
