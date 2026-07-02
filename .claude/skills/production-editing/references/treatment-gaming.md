# Treatment: gaming

For `clip.json.lens == "gaming"` — new-game trailer/gameplay reveal clips. **The
trailer/gameplay footage IS the content**, and there is usually **no host on screen**.
The cardinal rule: *never let the edit cover the reveal, the logo, or any embedded
graphics (UI, tweets, disclaimers) the source footage already carries.*

> **Calibration status: STARTER DEFAULTS.** These reuse the house components with
> gaming-first settings but have NOT been ear/eye-validated like spoken-clip. Treat the
> numbers as a starting point; refine on the first real gaming campaign and promote the
> validated values into `CLAUDE.md`.

## Character

No talking head, minimal added graphics. The white-box hook sets the hype premise
(reveal / nostalgia / crossover / first look); the trailer or gameplay footage delivers
the payoff. Source footage often already carries its own on-screen graphics (game logos,
HUD/UI, embedded tweets, "work in progress" disclaimers) — the edit must never cover
those.

## 1. Captions — minimal / none by default

- Default: **no karaoke captions.** Trailers and raw gameplay rarely have clip-relevant
  dialogue, and on-screen graphics already carry information — full-word captions would
  clutter the frame and compete with the reveal.
- If the clip DOES have meaningful narration/dialogue (`verbal_hook` not null), caption
  sparingly — key line only, same neon style as `treatment-spoken-clip.md`, but placed
  low and clear of any existing on-screen graphics/UI/embedded posts.

## 2. Motion — restrained, on the reveal beat only

- Optional soft `zoomHook()` at open (same 1.06→1.0 pull-back as spoken-clip).
- At most **one** `zoomPushStrong` on the reveal/payoff frame (the crossover moment, the
  character/logo unveil, the clutch/kill, the title card), `zoomRelease` ~1s after.
- No dense word-keyed zoom chain — it fights the trailer's own pacing/edit. If the source
  footage is already a tightly-cut trailer, consider holding with no added zoom at all.

## 3. Hook overlay — white-box hype premise (3rd person, names the game)

- `hook_title` in the white box (same component as spoken-clip): third person, naming
  the game/franchise, hype framing per `lens-gaming.md` (reveal / nostalgia / crossover /
  first look).
- Keep visible only into the first 2–3s — fade it before the reveal/payoff frame lands so
  it never covers the moment it is hyping.
- **Never let the hook overlay (or any added element) cover a visible "work in
  progress"/"pre-release"/build-watermark disclaimer** in the source footage — that is a
  brand-safety requirement, not a style choice.

## 4. Audio mix — game/trailer audio forward, no speech to protect

- Trailer or in-game audio (score, SFX, voiceover if any) stays at `data-volume="1.0"` —
  it IS the payoff, unlike spoken-clip where it's a backdrop to the voice.
- Background music bed: **omit by default.** The trailer's own score already carries the
  energy. If a clip needs a bridge over a quiet/wordless stretch, add a bed only very low
  (≈ `0.08–0.12`, by ear) — never let it compete with the source audio.
- Glitch-SFX: optional, sparing — only as a cut-in stinger right before the reveal beat
  (`data-volume="0.20"`, same spec as spoken-clip).

## 5. Speed-up

- **OFF by default.** Trailer pacing and music are already tuned by the publisher;
  speeding up desyncs score hits from visual beats. Spoken-clip's `SPEED=1.03` does NOT
  apply here. Only consider speed-up for raw, unedited gameplay capture with no scored
  music — and even then, judge per clip.

## Templates used

`zoom-engine.js` only if a reveal-beat zoom is used; `caption-neon.css` /
`caption-neon.js` only if the clip has captionable narration/dialogue.
