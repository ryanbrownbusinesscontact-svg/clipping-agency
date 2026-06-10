#!/usr/bin/env node
/*
 * SCHRITT 2 — FOOTAGE SAMMELN (Multi-Quellen-Dispatcher)
 * ---------------------------------------------------------------------------
 * Liest eine campaign.json, klassifiziert JEDE URL der content_library nach
 * Quellen-Typ und laedt sie mit dem passenden Werkzeug komplett herunter:
 *
 *   youtube / video-platform  -> yt-dlp  (TikTok, Vimeo, IG, FB, Twitch ...)
 *   dropbox / direct           -> yt-dlp  (generic / dl=1)
 *   gdrive (Datei/Ordner)      -> rclone (Remote-Name: "gdrive")
 *   wetransfer                 -> manuell (Link laeuft ab! -> sofort spiegeln)
 *
 * Dateien werden nach LABEL benannt (z.B. "Roundswamp" -> roundswamp.mp4),
 * damit der Ordner fuer Menschen lesbar bleibt. Das Mapping Label<->URL<->Datei
 * steht im Manifest raw-footage/footage.json.
 *
 * Zwei Phasen:
 *   node pipeline/gather-footage.js <id>                     -> plan   (nur Routing, KEIN Netz)
 *   node pipeline/gather-footage.js <id> download [--limit N] -> alles laden
 *
 * Idempotent: bereits vorhandene Dateien werden uebersprungen.
 * Ausgabe:
 *   campaigns/<id>/raw-footage/<label>.mp4   — die Longform-Quellvideos
 *   campaigns/<id>/raw-footage/footage.json  — Manifest (label, url, file, status, duration)
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
          if (sub.isDirectory()) candidates.push(path.join(dir, sub.name, `${bin}.exe`));
        }
      } catch { /* egal */ }
    }
  } catch { /* egal */ }
  for (const c of candidates) {
    const r = spawnSync(c, ['--version'], { encoding: 'utf8' });
    if (r.status === 0) return c;
  }
  return null;
}

// --- URL-Klassifikation -------------------------------------------------
function classify(url) {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/vimeo\.com|tiktok\.com|instagram\.com|facebook\.com|fb\.watch|twitch\.tv|dailymotion\.com/i.test(url)) return 'video';
  if (/drive\.google\.com|docs\.google\.com/i.test(url)) return 'gdrive';
  if (/dropbox\.com/i.test(url)) return 'dropbox';
  if (/wetransfer\.com|we\.tl/i.test(url)) return 'wetransfer';
  return 'direct';
}
const HANDLER = {
  youtube: 'yt-dlp', video: 'yt-dlp', dropbox: 'yt-dlp (dl=1)',
  direct: 'yt-dlp generic', gdrive: 'rclone (remote: gdrive)', wetransfer: 'manuell/spiegeln',
};
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'src'; }
function ytId(url) { const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/); return m ? m[1] : null; }
function gdriveId(url) {
  const folder = url.match(/\/folders\/([\w-]+)/); if (folder) return { kind: 'folder', id: folder[1] };
  const file = url.match(/\/d\/([\w-]+)/) || url.match(/[?&]id=([\w-]+)/); if (file) return { kind: 'file', id: file[1] };
  return null;
}

// --- Args ---------------------------------------------------------------
const [, , campaignId, phaseArg, ...rest] = process.argv;
if (!campaignId) { console.error('Nutzung: node pipeline/gather-footage.js <campaign-id> [plan|download] [--limit N]'); process.exit(1); }
const phase = phaseArg === 'download' ? 'download' : 'plan';
const limitIdx = rest.indexOf('--limit');
const limit = limitIdx >= 0 ? parseInt(rest[limitIdx + 1], 10) : Infinity;

const campDir = path.join(ROOT, 'campaigns', campaignId);
const campFile = path.join(campDir, 'campaign.json');
const footDir = path.join(campDir, 'raw-footage');
if (!fs.existsSync(campFile)) { console.error(`FEHLER: ${campFile} existiert nicht.`); process.exit(1); }

const campaign = JSON.parse(fs.readFileSync(campFile, 'utf8'));
const lib = campaign.content_library || {};

