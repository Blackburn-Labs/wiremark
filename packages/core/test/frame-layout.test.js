// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse, render, toFlowGraph } from '../src/index.js';
import { layout } from '../src/layout.js';
import { layoutFrames } from '../src/frame-layout.js';
import { connectorGeometry } from '../src/render.js';
import { connectorArrow } from '../src/draw.js';
import { PRESET_SIZES, FRAME_FLOW_GAP, CONNECTOR_SPREAD, CONNECTOR_WIDTH, CHANNEL_TRACK_GAP, CHANNEL_PAD } from '../src/metrics.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');
/** @param {string} name */
const fixture = (name) => readFileSync(join(FIXTURES, name), 'utf8');

/** Parse + size + flow-position the multi-frame fixture. @param {'TD'|'LR'} dir */
function positioned(dir) {
  const doc = parse(fixture('multi-frame.wiremark'));
  const graph = toFlowGraph(doc);
  const frames = layoutFrames(layout(doc), graph, { direction: dir });
  /** @param {string} id */
  const byId = (id) => /** @type {*} */ (frames.find((f) => f.id === id));
  return { frames, byId, graph };
}

/** Visible frames as render's placed-rect shape. @param {*[]} frames */
const placedOf = (frames) =>
  frames.filter((f) => f.visible).map((f) => ({ frame: f, x: f.x, y: f.y, w: f.w, h: f.h }));

/** Synthetic placed rects from {id,x,y,w,h}. @param {*[]} rs */
const rects = (rs) => rs.map((r) => ({ frame: { id: r.id }, x: r.x, y: r.y, w: r.w, h: r.h }));

/** Do two connector polylines properly intersect (endpoints touching don't count)? @param {*[]} a @param {*[]} b */
function pathsCross(a, b) {
  const seg = (/** @type {*} */ p1, /** @type {*} */ p2, /** @type {*} */ p3, /** @type {*} */ p4) => {
    const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
    if (Math.abs(d) < 1e-9) return false;
    const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
    const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
    return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
  };
  for (let i = 0; i < a.length - 1; i++)
    for (let j = 0; j < b.length - 1; j++)
      if (seg(a[i], a[i + 1], b[j], b[j + 1])) return true;
  return false;
}

const { h: LH } = PRESET_SIZES.landscape; // #login is landscape; the anchored frames adopt #shell's landscape canvas

/**
 * Count placed frames by a marker that is genuinely 1:1 with a frame group:
 * render.js wraps every visible frame in its own `<clipPath id="wm-clip-N">`
 * (the per-frame overflow clip). A bare `<g transform>` count is NOT a valid
 * proxy -- resolved icons (`iconBody` -> `<g transform="translate(...) scale(...)">`)
 * and any other transformed group inflate it, so a frame holding an icon would
 * over-count. The clip id is emitted once per placed frame and by nothing else.
 * @param {string} svg @returns {number}
 */
const frameCount = (svg) => (svg.match(/<clipPath id="wm-clip-\d+"/g) ?? []).length;

// The fixture: #login -> #home, then #home fans out to #details and #product, with
// a #details -> #home back-link. (#login -> #reset and #product -> #detail are
// dangling; #shell is the invisible background.)

test('multi-frame: invisible background frame is excluded from the flow but still composes', () => {
  const { byId } = positioned('TD');
  const shell = byId('shell');
  // #shell is visible=false: a graph node it is not, so it gets no position...
  assert.equal(shell.x, undefined);
  assert.equal(shell.y, undefined);
  // ...yet it still underlays #home/#details as a background= template.
  assert.ok(byId('home').backgroundChain.some((/** @type {*} */ b) => b.id === 'shell'),
    '#home should still paint over #shell');
});

test('multi-frame (TD): linked frames rank top-to-bottom; the back-link does not reorder them', () => {
  const { byId } = positioned('TD');
  const login = byId('login');
  const home = byId('home');
  const details = byId('details');
  assert.ok(login.y < home.y && home.y < details.y, '#login -> #home -> #details run down the ranks');
  // #login -> #home is a single straight run, so its channel stays the minimum.
  assert.equal(home.y, login.y + LH + FRAME_FLOW_GAP, '#home sits one rank below #login');
  // The #home -> {#details, #product} + back channel carries 3 bending runs, so it
  // widens past the minimum to seat their tracks (2*CHANNEL_PAD + (3-1)*TRACK_GAP).
  assert.equal(details.y, home.y + LH + (2 * CHANNEL_PAD + 2 * CHANNEL_TRACK_GAP),
    '#details sits one rank below #home; the channel widens for its tracks (back-link ignored)');
});

