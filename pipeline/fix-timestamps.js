#!/usr/bin/env node
/*
 * fix-timestamps.js  —  Whisper-basierte Timestamp-Korrektur für candidates.json
 * ─────────────────────────────────────────────────────────────────────────────
 * Liest vorhandene candidates.json, transkribiert die lokale Audio-Datei via
 * Whisper, und korrigiert Timestamps:
 *
 *   • verbal_hook vorhanden → Text-Match in Whisper-Segmenten (nächstes Vorkommen
 *     nahe dem Gemini-Schätzwert)
 *   • verbal_hook null      → Drift-Interpolation aus erfolgreichen Snaps
 *
 * Backup des Originals: clips/<label>/_candidates-gemini-ts.json
 *
 * Usage:
 *   node pipeline/fix-timestamps.js <campaign-id> "<video-label>"
 *
 * Flags:
 *   --retranscribe  Whisper-Transkript neu erstellen (überschreibt Cache)
 */

'use strict';

const fs     = require('fs');
const path   = require('path');
const { execSync } = require('child_process');
const OpenAI = require('openai');

// ── Paths ─────────────────────────────────────────────────────────────────────
const ROOT = path.join(__dirname, '..');

// ── Load .env ─────────────────────────────────────────────────────────────────
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

// ── Args ──────────────────────────────────────────────────────────────────────
const args          = process.argv.slice(2);
const retranscribe  = args.includes('--retranscribe');
const positional    = args.filter(a => !a.startsWith('--'));
const campaignId    = positional[0];
const videoLabel    = positional[1];