// --- alle Quellen flach einsammeln + Datei-Namen vergeben ----------------
function collect() {
  const out = [];
  const add = (arr, bucket) => (arr || []).forEach(i => { if (i && i.url) out.push({ label: i.label || i.url, url: i.url, bucket }); });
  add(lib.official_youtube, 'official_youtube');
  add(lib.third_party_youtube, 'third_party_youtube');
  add(lib.drive_folders, 'drive_folders');
  add(lib.other, 'other');

  const seen = new Set();
  return out.map(s => {
    const st = classify(s.url);
    const yt = ytId(s.url);
    let base = slug(s.label);
    if (seen.has(base)) base = `${base}-${(yt || Math.random().toString(36).slice(2)).slice(0, 6)}`;
    seen.add(base);
    return { ...s, source_type: st, yt_id: yt, name: base };
  });
}
const sources = collect();

// --- yt-dlp / rclone / ffprobe Lazy-Resolver -----------------------------
let _yt, _rc, _fp;
const ytDlp = () => (_yt !== undefined ? _yt : (_yt = resolveTool('yt-dlp')));
const rclone = () => (_rc !== undefined ? _rc : (_rc = resolveTool('rclone')));
const ffprobe = () => (_fp !== undefined ? _fp : (_fp = resolveTool('ffprobe')));
function run(bin, args, opts = {}) { return spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 64, ...opts }); }

