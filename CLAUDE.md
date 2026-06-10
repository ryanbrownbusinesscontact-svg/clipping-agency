# Clipping Agency — Style-Kalibrierung für Production Editing (Schritt 4)

Diese Datei ist die **Single Source** der kalibrierten Component-Werte, auf die
`.claude/skills/production-editing/` und seine Treatment-Profile
(`references/treatment-<lens>.md`) verweisen. Die Zahlen unten sind der kalibrierte
**`spoken-clip`-Default**. `treatment-visual-clip.md` und `treatment-music.md` weichen
**pro Lens bewusst ab** (z.B. music: statische Caption statt Karaoke, Beat-Sync-Zoom,
kein Speed-up) — bei visual/music immer das jeweilige Treatment-Profil zuerst lesen.

---

## Allgemeine Arbeitsweise

- **Immer Preview vor Render**: Änderungen zuerst bei localhost zeigen, nie direkt
  rendern ohne Freigabe.
- **Speed-up Standard (spoken-clip): 3% (SPEED=1.03)** — das Reel wird um 3%
  beschleunigt (straffer, mehr Energie). FFmpeg: `atempo=1.03` (Audio) +
  `setpts=PTS/1.03` (Video). Alle Timestamps werden durch 1.03 geteilt. Für `music`
  ist Speed-up **OFF** (siehe `treatment-music.md`).
- **Pausen kappen auf max. 0.7s** (nicht entfernen, 0.7s behalten für natürlichen
  Rhythmus) — bereits als `MAX_PAUSE` in `pipeline/edit-clips.js` implementiert
  (Wort-Timestamps aus dem Transkript, kein Silence-Detection). Für `music` wird
  Auto-Pausen-Trim übersprungen (Performance-Rhythmik).

---

## Audio-Mixing für Video-Reels (HyperFrames)

### Kalibrierung (Mai 2026, validiert im merged-reel Projekt)

Diese Werte wurden durch Messen und Hörtests bestätigt. Immer zuerst messen, dann rechnen.

#### Messpipeline
```bash
# Stimme messen (LUFS, LRA, True Peak)
ffmpeg -i clip.mp4 -af loudnorm=print_format=summary -f null -

# Musik/SFX messen
ffmpeg -i music.mp3 -af loudnorm=print_format=summary -f null -
```

#### Ziel-Hierarchie im Mix
| Track | Element | Ziel-LUFS | data-volume | Anmerkung |
|---|---|---|---|---|
| 1 | Stimme (Voiceover) | −19 LUFS (Referenz) | 1.0 | Nicht anfassen |
| 2 | Glitch-SFX / kurze Akzente | ~−30 LUFS effektiv | **0.20** | Raw-SFX war −15.7 dBFS |
| 3 | Hintergrundmusik | −27 LUFS (FFmpeg) | **0.14** | Zusätzliche Absenkung nötig |

#### Musik-Preprocessing mit FFmpeg (immer vor dem Einbinden)
```bash
ffmpeg -i input.mp3 \
  -af "atrim=0:DAUER, \
       acompressor=threshold=-15dB:ratio=2.5:attack=10:release=250:makeup=2dB, \
       loudnorm=I=-28:TP=-2:LRA=6, \
       afade=t=in:st=0:d=0.5, \
       afade=t=out:st=DAUER-3:d=3" \
  music.mp3 -y
```
- `DAUER` = exakte Reel-Länge in Sekunden
- Kompressor reduziert LRA von typisch 8–12 LU auf ~3–4 LU → konstanter Teppich
- loudnorm setzt Ziel auf −28 LUFS (9 LUFS unter Stimme)
- Danach in HyperFrames: `data-volume="0.14"` (Feinabstimmung per Gehör)

#### Warum data-volume="0.14" und nicht 1.0?
Die FFmpeg-Verarbeitung trifft −27 LUFS rechnerisch, aber HyperFrames-Preview und
Renderer können intern anders skalieren. Die 0.14 wurde per Hörtest als richtig
bestätigt: Musik hörbar als Energie, Stimme klar dominant, kein Pumpen.

#### Glitch-SFX Workflow
1. SFX-Datei messen (mean_volume)
2. Ziel: SFX sitzt ~60% der Stimm-Amplitude = data-volume ≈ 0.20 (nach Hörtest)
3. data-duration auf 200–250ms setzen (typisch: 0.25)
4. SFX startet 50ms vor dem Schnitt: `data-start = cut_time - 0.05`

---

## Zoom-Choreographie für Video-Reels (HyperFrames)

### System (validiert Mai 2026)

Immer `templates/scripts/zoom-engine.js` in das `_work/<clip-id>/`-Projekt kopieren.

Einbindung im HTML (vor caption-neon.js):
```html
<script src="scripts/zoom-engine.js"></script>
```