test('multi-frame (TD): a parent is centered over its fanned-out children', () => {
  const { byId } = positioned('TD');
  const cx = (/** @type {*} */ f) => f.x + f.w / 2;
  const login = byId('login'), home = byId('home'), details = byId('details'), product = byId('product');
  assert.equal(login.x, home.x, 'single-node ranks (#login, #home) share one centered column');
  assert.ok(details.x < product.x, '#details and #product are siblings, left to right');
  assert.equal(cx(home), (cx(details) + cx(product)) / 2, '#home is centered over its two children');
});

test('multi-frame (LR): the flow axis swaps to horizontal', () => {
  const { byId } = positioned('LR');
  const login = byId('login'), home = byId('home'), details = byId('details'), product = byId('product');
  assert.ok(login.x < home.x && home.x < details.x, 'ranks progress left-to-right in LR');
  assert.equal(product.x, details.x, '#details and #product share the last rank');
});

test('multi-frame: layout is deterministic across runs', () => {
  const a = positioned('TD').frames.map((f) => `${f.id}:${f.x},${f.y}`).join('|');
  const b = positioned('TD').frames.map((f) => `${f.id}:${f.x},${f.y}`).join('|');
  assert.equal(a, b);
  assert.equal(render(fixture('multi-frame.wiremark')).svg, render(fixture('multi-frame.wiremark')).svg);
});

test('multi-frame render: frames placed in 2D with frame-to-frame connectors', () => {
  const { svg, diagnostics } = render(fixture('multi-frame.wiremark'));
  assert.deepEqual(diagnostics, [], 'the fixture resolves cleanly');
  assert.equal(frameCount(svg), 4, 'four visible frames are placed (shell is hidden)');

  // Connectors live in their own layer, on top of the frames.
  const layer = svg.match(/<g class="wm-connectors">([\s\S]*)<\/g><\/svg>$/);
  assert.ok(layer, 'a wm-connectors layer is emitted');
  assert.ok((layer[1].match(/<path /g) ?? []).length >= 3, 'the layer draws arrow paths');
  assert.ok(layer[1].includes('Back'), 'the labeled edge caption appears in the connector layer');

  // A negative-origin, padded viewBox is the multi-frame signature.
  assert.match(svg, /viewBox="-\d+ -\d+ \d+ \d+"/);
});

test('multi-frame: only resolvable links draw; dangling to=#reset / to=#detail are dropped', () => {
  const { frames, graph } = positioned('TD');
  const geom = connectorGeometry(placedOf(frames), graph, 'TD');
  assert.equal(geom.length, 4, '#login->#home, #home->#details, #home->#product, #details->#home');
  assert.ok(
    !geom.some((c) => ['reset', 'detail'].includes(c.from) || ['reset', 'detail'].includes(c.to)),
    'targets that are not frames (#reset, #detail) are skipped',
  );
});

test('multi-frame: a bidirectional pair stays grouped and on the edge', () => {
  const { frames, graph } = positioned('TD');
  const geom = connectorGeometry(placedOf(frames), graph, 'TD');
  const home = frames.find((f) => f.id === 'home');
  const details = frames.find((f) => f.id === 'details');

  const fwd = geom.find((c) => c.from === 'home' && c.to === 'details');
  const back = geom.find((c) => c.from === 'details' && c.to === 'home');
  assert.ok(fwd && back, 'both directions of the #home <-> #details pair are present');

  // Every anchor sits exactly ON a frame edge (the old perpendicular offset floated
  // them off the side).
  assert.equal(fwd.tail.y, home.y + home.h, "#home->#details leaves #home's bottom edge");
  assert.equal(fwd.head.y, details.y, "#home->#details meets #details's top edge");
  assert.equal(back.tail.y, details.y, "#details->#home leaves #details's top edge");
  assert.equal(back.head.y, home.y + home.h, "#details->#home meets #home's bottom edge");

  // Grouped close: the two shafts are CONNECTOR_SPREAD apart at the shared #home end.
  const sep = Math.hypot(fwd.tail.x - back.head.x, fwd.tail.y - back.head.y);
  assert.equal(Math.round(sep), CONNECTOR_SPREAD, 'the two shafts are CONNECTOR_SPREAD apart');

  // A pair with a single edge (#login -> #home) stays centered on the face.
  const solo = geom.find((c) => c.from === 'login' && c.to === 'home');
  assert.equal(solo.head.x, home.x + home.w / 2, 'a single connector stays centered');
});

