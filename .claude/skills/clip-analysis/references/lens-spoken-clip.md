# Lens: spoken-clip

For **every word-driven content** — podcast, interview, talk, lecture. Niche-agnostic:
sales, finance, health, mindset, business. The examples below are pure **calibration**,
not the matching rule. Gemini matches on the **primitives**.

## Leading modality: TRANSCRIPT (visual supports)

The value is in **what is said**. Gemini processes the audio track in one pass — the
spoken content finds the candidates; expression/emotion/gesture are a **boost/tiebreaker**
(real laughter, shock, emphasis), not the main criterion.

## What Gemini hunts for — the primitives (in the spoken word)

1. **Contrarian / pattern interrupt** — a statement against the norm / against common
   sense. *(e.g. "Do NOT save for retirement.")*
2. **Curiosity gap** — promises an insight, briefly withholds it.
   *(e.g. "The real reason most people die broke is…")*
3. **Concrete number / specificity** — amount, percentage, timeframe.
   *(e.g. "$20K a month", "in 90 days".)*
4. **High stakes / emotion** — fear, greed, status, regret. *(e.g. "You're wasting your
   best decade.")*
5. **Story arc with a turn** — short anecdote with setup → twist → punch.
6. **Q→A reveal** — a question opens the loop, the answer closes it surprisingly.
7. **Authority / social proof** — credibility through experience/success.
   *(e.g. "I make $100M a year…")*

A strong spoken-clip has a **clear verbal statement** that hits ≥1 primitive AND a
payoff inside the window.

## Title overlay = reframe of the statement (the white box)

Take the core statement and reframe it into curiosity/contrarian/number:
- Statement "20K a month is realistic" → title **"Earn $20K/Month: It's Normal"**.
- Statement "spend your money while you can enjoy it" → **"Spend It Before It's Too Late"**.

Formula: **reframe into desire/curiosity/contrarian + a number if available.** Tension
in the title, resolution in the clip.

**CRITICAL — no first-person in hook_title:** This content is posted by clipping pages,
not by the original speaker. `hook_title` must NEVER use I / me / my / we / our.
Use third-person ("She hasn't been sick in 7 years") or impersonal form
("7 Years Without Getting Sick — Here's Why"). The verbal_hook (the actual spoken line)
may keep first-person as a verbatim quote — only hook_title must change.

## Score weighting

- Dominant: **semantic payoff** (strength/originality of the statement + a clear payoff).
- Boost: **expression/emotion** (visible laughter/shock/emphasis lifts a good take over
  a static one).
- Check **`philosophy_fit`** especially: does the statement match the campaign `must_do`
  (e.g. a campaign that demands a clear philosophy link, not a generic tip)?

## hook_type enum (spoken-clip)

`contrarian` | `curiosity_gap` | `concrete_number` | `high_stakes` | `story_turn` |
`qa_reveal` | `authority`

## Examples — CALIBRATION ONLY

Instances of the primitives; the same lens applies to any podcast:

- "Earn $20K/Month in Sales: It's Normal" → contrarian + number + aspiration.
- "Spend Your Money NOW - Before It's Too Late" → stakes + curiosity.
- "The Success Pattern He Sees in Every Billionaire" → curiosity gap + authority.
- "Your Ego Is Keeping You Poor" → contrarian + stakes.
