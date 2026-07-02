/**
 * caption-static.js  —  Static fan-voice caption for HyperFrames (music lens)
 * Style: one persistent stan/fan-voice line (NOT karaoke).
 * Font:  Anton 400  (linked via styles/caption-static.css)
 *
 * Lives in the black hook-bar above the native-crop video
 * (treatment-music.md, "Frame layout") — instantly visible at t=0, drifts
 * subtly, then fades out near the end. Validated June 2026 on the first
 * music clip (dua-lipa-live-from-mexico-03).
 *
 * USAGE
 * ──────────────────────────────────────────────────────────────────────
 *  1. <head>:        <link rel="stylesheet" href="styles/caption-static.css">
 *  2. root div:      <div id="static-caption"></div>
 *  3. after GSAP tl: buildStaticCaption(tl, FAN_LINE);
 *
 *     FAN_LINE = the clip.json hook_title in fan voice, naming the artist,
 *       e.g. "Dua's outfit reveal for 'New Rules' is insane"
 *
 * OPTIONS (3rd arg object, all optional — defaults are the validated values)
 * ──────────────────────────────────────────────────────────────────────
 *  appear     {number}  timeline time the animation starts (s).   Default 0
 *  duration   {number}  total visible+drift+fade window (s).      Default 4.4
 *  driftX     {number}  px drifted right over `duration`.         Default 24
 *  driftYFrom {number}  initial y offset (px).                    Default -11
 *  driftYTo   {number}  y offset when the fade-out begins (px).   Default -3
 *  fadeStart  {number}  fraction of `duration` where fade begins. Default 0.909
 *  layerId    {string}  container id.                             Default 'static-caption'
 *
 * SECURITY: the text is untrusted (clip.json) → set via textContent, never innerHTML.
 */

function buildStaticCaption(tl, text, options) {
  options = options || {};
  var layerId    = options.layerId    || 'static-caption';
  var appear     = options.appear     != null ? options.appear     : 0;
  var duration   = options.duration   != null ? options.duration   : 4.4;
  var driftX     = options.driftX     != null ? options.driftX     : 24;
  var driftYFrom = options.driftYFrom != null ? options.driftYFrom : -11;
  var driftYTo   = options.driftYTo   != null ? options.driftYTo   : -3;
  var fadeStart  = options.fadeStart  != null ? options.fadeStart  : 0.909;

  var layer = document.getElementById(layerId);
  if (!layer) return;
  layer.innerHTML = '';                       // clear
  var span = document.createElement('span');
  span.className = 'sc-txt';
  span.textContent = String(text == null ? '' : text);   // untrusted → textContent
  layer.appendChild(span);

  // Instantly visible (CSS default opacity:1) — drift subtly, then fade out
  // in the final (1 - fadeStart) fraction of `duration`.
  var fadeKey = (fadeStart * 100).toFixed(1) + '%';
  var keyframes = {};
  keyframes['0%']    = { opacity: 1, x: 0,      y: driftYFrom };
  keyframes[fadeKey] = { opacity: 1, x: driftX, y: driftYTo   };
  keyframes['100%']  = { opacity: 0 };

  tl.to(layer, { keyframes: keyframes, duration: duration }, appear);
}
