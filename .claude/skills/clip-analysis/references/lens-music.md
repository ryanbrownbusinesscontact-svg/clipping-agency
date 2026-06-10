# Lens: music

For **artist / live-music / concert content** — touring pop & hip-hop, festival sets,
live-session uploads, fancam compilations, tour-diary footage. Niche-agnostic across
genres (pop, rap, K-pop, rock, Latin). The examples below are pure **calibration**, not
the matching rule. Gemini matches on the **primitives**.

## What makes music different (read first)

In `spoken-clip` the hook comes from **what is said**; in `visual-clip` it neutrally
describes **what is seen**. In `music` the hook is **neither** — it is a **fan / comment-
section reaction projected onto the moment**. "the mic was ON", "definitely a core
memory", "she ate this" — nobody in the video says that; it is the emotion the cold
viewer is *supposed to feel*, written as the overlay in **stan voice**. The clip provides
the goosebump; the overlay names the feeling.

Two rules therefore **flip** for this lens:

- **First-person is ALLOWED — as the fan collective.** Collective "us/we" and direct
  address to the artist ("you") are the native voice and a strength:
  "she gave **us** a concert film for free", "the woman that **you** are".
  Still forbidden: the *artist's* first person ("I gave you a show"). The voice is the
  audience, never the performer.
- **`verbal_hook` is OPTIONAL.** Many clips have zero dialogue (pure performance). When
  there is no spoken line, set `verbal_hook` to null and carry the hook entirely in
  `hook_title` + `visual_hook`. `visual_hook` is **required** here (the beat at second 0).

## Leading modality: AUDIO + VISUAL (jointly)

Not "visual with audio support" — for performance clips the **audio IS the money shot**
(the belted note, the run, the live-equals-studio reveal, the beat drop). Gemini sees
video + audio at once and weighs both. First questions, always: *"Is there a goosebump
beat to HEAR here?"* and *"Is there a beat to SEE here?"* Either can carry a clip; the
best clips land both on the same moment.

**Analysis method: one-shot.** The whole video goes straight to the current Gemini Flash
model. No transcript-first pass — that would miss every wordless performance peak.

## Archetype routing (pick one per candidate)

Every music candidate is one of three archetypes. Route first, then pick the hook voice
to match — this is what keeps the lens flexible across "concert where the music leads"
vs. "fan-interaction moment where the human beat leads".

- **A — Performance-Flex** — the artistry IS the payoff (live vocals, choreo, staging,
  production). The clip MUST contain the peak itself (the belt / dance break / drop).
  Hook voice = awe at the craft.
- **B — Parasocial-Moment** — the human interaction IS the payoff (talks to crowd,
  signs/gifts something, reacts to a fan, picks someone out, eye contact). Music is
  background; the human beat leads. Hook voice = wholesome / "core memory".
- **C — Status-Take** — cultural positioning IS the payoff (proof of range, longevity,
  dominance). Usually laid over a flex moment. Hook voice = declarative stan claim.

## What Gemini hunts for — the primitives (niche-agnostic)

1. **Vocal money-moment** — the belt, the run, an a-cappella stretch, a "live = studio"
   reveal, a held note. *(the "mic was ON" beat.)*
2. **Choreo / spectacle peak** — dance break, formation, pyro, staging/outfit reveal, a
   crowd-scale wide shot. *(the "cinematic" beat.)*
3. **Artist–fan parasocial moment** — addresses the crowd, signs/gifts, reacts to a sign,
   makes eye contact, pulls someone on stage. *(the "core memory" beat.)*
4. **Crowd communion** — the whole venue singing a line back, a phone-light sea, a
   collective goosebump moment.
5. **Status / discourse bait** — a moment that "proves" the artist's tier (range,
   growth, reign) and fuels a declarative take.
6. **Iconic / meme-able beat** — a facial expression, a quotable aside, an outfit
   moment that can become a sound or meme.
7. **Surprise / unexpected** — guest appearance, unreleased song, a wardrobe moment, a
   mistake recovered gracefully.

A strong music clip usually combines **2–3 primitives** (e.g. vocal money-moment +
crowd communion + status proof).

## Boundary logic — cut to MUSICAL structure, not sentences

Unlike spoken-clip (cut on sentence boundaries), align cuts to the **musical beat**:
enter 1–2 beats *before* the peak (the key change / belt / dance break / drop) and ride
it. Performance clips may **start very close to the climax** — there is no verbal setup
to protect, so front-load the goosebump. Keep the window tight around the single peak;
do not pad with the verse before it unless the build itself is the payoff.

