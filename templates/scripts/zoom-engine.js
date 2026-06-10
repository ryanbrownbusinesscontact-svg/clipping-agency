/**
 * zoom-engine.js  —  Reusable zoom choreography for HyperFrames
 * Version: 1.0 — Mai 2026
 *
 * PHILOSOPHY
 * ──────────────────────────────────────────────────────────────────────
 *  Zoom IN   → Spannung aufbauen, wichtiger Punkt kommt
 *  Zoom OUT  → Themenwechsel, Atmen, neuer Gedanke
 *  Zoom HOLD → Dramatische Pause — lass die Aussage wirken
 *
 *  Regeln:
 *  1. Zoom immer auf Satzanfang oder Key Word timen — nie mittendrin
 *  2. Nie zwei "Sehr stark" Events hintereinander — Aufbau und Release
 *  3. Alle 2–3s etwas, aber hierarchisch (leicht → mittel → stark → clip change)
 *  4. zoomRelease() nach jedem Peak — sonst bleibt der Frame eingefroren
 *
 * HIERARCHY
 * ──────────────────────────────────────────────────────────────────────
 *  zoomHook()        Sehr stark  — visueller Opener, nur 1× pro Reel am Anfang
 *  zoomPushStrong()  Stark       — stärkstes Wort pro Clip-Abschnitt
 *  zoomPush()        Mittel      — Geldbeträge, Markennamen, Zahlen
 *  zoomNewThought()  Leicht      — Clip-Wechsel, neuer Gedanke
 *  zoomRelease()     Reset       — nach jedem Peak, gibt Raum zum Atmen
 *
 * USAGE
 * ──────────────────────────────────────────────────────────────────────
 *  1. In <head> / before </body>:
 *       <script src="scripts/zoom-engine.js"></script>
 *
 *  2. Nach GSAP timeline setup, vor window.__timelines:
 *       // Visual hook — immer am Anfang
 *       zoomHook(tl, '#clip-hook', 0);
 *
 *       // Keyword emphasis
 *       zoomPush(tl, '#clip-hook', 1.46);         // "Geld"
 *       zoomPushStrong(tl, '#clip-hook', 3.2);    // "verbrennen"
 *       zoomRelease(tl, '#clip-hook', 4.5);       // breathe
 *
 *       // Clip-Wechsel
 *       zoomNewThought(tl, '#clip-body', 6.72);
 *
 *  WICHTIG: selector = ID des <video>-Elements, nicht des Containers
 *  Das Parent-Div braucht overflow:hidden (bei HyperFrames default)
 *
 * RESPONSIVE SCALING HINTS
 * ──────────────────────────────────────────────────────────────────────
 *  zoomPush       → 1.04  — subtil, für schnellen Speech kaum sichtbar
 *  zoomPushStrong → 1.07  — sichtbar aber nicht cheesy
 *  zoomHook Start → 1.06  — pull-back Opener
 *
 *  Für langsameren Speech (Tutorials, Erklärvideos) alles +0.02 erhöhen.
 *  Für sehr schnellen Speech alles -0.01 reduzieren.
 */

// ── Core primitive ────────────────────────────────────────────────────
function zoomTo(tl, selector, t, toScale, dur, ease) {
  tl.to(selector, {
    scale: toScale,
    duration: dur,
    ease: ease || 'power2.out',
    transformOrigin: '50% 50%',
    overwrite: 'auto'
  }, t);
}

function zoomSet(tl, selector, t, scale) {
  tl.set(selector, { scale: scale, transformOrigin: '50% 50%' }, t);
}

// ── Named zoom types ──────────────────────────────────────────────────

/**
 * zoomHook — Visueller Opener: langsamer Pull-Back 1.06 → 1.0
 * Erzeugt sofort Bewegung + Spannung. Nur 1× pro Reel, ganz am Anfang.
 */
function zoomHook(tl, selector, t) {
  zoomSet(tl, selector, t, 1.06);
  zoomTo(tl, selector, t, 1.0, 2.5, 'power1.out');
}

/**
 * zoomPush — Mittlerer Keyword-Push: → 1.04
 * Für: Geldbeträge, Zahlen, Markennamen
 */
function zoomPush(tl, selector, t) {
  zoomTo(tl, selector, t, 1.04, 0.18, 'power3.out');
}

/**
 * zoomPushStrong — Starker Keyword-Push: → 1.07
 * Für: stärkstes Wort/Konzept pro Clip-Abschnitt (max. 1–2× pro Clip)
 */
function zoomPushStrong(tl, selector, t) {
  zoomTo(tl, selector, t, 1.07, 0.15, 'power3.out');
}

/**
 * zoomRelease — Langsames Zurückdriften → 1.0
 * Immer nach einem Peak. Gibt dem Zuschauer Raum zu atmen.
 * dur: optional, default 1.2s
 */
function zoomRelease(tl, selector, t, dur) {
  zoomTo(tl, selector, t, 1.0, dur || 1.2, 'power2.inOut');
}

/**
 * zoomNewThought — Clip-Wechsel / neuer Gedanke
 * Setzt Scale auf 1.03, driftet langsam zu 1.0. Wirkt wie "einatmen".
 * Immer am Anfang eines neuen Clips oder nach Themenwechsel.
 */
function zoomNewThought(tl, selector, t) {
  zoomSet(tl, selector, t, 1.03);
  zoomTo(tl, selector, t, 1.0, 1.5, 'power1.out');
}
