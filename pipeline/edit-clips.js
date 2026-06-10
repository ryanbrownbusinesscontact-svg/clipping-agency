#!/usr/bin/env node
/*
 * SCHRITT 4 (deterministischer Teil) — CLIP-CUT
 * ---------------------------------------------------------------------------
 * Nimmt die candidates.json EINES Longform-Videos + die zugehoerige Datei aus
 * raw-footage/ und erzeugt fuer jeden (oder ausgewaehlte) Kandidaten den
 * geschnittenen, vertikalen (9:16) Roh-Clip — die Quelle, die der HyperFrames-
 * Edit (Captions / Zoom / Hook-Title / Audio-Mix) dann veredelt.
 *
 *   campaigns/<id>/clips/<video>/_work/<clip-id>/source-916.mp4  — Schnitt, 1080x1920
 *   campaigns/<id>/clips/<video>/_work/<clip-id>/audio.wav       — 16k mono fuer Whisper
 *   campaigns/<id>/clips/<video>/_work/<clip-id>/clip.json       — der Kandidat (Kopie)
 *
 * Der fertige Reel landet NACH dem Render in clips/<video>/unpublished/<clip-id>.mp4
 * (das macht der production-editing Skill, der diesen Cut als Input nutzt).
 *
 * Nutzung (flexibel):
 *   node pipeline/edit-clips.js <id> "<video-label>"                 — alle Kandidaten des Videos
 *   node pipeline/edit-clips.js <id> "<video-label>" roundswamp-01   — nur dieser Clip
 *   node pipeline/edit-clips.js <id> --all                           — alle Videos, alle Kandidaten
 *
 * Annahme: raw-footage ist Querformat (Center-Crop auf 9:16). Erfordert ffmpeg.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

// --- Tool-Resolver (PATH + WinGet-Fallback) -----------------------------
function resolveTool(bin) {
  const local = process.env.LOCALAPPDATA || '';
  const candidates = [bin, path.join(local, 'Microsoft', 'WinGet', 'Links', `${bin}.exe`)];
  const pkgRoot = path.join(local, 'Microsoft', 'WinGet', 'Packages');
  try {
    for (const d of fs.readdirSync(pkgRoot)) {
      if (!d.toLowerCase().startsWith(bin)) continue;
      const dir = path.join(pkgRoot, d);
      candidates.push(path.join(dir, `${bin}.exe`));
      try {
        for (const sub of fs.readdirSync(dir, { withFileTypes: true })) {
          if (sub.isDirectory()) candidates.push(path.join(dir, sub.name, `${bin}.exe`), path.join(dir, sub.name, 'bin', `${bin}.exe`));
        }
      } catch { /* egal */ }
    }
  } catch { /* egal */ }
  for (const c of candidates) {
    const r = spawnSync(c, ['-version'], { encoding: 'utf8' });
    if (r.status === 0) return c;
  }
  return null;
}

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'video';
const toSeconds = ts => { const [h, m, s] = String(ts).split(':').map(Number); return h * 3600 + m * 60 + s; };
// Sekunden → HH:MM:SS.mmm (sub-Sekunden-genau, fuer Auto-Pausen-Trims)
const toHMS = sec => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const ss = (sec % 60).toFixed(3).padStart(6, '0');
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${ss}`;
};
const MAX_PAUSE = 0.7;          // CLAUDE.md: Pausen kappen auf max. 0.7s (nicht entfernen, 0.7s behalten)
const PAUSE_TOL = 0.05;         // Mikro-Luecken ignorieren
const BOUND_EPS = 5e-3;         // Toleranz an Segment-Grenzen: toHMS rundet auf 3 Dezimalen,
                                // dadurch landet das erste Wort NACH einem Trim sonst knapp
                                // ausserhalb von seg.s und wuerde faelschlich verworfen.

// --- [start,end] minus internal_trims => Liste behaltener Segmente -------
function keptSegments(c) {
  const start = toSeconds(c.start), end = toSeconds(c.end);
  const trims = (c.internal_trims || [])
    .map(t => ({ s: toSeconds(t.from), e: toSeconds(t.to) }))
    .filter(t => t.e > t.s)
    .sort((a, b) => a.s - b.s);
  const segs = [];
  let cur = start;
  for (const t of trims) {
    if (t.s > cur) segs.push({ s: cur, e: Math.min(t.s, end) });
    cur = Math.max(cur, t.e);
    if (cur >= end) break;
  }
  if (cur < end) segs.push({ s: cur, e: end });
  return segs.filter(seg => seg.e > seg.s);
}

// --- Volltranskript laden (Wort-Level bevorzugt, Segment-Fallback) ------
function loadFullTranscript(name) {
  const p = path.join(campDir, 'raw-footage', `${name}-transcript.json`);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

// --- Gesprochene Einheiten im Fenster [s,e] (absolute Sek) --------------
// Wort-Level (words[]) wenn vorhanden — sonst Segmente.
function spokenUnits(transcript, startSec, endSec) {
  const src = (transcript?.words?.length)
    ? transcript.words.map(w => ({ text: (w.word ?? w.text ?? '').trim(), start: w.start, end: w.end }))
    : (transcript?.segments || []).map(s => ({ text: (s.text ?? '').trim(), start: s.start, end: s.end }));
  return src.filter(u => Number.isFinite(u.start) && Number.isFinite(u.end) && u.end > startSec && u.start < endSec);
}
const transcriptLevel = t => (t?.words?.length ? 'Wort' : 'Segment');

// --- Auto-Pausen-Trims: Luecken > MAX_PAUSE kappen (0.7s behalten) ------
// Liefert {from,to} (HH:MM:SS, absolut) fuer die Teile, die ENTFERNT werden.
function computeAutoTrims(units) {
  const trims = [];
  for (let i = 0; i < units.length - 1; i++) {
    const gapStart = units[i].end;
    const gapEnd   = units[i + 1].start;
    if (gapEnd - gapStart > MAX_PAUSE + PAUSE_TOL) {
      trims.push({ from: toHMS(gapStart + MAX_PAUSE), to: toHMS(gapEnd) });
    }
  }
  return trims;
}

// --- Clip-Timeline aus behaltenen Segmenten (absolut → clip-relativ) ----
function buildTimeline(segs) {
  let acc = 0;
  return segs.map(seg => { const o = { s: seg.s, e: seg.e, clipStart: acc }; acc += seg.e - seg.s; return o; });
}
function absToClip(absSec, timeline) {
  for (const seg of timeline) {
    if (absSec >= seg.s - BOUND_EPS && absSec <= seg.e + BOUND_EPS) {
      // max(0,…): knapp unter seg.s (Rundung) → an den Segmentanfang klemmen.
      return seg.clipStart + Math.max(0, absSec - seg.s);
    }
  }
  return null;                  // liegt in einem getrimmten Bereich
}

// --- Einheiten auf Clip-Zeit mappen; getrimmte Bereiche fallen weg ------
// KEIN Re-Zeroing: das Timing bleibt synchron zur (unveraenderten) Audio.
function mapUnitsToClip(units, startSec, endSec, timeline) {
  const out = [];
  for (const u of units) {
    const uStart = Math.max(u.start, startSec);
    // Wort-Ende nie vor dem Start: Whisper liefert teils zero-duration Worte
    // (start == end). Die MUESSEN erhalten bleiben (sonst fehlt das Wort im Caption-Text),
    // sie werden im Edit nur 0s hervorgehoben — das Wort steht aber lesbar im Block.
    const uEnd = Math.min(Math.max(u.end, u.start), endSec);
    if (uStart >= endSec || uEnd <= startSec) continue;   // ganz ausserhalb des Fensters
    const cs = absToClip(uStart, timeline);
    if (cs == null) continue;   // Start in getrimmter Pause → Wort verschwindet mit der Pause
    let ce = absToClip(Math.max(uEnd, uStart), timeline);
    if (ce == null || ce < cs) {
      const seg = timeline.find(t => uStart >= t.s - BOUND_EPS && uStart <= t.e + BOUND_EPS);
      ce = seg ? seg.clipStart + (seg.e - seg.s) : cs;
    }
    out.push({ text: u.text, start: +cs.toFixed(3), end: +Math.max(ce, cs).toFixed(3) });
  }
  return out;
}

// --- Fuehrendes Fragment (Rest des Vorsatzes) vor dem verbal_hook weg ---
const normTok = s => String(s).toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
function stripLeadingFragment(clipUnits, verbalHook) {
  const hookTok = normTok(verbalHook);
  if (hookTok.length < 2 || !clipUnits.length) return { units: clipUnits, stripped: 0 };
  const anchor = hookTok.slice(0, Math.min(3, hookTok.length));
  const firstTok = clipUnits.map(u => normTok(u.text)[0] || '');
  for (let i = 0; i < firstTok.length; i++) {
    let ok = true;
    for (let k = 0; k < anchor.length; k++) { if (firstTok[i + k] !== anchor[k]) { ok = false; break; } }
    if (ok) return { units: i > 0 ? clipUnits.slice(i) : clipUnits, stripped: i };
  }
  return { units: clipUnits, stripped: 0 };   // kein Anker → unveraendert (sicher)
}

// --- ffmpeg-Args: Segmente schneiden + concat + Center-Crop 9:16 --------
function buildArgs(rawFile, segs, outFile) {
  const parts = [];
  segs.forEach((seg, i) => {
    parts.push(`[0:v]trim=start=${seg.s}:end=${seg.e},setpts=PTS-STARTPTS[v${i}]`);
    parts.push(`[0:a]atrim=start=${seg.s}:end=${seg.e},asetpts=PTS-STARTPTS[a${i}]`);
  });
  const inter = segs.map((_, i) => `[v${i}][a${i}]`).join('');
  parts.push(`${inter}concat=n=${segs.length}:v=1:a=1[vc][ac]`);
  parts.push(`[vc]crop=ih*9/16:ih,scale=1080:1920,setsar=1[vout]`);
  return ['-y', '-i', rawFile, '-filter_complex', parts.join(';'),
    '-map', '[vout]', '-map', '[ac]',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', outFile];
}

// --- Args ---------------------------------------------------------------
const campaignId = process.argv[2];
const rest = process.argv.slice(3);
if (!campaignId) { console.error('Usage: node edit-clips.js <id> [--all | "<video-label>" [clip-id ...]]'); process.exit(1); }

const campDir = path.join(ROOT, 'campaigns', campaignId);
if (!fs.existsSync(path.join(campDir, 'campaign.json'))) { console.error(`❌ Campaign not found: ${campaignId}`); process.exit(1); }

const FF = resolveTool('ffmpeg');
if (!FF) { console.error('❌ ffmpeg not found (PATH or WinGet).'); process.exit(1); }

// Welche Video-Ordner? --all oder ein Label
const clipsDir = path.join(campDir, 'clips');
let videoNames, clipFilter = null;
if (rest.length === 0 || rest.includes('--all') || rest.includes('-a')) {
  videoNames = fs.existsSync(clipsDir)
    ? fs.readdirSync(clipsDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name)
    : [];
} else {
  videoNames = [slug(rest[0])];
  clipFilter = rest.slice(1);            // optionale clip-ids
}
if (!videoNames.length) { console.error('❌ Keine Video-Ordner in clips/. Erst analysieren.'); process.exit(1); }

// --- Verarbeiten --------------------------------------------------------
let total = 0, okc = 0, failc = 0;
for (const name of videoNames) {
  const vDir = path.join(clipsDir, name);
  const candPath = path.join(vDir, 'candidates.json');
  if (!fs.existsSync(candPath)) { console.warn(`⚠️  ${name}: keine candidates.json — uebersprungen.`); continue; }

  const rawFile = path.join(campDir, 'raw-footage', `${name}.mp4`);
  if (!fs.existsSync(rawFile)) {
    console.warn(`⚠️  ${name}: raw-footage/${name}.mp4 fehlt — erst 'gather-footage download'. Uebersprungen.`);
    continue;
  }

  let cands = JSON.parse(fs.readFileSync(candPath, 'utf8'));
  if (clipFilter && clipFilter.length) cands = cands.filter(c => clipFilter.includes(c.id));
  if (!cands.length) { console.warn(`⚠️  ${name}: keine passenden Kandidaten.`); continue; }

  // Volltranskript EINMAL pro Video laden (Wiederverwendung — kein neuer API-Call)
  const fullTranscript = loadFullTranscript(name);
  if (!fullTranscript) console.warn(`   ⚠️  ${name}: kein Volltranskript (raw-footage/${name}-transcript.json) — Auto-Pausen-Trim & Captions entfallen.`);
  else if (!fullTranscript.words?.length) console.warn(`   ⚠️  ${name}: Transkript nur Segment-Level (kein words[]) — Captions weniger praezise. analyze-clips.js neu laufen lassen fuer Wort-Level.`);

  console.log(`\n🎬 ${name}  (${cands.length} Clips)`);
  for (const c of cands) {
    total++;
    const startSec = toSeconds(c.start), endSec = toSeconds(c.end);
    const isMusic = c.lens === 'music';   // Musik: kein Pausen-Trim (Rhythmus!), kein Karaoke

    // ── FIX #3: Auto-Pausen-Trim — Luecken >0.7s im Transkript-Fenster kappen
    // Bei Musik UEBERSPRUNGEN: instrumentale Pausen/gehaltene Toene/Crowd sind kein
    // "Dead Air" — Pausen kappen wuerde die Performance-Rhythmik zerstoeren.
    const units = (fullTranscript && !isMusic) ? spokenUnits(fullTranscript, startSec, endSec) : [];
    if (isMusic) console.log(`   🎵 ${c.id}: Musik-Lens — Auto-Pausen-Trim & Karaoke-Transcript uebersprungen`);
    if (units.length) {
      const autoTrims = computeAutoTrims(units);
      if (autoTrims.length) {
        c.internal_trims = [...(c.internal_trims || []), ...autoTrims];
        const saved = autoTrims.reduce((a, t) => a + (toSeconds(t.to) - toSeconds(t.from)), 0);
        console.log(`   ⏸  ${c.id}: ${autoTrims.length} Pause(n) >${MAX_PAUSE}s gekappt (−${saved.toFixed(1)}s)`);
      }
    }

    const segs = keptSegments(c);
    if (!segs.length) { console.warn(`   ❌ ${c.id}: leeres Zeitfenster.`); failc++; continue; }
    const workDir = path.join(vDir, '_work', c.id);
    fs.mkdirSync(workDir, { recursive: true });
    const src = path.join(workDir, 'source-916.mp4');

    const r = spawnSync(FF, buildArgs(rawFile, segs, src), { encoding: 'utf8', stdio: 'inherit' });
    if (r.status !== 0 || !fs.existsSync(src)) { console.warn(`   ❌ ${c.id}: ffmpeg-Cut fehlgeschlagen.`); failc++; continue; }

    // 16k-mono-Audio fuer Whisper-Captions
    spawnSync(FF, ['-y', '-i', src, '-vn', '-ar', '16000', '-ac', '1', path.join(workDir, 'audio.wav')], { encoding: 'utf8' });
    // Kandidat (inkl. gemergter Auto-Trims) ins Work-Verzeichnis — reproduzierbar
    fs.writeFileSync(path.join(workDir, 'clip.json'), JSON.stringify(c, null, 2));

    // ── FIX #4 + #1: driftfreies clip-relatives Transkript + fuehrendes Fragment weg
    if (fullTranscript && units.length) {
      const timeline = buildTimeline(segs);
      const clipUnits = mapUnitsToClip(units, startSec, endSec, timeline);
      const { units: cleaned, stripped } = stripLeadingFragment(clipUnits, c.verbal_hook || '');
      fs.writeFileSync(path.join(workDir, 'transcript.json'), JSON.stringify(cleaned, null, 2));
      console.log(`          transcript.json (${cleaned.length} ${transcriptLevel(fullTranscript)}-Einheiten${stripped ? `, ${stripped} Fragment-Wort(e) am Anfang entfernt` : ''})`);
    } else if (isMusic) {
      console.log(`          ℹ️  ${c.id}: kein transcript.json (Musik) — statische Fan-Voice-Caption im Edit; nur fuer Crowd-Talk-Segmente transkribieren.`);
    } else {
      console.warn(`          ⚠️  ${c.id}: transcript.json nicht erzeugt — im Edit-Schritt transkribieren (npx hyperframes transcribe audio.wav)`);
    }

    const dur = segs.reduce((a, s) => a + (s.e - s.s), 0);
    console.log(`   ✅ ${c.id}  ${dur.toFixed(1)}s  → clips/${name}/_work/${c.id}/source-916.mp4`);
    okc++;
  }
}

console.log(`\n📊 Cut fertig: ${okc}/${total} ok${failc ? `, ${failc} fehlgeschlagen` : ''}.`);
console.log(`Weiter: HyperFrames-Edit (Captions/Zoom/Hook/Audio) → Render → clips/<video>/unpublished/<clip-id>.mp4`);
console.log(`Siehe Skill: production-editing.`);
