# Lens: visual-clip

For **every visually driven creator** — Food, Travel, Tech, Gaming, Fashion, Fitness,
IRL/reaction streamer. **Not** niche-specific. The examples below are pure
**calibration** (they show the bar), never the matching rule. Gemini matches on the
**primitives**, not the instances.

## Leading modality: VISUAL (transcript supports)

First question, always: *"Is there a strong visual or emotional beat to SEE here?"* A
clip can carry on image/reaction alone — even with mediocre dialogue. The transcript
provides context/story and the title, but it is not the main criterion.

**Analysis method: one-shot.** The **whole video** goes straight to the current Gemini
Flash model. No Pass A that filters transcript-first — that would miss visual moments.
Gemini sees video + audio + speech at once and returns the candidates for this video
directly.

## What Gemini hunts for — the primitives (niche-agnostic)

1. **Peak-emotion reaction** — the real, unscripted moment of awe / shock / joy /
   disgust / disbelief. Authenticity beats staging.
   *(e.g. first bite, unboxing, seeing the price, a game clutch, first reaction to
   something crazy.)*
2. **Sensory spectacle ("money shot")** — visually overwhelming close-up, dramatic
   prep/reveal, texture, motion.
   *(e.g. food-porn close-up, sauce pour, sneaker detail, a car, a landscape, unboxing reveal.)*
3. **Storytelling setup / narrative tension** — the creator frames a place/experience,
   builds expectation, opens a loop visually + verbally.
4. **Personality / charisma / parasocial bond** — the human moment: interaction with
   chefs, guests, locals, chat; charm, authenticity.
5. **Stakes / bet / challenge** — wager, risk, dare.
   *(e.g. "bets cameraman $1000 to eat the largest oyster".)*
6. **Status / aspiration / exclusivity** — the most expensive, rarest, best,
   VIP/behind-the-scenes access. Desire + curiosity.
7. **Social dynamics + humor** — jokes that land, group dynamics, fun moments.
8. **Borrowed audience** — a known person/brand appears → attach their audience.
   *(e.g. a celebrity / big creator in the clip.)*

A strong visual-clip usually combines **2–3 primitives** (e.g. status premise +
peak reaction + money shot).

## Title-overlay formulas (the white box) — general

The overlay sets the **premise/tension**; the clip resolves it. Patterns:
- **Superlative question**: "Best ___ in the world?" / "Most famous ___?"
- **Price anchor**: "$3000 ___" / "$150 ___" / "$40 ___!" / "Most expensive ___?"
- **Bet / stakes**: "bets $1000 to ___"
- **Personal arc**: "discovers his new favorite ___"
- **Borrowed audience**: "[known person] does/tries ___"

Formula: **concrete number/price OR superlative OR question + the subject.** Tension in
the title, resolution in the clip.

**CRITICAL — no first-person in hook_title:** This content is posted by clipping pages,
not by the original creator. `hook_title` must NEVER use I / me / my / we / our.
Use third-person ("He tries the $3000 steak") or impersonal form
("$3000 Steak — Worth It?"). The verbal/visual descriptions may quote the creator's
words, but the hook_title itself stays in third-person or neutral form.

## Score weighting

- Dominant: **visual_impact** + **reaction_strength** (strength/authenticity of the
  visible beat).
- Support: transcript (context, story, title material) — not the main weight.
- `visual_hook` is a **required field** here (describes the visible beat at second 0).

## hook_type enum (visual-clip)

`peak_reaction` | `spectacle` | `storytelling` | `personality` | `stakes` |
`status_price` | `social_humor` | `borrowed_audience`

## Examples — CALIBRATION ONLY (Jack's Dining Room, food vlog)

These really performed. They are **instances of the primitives above** — the same lens
applies unchanged to a tech, travel, or gaming creator:

- "JacksDiningRoom tries $3000 Tasmanian King Crab" → status/price + money shot + reaction (16M).
- "bets cameraman $1000 to eat world's largest oyster" → stakes/bet + personality.
- "Best Indian restaurant in the world?🇮🇳" → superlative question (curiosity) + spectacle.
- "IShowSpeed passes out from Texas BBQ" → borrowed audience + peak reaction.
- "discovers his new favorite dessert in Japan" → personal arc + reaction.

Note: hard-coding "first bite" would break the lens for a gamer or reviewer. The
primitive ("peak-emotion reaction") ports; the example only calibrates.
