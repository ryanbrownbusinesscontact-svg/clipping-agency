# Lens: music

For **artist / live-music / concert content** — touring pop & hip-hop, festival sets,
live-session uploads, fancam compilations, tour-diary footage. Niche-agnostic across
genres (pop, rap, K-pop, rock, Latin). Every example below is **calibration only**, never
the matching rule — Gemini matches on the **primitives** and builds with the **formats**.

## What makes music different (read first)

In `spoken-clip` the hook comes from **what is said**; in `visual-clip` it neutrally
describes **what is seen**. In `music` the hook is **neither** — it is a **fan / comment-
section reaction projected onto the moment**. "the mic was ON", "definitely a core
memory", "she ate this" — nobody in the video says that; it is the emotion the cold
viewer is *supposed to feel*, written as the overlay in **stan voice**. The clip provides
the goosebump; the overlay names the feeling.

Two rules therefore **flip** for this lens:

- **First-person is ALLOWED — as the fan collective.** Collective "us/we" and direct
  address to the artist ("you") are the native voice and a strength. Still forbidden: the
  *artist's* first person. The voice is the audience, never the performer.
- **`verbal_hook` is OPTIONAL.** Many clips have zero dialogue (pure performance). When
  there is no spoken line, set it to null and carry the hook in `hook_title` +
  `visual_hook`. `visual_hook` is **required** here (the image at second 0).

## Leading modality: AUDIO + VISUAL (jointly)

For performance clips the **audio IS the money shot** (the belted note, the run, the
live-equals-studio reveal, the beat drop) and the **image is the scroll-stopper**. Gemini
sees video + audio at once and weighs both. First questions, always: *"Is there a
goosebump beat to HEAR here?"* and *"Is there a beat to SEE here?"* — the best clips land
both on the same instant. **Analysis is one-shot** (the whole video to Gemini); never a
transcript-first pass — that would miss every wordless performance peak.

---

## The two laws that override every format

These are non-negotiable. A clip that breaks either is wrong even if the moment is great.

### 1. The opening law — the first ~1 second commits the viewer
The viewer decides in well under two seconds — but the very first ~0.3–0.5s is partly
eaten by the **swipe itself** (the thumb is still finishing the scroll, the eye is still
landing, the audio is ramping). So the rule is **not** "put your single best frame on
frame 0 and hope" — a literal peak on frame 0 can be gone before the viewer has even
landed. The rule is: the **opening second must be instantly loud, legible and in motion.**
No slow build, no dead air, no logo/title card, no empty or wide establishing shot, no
back-of-head, no quiet intro. The strongest beat either **sits at second 0** or is
**visibly teased at second 0 and delivered within ~1–2s** — never later. `visual_hook`
describes the exact t=0 image, and it must read as *"something is happening"* at a glance.
If the first second is weak, ambiguous or a build-up, `start` is too early → move it.
"It gets good by second 3" is exactly the failure this prevents.

