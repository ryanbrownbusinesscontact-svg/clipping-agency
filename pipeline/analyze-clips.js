#!/usr/bin/env node
/*
 * SCHRITT 3 — CLIP-ANALYSE (Gemini)
 * -----------------------------------------------------------------------
 * Baut den 3-Schichten-Prompt, schickt das Video an Gemini, parst die
 * JSON-Antwort, ergaenzt deterministische Felder und legt PRO LONGFORM-VIDEO
 * einen eigenen Clip-Ordner an:
 *
 *   campaigns/<id>/clips/<label>/candidates.json   — Kandidaten DIESES Videos
 *   campaigns/<id>/clips/<label>/_raw.json         — Gemini-Rohantwort (Debug)
 *   campaigns/<id>/clips/<label>/unpublished/      — Ziel fuer editierte Reels (Station 4)
 *   campaigns/<id>/clips/<label>/published/        — nach Veroeffentlichung hierher schieben
 *   campaigns/<id>/clips/_all-ranked.json          — alle Videos, nach Score sortiert
 *
 * So sieht man auf einen Blick: dieser Ordner = dieses Quellvideo = diese Clips.
 *
 * Nutzung (flexibel — eins, mehrere oder alle):
 *   node pipeline/analyze-clips.js <campaign-id> --all                 — alle Videos
 *   node pipeline/analyze-clips.js <campaign-id> "Roundswamp"          — ein Video
 *   node pipeline/analyze-clips.js <campaign-id> "Roundswamp" "Katz"   — mehrere
 *
 * Gemini bekommt die YouTube-URL direkt — kein Download noetig fuer die Analyse.
 * Erfordert GEMINI_API_KEY (Umgebung oder .env im Projekt-Root).
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Paths ─────────────────────────────────────────────────────────────────
const ROOT   = path.join(__dirname, '..');
const SKILLS = path.join('C:\\Users\\priva\\.claude\\skills\\clip-analysis\\references');

// ── Load .env (optional) ──────────────────────────────────────────────────
try {
  const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  for (const line of env.split('\n')) {
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (k && !process.env[k]) process.env[k] = v;
  }
} catch { /* .env optional */ }

// ── Args ──────────────────────────────────────────────────────────────────
const campaignId   = process.argv[2];
const rawTargets   = process.argv.slice(3);
const forceYouTube = rawTargets.includes('--youtube') || rawTargets.includes('-y');
const targets      = rawTargets.filter(a => a !== '--youtube' && a !== '-y');
if (!campaignId) {
  console.error('Usage: node analyze-clips.js <campaign-id> [--youtube] [--all | "<video-label>" ...]');
  process.exit(1);
}

// ── API key check ─────────────────────────────────────────────────────────
const API_KEY        = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY not set. Add it to .env or your environment.');
  console.error('   Get one free at: https://aistudio.google.com/apikey');
  process.exit(1);
}
if (!OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY fehlt — Timestamps kommen von Gemini (weniger genau).');
}

// ── Load campaign ─────────────────────────────────────────────────────────
const campaignPath = path.join(ROOT, 'campaigns', campaignId, 'campaign.json');
if (!fs.existsSync(campaignPath)) {
  console.error(`❌ Campaign not found: ${campaignPath}`);
  process.exit(1);
}
const campaign = JSON.parse(fs.readFileSync(campaignPath, 'utf8'));
const isMusic  = campaign.category === 'music';   // music flips several spoken/visual defaults
const MIN_DUR  = isMusic ? 10 : 15;               // music peaks (a belt/drop) run shorter than a spoken point

// ── Videos in content_library ──────────────────────────────────────────────
const allVideos = [
  ...(campaign.content_library.official_youtube    || []),
  ...(campaign.content_library.third_party_youtube || []),
];
const isYouTube = url => /youtube\.com|youtu\.be/i.test(url || '');
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'video';

// Auswahl: leer / --all / -a => alle YouTube-Videos; sonst die genannten Labels
const wantAll = targets.length === 0 || targets.includes('--all') || targets.includes('-a');
let queue;
if (wantAll) {
  queue = allVideos.filter(v => isYouTube(v.url));
  const skipped = allVideos.filter(v => !isYouTube(v.url));
  if (!queue.length) { console.error('❌ Keine analysierbaren YouTube-Videos in content_library.'); process.exit(1); }
  if (skipped.length) console.warn(`⚠️  ${skipped.length} Nicht-YouTube-Quelle(n) uebersprungen (Analyse via URL nur fuer YouTube): ${skipped.map(v => v.label).join(', ')}`);
} else {
  queue = [];
  for (const label of targets) {
    const v = allVideos.find(x => x.label === label);
    if (!v) { console.error(`❌ Video "${label}" not found. Available: ${allVideos.map(x => x.label).join(', ')}`); process.exit(1); }
    if (!isYouTube(v.url)) { console.error(`❌ "${label}" ist keine YouTube-URL — Analyse via URL aktuell nur fuer YouTube.`); process.exit(1); }
    queue.push(v);
  }
}

// ── Load skill reference files ──────────────────────────────────────────────
function readRef(filename) {
  const p = path.join(SKILLS, filename);
  if (!fs.existsSync(p)) throw new Error(`Reference file missing: ${p}`);
  return fs.readFileSync(p, 'utf8');
}
const psychology = readRef('clip-psychology.md');
const method     = readRef('extraction-method.md');
const lens       = readRef(`lens-${campaign.category}.md`);

// ── Winning examples (optional) ────────────────────────────────────────────
let examples = 'none provided';
const exPath = path.join(ROOT, 'campaigns', campaignId, 'winning-examples.md');
if (fs.existsSync(exPath)) examples = fs.readFileSync(exPath, 'utf8');

