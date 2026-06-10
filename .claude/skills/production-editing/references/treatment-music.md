# Treatment: music

For `clip.json.lens == "music"` — artist / live / concert / fancam. **The performance IS
the content** and **the original audio IS the track.** The edit must not get in the way of
the music or the moment. The hook is a *fan reaction* laid over the beat, not a description.

> **Calibration status: STARTER DEFAULTS.** New profile — not yet ear/eye-validated.
> Refine on the first real music campaign and promote validated values into `CLAUDE.md`.

## Character

Performance leads, audio is sacred. Minimal text, motion synced to the music, nothing that
breaks rhythm. Think fancam, not explainer.

## 1. Captions — ONE static fan-voice line (NOT karaoke)

- Default: a **single static caption** = the `hook_title` in **stan/fan voice** (e.g.
  "the vocals on Love Again are actually insane", "that mic was ON"). It states the feeling
  the viewer should have; it is not a transcript.
- Style: **plain bold white text with a strong shadow** (NOT the CapCut white box — music
  clips read cleaner with shadowed text). Anton/bold, centered, upper-third or mid-frame,
  generous size. Appears at/near t=0; may persist or fade after the peak.
- **First-person collective is allowed** ("she gave **us** a concert film for free", "the
  woman that **you** are") — the voice is the fan community, never the artist.
- Karaoke captions **only** for a parasocial segment where the artist actually talks to the
  crowd (archetype B). Then transcribe that segment and caption just the spoken lines.
- Step 3: usually **skip transcription** (no speech); run it only for a crowd-talk segment.

## 2. Motion — beat-synced

- Sync zooms to the **musical structure**: punch (`zoomPushStrong`) on the drop / belt /
  key change / dance-break hit; gentle drift or hold otherwise; `zoomRelease` after each
  punch. Do not zoom on words — there are none to key on.
- A soft `zoomHook()` open is fine. Keep it musical, not busy.

## 3. Hook overlay = the fan-voice caption

- In music the "hook title" and the on-screen caption **merge into the one fan-voice line**
  above — do not also add a separate white-box title. One voice, one line.

## 4. Audio mix — original audio IS the track

- The clip's own concert/performance audio at `data-volume="1.0"` is the whole mix.
- **NO background-music layer** (the performance is the music) and **NO glitch-SFX over
  the music** (it fights the beat). A single subtle riser into a drop is the only optional
  accent, and only if it genuinely fits.
- Preserve dynamics — do not over-compress a live vocal peak into flatness.

## 5. Speed-up

- **OFF (SPEED=1.0).** Never speed-ramp music — it detunes/destroys the rhythm and the
  vocal. This is the hard override vs. the other lenses.

## Templates used

- **`templates/styles/caption-static.css`** + **`templates/scripts/caption-static.js`** —
  the static fan-voice line. Wire it: `<div id="static-caption"></div>` in the root, then
  `buildStaticCaption(tl, FAN_LINE, { appear: 0.2 })` where `FAN_LINE` is the `hook_title`.
  (Pass `{ hold: <t> }` to fade it out after the peak; omit to keep it up the whole clip.)
- **`templates/scripts/zoom-engine.js`** — beat-synced motion.
- For a crowd-talk segment only: the karaoke `caption-neon.*` for that spoken part.

> The static-caption templates are new (Juni 2026) **starter defaults** — top:360px,
> 64px Anton, white + strong shadow. Calibrate position/size on the first real music clip.