**Length corridor (music-specific, overrides the general 15–60s).** Target **15–45s**.
A clip may run up to **50s only if** the extra body content stays genuinely engaging
AND meaningfully builds toward the payoff — never as padding. Default bias: the earlier
an engaging payoff lands (while the body leading to it stays engaging), the better —
short-form algorithms reward completion rate and rewatches, and dead time after an
early payoff kills both.

**Payoff position.** The payoff should land in the back half of the clip, or the clip
should end within **~5–8s after the payoff** — avoid "payoff then long tail-off".

**Multi-peak performances.** If a performance has two or more strong, far-apart peaks
(e.g., outfit reveal + a choreo highlight many seconds later), prefer **splitting into
separate, tightly-cut candidates** rather than stitching one long clip that drags
between peaks.

**Lead-in test (archetype-specific).** For **Parasocial-Moment (B)**, a few seconds of
anticipation/approach before the payoff line is fine — it builds the human tension. For
**Performance-Flex (A) / Status-Take (C)**, minimize lead-in: even if the spectacle
(outfit, staging, lighting) is already visible, several seconds of someone walking or
posing with no vocal/musical anchor reads as dead time to a cold scroller. Find the
frame where the spectacle is ALREADY visible, then cut forward so the first sung/
spoken line (`verbal_hook`) lands within roughly **1–4s of frame 0** — the visual
spectacle and the opening line should arrive together, not the visual first and the
line several seconds later.

## Title overlay = the fan reaction (the white box / centered caption)

The overlay names the feeling in **stan voice**. Patterns, by archetype:

- **Awe declaration** (A): "the vocals on ___ are actually insane", "the way she ATE this"
- **Live-proof flex** (A): "the mic was ON", "no autotune in sight", "she can SING SING"
- **Cinematic claim** (A): "this part is a cinematic masterpiece", "[artist] cinematic
  universe only"
- **Free-gift framing** (A): "she gave us a whole concert film for free", "the people's
  princess"
- **Core-memory framing** (B): "definitely a core memory", "this would heal me"
- **Wholesome story** (B): "he asked [artist] to sign his arm for a tattoo"
- **Status / discourse claim** (C): "she's BEEN that girl", "[artist]'s growth needs to
  be studied", "the woman that you are"

Formula: **name the feeling a fan would post in the comments + the artist/song as anchor.**
Tension/awe in the overlay, resolution in the beat.

**Naming rule (cold-viewer anchor).** Default: **name the artist/creator in the
`hook_title`** ("the vocals on Love Again from Dua Lipa are insane"). A name orients
viewers who don't recognize the performer yet and helps algorithmic matching/search —
the borrowed audience is structural here, not a bonus.
**Exception:** if the artist's face is clearly/iconically recognizable in the very first
frame (sharp close-up, well-lit, unmistakable), naming is redundant — drop the name and
let the line focus purely on the feeling/moment.

## Score weighting

- Dominant: **audio_impact** (strength of the vocal/musical peak) + **visual_spectacle**
  (the visible beat) — weighted jointly.
- Support: **parasocial_warmth** (for archetype B) and **discourse strength** (for C).
- `visual_hook` is a **required field** (the beat at second 0). `verbal_hook` optional.
- Goosebump potential > polish: an authentic raw fancam peak beats a clean but flat take.

## hook_type enum (music)

`vocal_flex` | `spectacle_peak` | `parasocial_moment` | `crowd_communion` |
`status_take` | `iconic_meme` | `surprise`

## Examples — CALIBRATION ONLY (Dua Lipa live, fancam/tour content)

These really performed. They are **instances of the primitives above** — the same lens
applies unchanged to a rap set or a K-pop fancam:

- "this part of the concert is a cinematic masterpiece 😭❤️" (vocals on Love Again) →
  `vocal_flex` + spectacle; awe declaration (372k views).
- "Definitely a core memory ☀️" (Dua chatting with the crowd) → `parasocial_moment`;
  core-memory framing (151k).
- "She's been THAT GIRLLL" / "That mic was ON" (choreo + live vocal) → `status_take` +
  `vocal_flex`; live-proof flex (111k).
- "He asked Dua Lipa to sign his arm for a tattoo 🥹❤️" → `parasocial_moment`; wholesome
  story (110k).

Note: hard-coding "concert" or "belted note" would break the lens for a rap set with no
singing. The primitive ("vocal money-moment", "parasocial moment") ports; the example
only calibrates.