// ── Campaign context ────────────────────────────────────────────────────────
const campaignContext = `${campaign.client} — ${campaign.title}`;

// ── Duration lookup from footage.json ──────────────────────────────────────
function getFootageDuration(videoLabel) {
  const manifestPath = path.join(ROOT, 'campaigns', campaignId, 'raw-footage', 'footage.json');
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const entry = (manifest.sources || []).find(s => s.label === videoLabel);
    return entry?.duration_sec || null;
  } catch { return null; }
}

// ── Candidate target — 3–5 clips per 10 minutes ──────────────────────────────
function buildCandidateTarget(durationSec) {
  if (durationSec && durationSec > 0) {
    const min = Math.round(durationSec / 60);
    const lo  = Math.max(5,  Math.round(min / 10 * 3));
    const hi  = Math.max(10, Math.round(min / 10 * 5));
    return `Target: 3–5 candidates per 10 minutes of runtime.\n` +
           `This video is ~${min} minutes → aim for ${lo}–${hi} candidates.\n` +
           `Cover the full runtime evenly — not just the first half.`;
  }
  // Duration unknown: let Gemini measure the video and apply the formula itself
  return `Target: 3–5 candidates per 10 minutes of runtime.\n` +
         `Measure the video length yourself and apply this formula to determine your target count.\n` +
         `Cover the full runtime evenly — not just the first half.`;
}

