/**
 * caption-neon.js  —  Reusable karaoke caption engine for HyperFrames
 * Style: Neon Accent  (white base · #FFD60A active · no green)
 * Font:  Anton 400  (linked via styles/caption-neon.css)
 *
 * USAGE
 * ──────────────────────────────────────────────────────────────────────
 *  1. In <head>:
 *       <link rel="stylesheet" href="styles/caption-neon.css">
 *
 *  2. In the composition root div:
 *       <div id="caption-layer"></div>
 *
 *  3. Before the closing </script> (after your GSAP timeline is created):
 *       <script src="scripts/caption-neon.js"></script>
 *       ...
 *       buildCaptions(tl, WORDS, [0, 15, 159]);
 *
 *     where WORDS is:
 *       [ { t: "word", s: 0.000, e: 0.420 }, ... ]   (s/e in composition seconds)
 *
 *     and the third argument is an array of word indices where clips change
 *     (groups must never span a clip boundary — they'd straddle the cut).
 *
 * OPTIONS  (optional 4th argument object)
 * ──────────────────────────────────────────────────────────────────────
 *  groupSize  {number}  Words per caption block. Default: 8 (~2 lines at 56px)
 *  layerId    {string}  ID of the caption container div. Default: 'caption-layer'
 *
 * DEFAULTS BAKED IN (match caption-neon.css 1080×1920 9:16 template)
 * ──────────────────────────────────────────────────────────────────────
 *  groupSize : 8          → ~2 lines at 56 px in a 1080 px wide canvas
 *  font-size : 56 px      (set in caption-neon.css)
 *  bottom    : 260 px     TikTok/Reels safe zone (set in caption-neon.css)
 *  base color: #FFFFFF
 *  active    : #FFD60A    with multi-layer neon glow
 *  timing    : instant cut (duration:0) — old group hides the moment the
 *              new group appears → zero gap, zero overlap
 */

function buildCaptions(tl, words, clipBoundaryWordIndices, options) {
  options = options || {};
  var GROUP_SIZE  = options.groupSize || 8;
  var layerId     = options.layerId   || 'caption-layer';
  var CLIP_STARTS = clipBoundaryWordIndices || [];

  var WHITE_SHADOW = '1px 1px 3px rgba(0,0,0,0.85), -1px -1px 3px rgba(0,0,0,0.85), 0 2px 6px rgba(0,0,0,0.6)';
  var NEON_SHADOW  = '0 0 8px #FFD60A, 0 0 18px #FFD60A, 0 0 35px rgba(255,214,10,0.65), 1px 1px 3px rgba(0,0,0,0.6), -1px -1px 3px rgba(0,0,0,0.6)';

  // ── 1. Build groups, respecting clip boundaries ──────────────────────
  var groups = [];
  var wi = 0;
  while (wi < words.length) {
    var nextBound = words.length;
    for (var b = 0; b < CLIP_STARTS.length; b++) {
      if (CLIP_STARTS[b] > wi && CLIP_STARTS[b] < nextBound) {
        nextBound = CLIP_STARTS[b];
      }
    }
    var size = Math.min(GROUP_SIZE, nextBound - wi);
    groups.push(words.slice(wi, wi + size));
    wi += size;
  }

  // ── 2. Build caption DOM ─────────────────────────────────────────────
  var layer = document.getElementById(layerId);
  layer.innerHTML = '';  // clear any previous captions

  var globalWordIdx = 0;
  groups.forEach(function(group, gi) {
    var div = document.createElement('div');
    div.className = 'cap-group';
    div.id = 'cg-' + gi;
    group.forEach(function(word) {
      var span = document.createElement('span');
      span.className = 'cap-word';
      span.id = 'cw-' + globalWordIdx;
      span.textContent = word.t + ' ';
      div.appendChild(span);
      globalWordIdx++;
    });
    layer.appendChild(div);
  });

  // ── 3. Wire GSAP tweens ──────────────────────────────────────────────
  var flatIdx = 0;
  groups.forEach(function(group, gi) {
    var gStart = group[0].s;
    var gEnd   = group[group.length - 1].e;
    var gId    = '#cg-' + gi;

    // Show instantly when this group's first word starts
    tl.to(gId, { opacity: 1, duration: 0, overwrite: 'auto' }, gStart);

    // Hide exactly when the next group appears — zero gap, zero overlap
    var nextStart = (gi + 1 < groups.length) ? groups[gi + 1][0].s : (gEnd + 0.3);
    tl.to(gId,  { opacity: 0, duration: 0, overwrite: 'auto' }, nextStart);
    tl.set(gId, { opacity: 0, visibility: 'hidden' },            nextStart + 0.01);

    // Per-word karaoke highlight
    group.forEach(function(word, wInGroup) {
      var wId     = '#cw-' + flatIdx;
      var offTime = group[wInGroup + 1] ? group[wInGroup + 1].s : (gEnd + 0.04);

      tl.to(wId, { color: '#FFD60A', textShadow: NEON_SHADOW, duration: 0, overwrite: 'auto' }, word.s);
      tl.to(wId, { color: '#FFFFFF', textShadow: WHITE_SHADOW, duration: 0, overwrite: 'auto' }, offTime);

      flatIdx++;
    });
  });
}