test('multi-frame: connectors sharing a face are spread out, ordered toward their targets', () => {
  const { frames, graph } = positioned('TD');
  const geom = connectorGeometry(placedOf(frames), graph, 'TD');
  const home = frames.find((f) => f.id === 'home');

  // #home fans out to #details (left) and #product (right) off its bottom edge.
  const hd = geom.find((c) => c.from === 'home' && c.to === 'details');
  const hp = geom.find((c) => c.from === 'home' && c.to === 'product');
  assert.equal(hd.tail.y, home.y + home.h, 'both leave the bottom edge...');
  assert.equal(hp.tail.y, home.y + home.h);
  assert.notEqual(hd.tail.x, hp.tail.x, '...at different points, not piled at the center');
  assert.ok(hd.tail.x < hp.tail.x, 'anchors order toward their targets (details left, product right)');
});

test('multi-frame: off-axis connectors route as right-angle elbows', () => {
  const { frames, graph } = positioned('TD');
  const geom = connectorGeometry(placedOf(frames), graph, 'TD');

  // #home fans out to a laterally-offset child -> a down/across/down elbow.
  const hp = geom.find((c) => c.from === 'home' && c.to === 'product');
  assert.equal(hp.points.length, 4, 'an off-axis connector bends');
  assert.equal(hp.points[0].x, hp.points[1].x, 'leaves the source face straight down (TD)');
  assert.equal(hp.points[1].y, hp.points[2].y, 'the middle run is horizontal');
  assert.equal(hp.points[2].x, hp.points[3].x, 'enters the target face straight down (TD)');

  // An axis-aligned pair (#login -> #home) stays a single straight segment.
  const lh = geom.find((c) => c.from === 'login' && c.to === 'home');
  assert.equal(lh.points.length, 2, 'aligned frames -> straight connector');
});

test('multi-frame: a bidirectional pair also offsets its across-run, so no part coincides', () => {
  const { frames, graph } = positioned('TD');
  const geom = connectorGeometry(placedOf(frames), graph, 'TD');
  const fwd = geom.find((c) => c.from === 'home' && c.to === 'details');
  const back = geom.find((c) => c.from === 'details' && c.to === 'home');
  // Both are elbows; their horizontal across-runs (points[1].y is the track) sit on
  // ADJACENT tracks, exactly CHANNEL_TRACK_GAP apart, so the lines never coincide.
  assert.equal(fwd.points.length, 4);
  assert.equal(back.points.length, 4);
  const sep = Math.abs(fwd.points[1].y - back.points[1].y);
  assert.equal(sep, CHANNEL_TRACK_GAP, 'the pair sits on adjacent tracks, CHANNEL_TRACK_GAP apart');
});

test('multi-frame: flow connectors are clean (not hand-drawn) and thicker', () => {
  const { svg } = render(fixture('multi-frame.wiremark'));
  const layer = svg.match(/<g class="wm-connectors">([\s\S]*)<\/g><\/svg>$/)[1];
  const paths = [...layer.matchAll(/<path d="([^"]*)"/g)].map((m) => m[1]);
  assert.ok(paths.length > 0, 'connectors draw paths');
  // rough.js sketch strokes are cubic-bezier ("C"); clean connectors are M/L/Z only.
  assert.ok(paths.every((d) => !/[CQA]/.test(d)), 'connector paths have no curve commands -> not hand-drawn');
  assert.match(layer, new RegExp(`stroke-width="${CONNECTOR_WIDTH}"`), 'connectors use the thicker stroke');
});

test('multi-frame: a diagonal bidirectional pair never tangles into an X (either diagonal)', () => {
  for (const bx of [1600, -1600]) { // target lower-right, then lower-left of the source
    const placed = rects([{ id: 'a', x: 0, y: 0, w: 1280, h: 800 }, { id: 'b', x: bx, y: 880, w: 1280, h: 800 }]);
    const geom = connectorGeometry(placed, { edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }] }, 'TD');
    const ab = geom.find((c) => c.from === 'a').points;
    const ba = geom.find((c) => c.from === 'b').points;
    assert.ok(!pathsCross(ab, ba), `the bidirectional pair (bx=${bx}) must not cross`);
  }
});

test('multi-frame: no two connectors cross in the rendered fixture (TD and LR)', () => {
  for (const dir of /** @type {const} */ (['TD', 'LR'])) {
    const { frames, graph } = positioned(dir);
    const geom = connectorGeometry(placedOf(frames), graph, dir);
    for (let i = 0; i < geom.length; i++)
      for (let j = i + 1; j < geom.length; j++)
        assert.ok(!pathsCross(geom[i].points, geom[j].points),
          `${geom[i].from}->${geom[i].to} crosses ${geom[j].from}->${geom[j].to} in ${dir}`);
  }
});