// ── Assemble prompt (per-video, dynamic candidate target + optional transcript) ─
function buildPrompt(durationSec, transcriptText, segmentInfo) {
  const durationHMS = durationSec ? (() => {
    const h = Math.floor(durationSec / 3600);
    const m = Math.floor((durationSec % 3600) / 60);
    const s = Math.floor(durationSec % 60);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  })() : null;

  // ── Category-conditional OUTPUT-CONTRACT pieces — music flips spoken/visual defaults ──
  const verbalHookField = isMusic
    ? `verbal_hook            (opening spoken line IF any speech; null for wordless performance)`
    : `verbal_hook            (opening spoken line; for hook_relocate: the relocated line)`;
  const firstPersonRule = isMusic
    ? `- hook_title is written in FAN / COMMENT voice (stan voice). Collective first person
  ("we", "us", "our") and direct address to the artist ("you") ARE allowed and natural —
  the voice is the audience. NEVER the ARTIST's own first person (no "I gave you a show").
  GOOD: "she gave us a whole concert film for free" / "the woman that you are" / "that mic was ON"`
    : `- hook_title must NEVER use first-person pronouns (I, me, my, mine, we, our, us).
  This content is posted by a clipping page, not the original speaker.
  Rewrite to third-person or neutral/impersonal form.
  BAD:  "I Haven't Been Sick In 7 Years"
  GOOD: "She Hasn't Been Sick In 7 Years" / "How To Not Get Sick For 7 Years" / "7 Years Without Getting Sick"`;
  const verbalHookRule = isMusic
    ? `- verbal_hook is OPTIONAL — the exact opening spoken words IF the clip contains speech,
  else null. Pure performance clips are wordless and valid.`
    : `- verbal_hook MUST be the exact opening spoken words of the clip at timestamp "start".
  ${transcriptText ? `Copy verbatim from the transcript — this is how "start" is verified.` : `This phrase is your timestamp anchor — locate it precisely in the audio.`}`;
  const boundaryRule = isMusic
    ? `- "start"/"end" align to MUSICAL structure, not sentences: enter 1–2 beats before the
  peak (belt / drop / key change / dance break / fan moment) and end shortly after it
  resolves. A tight window around the single peak beats a long loose one.`
    : `- "start" begins on a complete thought (no leading filler/conjunction/previous-line
  fragment); "end" lands on the first sentence-final boundary after the payoff — never
  mid-sentence, never a meandering tail. A tight clean window beats a long loose one.`;
  const locateRule = isMusic
    ? `2. Locate each moment by its musical/visual beat (the peak you are clipping), not by counting frames.`
    : `2. Locate every verbal_hook by its speech content in the audio, not by counting frames.`;

  // ── Segment-Context-Block (zwei Varianten) ────────────────────────────────
  let segmentBlock = '';
  if (segmentInfo) {
    if (segmentInfo.burnedTimestamps) {
      // ── Burned-Timestamp-Variante: Gemini LIEST aus Pixel, generiert nicht ──
      segmentBlock = `# TIMESTAMP INSTRUCTION — READ THIS FIRST (CRITICAL)
You are analyzing one ${Math.round((segmentInfo.end - segmentInfo.start) / 60)}-minute segment of a ${Math.round(segmentInfo.total / 60)}-minute concert film.
This segment covers ${toHMS(segmentInfo.start)}–${toHMS(segmentInfo.end)} of the full film.

⚠️  DO NOT ESTIMATE OR CALCULATE TIMESTAMPS — ONLY READ THEM.
Every frame of this video has the EXACT absolute film timestamp (HH:MM:SS) burned into the TOP-LEFT CORNER.
The corner timestamp shows the true position in the full concert film, already offset-corrected.

For your JSON output:
- "start" = the HH:MM:SS you see in the top-left corner at the moment the clip begins
- "end"   = the HH:MM:SS you see in the top-left corner at the moment the clip ends
Copy the value from the corner pixel-for-pixel. Never invent a timestamp yourself.

Only include candidates whose moments fall within ${toHMS(segmentInfo.start)}–${toHMS(segmentInfo.end)}.

`;
    } else {
      // ── YouTube-Variante: MM:SS beobachten + Offset addieren ──────────────
      const exampleAbsolute = toHMS(segmentInfo.start + 5 * 60 + 30);
      segmentBlock = `# SEGMENT CONTEXT — READ THIS FIRST (CRITICAL)
You are analyzing one time window of a longer concert film split into multiple passes.
This pass covers ${toHMS(segmentInfo.start)}–${toHMS(segmentInfo.end)} of a ${Math.round(segmentInfo.total/60)}-minute film.
The footage you see BEGINS at ${toHMS(segmentInfo.start)} absolute film time.

Timestamp format: When referring to specific moments in this segment, use the MM:SS format
(e.g., 01:15 for 1 minute and 15 seconds into this segment).
This segment runs from 00:00 to ${toMMSS(segmentInfo.end - segmentInfo.start)} in MM:SS.

⚠️  OUTPUT TIMESTAMP RULE — NON-NEGOTIABLE:
All "start" and "end" values in your JSON output MUST be absolute HH:MM:SS (relative to the FULL FILM start).
To convert: take the MM:SS you observe and add the segment offset.
  Segment offset: ${toHMS(segmentInfo.start)}
  Formula:        observed MM:SS  +  offset  =  output HH:MM:SS
  Example:        05:30 observed  +  ${toHMS(segmentInfo.start)}  =  ${exampleAbsolute} in output

Only include candidates whose moments fall within this segment (${toHMS(segmentInfo.start)}–${toHMS(segmentInfo.end)}).

`;
    }
  }

  return `${segmentBlock}# ROLE
You are an expert short-form video editor for TikTok / Reels / YouTube Shorts.
You find the moments in long footage that can go viral as ${MIN_DUR}–90s clips.
Be generous in selection but never include a moment with no real hook.

# TASK
Watch the attached video and find every moment that can become a viral short. For each,
define the tightest standalone window, the single strongest hook, and the score.
${buildCandidateTarget(durationSec)}
When in doubt, include.

Campaign context: ${campaignContext}

# TIMESTAMPS${transcriptText ? ` — USE TRANSCRIPT BELOW (accurate to the second)` : ` ACCURACY`}
${transcriptText ? `A Whisper-generated transcript with accurate timestamps is appended at the end of this prompt.
ALL timestamps in your output MUST be copied from the transcript — do NOT estimate from the video.
- "start" = the [HH:MM:SS] line in the transcript where the verbal_hook begins
- "end"   = the [HH:MM:SS] line where the clip content naturally ends
- verbal_hook MUST be an exact quote from the transcript text

CLEAN BOUNDARIES (critical for retention — a clip that opens mid-thought or ends
mid-sentence loses the viewer):
- "start" MUST be the first word of a COMPLETE sentence/thought — the strong opening
  word that hooks. NEVER start on a filler word, a dangling conjunction, or the
  trailing fragment of the PREVIOUS speaker's / previous sentence's line. If the
  natural hook is preceded by such a fragment in the transcript, set "start" to the
  hook's own first word, not the fragment.
- "end" MUST land on a clean sentence boundary (a transcript line ending in . ? or !),
  SHORTLY after the payoff completes — close within ~1–2s of the payoff landing.
  Do NOT pad the window with meandering tail, half-started next thoughts, or a
  sentence the speaker cuts off. When the payoff has landed, find the next
  sentence-final punctuation and end there. Never end mid-sentence.

The video is provided so you can judge visual quality, speaker energy, and pacing —
but for timestamps you always look them up in the transcript.` : `Timestamps drift in long videos. You MUST verify each one:
1. VIDEO LENGTH: ${durationSec ? `exactly ${durationSec}s (${durationHMS}) — use as ruler` : `measure first, use as ruler`}
${locateRule}
3. Re-scan ±3 minutes around your estimate. Report HH:MM:SS accurate to ±5s.`}

# HOW VIRAL CLIPS WORK
${psychology}

# HOW TO EXTRACT THEM
${method}

# WHAT TO HUNT FOR
${lens}

# CAMPAIGN INSPIRATION (inspiration only — not a filter)
${examples}

# CAMPAIGN RULES (for philosophy_fit)
must_do:
${campaign.must_do.map(r => `- ${r}`).join('\n')}

must_avoid:
${campaign.must_avoid.map(r => `- ${r}`).join('\n')}

# OUTPUT CONTRACT (strict)
Return ONLY a JSON array sorted descending by virality_score. No prose, no markdown fences.
Each object has EXACTLY these keys:

  start, end             (HH:MM:SS, relative to video start)
  ${verbalHookField}
  hook_type              (one value from the lens enum)
  hook_title             (white-box overlay text — must pass the 3 hook-craft tests)
  why_viral              (1–2 sentences: which hook move + why a cold viewer gets it)
  payoff                 (the payoff / punchline)
  body_arc               (is there a turn? where?)
  construction_type      (lift | tighten | hook_relocate | stitch; default lift)
  internal_trims         (array of {from, to} HH:MM:SS removed inside window; else [])
  hook_relocate_from     (HH:MM:SS of relocated verbal_hook source; else null)
  visual_hook            (visible beat at second 0 — REQUIRED)
  standalone             (true/false)
  philosophy_fit         (0–10 vs. must_do/must_avoid — separate axis from virality_score)
  virality_score         (0–10)
  watchtime_risk         (low | medium | high)

Rules:
- Every candidate MUST hit ≥1 hook primitive. No hook → do not include.
- One hook per clip, not variants.
- hook_title must pass cold-viewer / tension / concrete tests. Rewrite before finalising.
- hook_title MUST be written in English only. Even if the artist or crowd spoke in another
  language during the clip, the hook_title must be English. Paraphrase or translate — never
  copy a non-English phrase verbatim into hook_title.
${firstPersonRule}
${verbalHookRule}
${boundaryRule}
- philosophy_fit: any must_avoid risk → ≤3 AND named in why_viral. Never default to 10.
- Target window ${MIN_DUR}–90s. Unknown values → null.
- Do NOT output id, source_label, source_url, duration_s, lens.
${transcriptText ? `
# TRANSCRIPT (Whisper — accurate timestamps)
${transcriptText}` : ''}`;}  // end buildPrompt

