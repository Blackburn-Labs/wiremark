// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse, render, toFlowGraph } from '../src/index.js';
import { layout } from '../src/layout.js';
import { layoutFrames } from '../src/frame-layout.js';
import { connectorGeometry } from '../src/render.js';
import { PRESET_SIZES, FRAME_FLOW_GAP, CONNECTOR_SPREAD, CONNECTOR_WIDTH } from '../src/metrics.js';

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

const { h: LH } = PRESET_SIZES.landscape; // every frame in the fixture is landscape

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
  assert.equal(home.y, login.y + LH + FRAME_FLOW_GAP, '#home sits one rank below #login');
  assert.equal(details.y, home.y + LH + FRAME_FLOW_GAP, '#details sits one rank below #home (back-link ignored)');
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
  assert.equal((svg.match(/<g transform/g) ?? []).length, 4, 'four visible frames are placed (shell is hidden)');

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
  // Both are elbows; their horizontal across-runs (points[1].y is the bend) sit at
  // DIFFERENT y, so the lines don't overlap on the across segment either.
  assert.equal(fwd.points.length, 4);
  assert.equal(back.points.length, 4);
  assert.notEqual(fwd.points[1].y, back.points[1].y, 'the across-runs are vertically separated');
  assert.equal(Math.round(Math.abs(fwd.points[1].y - back.points[1].y)), CONNECTOR_SPREAD, 'by CONNECTOR_SPREAD');
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

test('direction is a keyed Wireframe prop and an option override', () => {
  const doc = parse('Wireframe #a landscape direction=LR\n  Typography "x"');
  assert.equal(doc.frames[0].props.direction, 'LR');

  // The render-time option wins over any in-source value.
  const src = fixture('multi-frame.wiremark');
  const td = render(src, { direction: 'TD' }).svg;
  const lr = render(src, { direction: 'LR' }).svg;
  assert.notEqual(td, lr, 'TD and LR produce different layouts');
});

test('single-frame files render exactly as before (no flow chrome)', () => {
  const { svg } = render('Wireframe\n  Typography "Hello"');
  assert.match(svg, /viewBox="0 0 800 600"/, 'legacy origin + default canvas size preserved');
  assert.equal((svg.match(/<g transform/g) ?? []).length, 1, 'one frame group');
  assert.doesNotMatch(svg, /wm-connectors/, 'no connector layer for a lone frame');
});
