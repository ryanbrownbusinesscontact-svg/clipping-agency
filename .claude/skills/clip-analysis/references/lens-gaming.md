# Lens: gaming

For campaigns where the **content library IS a specific game** — trailer footage,
dev-provided gameplay capture, or first-look footage of a title. **Niche-agnostic across
genres** (platformer, shooter, RPG, mobile). The examples below are pure
**calibration** (they show the bar), never the matching rule.

## What makes gaming different (read first)

In `visual-clip` a **creator** is on screen and the hook is THEIR reaction. In `gaming`
there is usually **no host** — the trailer/gameplay footage itself is the content, and
the hook is hype about **the game**: a reveal, a return, a crossover, a first look. Think
of the overlay as the line a hype gaming-news page would post above the clip, not a
person's reaction to it.

- **No first-person, no fan/stan voice.** Unlike `music`, the voice here is a
  **gaming-news/hype page**, third person, naming the game/franchise. "we" / "I" do not
  apply (there is no fan-collective framing — see `lens-music.md` for that pattern).
- **`verbal_hook` is OPTIONAL.** Trailers and raw gameplay capture are very often
  wordless (score + SFX only, or in-game audio with no dialogue). When there is no
  spoken line or readable on-screen text, set `verbal_hook` to null and carry the hook
  entirely in `hook_title` + `visual_hook`. `visual_hook` is **required** (the beat at
  second 0).

## Leading modality: VISUAL (game audio supports)

First question, always: *"Is there a moment here that a gaming-news page would post as
'BREAKING' or 'FIRST LOOK'?"* The reveal/highlight frame carries the clip; dialogue or
narration (if any) is a bonus anchor, not the requirement.

**Analysis method: one-shot.** The whole video goes straight to the current Gemini Flash
model — no transcript-first pass, that would miss wordless reveal/gameplay beats.

## What Gemini hunts for — the primitives (niche-agnostic)

1. **Reveal moment** — a new character, mode, map, feature, weapon, or story beat is
   shown for the first time. *(e.g. a new playable character drops in, a logo/title
   card lands, a boss is unveiled.)*
2. **Nostalgia / long-awaited return** — the footage pays off years of waiting: a
   beloved series returns, a remaster, "after all this time".
   *(e.g. "11 years later... it's finally happening".)*
3. **Crossover / novelty surprise** — an unexpected IP collab or guest appearance that
   nobody predicted.
   *(e.g. a mascot crossing over into another franchise's world.)*
4. **Gameplay spectacle / first look** — a new mechanic, mode, or sequence shown in
   action for the first time; a clutch/combo/kill that demonstrates it.
   *(e.g. "First Look at [Mode] Gameplay".)*
5. **Community proof / discourse** — embedded reactions (tweets, comments, "fans
   weren't expecting this") that validate the hype or frame a debate.
6. **Comparison / debate bait** — old vs. new, this game vs. a rival, "is this better
   than ___?" — primes a comments-section argument.

A strong gaming clip usually combines **2 primitives** (e.g. reveal + crossover
surprise, or gameplay first-look + community proof).

## Title-overlay formulas (the white box) — third person, name the game

The overlay sets the **hype premise**; the footage delivers the reveal/payoff. Patterns:
- **Reveal hype**: "[Game] just revealed/dropped/teased ___ 😳"
- **Nostalgia payoff**: "[X years] later... it's finally happening 🚨"
- **Crossover surprise**: "[Game] fans weren't expecting THIS 😳" / "[Game] x [Other IP]
  — nobody saw this coming"
- **First look**: "First Look at [Game]'s ___ Gameplay 👀"
- **Comparison/debate**: "Is [Game]'s new ___ actually insane?"

Formula: **name the game/franchise (or "this game" if genuinely unclear) + a hype verb
(revealed/dropped/teased/finally) or a first-look frame.** Tension/hype in the title,
payoff in the footage.

**CRITICAL — no first-person, no fan/stan voice in `hook_title`:** This content is
posted by clipping pages, not the developer or a fan account. Never "I"/"we"/"us". Use
third-person, naming the game/franchise.

## Pre-release / work-in-progress footage

If the source footage carries a visible disclaimer ("work in progress", "currently in
development", "pre-release", a build-version watermark), note it in `visual_hook` —
production-editing must not crop or cover that disclaimer (misrepresenting WIP footage
as a finished/shipped product is a brand-safety risk for the campaign).

## Score weighting

- Dominant: **visual_impact** (the reveal/spectacle itself) + **hype/surprise factor**
  (how unexpected or long-awaited the moment is).
- Support: any on-screen text/embedded social proof, narration if present.
- `visual_hook` is a **required field** (describes the visible beat at second 0).
  `verbal_hook` optional.

## hook_type enum (gaming)

`reveal_hype` | `nostalgia_return` | `crossover_surprise` | `gameplay_firstlook` |
`community_reaction` | `comparison_debate`

## Examples — CALIBRATION ONLY (game-trailer/gameplay clipping pages)

These really performed. They are **instances of the primitives above** — the same lens
applies unchanged to a different franchise or genre:

- "Sonic just revealed his WILDEST crossover yet 🤔" (Sonic x Godzilla trailer reveal,
  marked work-in-progress) → `reveal_hype` + `crossover_surprise` (706k views).
- "Sonic fans weren't expecting THIS 😳" (same trailer, SEGA logo reveal) →
  `crossover_surprise`; community-framed surprise (386k).
- "11 years later... it is FINALLY happening 🚨" (long-awaited sequel/return teaser,
  wordless) → `nostalgia_return` (1M+ views).
- "First Look at DMZ Gameplay in MW4 👀" + embedded tweets reacting to the new
  extraction mode → `gameplay_firstlook` + `community_reaction` (310k).

Note: hard-coding "Sonic" or "DMZ" would break the lens for a different title. The
primitive ("reveal moment", "nostalgia payoff") ports; the example only calibrates.