// ── Helpers ──────────────────────────────────────────────────────────────────
// Akzeptiert HH:MM:SS und MM:SS (Gemini gibt manchmal beides zurück)
const toSeconds = ts => {
  if (!ts || typeof ts !== 'string') return NaN;
  const parts = ts.split(':').map(Number);
  if (parts.some(isNaN)) return NaN;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return NaN;
};
// Normalisiert immer auf HH:MM:SS (für edit-clips.js Kompatibilität)
const toHMS = sec => {
  if (!Number.isFinite(sec) || sec < 0) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};
// MM:SS — Minuten:Sekunden (für Segment-intern-Referenz im Prompt)
const toMMSS = sec => {
  if (!Number.isFinite(sec) || sec < 0) return null;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};
// Wie toHMS, aber sub-Sekunden-genau. Fuer End-Boundaries zwingend: ganze Sekunden
// wuerden je nach Lage entweder das letzte (Payoff-)Wort kappen oder das erste Wort
// des Folgesatzes hereinholen — Satzpausen sind oft <1s.
const toHMSp = sec => {
  if (!Number.isFinite(sec) || sec < 0) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = (sec % 60).toFixed(3).padStart(6, '0');
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${s}`;
};
// ── Whisper: Audio extrahieren + transkribieren ──────────────────────────────
async function getOrCreateTranscript(name) {
  const transcriptPath = path.join(ROOT, 'campaigns', campaignId, 'raw-footage', `${name}-transcript.json`);

  // Gecachtes Transkript zurückgeben
  if (fs.existsSync(transcriptPath)) {
    const t = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
    console.log(`   Whisper:   gecacht (${(t.segments||[]).length} Segmente)`);
    return t;
  }

  if (!OPENAI_API_KEY) return null;

  const localMp4 = path.join(ROOT, 'campaigns', campaignId, 'raw-footage', `${name}.mp4`);
  if (!fs.existsSync(localMp4)) { console.warn('   ⚠️  Kein lokales MP4 für Transkription'); return null; }

  // Audio komprimiert extrahieren (Ziel: <25 MB für Whisper API)
  const audioPath = path.join(ROOT, 'campaigns', campaignId, 'raw-footage', `${name}-audio.mp3`);
  console.log(`   Whisper:   Audio extrahieren...`);
  const { execSync } = require('child_process');
  execSync(`ffmpeg -i "${localMp4}" -ac 1 -ar 16000 -vn -b:a 32k -y "${audioPath}"`, { stdio: 'pipe' });
  const audioMB = (fs.statSync(audioPath).size / 1e6).toFixed(1);
  console.log(`   Whisper:   Transkribiere (${audioMB} MB)...`);

  // Whisper API aufrufen
  const formData = new FormData();
  formData.append('file', new Blob([fs.readFileSync(audioPath)], { type: 'audio/mpeg' }), 'audio.mp3');
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  // Segment- UND Wort-Level: Segmente fuer Gemini-Prompt + Snapping,
  // Wort-Level (words[]) fuer driftfreie Karaoke-Captions im Edit-Schritt.
  formData.append('timestamp_granularities[]', 'segment');
  formData.append('timestamp_granularities[]', 'word');

  const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });
  if (!resp.ok) { const e = await resp.text(); throw new Error(`Whisper API: ${resp.status} — ${e}`); }
  const result = await resp.json();

  fs.writeFileSync(transcriptPath, JSON.stringify(result, null, 2));
  try { fs.unlinkSync(audioPath); } catch { /* temp file, nicht kritisch */ }

  console.log(`   Whisper:   OK → ${(result.segments||[]).length} Segmente gespeichert`);
  return result;
}

// Transkript-Segmente als lesbaren Text für den Prompt formatieren
function formatTranscriptForPrompt(transcript) {
  if (!transcript?.segments?.length) return null;
  return transcript.segments.map(seg => `[${toHMS(Math.floor(seg.start))}] ${seg.text.trim()}`).join('\n');
}

// End-Boundary DETERMINISTISCH auf ein Satzende snappen.
// Gemini liefert nur eine grobe Endzeit (LLMs koennen Timestamps nicht exakt rechnen)
// und schiesst regelmaessig mitten in den Satz. Hier landet das Ende garantiert auf
// einem Segment, dessen Text auf . ? ! endet — nahe an Geminis Ziel, aber nie mitten
// im Satz. Der eigentliche Schnitt wird in die Stille NACH dem Satz gelegt (sub-Sekunde),
// damit weder das Payoff-Wort gekappt noch das erste Wort des Folgesatzes mitgenommen wird.
// Generalisiert auf jede kuenftige candidates.json.
const SENT_FINAL = /[.!?]['")\]]?\s*$/;
function snapEndToSentence(segments, targetEndSec, startSec) {
  const minEnd = startSec + 15;            // Mindest-Cliplaenge respektieren
  const finals = [];
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (Number.isFinite(s.end) && s.end > minEnd && SENT_FINAL.test((s.text || '').trim())) finals.push(i);
  }
  if (!finals.length) return targetEndSec;  // kein sauberer Boundary → unveraendert (sicher)

  const TOL_LATE = 4.0;    // bis 4s NACH Geminis Ziel: Payoff fertig sprechen lassen
  const TOL_EARLY = 2.5;   // bis 2.5s davor: Gemini hat ueberschossen
  let bestIdx = null, bestScore = Infinity;
  for (const i of finals) {
    const d = segments[i].end - targetEndSec;
    if (d > TOL_LATE || d < -TOL_EARLY) continue;
    const score = Math.abs(d) - (d >= 0 ? 0.4 : 0);  // leichte Praeferenz, nicht VOR dem Payoff zu schneiden
    if (score < bestScore) { bestScore = score; bestIdx = i; }
  }
  if (bestIdx == null) {                    // nichts im Toleranzfenster → naechstes Satzende >= Ziel
    bestIdx = finals.find(i => segments[i].end >= targetEndSec);
    if (bestIdx == null) bestIdx = finals[finals.length - 1];
  }
  const segEnd    = segments[bestIdx].end;
  const nextStart = (bestIdx + 1 < segments.length) ? segments[bestIdx + 1].start : segEnd + 0.4;
  const gap       = Math.max(0, nextStart - segEnd);
  // Schnitt in die Stille legen: knapp nach Satzende, sicher vor dem Folgesatz.
  return segEnd + Math.min(0.30, gap > 0.10 ? gap - 0.05 : gap / 2);
}

// Timestamps von Gemini-Schätzung auf Whisper-Transkript snappen
// Strategie: verbal_hook-Wörter gegen Segment-Texte matchen → genauesten Treffer nehmen
function snapTimestamps(candidate, segments) {
  if (!segments?.length) return { ...candidate, _ts_source: 'gemini' };

  const hookWords = (candidate.verbal_hook || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3);
  if (!hookWords.length) return { ...candidate, _ts_source: 'gemini' };

  let bestSeg = null, bestScore = 0;
  // Auch Fenster aus je 2 aufeinanderfolgenden Segmenten prüfen (hook kann Segment-Grenze überspannen)
  const windows = [
    ...segments.map((s, i) => ({ text: s.text, start: s.start })),
    ...segments.slice(0, -1).map((s, i) => ({ text: s.text + ' ' + segments[i+1].text, start: s.start })),
  ];
  for (const win of windows) {
    const winText = win.text.toLowerCase().replace(/[^\w\s]/g, '');
    const matches = hookWords.filter(w => winText.includes(w)).length;
    const score = matches / hookWords.length;
    if (score > bestScore) { bestScore = score; bestSeg = win; }
  }

  if (bestSeg && bestScore >= 0.4) {
    const geminiDurSec  = toSeconds(candidate.end) - toSeconds(candidate.start);
    const accurateStart = Math.floor(bestSeg.start);
    // Geminis grobes Ende, am exakten Start verankert → dann auf das nächste Satzende snappen.
    const targetEnd     = accurateStart + Math.max(geminiDurSec, 15);
    const accurateEnd   = snapEndToSentence(segments, targetEnd, accurateStart);
    return {
      ...candidate,
      start: toHMS(accurateStart),
      end:   toHMSp(accurateEnd),     // sub-Sekunde: nie mitten im Satz, kein Folge-Fragment
      _ts_source:     'whisper',
      _ts_confidence: Math.round(bestScore * 100),
    };
  }

  // Kein guter Match → Gemini-Timestamp behalten, aber markieren
  return { ...candidate, _ts_source: 'gemini', _ts_confidence: 0 };
}

const LENS_ENUMS = {
  'visual-clip':  ['peak_reaction','spectacle','storytelling','personality','stakes','status_price','social_humor','borrowed_audience'],
  'spoken-clip':  ['contrarian','curiosity_gap','concrete_number','high_stakes','story_turn','qa_reveal','authority'],
  'music':        ['vocal_flex','spectacle_peak','parasocial_moment','crowd_communion','status_take','iconic_meme','surprise'],
};
const validHookTypes = LENS_ENUMS[campaign.category] || [];

// ── Analyse ein Video ────────────────────────────────────────────────────────
async function analyzeOne(ai, video) {
  const name   = slug(video.label);
  const outDir = path.join(ROOT, 'campaigns', campaignId, 'clips', name);
  // Video-Ordner inkl. Produktions-Zielordner anlegen (Station 4 fuellt unpublished/)
  fs.mkdirSync(path.join(outDir, 'unpublished'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'published'),   { recursive: true });

  // Dauer aus footage.json (für dynamisches Kandidaten-Ziel)
  const durationSec = getFootageDuration(video.label);
  const durationMin = durationSec ? Math.round(durationSec / 60) : null;

  // Whisper-Transkript holen (gecacht oder neu erstellen) — fuer Musik uebersprungen:
  // Konzert-Clips haben kaum/keine Sprache und werden auf den Beat geschnitten, nicht auf Saetze.
  const transcript     = isMusic ? null : await getOrCreateTranscript(name);
  const transcriptText = formatTranscriptForPrompt(transcript);
  if (transcriptText) {
    console.log(`   Timestamps: Whisper-Transkript (${transcript.segments.length} Segmente → exakt)`);
  } else if (isMusic) {
    console.log(`   Timestamps: Gemini (Musik-Lens — burned HH:MM:SS in Pixel, ${Math.round(SEGMENT_SECS/60)}-min-Segmente, kein Whisper)`);
  } else {
    console.log(`   Timestamps: Gemini-Schätzung (kein Transkript)`);
  }

  // rawSegments: wird entweder vom music-burned-path oder vom allgemeinen Loop gefüllt.
  // Muss VOR dem if-else stehen, weil der music-path direkt pushes.
  const rawSegments = [];

  // ── Video-Source: lokales MP4 über Files API (vollständig, zuverlässig)
  //    Fallback: YouTube-URL mit automatischer Segmentierung für lange Videos
  // 40-min-Segmente für alle Kategorien (2400s).
  // Music: burned timestamps = Accuracy hängt nicht von Segmentgröße ab.
  // 40min ≈ 620K Tokens (unter 1M-Limit), 3 Segmente + Rest für 2h-Konzert.
  const SEGMENT_SECS = 2400;
  const localMp4 = path.join(ROOT, 'campaigns', campaignId, 'raw-footage', `${name}.mp4`);
  let basePart;      // fileData ohne Segmentierung (lokales MP4 oder kurze YouTube-URL)
  let cleanUrl = null;
  let useSegments = false;

  if (isMusic && !forceYouTube && fs.existsSync(localMp4)) {
    // ── MUSIC + lokales MP4 → Burned-Timestamp-Segmente ──────────────────────
    // ffmpeg brennt absoluten HH:MM:SS in die Ecke jedes Frames.
    // Gemini liest Timestamps aus Pixeln → kein Halluzinieren möglich.
    // Segmente: 480p, 15fps, CRF 36 → ~15-30 MB pro 20min, Gemini Files API gecacht.
    const { execSync: execSyncLocal } = require('child_process');
    const segDir = path.join(ROOT, 'campaigns', campaignId, 'raw-footage', 'gemini-segments');
    fs.mkdirSync(segDir, { recursive: true });
    const segManifestPath = path.join(segDir, `${name}-manifest.json`);
    let segManifest = {};
    try { segManifest = JSON.parse(fs.readFileSync(segManifestPath, 'utf8')); } catch {}

    const segCount = Math.ceil(durationSec / SEGMENT_SECS);
    console.log(`\n🎬 Analyzing: ${video.label} (burned-timestamp Segmente, ${segCount} × ${Math.round(SEGMENT_SECS/60)}min)`);
    console.log(`   Methode:   HH:MM:SS in Pixel gebrannt → Gemini liest, halluziniert nicht`);
    console.log(`   Qualität:  720p · 2fps · CRF 36 (~20–40 MB/Segment, Gemini sampelt intern ~1fps)`);

    for (let i = 0; i < segCount; i++) {
      const segStart = i * SEGMENT_SECS;
      const segEnd   = Math.min(segStart + SEGMENT_SECS, durationSec);
      const segKey   = `${name}-seg${String(i).padStart(2, '0')}`;
      const segPath  = path.join(segDir, `${segKey}.mp4`);
      const segInfo  = { start: segStart, end: segEnd, total: durationSec, burnedTimestamps: true };

      console.log(`\n   Segment ${i + 1}/${segCount}: ${toHMS(segStart)}–${toHMS(segEnd)}`);

      // ── Cache-Check (Gemini Files API, < 47h) ──────────────────────────────
      let segFileUri = null;
      if (segManifest[segKey]?.uri && segManifest[segKey]?.uploadedAt) {
        const ageH = (Date.now() - new Date(segManifest[segKey].uploadedAt).getTime()) / 3600000;
        if (ageH < 47) {
          segFileUri = segManifest[segKey].uri;
          console.log(`      Files API: gecacht ✓`);
        }
      }

      if (!segFileUri) {
        // ── Segment extrahieren (480p, 15fps, HH:MM:SS in Ecke) ────────────
        if (!fs.existsSync(segPath)) {
          console.log(`      Extrahiere…`);
          const basetime  = Math.round(segStart * 1000000); // Mikrosekunden für drawtext
          const duration  = segEnd - segStart;
          // drawtext: \: ist Escape für Doppelpunkt im ffmpeg-Filterstring
          // fontfile: Arial explizit (Windows-Fontconfig nicht verfügbar)
          // 720p (1280×720) — bessere Gesichts-/Crowd-Erkennung, Timestamp gut lesbar
          const vf = `setpts=PTS-STARTPTS,scale=1280:-2,drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='%{pts\\:hms}':fontsize=48:fontcolor=white:box=1:boxcolor=black@0.85:boxborderw=6:x=15:y=15:basetime=${basetime}`;
          // 2fps: Gemini sampelt intern ~1fps → kein Qualitätsverlust für Analyse.
          // 480p + Arial-Timestamp-Overlay → lesbar, ~8-15 MB pro 30min.
          execSyncLocal(
            `ffmpeg -ss ${segStart} -t ${duration} -i "${localMp4}" -vf "${vf}" -r 2 -c:v libx264 -crf 36 -preset veryfast -c:a aac -b:a 48k -y "${segPath}"`,
            { stdio: 'pipe' }
          );
        }
        const segMB = (fs.statSync(segPath).size / 1e6).toFixed(1);
        console.log(`      ${segMB} MB → Upload Gemini Files API…`);

        // ── Upload ──────────────────────────────────────────────────────────
        const uploadResult = await ai.files.upload({
          file: segPath,
          config: { mimeType: 'video/mp4', displayName: segKey },
        });
        let uploaded = uploadResult.file || uploadResult;
        while (uploaded.state === 'PROCESSING') {
          process.stdout.write('.');
          await new Promise(r => setTimeout(r, 4000));
          uploaded = await ai.files.get({ name: uploaded.name });
        }
        if (uploaded.state === 'FAILED') throw new Error(`Segment ${i + 1} Upload fehlgeschlagen.`);
        segFileUri = uploaded.uri;
        console.log(`\n      Upload OK`);

        // Cache + lokale Datei löschen (Gemini hat sie, lokal nicht nötig)
        segManifest[segKey] = { uri: segFileUri, uploadedAt: new Date().toISOString(), start: segStart, end: segEnd };
        fs.writeFileSync(segManifestPath, JSON.stringify(segManifest, null, 2));
        try { fs.unlinkSync(segPath); } catch {}
      }

      const fp  = { fileData: { fileUri: segFileUri, mimeType: 'video/mp4' } };
      const raw = await callGemini(fp, segInfo);
      rawSegments.push(raw);
    }
    fs.writeFileSync(path.join(outDir, '_raw.json'), JSON.stringify(rawSegments, null, 2));

  } else if (!isMusic && !forceYouTube && fs.existsSync(localMp4)) {
    // ── NON-MUSIC + lokales MP4 → Ganzes File über Files API ─────────────────
    console.log(`\n🎬 Analyzing: ${video.label} (lokales MP4 → Files API)`);
    console.log(`   Datei:     ${path.relative(ROOT, localMp4)} (${(fs.statSync(localMp4).size / 1e6).toFixed(0)} MB)`);
    console.log(`   Dauer:     ${durationMin ? `~${durationMin} min` : 'wird von Gemini gemessen'}`);

    const manifestPath = path.join(ROOT, 'campaigns', campaignId, 'raw-footage', 'footage.json');
    let cachedUri = null;
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const entry = (manifest.sources || []).find(s => s.label === video.label);
        if (entry?.gemini_file_uri && entry?.gemini_uploaded_at) {
          const ageHours = (Date.now() - new Date(entry.gemini_uploaded_at).getTime()) / 3600000;
          if (ageHours < 47) cachedUri = entry.gemini_file_uri;
        }
      } catch { /* ignore */ }
    }

    if (cachedUri) {
      console.log(`   Files API: gecacht (${cachedUri.slice(-20)})`);
      basePart = { fileData: { fileUri: cachedUri, mimeType: 'video/mp4' } };
    } else {
      console.log(`   Files API: lade hoch...`);
      const uploadResult = await ai.files.upload({ file: localMp4, config: { mimeType: 'video/mp4', displayName: video.label } });
      let uploadedFile = uploadResult.file || uploadResult;
      while (uploadedFile.state === 'PROCESSING') {
        process.stdout.write('.');
        await new Promise(r => setTimeout(r, 4000));
        uploadedFile = await ai.files.get({ name: uploadedFile.name });
      }
      if (uploadedFile.state === 'FAILED') throw new Error('Gemini Files API: Verarbeitung fehlgeschlagen.');
      const fileUri = uploadedFile.uri;
      console.log(`\n   Files API: OK (${fileUri.slice(-20)})`);
      basePart = { fileData: { fileUri, mimeType: 'video/mp4' } };
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const entry = (manifest.sources || []).find(s => s.label === video.label);
        if (entry) { entry.gemini_file_uri = fileUri; entry.gemini_uploaded_at = new Date().toISOString(); }
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      } catch { /* nicht kritisch */ }
    }
  } else {
    // Kein lokales File — YouTube-URL; lange Videos in 30-min-Segmente aufteilen
    const ytMatch = video.url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
    cleanUrl = ytMatch ? `https://www.youtube.com/watch?v=${ytMatch[1]}` : video.url;
    useSegments = !!(durationSec && durationSec > SEGMENT_SECS);
    const segCount = useSegments ? Math.ceil(durationSec / SEGMENT_SECS) : 1;
    if (useSegments) {
      console.log(`\n🎬 Analyzing: ${video.label} (YouTube-URL, ${segCount} Segmente à ~${Math.round(SEGMENT_SECS/60)}min)`);
    } else {
      console.log(`\n🎬 Analyzing: ${video.label} (YouTube-URL, kein lokales MP4)`);
    }
    console.log(`   URL:       ${cleanUrl}`);
    console.log(`   Dauer:     ${durationMin ? `~${durationMin} min` : 'wird von Gemini gemessen'}`);
    basePart = { fileData: { fileUri: cleanUrl } };
  }

  console.log(`📋 Campaign:  ${campaignId} (${campaign.category})`);
  console.log(`🤖 Model:     gemini-3.5-flash`);

  // ── Gemini-Call-Helper (ein Segment oder ganzes Video) ─────────────────────
  async function callGemini(fp, segInfo) {
    const p = buildPrompt(durationSec, transcriptText, segInfo);
    const resp = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [fp, { text: p }] }],
      config: { temperature: 0.4, maxOutputTokens: 32768, thinkingConfig: { thinkingBudget: 8192 } },
    });
    let r = (typeof resp.text === 'function' ? resp.text() : resp.text || '').trim();
    return r.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  }

  // ── Segmentierte oder einmalige Analyse (nur wenn rawSegments noch leer) ──
  // Music-local-path füllt rawSegments bereits direkt oben — dieser Block ist
  // nur für YouTube-URL-Pfad und Non-Music-Local-File-Pfad aktiv.
  if (!rawSegments.length && useSegments) {
    const segCount = Math.ceil(durationSec / SEGMENT_SECS);
    for (let i = 0; i < segCount; i++) {
      const segStart = i * SEGMENT_SECS;
      const segEnd   = Math.min(segStart + SEGMENT_SECS, durationSec);
      console.log(`   → Segment ${i + 1}/${segCount}: ${toHMS(segStart)}–${toHMS(segEnd)}`);
      const segPart = {
        fileData: { fileUri: cleanUrl },
        videoMetadata: { startOffset: { seconds: segStart }, endOffset: { seconds: segEnd } },
      };
      const raw = await callGemini(segPart, { start: segStart, end: segEnd, total: durationSec });
      rawSegments.push(raw);
    }
    fs.writeFileSync(path.join(outDir, '_raw.json'), JSON.stringify(rawSegments, null, 2));
  } else if (!rawSegments.length) {
    // Kurzes Video / kein Segmentieren nötig
    const raw = await callGemini(basePart, null);
    rawSegments.push(raw);
    fs.writeFileSync(path.join(outDir, '_raw.json'), raw);
  }
  // (rawSegments.length > 0 && !useSegments) → music-path hat bereits geschrieben

  // ── Alle Segmente parsen und zusammenführen ────────────────────────────────
  let candidates = [];
  for (let si = 0; si < rawSegments.length; si++) {
    try {
      const parsed = JSON.parse(rawSegments[si]);
      if (Array.isArray(parsed)) candidates.push(...parsed);
    } catch {
      console.warn(`⚠️  Segment ${si + 1} konnte nicht geparst werden — übersprungen.`);
    }
  }
  if (!candidates.length) {
    console.error(`❌ Keine gültigen Kandidaten aus Gemini für "${video.label}". Raw: clips/${name}/_raw.json`);
    return { label: video.label, count: 0, error: 'parse_failed' };
  }

  // ── Timestamps auf Whisper-Transkript snappen (falls verfügbar) ──────────
  if (transcript?.segments?.length) {
    candidates = candidates.map(c => snapTimestamps(c, transcript.segments));
    const snapped  = candidates.filter(c => c._ts_source === 'whisper').length;
    const fallback = candidates.filter(c => c._ts_source === 'gemini').length;
    if (snapped)  console.log(`   Snap:      ${snapped}/${candidates.length} Timestamps auf Whisper gesnapped`);
    if (fallback) console.warn(`   ⚠️  ${fallback} Kandidaten ohne Transkript-Match — Gemini-Timestamp behalten`);
  }

  // ── Validate + drop floor violations ─────────────────────────────────
  const valid = [];
  const dropped = [];
  for (const c of candidates) {
    if (!c.start || !c.end || !c.hook_title) { dropped.push(`${c.start}→${c.end} (missing start/end/hook_title)`); continue; }
    const startSec = toSeconds(c.start);
    const endSec   = toSeconds(c.end);
    if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) {
      dropped.push(`${c.start}→${c.end} (unparseable timestamp)`); continue;
    }
    const dur = endSec - startSec;
    if (dur < MIN_DUR) { dropped.push(`${c.start}→${c.end} (too short ${dur}s)`); continue; }
    if (validHookTypes.length && !validHookTypes.includes(c.hook_type)) {
      console.warn(`  ⚠️  Unknown hook_type "${c.hook_type}" — keeping but flagged.`);
    }
    // Timestamps normalisieren (edit-clips.js parst HH:MM:SS[.mmm]).
    // Start auf ganze Sekunde (kleiner Vorlauf schadet nicht), Ende sub-Sekunde
    // belassen — sonst wuerde das Re-Flooren das Satz-Snapping wieder zerstoeren.
    c.start = toHMS(startSec);
    c.end   = toHMSp(endSec);
    if (c.internal_trims) {
      c.internal_trims = c.internal_trims.map(t => ({
        from: toHMS(toSeconds(t.from)) || t.from,
        to:   toHMS(toSeconds(t.to))   || t.to,
      }));
    }
    valid.push(c);
  }
  if (dropped.length) {
    console.warn(`⚠️  Dropped ${dropped.length}: ${dropped.join('; ')}`);
  }

  // ── Add deterministic fields + per-video ids ──────────────────────────
  const finalized = valid
    .sort((a, b) => b.virality_score - a.virality_score)
    .map((c, i) => ({
      id: `${name}-${String(i + 1).padStart(2, '0')}`,
      ...c,
      source_label: video.label,
      source_url:   video.url,
      duration_s:   toSeconds(c.end) - toSeconds(c.start),
      lens:         campaign.category,
    }));

  fs.writeFileSync(path.join(outDir, 'candidates.json'), JSON.stringify(finalized, null, 2));

  console.log(`✅ ${finalized.length} candidates → clips/${name}/candidates.json`);
  finalized.slice(0, 3).forEach(c => {
    const flag = c.philosophy_fit <= 3 ? ' ⚠️ BRAND RISK' : '';
    console.log(`   [${c.virality_score}] ${c.start}→${c.end}  "${c.hook_title}"${flag}`);
  });

  return { label: video.label, count: finalized.length };
}

