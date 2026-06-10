# Classifying & evaluating a campaign

This document provides the judgment rules to translate a Whop campaign into `category`,
`decision.fit_score`/`verdict`, and clean `must_do`/`must_avoid` lists.

## Determine category

`category` decides which production skill runs later. Pick exactly ONE:

| category | When | Tells in the brief |
|---|---|---|
| `spoken-clip` | Speech is the value — podcast, interview, talk | "podcast", "episode", long conversations, transcript-driven, one/more speakers |
| `visual-clip` | Image is the value — footage with visual moments | food, product, travel, gaming, reactions, "b-roll", "footage", visual highlights |
| `ugc-produce` | Original production needed — no ready footage | "create original content", "talking head", "film yourself", script skeleton in the brief, NO content library |
| `music` | An **artist/act is the value** — clip live/concert/fancam/tour footage | musician/band/tour campaign, concert or live-session footage, fancam library, "clip the show", song/performance highlights |

Mixed cases: decide by the **main work**. A podcast with some b-roll stays `spoken-clip`
(transcript drives the clips). A food vlog with voiceover is `visual-clip` (the images
stop the scroll). When in doubt, pick the category whose skill delivers the larger share
of the value.

**`music` vs. the look-alikes — read carefully.** `music` is for **clipping an artist's
existing performance footage** (the live vocals / choreo / crowd / fan moments are the
content; the hook is a projected fan reaction). It is NOT "here is a sound, put it on your
own clips": a campaign that only hands over **a track/sound to lay over self-shot footage**
(no artist footage library) is `ugc-produce` (you produce the video), not `music`. Tell
them apart by the library: **artist footage to cut → `music`; only an audio/sound asset →
`ugc-produce`.**

## fit_score (0–10) — the intake filter

`≥ 6` = take (verdict `TAKE`), else `SKIP`. Four axes, each ~0–2.5 points:

1. **Library size** — how much approved content exists? Many hours of ready footage =
   high. `ugc-produce` (film everything yourself) = low, unless the leverage is large.
2. **Account freedom** — can the content go on an existing theme account?
   `dedicated_required: true` (own brand page mandatory, must warm up first) = deduction.
3. **Economics** — CPM × realistic reach, remaining budget, max_payout cap,
   approval_rate. High CPM + lots of remaining budget + loose approval = high.
4. **Recurrence** — one-off drop or ongoing/phase-2 opportunity? Recurring = high.

Agency focus: campaigns with **lots of existing content to clip**
(`spoken-clip`/`visual-clip`). `ugc-produce` only with very strong economics. Justify the
score briefly (one sentence in the report, not in the JSON).

## must_do vs. must_avoid — HARD rules only

Iron separation: the JSON gets **only** clear duties/bans, no recommendations, no hooks,
no style tips (the production skill does that).

Test per candidate sentence: "Does a violation lead to reject / non-billable / breach of
contract?"
- **Yes** → `must_do` (duty) or `must_avoid` (ban).
- **No** (just "we recommend", "best to", "performs well") → OMIT.

Typical `must_do`: required tag (@account), required hashtags, approved sources only,
format (9:16), language, minimum runtime live, submission duties (screenshots,
post-deadline), platform restriction.

Typical `must_avoid`: blocked sources, brand-safety killers (e.g. "person must never look
negative/incompetent"), footage outside the library, missing tags (non-billable),
forbidden platforms/topics, NSFW.

Recommendations in the brief do NOT go into the JSON — but mention them briefly in the
final report so the later skill knows them as context.

## Assign account_usage

- `dedicated_required`: `true` only if the brief MANDATES an own brand page.
  "recommended"/"strategic" → `false` + reason in the `reason` field of the account record.
- `theme_account`: id of a `theme_accounts` entry in `accounts/accounts.json`, if the
  content may go on a niche channel (e.g. food → `food`). If none fits → create a new
  theme-account record.
- `dedicated_account`: id of a `brand_accounts` entry, if an own brand page is mandated or
  strategically sensible. Create the record in `accounts.json` (status `planned`, suggest
  the handle as `proposed_handle` — do NOT check availability or register, the human does that).

IMPORTANT (security): only create the **local account record** in `accounts.json`. Never
create real social-media accounts, never register handles, never confirm logins/ToS —
the human handles that.