**Peak placement is per-format** (the catalog sets it, don't fight it): `climax_rewind`
and `ranked_countdown` open **ON** the peak at second 0;
`vocal_showcase` and `aesthetic_showcase` open on a strong, committed image with the money
instant landing **within ~1–2s** (that short anticipation IS their retention engine — do
not flatten it onto frame 0).

### 2. Open-loop integrity — deliver what you teased
The open-loop format (`climax_rewind`) shows the payoff *first* to
plant a question, then make the viewer watch to resolve it. The teased moment (`peak_at`)
**MUST** fall inside the clip's own window, and the body **MUST** visibly build to and
**actually deliver** exactly that moment. Never tease a shock/apex the clip does not
contain or does not pay off. The cause→effect has to be fully visible in the footage —
if you cannot see *both* the build-up and the payoff on camera, do not pick the format.

### Retention is built into the format
Each format below is shaped so something keeps happening (a rising note, the next rank,
the snap of a speed-ramp, the rewind, the crowd swelling). Pick the format whose built-in
retention engine actually exists in the footage — don't force one.

---

## The format catalog (assign exactly ONE per candidate)

Every music candidate is built as one of **six formats**. The format decides *what kind
of video this becomes* and *how the editor will cut it* — so choosing it correctly, and
finding footage that genuinely fits it, is the whole job. Map each to its psychological
pillar; that pillar is the retention engine you are pulling.

The four pillars you are pressing:
- **Open loop (information gap)** — a riddle/shock; the brain must learn how/why.
- **Micro-loop chain (anticipation)** — known structure (a Top 5); they stay for "what's #1".
- **Sensory satisfaction (dopamine)** — no riddle; the audio/visual is just perfect.
- **Cognitive friction (gamification)** — a counter/quiz makes them *play*, not just watch.

| format | pillar | construction | extra fields | t=0 image |
|---|---|---|---|---|
| `vocal_showcase` | sensory + acoustic loop | lift / tighten | `peak_at` | artist mid-line, voice already sounding |
| `ranked_countdown` | micro-loop chain + counter | **stitch** | `segments[]` | the loudest single peak (even #5 explodes) |
| `aesthetic_showcase` | sensory (dopamine) | lift / tighten | `peak_at` | the apex pose / outfit in full light |
| `crowd_takeover` | social loop / FOMO | tighten / stitch | `segments[]` opt. | crowd wide OR a crying/screaming face |
| `climax_rewind` | classic open loop | hook_relocate | `peak_at` | the single most shocking instant OR a frozen jaw-drop apex |
| `pure_moment` | any (fallback) | lift | — | one strong continuous beat |

### 1. `vocal_showcase` — the talent proof
- **Psychology:** plant an acoustic question — *"can the voice really do this live?"* — and
  make them lean in to hear if the note lands. The note is the resolution.
- **t=0:** the artist mid-line, face/mouth visible, voice already sounding. Never an
  instrumental intro — the first *sound* should be the voice.
- **Find:** the band drops out or thins (a-cappella feel), a visible breath, then a
  sustained / belted / high note or a hard clean run; a "sounds exactly like the record"
  moment. Rap: the fastest or hardest bars, delivered clean.
- **Build:** `peak_at` = the held/belted note. `start` = the first vocal word; `end` just
  after the note resolves + the crowd reaction. Trim a dull bar before the money line
  (`tighten`) if needed.
- **Hook voice — awe at the craft:** "they still think pop stars don't sing live… then
  explain THIS 🤫" · "no autotune, no backing track — just her" · "the way her voice
  cracks the whole room open here".

### 2. `ranked_countdown` — the Top-N
- **Psychology:** each rank closes a micro-loop and instantly opens the next; the running
  number is a gamified counter; the meta-loop *"what's #1?"* holds them to the end.
- **t=0:** the FIRST shown segment must already explode (a drop / pyro). Even the lowest
  rank is a scroll-stopper — never open on the weakest clip.
- **Find:** the N (default **5**) biggest **distinct** spectacle peaks of the whole show —
  drops, pyro bursts, key-changes, the most-famous song's chorus, the hardest transitions.
  Five different moments, not five angles of one.
- **Build:** **stitch** → fill `segments[]`, each **3–4 s**, ordered for the countdown,
  each with a `label` ("5. LEVITATING DROP", "4. …"). `construction_type: "stitch"`.
- **Hook voice — declarative ranking:** "ranking the 5 most insane drops of this tour
  (No. 2 felt like an earthquake)" · "her transitions, ranked from good to illegal".

### 3. `aesthetic_showcase` — choreo / outfit / staging
- **Psychology:** no riddle — pure visual/kinetic perfection hypnotizes. Sync and beauty
  hold the eye by themselves (dopamine).
- **t=0:** open ON the most striking instant already in motion — the apex pose, the outfit
  hitting full light, the synchronized hit. Gorgeous at frame 1.
- **Find:** tight choreo sync, an outfit/staging reveal, prop work (chair / stairs / lift),
  a striking formation.
- **Build:** lift / tighten. `peak_at` = the single hardest move (the editor speed-ramps
  into it).
- **Hook voice — aesthetic awe:** "this one transition lives rent-free in my head 🔥" ·
  "the costume team deserved a raise for this".

### 4. `crowd_takeover` — the room loses it
- **Psychology:** seeing tens of thousands lose control fires mirror neurons + FOMO; the
  loop is *"how loud / how huge does it get?"*
- **t=0:** an already-loud social image — the massive crowd wide (scale shock) OR a crying
  / screaming front-row face (emotional shock). Not the artist talking quietly.
- **Find:** the artist holds the mic out and the venue sings the hook alone; a phone-light
  sea; front-row tears/screams. Best when the film already intercuts artist↔crowd.
- **Build:** `tighten` (one continuous intercut stretch) or `stitch` (segments of separate
  crowd shots in `segments[]`). The editor pushes the crowd audio forward.
- **Hook voice — collective FOMO:** "the whole stadium took the song over 🤯" · "80,000
  people singing it back to her".

### 5. `climax_rewind` — shock first, then why  *(the flagship open loop, two variants)*
- **Psychology:** show the **effect** (the shock / huge reaction, OR a stunning frozen
  apex) at t=0 and withhold the **cause** or the run-up; the brain *must* keep watching to
  learn why/how it happened. The rewind device makes the gap explicit and irresistible.
  Two variants of the same mechanic:
  - **Event variant:** an unexpected cause→effect (a fan gift caught, a mistake recovered,
    a surprise guest, an off-script moment) — the "cause" is a prior event.
  - **Pose variant:** a single jaw-dropping apex pose (a lift, a backbend, a prop apex, a
    held silhouette) — the "cause" is the choreo run-up that gets you into that pose.
- **t=0:** the single most shocking instant — the arena screaming, the artist's shocked
  face, the thing happening — OR the frozen jaw-drop apex itself, already visually loud.
- **Find:** for the event variant, a clear cause→effect that is **fully on camera** — you
  must see both the build-up AND the payoff. For the pose variant, a single jaw-dropping
  peak pose — a prop apex (top of the stairs, balanced on the chair), a lift apex, a held
  silhouette — where the run-up into it is on camera.
- **Build:** `hook_relocate`. `peak_at` = the shock instant or the apex frame (the
  teaser). `start` = where the build/run-up begins; `end` just after the shock resolves or
  the apex releases. **Integrity:** `peak_at` lies inside `[start, end]` and the
  chronological body arrives at exactly that shock/apex. (Editor: short teaser from
  `peak_at` → rewind FX → play `start→end` landing back on the shock/apex.)
- **Build length is not optional:** `peak_at` must sit **≥8s after `start`**, ideally
  12–20s+ when the footage shows real visible anticipation. A shorter gap kills the format
  — the viewer sees the reveal again seconds after already seeing it, so no tension had
  time to build; it reads as an instant echo, not a payoff. If the genuine lead-in in the
  footage is under 8s (a pure flash with no build), don't force `climax_rewind` onto it —
  score it `pure_moment` instead.
- **Hook voice — open-loop tease:** "this fan did something that genuinely shocked her 😭"
  · "the exact moment the show went completely off-script" · "people are losing it over
  what she does with this chair 😳" · "the hardest move of the entire tour".

### 6. `pure_moment` — the clean single beat  *(fallback only)*
- **Psychology:** one self-contained goosebump beat (whichever pillar it happens to hit).
- **Use only** when no engineered format above clearly fits. This is the FALLBACK, not the
  default — do not let everything collapse into it.
- **t=0:** still must open on a strong image (the second-0 law always applies).
- **Find:** a single continuous vocal+visual goosebump moment that needs no construction.
- **Build:** `lift`.
- **Hook voice — standard fan line:** "she gave us a whole concert film for free" · "that
  mic was ON".

---

## The primitives the formats are built from (niche-agnostic)

These are the raw signals you scan for; a format is the video you build once you spot them.
A strong clip usually combines **2–3**.

1. **Vocal money-moment** — belt, run, a-cappella stretch, "live = studio" reveal, held note.
2. **Choreo / spectacle peak** — dance break, formation, pyro, staging/outfit reveal, crowd-scale wide.
3. **Artist–fan parasocial moment** — addresses the crowd, signs/gifts, reacts to a sign, eye contact.
4. **Crowd communion** — the whole venue singing a line back, a phone-light sea.
5. **Status / discourse bait** — a moment that "proves" the artist's tier (range, growth, reign).
6. **Iconic / meme-able beat** — a facial expression, a quotable aside, an outfit moment.
7. **Surprise / unexpected** — guest, unreleased song, wardrobe moment, mistake recovered.

## Harvest every format — systematically, but never on a quota

There is **no target count and no upper limit.** A rich show yields many clips, a sparse
one fewer; some formats recur all night, others appear once or not at all. Both are
correct. What is NOT correct is neglecting a format you simply never looked for.

So do not chase numbers — run a **per-format sweep**. Go through the full runtime once
**per format**, asking only: *"how many real `<format>` moments does THIS video contain?"*
Take every instance that clears the floor (a real hook + genuine fit for that format + a
strong opening per the Opening Law).

- **Force nothing.** If a format genuinely isn't in the footage, it returns zero — that is
  the right answer, never a reason to invent a weak one.
- **Skip nothing.** Don't stop at the first two `vocal_showcase` moments if the show has
  eight; don't ignore `ranked_countdown` or `climax_rewind` just because `pure_moment` is
  easier to label.
- **Let it be lopsided.** "Everything the footage truly supports" is the goal, even if
  that's nine of one format and zero of another.

Two habits that keep the sweep honest:
1. Before you settle on `pure_moment`, check whether the moment is actually a stronger
   build of the same footage — a `vocal_showcase`, an `aesthetic_showcase`, the apex pose
   for a `climax_rewind`, or one segment of a `ranked_countdown`. `pure_moment` is the
   fallback, used only when nothing richer fits.
2. Before finalising, confirm you actually swept all six formats end to end. The classic
   failure is a list of 30 `pure_moment`s because the richer formats were never hunted.

## Title overlay = the fan reaction

Name the feeling a fan would post in the comments, with the artist/song as the anchor.
Tension/awe in the overlay, resolution in the beat. Use the artist's name freely — the
borrowed audience is structural here. Match the hook voice to the format (above).

## Score weighting

- Dominant: **audio_impact** (the vocal/musical peak) + **visual_spectacle** (the visible
  beat) — weighted jointly. The strength of the **t=0 frame** is part of the score: a
  weak first frame caps it.
- Support: **parasocial_warmth** and **discourse strength** where relevant.
- `visual_hook` (the t=0 image) is **required**; `verbal_hook` optional.
- Goosebump potential > polish: an authentic raw fancam peak beats a clean but flat take.

## hook_type enum (the dominant primitive — separate from `format`)

`vocal_flex` | `spectacle_peak` | `parasocial_moment` | `crowd_communion` |
`status_take` | `iconic_meme` | `surprise`

## Examples — CALIBRATION ONLY (tagged by format)

These really performed; they are **instances of the formats/primitives**, not a whitelist.
The same lens applies unchanged to a rap set or a K-pop fancam.

- "this part of the concert is a cinematic masterpiece 😭❤️" (vocals on Love Again) →
  `vocal_showcase` (372k).
- "Definitely a core memory ☀️" (chatting with the crowd) → `pure_moment` /
  parasocial (151k).
- "She's been THAT GIRLLL" / "That mic was ON" (choreo + live vocal) → `vocal_showcase`
  with a status hook (111k).
- "He asked her to sign his arm for a tattoo 🥹❤️" → `climax_rewind` candidate if the
  reaction is the shock, else `pure_moment` (110k).

Hard-coding "concert" or "belted note" would break the lens for a rap set with no singing.
The primitive and the format port; the example only calibrates.