// ── _all-ranked.json aus allen Video-Ordnern neu bauen ───────────────────────
function rebuildAllRanked() {
  const cDir = path.join(ROOT, 'campaigns', campaignId, 'clips');
  if (!fs.existsSync(cDir)) return 0;
  const all = [];
  for (const entry of fs.readdirSync(cDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const f = path.join(cDir, entry.name, 'candidates.json');
    if (fs.existsSync(f)) { try { all.push(...JSON.parse(fs.readFileSync(f, 'utf8'))); } catch { /* ignore */ } }
  }
  all.sort((a, b) => b.virality_score - a.virality_score);
  fs.writeFileSync(path.join(cDir, '_all-ranked.json'), JSON.stringify(all, null, 2));
  return all.length;
}

// ── Run ──────────────────────────────────────────────────────────────────────
async function run() {
  const { GoogleGenAI } = require('@google/genai');
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const results = [];
  for (const video of queue) {
    try { results.push(await analyzeOne(ai, video)); }
    catch (e) { console.error(`❌ Error on "${video.label}":`, e.message || e); results.push({ label: video.label, count: 0, error: 'api_error' }); }
  }

  const total = rebuildAllRanked();
  console.log(`\n📊 Done. ${results.length} video(s) analyzed.`);
  results.forEach(r => console.log(`   ${r.error ? '❌' : '✅'} ${r.label}: ${r.count} candidates${r.error ? ` (${r.error})` : ''}`));
  console.log(`\n💾 Combined ranked view: campaigns/${campaignId}/clips/_all-ranked.json (${total} total)`);
  console.log(`Weiter: editieren -> node pipeline/edit-clips.js ${campaignId} "<video-label>"`);
}

run().catch(err => {
  console.error('❌ Error:', err.message || err);
  process.exit(1);
});