function probeDuration(file) {
  const FP = ffprobe(); if (!FP || !fs.existsSync(file)) return null;
  const r = run(FP, ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  const d = parseFloat((r.stdout || '').trim());
  return Number.isFinite(d) ? Math.round(d) : null;
}

// --- PHASE: plan (nur Routing anzeigen, kein Netz) ----------------------
function doPlan() {
  console.log(`Kampagne: ${campaignId}  |  Phase: PLAN (kein Download)\n`);
  const byType = {};
  sources.forEach(s => { (byType[s.source_type] ||= []).push(s); });
  for (const t of Object.keys(byType)) {
    console.log(`== ${t.toUpperCase()}  ->  ${HANDLER[t]}  (${byType[t].length})`);
    byType[t].forEach(s => console.log(`   - ${s.label}  ->  raw-footage/${s.name}.mp4`));
    console.log('');
  }
  const needYt = sources.some(s => ['youtube', 'video', 'dropbox', 'direct'].includes(s.source_type));
  const needRc = sources.some(s => s.source_type === 'gdrive');
  const hasWt = sources.some(s => s.source_type === 'wetransfer');
  console.log('Tooling:');
  if (needYt) console.log(`  yt-dlp : ${ytDlp() ? 'OK' : 'FEHLT (winget install yt-dlp.yt-dlp)'}`);
  if (needRc) {
    const rc = rclone();
    let remoteOk = false;
    if (rc) { const lr = run(rc, ['listremotes']); remoteOk = /^gdrive:/m.test(lr.stdout || ''); }
    console.log(`  rclone : ${rc ? (remoteOk ? 'OK (remote "gdrive" vorhanden)' : 'installiert, aber remote "gdrive" fehlt -> einmalig: rclone config') : 'FEHLT (winget install Rclone.Rclone)'}`);
  }
  console.log(`  ffprobe: ${ffprobe() ? 'OK (Dauer wird erfasst)' : 'fehlt (Dauer bleibt null)'}`);
  if (hasWt) console.log('  wetransfer: kein Auto-Download -> Link laeuft ab, zeitnah manuell per Browser sichern.');
  console.log(`\nWeiter: node pipeline/gather-footage.js ${campaignId} download   (laedt alles)`);
}

// --- PHASE: download (alle Typen) ---------------------------------------
function doDownload() {
  fs.mkdirSync(footDir, { recursive: true });
  const mpath = path.join(footDir, 'footage.json');

  // bestehendes Manifest laden (Status erhalten), sonst frisch aus sources
  const prev = fs.existsSync(mpath) ? JSON.parse(fs.readFileSync(mpath, 'utf8')).sources || [] : [];
  const prevByUrl = new Map(prev.map(s => [s.url, s]));
  const manifest = sources.map(s => ({
    label: s.label, url: s.url, source_type: s.source_type, yt_id: s.yt_id, name: s.name,
    file: prevByUrl.get(s.url)?.file || null,
    duration_sec: prevByUrl.get(s.url)?.duration_sec || null,
    status: 'pending', note: null,
  }));

  let done = 0;
  for (const s of manifest) {
    if (done >= limit) { console.log(`--limit ${limit} erreicht.`); break; }
    Object.assign(s, downloadOne(s));
    console.log(`[${s.source_type}] ${s.label}: ${s.status}${s.duration_sec ? `  (${Math.round(s.duration_sec / 60)} min)` : ''}`);
    done++;
  }

  writeManifest(manifest);

  const ok = manifest.filter(s => s.status === 'downloaded');
  const manual = manifest.filter(s => /needs_/.test(s.status));
  const fail = manifest.filter(s => /fail/.test(s.status));
  const totalMin = ok.reduce((a, s) => a + (s.duration_sec || 0), 0) / 60;
  console.log(`\nFertig (download).`);
  console.log(`  geladen:  ${ok.length}/${manifest.length}  (~${totalMin.toFixed(0)} min Material)`);
  if (manual.length) console.log(`  manuell:  ${manual.length}  -> ${manual.map(s => s.label).join(', ')}`);
  if (fail.length) console.log(`  fehler:   ${fail.length}  -> ${fail.map(s => s.label).join(', ')}`);
  console.log(`\nManifest: ${path.relative(ROOT, mpath)}`);
  console.log(`Weiter: alle Clips analysieren -> node pipeline/analyze-clips.js ${campaignId} --all`);
}

function downloadOne(s) {
  const YT = ytDlp(), RC = rclone();
  const name = s.name || slug(s.label);

  if (s.source_type === 'gdrive') {
    if (!RC) return { status: 'needs_rclone' };
    if (!/^gdrive:/m.test((run(RC, ['listremotes']).stdout) || '')) return { status: 'needs_rclone_setup' };
    const g = gdriveId(s.url); if (!g) return { status: 'gdrive_url_unparsed' };
    if (g.kind === 'folder') {
      const dest = path.join(footDir, name);
      const r = run(RC, ['copy', 'gdrive:', dest, '--drive-root-folder-id', g.id, '--transfers', '4', '-P'], { stdio: 'inherit' });
      return { status: r.status === 0 ? 'downloaded' : 'failed', file: path.relative(ROOT, dest) };
    }
    const r = run(RC, ['backend', 'copyid', 'gdrive:', g.id, footDir + path.sep], { stdio: 'inherit' });
    return { status: r.status === 0 ? 'downloaded' : 'failed' };
  }

  if (s.source_type === 'wetransfer') {
    return { status: 'needs_manual', note: 'WeTransfer laeuft ab — per Browser herunterladen (Erlaubnis) und als raw-footage/' + name + '.mp4 ablegen.' };
  }

  // youtube / video / dropbox / direct -> yt-dlp
  if (!YT) return { status: 'needs_ytdlp' };
  const out = path.join(footDir, `${name}.mp4`);
  if (fs.existsSync(out)) {
    return { status: 'downloaded', file: path.relative(ROOT, out), duration_sec: s.duration_sec || probeDuration(out) };
  }
  const info = path.join(footDir, `${name}.info.json`);
  const r = run(YT, ['-f', 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]/b',
    '--merge-output-format', 'mp4', '--write-info-json', '--no-write-playlist-metafiles',
    '--no-playlist',
    '-o', out, s.url], { stdio: 'inherit' });

  let duration = null;
  if (fs.existsSync(info)) {
    try { duration = JSON.parse(fs.readFileSync(info, 'utf8')).duration || null; } catch { /* ignore */ }
    try { fs.unlinkSync(info); } catch { /* ignore */ }  // Manifest haelt die Metadaten — Ordner bleibt sauber
  }
  if (!duration) duration = probeDuration(out);

  return (r.status === 0 && fs.existsSync(out))
    ? { status: 'downloaded', file: path.relative(ROOT, out), duration_sec: duration }
    : { status: 'download_failed' };
}

function writeManifest(manifest) {
  fs.writeFileSync(path.join(footDir, 'footage.json'),
    JSON.stringify({ campaign: campaignId, generated_at: new Date().toISOString(), sources: manifest }, null, 2));
}

if (phase === 'plan') doPlan();
else doDownload();
