/**
 * caption-static.js  —  Static fan-voice caption for HyperFrames (music lens)
 * Style: one persistent stan/fan-voice line (NOT karaoke).
 * Font:  Anton 400  (linked via styles/caption-static.css)
 *
 * USAGE
 * ──────────────────────────────────────────────────────────────────────
 *  1. <head>:        <link rel="stylesheet" href="styles/caption-static.css">
 *  2. root div:      <div id="static-caption"></div>
 *  3. after GSAP tl: buildStaticCaption(tl, FAN_LINE, { appear: 0.2 });
 *
 *     FAN_LINE = the clip.json hook_title in fan voice, e.g.
 *       "the vocals on Love Again are actually insane"  /  "that mic was ON"
 *
 * OPTIONS (4th arg object, all optional)
 * ──────────────────────────────────────────────────────────────────────
 *  appear   {number}  when the line fades in (s).            Default 0.2
 *  fadeIn   {number}  fade-in duration (s).                  Default 0.4
 *  hold     {number}  if set, the line fades OUT at this time (s); omit to
 *                     keep it on screen for the whole clip.  Default: persist
 *  fadeOut  {number}  fade-out duration (s).                 Default 0.4
 *  rise     {number}  px it drifts up while fading in (0 = none). Default 24
 *  layerId  {string}  container id.                          Default 'static-caption'
 *
 * SECURITY: the text is untrusted (clip.json) → set via textContent, never innerHTML.
 */

function buildStaticCaption(tl, text, options) {
  options = options || {};
  var layerId = options.layerId || 'static-caption';
  var appear  = options.appear  != null ? options.appear  : 0.2;
  var fadeIn  = options.fadeIn  != null ? options.fadeIn  : 0.4;
  var fadeOut = options.fadeOut != null ? options.fadeOut : 0.4;
  var rise    = options.rise    != null ? options.rise    : 24;
  var hold    = options.hold;   // undefined ⇒ persist to end

  var layer = document.getElementById(layerId);
  if (!layer) return;
  layer.innerHTML = '';                       // clear
  var span = document.createElement('span');
  span.className = 'sc-txt';
  span.textContent = String(text == null ? '' : text);   // untrusted → textContent
  layer.appendChild(span);

  // Hidden + slightly lowered before it appears
  tl.set(layer, { opacity: 0, y: rise }, 0);

  // Fade in (with a small upward drift) on the beat
  tl.to(layer, { opacity: 1, y: 0, duration: fadeIn, ease: 'power2.out' }, appear);

  // Optional fade out — omit `hold` to keep the line up for the whole clip
  if (hold != null) {
    tl.to(layer, { opacity: 0, duration: fadeOut, ease: 'power2.in' }, hold);
  }
}
