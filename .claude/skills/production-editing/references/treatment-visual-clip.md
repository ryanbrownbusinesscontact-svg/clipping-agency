# Treatment: visual-clip

For `clip.json.lens == "visual-clip"` — food / travel / tech / gaming / fashion / reaction.
**The image IS the content.** The cardinal rule: *never let the edit cover or distract from
the money shot.* Captions and motion support the visual beat; they do not compete with it.

> **Calibration status: STARTER DEFAULTS.** These reuse the house components with
> visual-first settings but have NOT been ear/eye-validated like spoken-clip. Treat the
> numbers as a starting point; refine on the first real visual-clip campaign and promote
> the validated values into `CLAUDE.md`.

## Character

Image leads. Let the footage breathe. Lower text density, gentler motion, audio from the
footage stays present. The hook overlay sets a premise; the visual resolves it.

## 1. Captions — sparse / key-line only (NOT full karaoke)

- Do **not** karaoke every word — that buries the money shot.
- Caption **only** when speech adds meaning (a reaction line, a price said aloud, a punch
  line). Otherwise no captions over a spectacle beat.
- When used: short phrases / single lines, neon style is fine, but **placed low and clear
  of the subject** (never across the center reveal). Consider a smaller size than 56px.
- Step 3: still transcribe, then **keep only the lines worth showing**.

## 2. Motion — gentle, on reveal/reaction beats (not on words)

- Optional soft `zoomHook()` at open is fine.
- Use at most a couple of `zoomPush` on the **reveal / reaction** beats (the bite, the
  price reveal, the clutch), `zoomRelease` after. **No** dense word-keyed `zoomPushStrong`
  chain — it fights the footage. When the shot is already strong, hold it; don't zoom.

## 3. Hook overlay — white-box premise (3rd person)

- The candidate's `hook_title` in the white box (same component as spoken-clip), setting
  the premise/tension (price anchor / superlative / question). Resolution lands in the
  visual.
- **No first person** (clipping-page voice).
- May fade slightly later than spoken-clip if the reveal it sets up comes later — judge by
  when the payoff hits.

## 4. Audio mix — footage audio forward

- Footage/diegetic audio (sizzle, crowd, the reaction sound) is part of the payoff — keep
  it present, voice/diegetic at `data-volume="1.0"`.
- Background music bed may sit a touch **louder** than spoken-clip (≈ `0.18–0.25`, by ear)
  since dialogue is not the primary value — but never bury a key reaction sound.
- Glitch-SFX: optional, sparing.

## 5. Speed-up

- **Optional 3%** — fine for pacing, but drop it if it makes a savored beat (a slow pour,
  a reveal) feel rushed. Judge per clip.

## Templates used

`zoom-engine.js` always; `caption-neon.css` + `caption-neon.js` only if the clip uses
captions.