### Zoom-Hierarchie
```
zoomHook()        Sehr stark  — nur 1× pro Reel, ganz am Anfang (Pull-Back 1.06→1.0)
zoomPushStrong()  Stark       — stärkstes Konzept pro Clip (max 2× pro Clip)
zoomPush()        Mittel      — Geldbeträge, Zahlen, Markennamen
zoomNewThought()  Leicht      — Clip-Wechsel, neuer Gedanke (1.03→1.0)
zoomRelease()     Reset       — IMMER nach jedem Peak, sonst hängt der Frame
```

### Regeln
- Zoom **immer auf Satzanfang oder Key Word** — nie mittendrin
- Alle **2–4s** etwas, aber hierarchisch — kein Random
- Nach jedem `zoomPushStrong` → `zoomRelease()` ca. 1s später
- Nie zwei `zoomPushStrong` direkt hintereinander
- Selector = ID des `<video>`-Elements (z.B. `#clip-hook`, `#clip-body`, `#source`)
- **Pull-Back-Regel (kritisch):** `zoomHook()` läuft 2.5s — in diesem Fenster (t=0–2.5s)
  KEINE anderen Pushes setzen. Der Pull-Back ist ein einziger ungestörter
  Spannungsaufbau. Erst nach t=2.5 darf der erste `zoomPush` kommen.