test('multi-frame: a skip-rank connector detours onto a lane outside the component', () => {
  // #a (rank 0) -> #b (rank 1) makes #b a real rank-1 frame; #a -> #c then skips
  // past it to #c (rank 2), so the edge must lane AROUND #b, not cut through it.
  const placed = rects([
    { id: 'a', x: 0, y: 0, w: 400, h: 200 },
    { id: 'b', x: 700, y: 280, w: 400, h: 200 },
    { id: 'c', x: 150, y: 560, w: 400, h: 200 },
  ]);
  const geom = connectorGeometry(placed, { edges: [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }] }, 'TD');
  const ac = geom.find((c) => c.from === 'a' && c.to === 'c').points;
  assert.equal(ac.length, 6, 'a skip-rank edge routes tail-channel -> lane -> head-channel (6 points)');
  // The lane run (points[2]-[3]) is a single vertical OUTSIDE every frame's x-span.
  assert.equal(ac[2].x, ac[3].x, 'the lane run is one vertical line');
  const xs = placed.flatMap((p) => [p.x, p.x + p.w]);
  assert.ok(ac[2].x < Math.min(...xs) || ac[2].x > Math.max(...xs), 'the lane sits clear of all frames');
  // Its two across-runs sit in the gaps above and below #b (y 280..480), not through it.
  assert.ok(ac[1].y > 200 && ac[1].y < 280, 'the tail across-run sits in the gap above #b');
  assert.ok(ac[4].y > 480 && ac[4].y < 560, 'the head across-run sits in the gap below #b');
});

test('multi-frame (LR): off-axis connectors route as across/down/across on the side faces', () => {
  const { frames, graph } = positioned('LR');
  const geom = connectorGeometry(placedOf(frames), graph, 'LR');
  const hp = geom.find((c) => c.from === 'home' && c.to === 'product');
  assert.equal(hp.points.length, 4, 'an off-axis LR connector bends');
  assert.equal(hp.points[0].y, hp.points[1].y, 'leaves the source face horizontally (LR)');
  assert.equal(hp.points[1].x, hp.points[2].x, 'the middle run is vertical');
  assert.equal(hp.points[2].y, hp.points[3].y, 'enters the target face horizontally (LR)');
  const home = frames.find((f) => f.id === 'home');
  assert.equal(hp.points[0].x, home.x + home.w, 'exits the right face in LR');
});

test('connectorArrow degrades gracefully on degenerate input (< 2 points)', () => {
  assert.equal(connectorArrow([]), '');
  assert.equal(connectorArrow([{ x: 1, y: 2 }]), '');
  assert.match(connectorArrow([{ x: 0, y: 0 }, { x: 10, y: 0 }]), /<path /, 'a valid 2-point arrow still draws');
});

test('the Flow directive sets the document orientation; the render option overrides it', () => {
  const doc = parse('Flow LR\nWireframe #a landscape\n  Typography "x"');
  assert.equal(doc.flow, 'LR');
  assert.deepEqual(doc.diagnostics, []);

  // The directive drives multi-frame orientation end-to-end.
  const src = fixture('multi-frame.wiremark');
  const flowTd = render(`Flow TD\n${src}`).svg;
  const flowLr = render(`Flow LR\n${src}`).svg;
  assert.notEqual(flowTd, flowLr, 'the Flow directive changes the layout');

  // The render-time option still wins over the in-source directive.
  assert.equal(render(`Flow LR\n${src}`, { direction: 'TD' }).svg, flowTd, 'option overrides the directive');
});

test('single-frame files render exactly as before (no flow chrome)', () => {
  const { svg } = render('Wireframe\n  Typography "Hello"');
  assert.match(svg, /viewBox="0 0 800 600"/, 'legacy origin + default canvas size preserved');
  assert.equal(frameCount(svg), 1, 'one frame group');
  assert.doesNotMatch(svg, /wm-connectors/, 'no connector layer for a lone frame');
});

test('frame count is robust to icons in the content (wm-clip marker, not <g transform>)', () => {
  // Regression guard for the brittle proxy this test used to use: a resolved icon
  // emits its own `<g transform="translate(...) scale(...)">`, so counting raw
  // `<g transform>` over-counts any frame holding an icon. Two frames, one of which
  // contains an Icon: the robust marker must report 2, while `<g transform>` is
  // inflated past 2 -- proving why frameCount() does not use it.
  const src = [
    'Wireframe #one',
    '  Icon Search',
    'Wireframe #two',
    '  Typography "plain"',
  ].join('\n');
  const { svg, diagnostics } = render(src);
  assert.deepEqual(diagnostics, [], 'the icon resolves cleanly');

  assert.equal(frameCount(svg), 2, 'two frames counted regardless of the icon group');
  // The icon adds at least one extra `<g transform>`, so the old proxy would mis-count.
  assert.ok((svg.match(/<g transform/g) ?? []).length > 2,
    'raw <g transform> is inflated by the icon -- the reason this proxy was replaced');
});
