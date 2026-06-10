# Extraction Method — how footage becomes candidates (category-agnostic)

This file describes **the procedure**: how Gemini breaks a long video into closed clip
windows, where it cuts, how it sets the hook, and how a candidate is built. It
complements `clip-psychology.md` (the **why** + schema) and the `lens-<category>.md`
(the **leading modality** + what to hunt for). It applies to both categories — the lens
only decides whether transcript or image leads.

## The 5-stage funnel

Gemini works a video in five stages. Generous at the top, strict at the floor.

1. **Scan** — go through the whole video (visual-clip) or transcript+windows
   (spoken-clip) once and mark **every** moment that touches a hook primitive. Cast a
   wide net here — rather 30 raw markers than 8.
2. **Boundaries** — for each marker, find the **tightest standalone window**
   (setup → beat → payoff) using the heuristics below. Target window 15–60s.
3. **Hook** — pick the **single strongest hook** per window (3 layers, below), write the
   `hook_title`, then run it through the **hook-craft tests** (below) and rewrite if weak.
   No hook ⇒ the marker is dropped (floor).
4. **Score** — set `virality_score`, `philosophy_fit`, `watchtime_risk`. Justify them.
5. **Dedupe** — merge overlapping windows that cover the same beat into **one** best
   candidate (tightest/strongest wins). Do not list mere variants of the same moment.

Result: many candidates, each with a real hook, sorted by `virality_score`.

## Boundary heuristics (where to cut)

- **Start on the hook, not the warmup.** The first frame/line must already grab. Cut
  dead lead-in ("so… um… yeah so") before the beat.
- **End right after the payoff.** Once the loop closes (laugh, reveal, punch, awe) → cut.
  No trailing dead air, no transition into the next topic.
- **Respect sentence/beat boundaries.** Never start or end mid-word/mid-sentence.
- **Standalone test.** Would a stranger understand the clip with no prior context? If an
  "as I said earlier" is needed → move the window or drop it.
- **15–60s target corridor.** Below that usually too thin for a payoff; above it,
  retention risk. If a strong beat runs longer → mark `watchtime_risk` high, don't force-cut.

## Construction spectrum (how the clip is built)

Each candidate gets a `construction_type`. **v1 actively supports three levels; stitch
is only flagged, not auto-built.**

1. **`lift`** — take one continuous segment as-is (`start`→`end`), nothing removed
   inside. The default and cleanest case.
2. **`tighten`** — continuous segment, but **internal filler/pauses removed** (ums,
   repeats, long silence). List the removed ranges in `internal_trims` as
   `{from, to}` (HH:MM:SS). `start`/`end` stay the outer bounds.
3. **`hook_relocate`** — like `tighten`, BUT a later punchy line is **pulled to the
   front as a cold open** (it becomes the first spoken line). Put the line's original
   timestamp in `hook_relocate_from` (HH:MM:SS). Use only when the relocated line opens
   the clip clearly stronger.
4. **`stitch`** — combine two separate parts of the video (e.g. question at 12:03 +
   answer at 31:40). **v1: do NOT auto-build.** If Gemini sees a strong stitch, list it
   as a candidate with `construction_type: "stitch"` and describe the parts in
   `internal_trims`/note — production decides manually.

Rule: **as little construction as needed.** When in doubt, `lift`. Use tighten/relocate
only when it makes the clip measurably better (clearer hook, less sag).

## The hook in 3 layers — but ONE best per clip

A clip hook works on three layers at once. Gemini describes all three but picks **the
single strongest** as the leading hook (no A/B variant set):

1. **Visual hook** (first frame) — what you SEE at second 0. For visual-clip often the
   strongest driver (money-shot, reaction). → `visual_hook`.
2. **Verbal hook** (first spoken line) — the opening line. For `hook_relocate` this is
   the relocated line. → `verbal_hook`.
3. **Text hook** (white box at top) — the overlay that sets the premise/tension which
   the clip resolves. → `hook_title`. Formulas live in the lens.

`hook_type` = the **dominant** primitive (from the lens enum). `why_viral` justifies in
1–2 sentences which primitive pulls and why. **One** hook, not multiple suggestions —
the AI makes the call, production builds it.

## Hook craft — make the title STRONG, not just present

A hook can hit a primitive and still be weak. Before accepting a `hook_title`, run it
through three tests. If it fails **any**, **rewrite it** — never ship the first idea.

1. **Cold-viewer test (accessibility).** A viewer with ZERO context — who does not know
   the creator, the place, or any reference — must instantly get the tension. A hook that
   leans on a name/brand/place only works if that reference is **globally famous**
   (e.g. McDonald's), not insider knowledge (one city's deli). Niche reference →
   **translate it to a universal frame** (superlative, number, money, sensory, emotion).
   - *Weak:* "Is this better than NYC's Katz Deli?" (most viewers don't know Katz).
   - *Fixed:* "Is this the best pastrami sandwich on earth?"
2. **Tension test (stakes).** Not knowing the answer must create discomfort, or the claim
   must force agree/disagree. A neutral question or abstract musing is NOT a hook.
   - *Weak:* "Is bread the most important part of a sandwich?" / "How do you take the
     first bite?" — no stakes.
   - *Strong:* "Cold cheese on a tuna melt should be illegal."
3. **Concrete test (specificity).** A concrete noun / number / claim, not a vague
   comparison.
   - *Weak:* "looks like a UFO."
   - *Fixed:* "a sandwich so big he can barely bite it."

Strong hook moves (pick the one that fits the moment, then write the title with it):
- **Curiosity gap** — withhold the resolution ("He left a 2-star Michelin kitchen to make
  THIS").
- **Bold / contrarian claim** — invites agree/disagree.
- **Number / price / money anchor** — concrete + status ("$40 for a sandwich?").
- **Superlative / universal benchmark** — replaces niche comparisons ("best ___ on
  earth?", "most famous ___?").
- **Payoff promise** — "watch what happens when…".
- **Borrowed audience** — only **mass-recognized** people/brands.
- **Stakes / bet** — "$1000 says this is the best in the city."

`why_viral` must state which move the title uses AND why a cold viewer gets it. The lens +
`winning-examples.md` give the niche-specific title patterns; these three tests are the
**universal floor** for hook quality.

## Floor check per candidate (final gate before inclusion)

Before a marker becomes a candidate, it must satisfy ALL of:
- [ ] Clearly hits **≥1 hook primitive** (not a "nice moment with no hook").
- [ ] Is **standalone** understandable.
- [ ] Has a **payoff** inside the window (emotional/informative/social).
- [ ] Has a writable `hook_title`.

Missing any → out. Satisfies all → include and rank by `virality_score` (generous).