if (!campaignId || !videoLabel) {
  console.error('Usage: node fix-timestamps.js <campaign-id> "<video-label>" [--retranscribe]');
  process.exit(1);
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('❌  OPENAI_API_KEY nicht gesetzt.');
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'video';

const toSeconds = ts => {
  if (!ts || typeof ts !== 'string') return NaN;
  const parts = ts.split(':').map(Number);
  if (parts.some(isNaN)) return NaN;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return NaN;
};

const toHMS = sec => {
  if (!Number.isFinite(sec) || sec < 0) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

// ── Whisper-Transkription ─────────────────────────────────────────────────────
// Splitte Audio in 20-min-Chunks (≈ 3.4 MB), transkribiere einzeln,
// merge Segmente mit Offset-Timestamps.
const CHUNK_SECS = 1200; // 20 Minuten

async function getOrCreateTranscript(localMp4, transcriptPath) {
  if (!retranscribe && fs.existsSync(transcriptPath)) {
    const t = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
    console.log(`   Whisper: gecacht (${(t.segments || []).length} Segmente)`);
    return t;
  }

  const dir     = path.dirname(transcriptPath);
  const base    = path.basename(transcriptPath, '-transcript.json');
  const openai  = new OpenAI({ apiKey: OPENAI_API_KEY });

  // ── Audiodauer per ffprobe ──────────────────────────────────────────────
  let durationSec = 0;
  try {
    const probe = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${localMp4}"`,
      { stdio: 'pipe' }
    ).toString().trim();
    durationSec = parseFloat(probe);
  } catch { /* fallback: CHUNK_SECS will handle it */ }

  if (!durationSec) {
    // Fallback: probe the audio file if it already exists
    const audioTest = path.join(dir, `${base}-ts-audio.mp3`);
    if (fs.existsSync(audioTest)) {
      try {
        const probe = execSync(
          `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioTest}"`,
          { stdio: 'pipe' }
        ).toString().trim();
        durationSec = parseFloat(probe);
      } catch { durationSec = 7447; }
    } else {
      durationSec = 7447;
    }
  }

  const nChunks = Math.ceil(durationSec / CHUNK_SECS);
  console.log(`   Audio: ${Math.round(durationSec)}s → ${nChunks} Chunks à ${CHUNK_SECS/60}min`);

  const allSegments = [];

  for (let i = 0; i < nChunks; i++) {
    const chunkStart = i * CHUNK_SECS;
    const chunkEnd   = Math.min(chunkStart + CHUNK_SECS, durationSec);
    const chunkPath  = path.join(dir, `${base}-ts-chunk${i}.mp3`);

    // Chunk extrahieren (aus Original-MP4 direkt, spart Zwischenspeicher)
    console.log(`   Chunk ${i+1}/${nChunks}: ${Math.round(chunkStart)}s–${Math.round(chunkEnd)}s...`);
    execSync(
      `ffmpeg -ss ${chunkStart} -t ${chunkEnd - chunkStart} -i "${localMp4}" -ac 1 -ar 16000 -vn -b:a 24k -y "${chunkPath}"`,
      { stdio: 'pipe' }
    );

    const chunkMB = (fs.statSync(chunkPath).size / 1e6).toFixed(1);
    console.log(`      ${chunkMB} MB → Whisper...`);

    const resp = await openai.audio.transcriptions.create({
      file: fs.createReadStream(chunkPath),
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    // Segment-Timestamps um chunkStart verschieben
    const segs = (resp.segments || []).map(s => ({
      ...s,
      start: s.start + chunkStart,
      end:   s.end   + chunkStart,
    }));
    allSegments.push(...segs);
    console.log(`      OK — ${segs.length} Segmente`);

    // Chunk löschen
    try { fs.unlinkSync(chunkPath); } catch { /* nicht kritisch */ }

    // Kurze Pause zwischen Chunks (Rate-Limit)
    if (i < nChunks - 1) await new Promise(r => setTimeout(r, 2000));
  }

  const result = { segments: allSegments };
  fs.writeFileSync(transcriptPath, JSON.stringify(result, null, 2));
  console.log(`   Whisper gesamt: ${allSegments.length} Segmente gespeichert`);
  return result;
}

// ── Text-Matching ─────────────────────────────────────────────────────────────
// Findet das Whisper-Segment das am besten zum verbal_hook passt
// und am nächsten an Geminis Schätzung liegt (verhindert Verwechslung
// bei wiederholten Phrasen wie "Hello, Mexico!").
//
// MAX_DRIFT_SEC: Wenn der beste Match mehr als N Sekunden vom Gemini-Timestamp
// entfernt liegt, wird er abgelehnt (false positive durch Phrase die mehrfach
// im Konzert vorkommt). Gemini-Drift ist typisch <90s, selten >120s.
const MAX_DRIFT_SEC = 180;

function snapByText(candidate, segments, geminiStartSec) {
  const hookWords = (candidate.verbal_hook || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3);

  if (!hookWords.length) return { matched: false };

  // Einzel-Segmente + Paare aufeinanderfolgende Segmente (Hook kann Grenze überqueren)
  const windows = [
    ...segments.map(s => ({ text: s.text, start: s.start })),
    ...segments.slice(0, -1).map((s, i) => ({
      text: s.text + ' ' + segments[i + 1].text,
      start: s.start,
    })),
  ];

  // Nur Fenster innerhalb des Max-Drift-Fensters berücksichtigen
  const nearby = windows.filter(w => Math.abs(w.start - geminiStartSec) <= MAX_DRIFT_SEC);
  if (!nearby.length) return { matched: false };

  let bestScore = 0;
  let bestCandidates = [];
  for (const w of nearby) {
    const wText  = w.text.toLowerCase().replace(/[^\w\s]/g, '');
    const nMatch = hookWords.filter(word => wText.includes(word)).length;
    const score  = nMatch / hookWords.length;
    if (score > bestScore)       { bestScore = score; bestCandidates = [w]; }
    else if (score === bestScore && score > 0) bestCandidates.push(w);
  }

  if (bestScore < 0.35) return { matched: false };

  // Bei mehreren gleich guten Treffern: nächstes zum Gemini-Schätzwert
  const best = bestCandidates.reduce((a, b) =>
    Math.abs(a.start - geminiStartSec) <= Math.abs(b.start - geminiStartSec) ? a : b
  );

  // Max-Drift-Check: wenn Treffer außerhalb des Fensters → ablehnen
  if (Math.abs(best.start - geminiStartSec) > MAX_DRIFT_SEC) {
    return { matched: false };
  }

  return {
    matched: true,
    newStart: Math.floor(best.start),
    score: Math.round(bestScore * 100),
  };
}

// ── Drift-Interpolation ───────────────────────────────────────────────────────
// driftPoints: [{ geminiSec, driftSec }]  (driftSec = whisper - gemini)
// Positiver Drift: Gemini war zu früh → tatsächlicher Moment kommt später.
function interpolateDrift(driftPoints, targetGeminiSec) {
  if (!driftPoints.length) return 0;

  const pts = [...driftPoints].sort((a, b) => a.geminiSec - b.geminiSec);

  if (targetGeminiSec <= pts[0].geminiSec)                return pts[0].driftSec;
  if (targetGeminiSec >= pts[pts.length - 1].geminiSec)  return pts[pts.length - 1].driftSec;

  for (let i = 0; i < pts.length - 1; i++) {
    if (targetGeminiSec >= pts[i].geminiSec && targetGeminiSec <= pts[i + 1].geminiSec) {
      const t = (targetGeminiSec - pts[i].geminiSec) / (pts[i + 1].geminiSec - pts[i].geminiSec);
      return pts[i].driftSec + t * (pts[i + 1].driftSec - pts[i].driftSec);
    }
  }
  return 0;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  const name           = slug(videoLabel);
  const clipDir        = path.join(ROOT, 'campaigns', campaignId, 'clips', name);
  const candidatePath  = path.join(clipDir, 'candidates.json');
  const localMp4       = path.join(ROOT, 'campaigns', campaignId, 'raw-footage', `${name}.mp4`);
  const transcriptPath = path.join(ROOT, 'campaigns', campaignId, 'raw-footage', `${name}-transcript.json`);

  if (!fs.existsSync(candidatePath)) {
    console.error(`❌  candidates.json nicht gefunden: ${candidatePath}`); process.exit(1);
  }
  if (!fs.existsSync(localMp4)) {
    console.error(`❌  Lokale MP4 nicht gefunden: ${localMp4}`); process.exit(1);
  }

  // ── Backup als Wahrheitsquelle ────────────────────────────────────────────
  // _candidates-gemini-ts.json ist IMMER die ursprüngliche Gemini-Version.
  // Wenn es noch nicht existiert → jetzt anlegen.
  // candidates.json dient als Output (kann vom vorherigen Lauf überschrieben sein).
  const backupPath = path.join(clipDir, '_candidates-gemini-ts.json');
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(candidatePath, backupPath);
    console.log(`   Backup erstellt: _candidates-gemini-ts.json`);
  }

  // Immer aus dem Backup lesen (originale Gemini-Timestamps)
  const candidates = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  console.log(`\n📋 ${candidates.length} Kandidaten geladen — ${campaignId}/${name} (aus Gemini-Backup)`);

  // Sicherheitscheck: wurden die Kandidaten schon korrigiert?
  if (candidates.some(c => c._ts_source)) {
    console.log('   ⚠️  Backup enthält bereits _ts_source-Felder — ev. kein sauberes Original.');
  }

  // ── Transkription ────────────────────────────────────────────────────────
  console.log('\n🎙️  Whisper...');
  const transcript = await getOrCreateTranscript(localMp4, transcriptPath);
  const segments   = transcript.segments || [];
  console.log(`   ${segments.length} Segmente\n`);

  if (!segments.length) {
    console.error('❌  Kein Transkript — Abbruch.'); process.exit(1);
  }

  // ── Pass 1: Text-Matching ─────────────────────────────────────────────────
  console.log('🔍 Pass 1: Text-Matching (verbal_hook)...');
  const driftPoints = [];

  const fixed = candidates.map(c => {
    const geminiStartSec = toSeconds(c.start);
    const geminiEndSec   = toSeconds(c.end);
    const duration       = Math.max(10, geminiEndSec - geminiStartSec);

    if (c.verbal_hook) {
      const { matched, newStart, score } = snapByText(c, segments, geminiStartSec);
      if (matched) {
        const drift  = newStart - geminiStartSec;
        driftPoints.push({ geminiSec: geminiStartSec, driftSec: drift });
        const newEnd = newStart + duration;
        const driftStr = `${drift >= 0 ? '+' : ''}${Math.round(drift)}s`;
        console.log(`   ✅ ${c.id}  ${toHMS(geminiStartSec)} → ${toHMS(newStart)}  (${driftStr}, ${score}%)`);
        return { ...c, start: toHMS(newStart), end: toHMS(newEnd), _ts_source: 'whisper', _ts_confidence: score };
      }
      console.log(`   ⚠️  ${c.id}  kein Match für verbal_hook → vorläufig unverändert`);
    }

    return { ...c, _ts_source: 'gemini' };
  });

  console.log(`\n   ${driftPoints.length} Anker für Drift-Map`);

  // ── Pass 2: Drift-Interpolation für wortlose Clips ────────────────────────
  if (driftPoints.length > 0) {
    console.log('📐 Pass 2: Drift-Interpolation (wortlose Clips)...');
    for (let i = 0; i < fixed.length; i++) {
      if (fixed[i]._ts_source !== 'gemini') continue;

      const geminiStartSec = toSeconds(fixed[i].start);
      const geminiEndSec   = toSeconds(fixed[i].end);
      const duration       = Math.max(10, geminiEndSec - geminiStartSec);
      const drift          = Math.round(interpolateDrift(driftPoints, geminiStartSec));

      if (drift !== 0) {
        const newStart  = Math.max(0, geminiStartSec + drift);
        const newEnd    = newStart + duration;
        const driftStr  = `${drift >= 0 ? '+' : ''}${drift}s`;
        console.log(`   📐 ${fixed[i].id}  ${toHMS(geminiStartSec)} → ${toHMS(newStart)}  (${driftStr})`);
        fixed[i] = { ...fixed[i], start: toHMS(newStart), end: toHMS(newEnd), _ts_source: 'drift', _ts_drift: drift };
      }
    }
  } else {
    console.log('⚠️  Keine Anker-Punkte — Drift-Korrektur nicht möglich. Nur Text-Matches wurden korrigiert.');
  }

  // ── Schreiben ─────────────────────────────────────────────────────────────
  fs.writeFileSync(candidatePath, JSON.stringify(fixed, null, 2));

  const nWhisper   = fixed.filter(c => c._ts_source === 'whisper').length;
  const nDrift     = fixed.filter(c => c._ts_source === 'drift').length;
  const nUntouched = fixed.filter(c => c._ts_source === 'gemini').length;

  console.log(`\n✅ candidates.json aktualisiert`);
  console.log(`   Whisper-Match: ${nWhisper}  |  Drift-korrigiert: ${nDrift}  |  Unverändert (kein Match): ${nUntouched}`);
  console.log(`   Original-Gemini-Timestamps: _candidates-gemini-ts.json`);
}

run().catch(e => { console.error('❌', e.message || e); process.exit(1); });