- **Curiosity-Gap-Regel:** Das Versprechen-Statement ("Ich zeige dir, was ich stattdessen
  machen würde" o.ä.) immer mit `zoomNewThought` (neuer Clip) + Glitch-Transition +
  Riser-SFX markieren — das ist der Moment wo Zuschauer entscheiden ob sie bleiben.
  Immer als echter Jump Cut umsetzen (Video dort splitten via `data-media-start`).

### Curiosity-Gap-Transition — Standard (validiert Juni 2026)

An der Stelle wo der Zuschauer entscheidet ob er bleibt: **Riser + Glitch + Jump Cut**.

```
1. Video splitten: clip-main endet am Curiosity-Gap-Zeitpunkt, clip-body startet dort
   → <video id="clip-body" data-start="CG_T" data-media-start="CG_T" ...>
2. glitchAt(CG_T)           — Glitch-Visual überdeckt den Schnitt
3. zoomNewThought(tl, '#clip-body', CG_T)   — Pull-In in neue Szene
4. Riser-SFX: data-start = CG_T - 0.25  — 250ms vor dem Glitch, fast gleichzeitig
   data-volume="0.4", data-track-index="4"
```

| Element | Timing | Volume | Track |
|---|---|---|---|
| Riser-Audio | CG_T − 0.25s | 0.4 | 4 |
| Glitch-Visual | CG_T | — | — |
| Glitch-SFX | CG_T − 0.05s | 0.2 | 2 |
| zoomNewThought | CG_T | — | — |

**Riser messen vor Einbinden:** `ffmpeg -i riser.mp3 -af loudnorm=print_format=summary -f null -`
Startwert 0.4 gilt für −23 LUFS Raw-Pegel. Bei anderen Pegeln proportional anpassen.

### Werte (1080×1920, 9:16)
| Typ | Scale | Dauer | Ease |
|---|---|---|---|
| zoomHook (start) | 1.06 | — | — |
| zoomHook (end) | 1.0 | 2.5s | power1.out |
| zoomPush | 1.04 | 0.18s | power3.out |
| zoomPushStrong | 1.07 | 0.15s | power3.out |
| zoomRelease | 1.0 | 1.2s | power2.inOut |
| zoomNewThought | 1.03→1.0 | 1.5s | power1.out |

### JS-Template für neuen Reel
```javascript
// 1. Pull-Back — immer zuerst, läuft UNGESTÖRT 2.5s
zoomHook(tl, '#clip-hook', 0);

// 2. Erst nach t=2.5: Keywords aus Transkript
// Geldbeträge/Zahlen → zoomPush | stärkstes Wort/Konzept → zoomPushStrong (max 2×/Clip)
// Nach jedem Peak → zoomRelease ~1s später
// Curiosity-Gap ("Ich zeige dir...") → zoomPush markieren

// 3. Clip-Wechsel
zoomNewThought(tl, '#clip-body', CLIP2_START);
zoomNewThought(tl, '#clip-cta',  CLIP3_START);
```

### Key Words pro Kategorie (automatisch erkennen)
| Kategorie | Zoom-Typ |
|---|---|
| Zahlen / Geldbeträge (20, 30, €, Millionen) | `zoomPush` |
| Markennamen (Ebay, Amazon, Shopify) | `zoomPush` oder `zoomPushStrong` bei Reveal |
| Starke Emotionswörter (verbrennen, pleite, Cheatcode) | `zoomPushStrong` |
| Jahreszahlen (2026) | `zoomPush` |
| CTA-Kern-Wort (eBay in Kommentare) | `zoomPushStrong` |

---

## Caption-Stil für Video-Reels (HyperFrames)

### Neon Accent — Standardvorlage (validiert Mai 2026, spoken-clip)

Immer diese Dateien in das `_work/<clip-id>/`-Projekt kopieren:
- `templates/styles/caption-neon.css` — Font, Farben, Position
- `templates/scripts/caption-neon.js` — `buildCaptions()` Funktion

Einbindung im HTML:
```html
<head>
  <link rel="stylesheet" href="styles/caption-neon.css">
</head>
<!-- im composition div: -->
<div id="caption-layer"></div>
<!-- vor </script>: -->
<script src="scripts/caption-neon.js"></script>
```

JS-Aufruf (nach GSAP timeline):
```javascript
buildCaptions(tl, WORDS, [CLIP_BOUNDARY_WORD_INDICES]);
// Beispiel: buildCaptions(tl, WORDS, [0, 15, 159]);
```

### Werte (1080×1920 px, 9:16)
| Parameter | Wert | Erklärung |
|---|---|---|
| font-size | **56px** | Anton 400 — ~2 Zeilen bei 8 Wörtern |
| bottom | **760px** | Unter dem Kinn — Talking-Head/Avatar Framing |
| groupSize | **8 Wörter** | ~2 Zeilen, default in buildCaptions() |
| Farbe base | `#FFFFFF` | Weiß mit dunklem Outline-Shadow |
| Farbe aktiv | `#FFD60A` | Neon-Gelb mit Glow, KEIN Grün |
| Timing | **Instant cut** | duration:0 — kein Fade, kein Gap |

### Clip-Boundaries
Wort-Indices wo Clips starten → buildCaptions() respektiert automatisch:
- Kein Wort-Block darf eine Clip-Grenze überspannen
- CLIP_STARTS aus Transkript-Offset-Berechnung holen

### Wichtig
- **Kein Grün** — nur Weiß (#FFFFFF) und Gelb (#FFD60A)
- Timing: altes Group-Hide = exakter Moment wo neue Group startet → kein schwarzer Gap
- Anton-Font offline verfügbar: `templates/capture/assets/fonts/Anton-Regular.woff2`

### Music-Lens (statische Caption)
Für `lens === "music"` gilt **nicht** das Neon-Karaoke oben, sondern eine einzelne
statische Fan-Voice-Caption (`hook_title`), instant sichtbar (`opacity:1`), die nur
ausfadet — siehe `treatment-music.md` und `templates/styles/caption-static.css` /
`templates/scripts/caption-static.js`.

---

## Text-Hook-Stil für Video-Reels (HyperFrames)

### White-Box Hook Title — Standardvorlage (validiert Mai 2026, spoken-clip)

CapCut/TikTok-Stil: schwarzer Text auf weißen per-line Boxen oben im Frame. Immer
`box-decoration-break: clone` für den Zeilenumbruch-Effekt.

#### CSS
```css
#hook-title {
  position: absolute;
  top: 175px;
  left: 0; right: 0;
  z-index: 160;
  text-align: center;
  padding: 0 80px;
  pointer-events: none;
  opacity: 0;
}
#hook-title .htxt {
  display: inline;
  font-family: 'Anton', sans-serif;
  font-weight: 400;
  font-size: 58px;
  line-height: 1.65;
  letter-spacing: 0.01em;
  color: #000;
  background: #fff;
  padding: 6px 16px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  border-radius: 8px;
}
```

#### HTML
```html
<div id="hook-title">
  <span class="htxt">HOOK-TEXT HIER</span>
</div>
```

#### GSAP (t=0–3.5s, sofort sichtbar — kein Slide, kein Fade-in)
```javascript
tl.set('#hook-title', { opacity: 1 }, 0);
tl.to('#hook-title', { opacity: 0, duration: 0.3, ease: 'power2.in' }, 3.2);
// Fade-out startet bei 3.2s → endet bei 3.5s (duration 0.3)
```

#### Regeln
- **Immer ganz oben** (`top: 175px`) — unter der Kamera-Notch-Zone
- z-index: 160 → über allem außer Glitch-Effekten (z-index 199+)
- Nur für die ersten 2.7–3s sichtbar — verschwindet bevor Caption-Gruppen erscheinen
- Text kurz und knackig halten — max. 2 Zeilen bei 58px Anton
- Farbe: **immer schwarz (#000) auf Weiß (#fff)** — kein Gelb, kein Grau
- **Music-Lens:** hier gilt stattdessen die statische Fan-Voice-Caption
  (`treatment-music.md`), kein White-Box-Hook.
