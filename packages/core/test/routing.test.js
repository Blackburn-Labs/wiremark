// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse, render, toFlowGraph } from '../src/index.js';
import { layout } from '../src/layout.js';
import { layoutFrames } from '../src/frame-layout.js';
import { connectorGeometry } from '../src/render.js';
import { planFlow, realizeRoutes, inferComponents } from '../src/routing.js';
import {
  measureText, FRAME_FLOW_GAP, CHANNEL_TRACK_GAP, CHANNEL_PAD,
  CONNECTOR_LABEL_PAD, CONNECTOR_LABEL_CLEAR, CONNECTOR_LABEL_STAGGER,
  FLOW_LANE_MARGIN, FLOW_LANE_GAP,
} from '../src/metrics.js';
import {
  polylineHitsRect, polylinesCross, polylineOverlap, labelRect, rectsOverlap,
} from './helpers/flow-geometry.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');
/** @param {string} name */
const fixture = (name) => readFileSync(join(FIXTURES, name), 'utf8');

/** Parse + size + flow-position a fixture, returning placed rects + the viewBox. @param {string} file @param {'TD'|'LR'} dir */
function scene(file, dir) {
  const src = fixture(file);
  const doc = parse(src);
  const graph = toFlowGraph(doc);
  const frames = layoutFrames(layout(doc), graph, { direction: dir });
  const placed = frames.filter((f) => f.visible)
    .map((f) => ({ frame: f, x: f.x, y: f.y, w: f.w, h: f.h }));
  const svg = render(src, { direction: dir }).svg;
  const vb = /viewBox="(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)"/.exec(svg);
  const [, vx, vy, vw, vh] = vb.map(Number);
  return { placed, graph, geom: connectorGeometry(placed, graph, dir), viewBox: { x: vx, y: vy, w: vw, h: vh } };
}

/** Like scene() but from an inline source string (no fixture file). @param {string} src @param {'TD'|'LR'} dir */
function sceneFromSrc(src, dir) {
  const doc = parse(src);
  const graph = toFlowGraph(doc);
  const frames = layoutFrames(layout(doc), graph, { direction: dir });
  const placed = frames.filter((f) => f.visible).map((f) => ({ frame: f, x: f.x, y: f.y, w: f.w, h: f.h }));
  return { placed, graph, geom: connectorGeometry(placed, graph, dir) };
}

/** Synthetic plan nodes from {id,rank,c0,c1}. @param {*[]} ns */
const nodes = (ns) => ns.map((n) => ({ id: n.id, rank: n.rank, cross0: n.c0, cross1: n.c1 }));
/** Synthetic placed rects from {id,x,y,w,h}. @param {*[]} rs */
const rects = (rs) => rs.map((r) => ({ frame: { id: r.id }, x: r.x, y: r.y, w: r.w, h: r.h }));

/* ----------------------------- unit: planFlow ----------------------------- */

test('channel width: a single straight run stays the minimum (FRAME_FLOW_GAP)', () => {
  // Aligned frames -> the one run is straight (tailCross == headCross) -> no track.
  const plan = planFlow(
    nodes([{ id: 'a', rank: 0, c0: 0, c1: 100 }, { id: 'b', rank: 1, c0: 0, c1: 100 }]),
    [{ from: 'a', to: 'b', index: 0 }], 'TD',
  );
  assert.equal(plan.routes[0].straight, true, 'aligned frames give a straight run');
  assert.equal(plan.channelWidths[0], FRAME_FLOW_GAP, 'a straight-only channel stays at the minimum');
});

test('channel width: k bending runs widen to 2*PAD + (k-1)*TRACK_GAP', () => {
  // A fan-out whose targets sit off their anchors -> every run bends.
  const plan = planFlow(
    nodes([
      { id: 'a', rank: 0, c0: 0, c1: 300 },
      { id: 't1', rank: 1, c0: 0, c1: 60 },
      { id: 't2', rank: 1, c0: 100, c1: 160 },
      { id: 't3', rank: 1, c0: 240, c1: 300 },
    ]),
    [{ from: 'a', to: 't1', index: 0 }, { from: 'a', to: 't2', index: 1 }, { from: 'a', to: 't3', index: 2 }],
    'TD',
  );
  const k = plan.routes.filter((r) => r.channel === 0 && !r.straight).length;
  assert.equal(k, 3, 'all three fan-out runs bend');
  assert.equal(plan.channelWidths[0], 2 * CHANNEL_PAD + (k - 1) * CHANNEL_TRACK_GAP);
  assert.ok(plan.channelWidths[0] > FRAME_FLOW_GAP, 'the channel genuinely widened past the minimum');
});

test('channel width: a label widens the channel in LR (along the flow) but not in TD', () => {
  const label = 'Create Child Record Entry';
  const ns = nodes([{ id: 'a', rank: 0, c0: 0, c1: 100 }, { id: 'b', rank: 1, c0: 0, c1: 100 }]);
  const edges = [{ from: 'a', to: 'b', label, index: 0 }];
  const td = planFlow(ns, edges, 'TD');
  const lr = planFlow(ns, edges, 'LR');
  assert.equal(td.channelWidths[0], FRAME_FLOW_GAP, 'in TD the label is only ~1 line tall -> no widening');
  const w = measureText(label, 12).w;
  // straight run -> trackOffset 0 -> labelNeed = w + 2*(PAD + CLEAR).
  assert.equal(lr.channelWidths[0], w + 2 * (CONNECTOR_LABEL_PAD + CONNECTOR_LABEL_CLEAR));
});

test('track order is deterministic across runs and keeps a bidirectional pair adjacent', () => {
  const ns = nodes([
    { id: 'a', rank: 0, c0: 0, c1: 200 },
    { id: 'b', rank: 1, c0: 600, c1: 800 },
  ]);
  const edges = [{ from: 'a', to: 'b', index: 0 }, { from: 'b', to: 'a', index: 1 }];
  const p1 = planFlow(ns, edges, 'TD');
  const p2 = planFlow(ns, edges, 'TD');
  assert.deepEqual(p1.routes, p2.routes, 'identical input -> identical plan');
  const ab = p1.routes.find((r) => r.from === 'a' && r.to === 'b');
  const ba = p1.routes.find((r) => r.from === 'b' && r.to === 'a');
  assert.equal(Math.abs(ab.trackOffset - ba.trackOffset), CHANNEL_TRACK_GAP,
    'the two shafts sit on adjacent tracks');
});

test('lane assignment: a skip edge picks the nearer side and nests by rank span', () => {
  // a (rank0) and the c-side targets sit on the LOW cross side; two skip edges of
  // different span nest on parallel lanes there.
  const ns = nodes([
    { id: 'a', rank: 0, c0: 0, c1: 100 },
    { id: 'b', rank: 1, c0: 400, c1: 500 },
    { id: 'c', rank: 2, c0: 0, c1: 100 },
    { id: 'd', rank: 3, c0: 0, c1: 100 },
  ]);
  const plan = planFlow(ns, [
    { from: 'a', to: 'b', index: 0 },
    { from: 'b', to: 'c', index: 1 },
    { from: 'c', to: 'd', index: 2 },
    { from: 'a', to: 'c', index: 3 }, // span 2 skip
    { from: 'a', to: 'd', index: 4 }, // span 3 skip
  ], 'TD');
  const ac = plan.routes.find((r) => r.from === 'a' && r.to === 'c');
  const ad = plan.routes.find((r) => r.from === 'a' && r.to === 'd');
  assert.equal(ac.kind, 'skip');
  assert.equal(ad.kind, 'skip');
  assert.equal(ac.laneSide, 'low', 'both skips hug the low side (their anchors sit there)');
  assert.equal(ad.laneSide, 'low');
  assert.equal(ac.laneLevel, 0, 'the shorter-span skip nests innermost');
  assert.equal(ad.laneLevel, 1, 'the longer-span skip nests outside it');
  assert.equal(Math.abs(ac.laneCross - ad.laneCross), FLOW_LANE_GAP, 'nested lanes are FLOW_LANE_GAP apart');
  assert.equal(plan.lane.lowExtent, FLOW_LANE_MARGIN + 1 * FLOW_LANE_GAP, 'the reservation covers the outer lane');
});

test('label stagger: captions that collide along the cross axis offset on the main axis', () => {
  // Two same-pair edges (distinct labels) share one channel, both straight at the
  // channel centre; their wide labels overlap in cross, so the second staggers by
  // CONNECTOR_LABEL_STAGGER on the main axis rather than stacking exactly.
  const placed = rects([
    { id: 'a', x: 0, y: 0, w: 400, h: 100 },
    { id: 'b', x: 0, y: 200, w: 400, h: 100 },
  ]);
  const geom = connectorGeometry(placed, {
    edges: [
      { from: 'a', to: 'b', label: 'First wide caption here' },
      { from: 'a', to: 'b', label: 'Second wide caption here' },
    ],
  }, 'TD');
  const l1 = geom.find((g) => g.label === 'First wide caption here').labelAt;
  const l2 = geom.find((g) => g.label === 'Second wide caption here').labelAt;
  assert.ok(l1 && l2, 'both edges carry a labelAt');
  assert.equal(Math.abs(l1.y - l2.y), CONNECTOR_LABEL_STAGGER, 'colliding labels stagger by one step on the main axis');
});

test('inferComponents recovers ranks, bands, and bbox from placed rects', () => {
  const placed = rects([
    { id: 'a', x: 0, y: 0, w: 400, h: 200 },
    { id: 'b', x: 700, y: 280, w: 400, h: 200 },
    { id: 'c', x: 150, y: 560, w: 400, h: 200 },
  ]);
  const comps = inferComponents(placed, { edges: [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }] }, 'TD');
  assert.equal(comps.length, 1, 'the three frames form one component');
  const { nodes: ns, bands, bbox } = comps[0];
  const rankOf = (/** @type {string} */ id) => ns.find((n) => n.id === id).rank;
  assert.deepEqual([rankOf('a'), rankOf('b'), rankOf('c')], [0, 1, 2], 'ranks follow the sorted main-starts');
  assert.deepEqual(bands[0], { near: 0, far: 200 }, "rank 0's band is #a's y-span");
  assert.deepEqual(bands[1], { near: 280, far: 480 });
  assert.deepEqual(bbox, { crossMin: 0, crossMax: 1100 }, 'bbox spans every frame on the cross axis');
});

test('inferComponents drops a frame that no drawable edge touches', () => {
  const placed = rects([
    { id: 'a', x: 0, y: 0, w: 100, h: 100 },
    { id: 'b', x: 0, y: 200, w: 100, h: 100 },
    { id: 'lonely', x: 400, y: 0, w: 100, h: 100 },
  ]);
  const comps = inferComponents(placed, { edges: [{ from: 'a', to: 'b' }] }, 'TD');
  assert.equal(comps.length, 1, 'only the linked pair is a routable component');
  assert.deepEqual(comps[0].nodes.map((n) => n.id).sort(), ['a', 'b']);
});

/* -------------------------- invariants over fixtures ---------------------- */

const FLOW_FIXTURES = ['multi-frame.wiremark', 'flow-routing.wiremark'];

for (const file of FLOW_FIXTURES) {
  for (const dir of /** @type {const} */ (['TD', 'LR'])) {
    test(`${file} (${dir}): ZERO connector segments cut through a frame interior`, () => {
      const { placed, geom } = scene(file, dir);
      for (const g of geom)
        for (const p of placed)
          assert.ok(!polylineHitsRect(g.points, p),
            `${g.from}->${g.to} cuts through #${p.frame.id}`);
    });

    test(`${file} (${dir}): ZERO collinear overlaps between distinct connectors`, () => {
      const { geom } = scene(file, dir);
      for (let i = 0; i < geom.length; i++)
        for (let j = i + 1; j < geom.length; j++)
          assert.ok(polylineOverlap(geom[i].points, geom[j].points) <= 1,
            `${geom[i].from}->${geom[i].to} overlaps ${geom[j].from}->${geom[j].to}`);
    });

    test(`${file} (${dir}): ZERO connector-connector crossings`, () => {
      const { geom } = scene(file, dir);
      for (let i = 0; i < geom.length; i++)
        for (let j = i + 1; j < geom.length; j++)
          assert.ok(!polylinesCross(geom[i].points, geom[j].points),
            `${geom[i].from}->${geom[i].to} crosses ${geom[j].from}->${geom[j].to}`);
    });

    test(`${file} (${dir}): ZERO label boxes overlap a frame`, () => {
      const { placed, geom } = scene(file, dir);
      for (const g of geom) {
        if (!g.label || !g.labelAt) continue;
        const box = labelRect(g.labelAt, g.label);
        for (const p of placed)
          assert.ok(!rectsOverlap(box, { x: p.x, y: p.y, w: p.w, h: p.h }),
            `label "${g.label}" (${g.from}->${g.to}) overlaps #${p.frame.id}`);
      }
    });

    test(`${file} (${dir}): every connector point lies inside the viewBox`, () => {
      const { geom, viewBox } = scene(file, dir);
      for (const g of geom)
        for (const pt of g.points) {
          assert.ok(pt.x >= viewBox.x && pt.x <= viewBox.x + viewBox.w, `${g.from}->${g.to} x out of viewBox`);
          assert.ok(pt.y >= viewBox.y && pt.y <= viewBox.y + viewBox.h, `${g.from}->${g.to} y out of viewBox`);
        }
    });
  }
}

test('flow-routing exercises the lane path: the synthetic skip edge routes 6 points around the ranks', () => {
  const { geom } = scene('flow-routing.wiremark', 'TD');
  const skip = geom.find((g) => g.from === 'import-warning' && g.to === 'records');
  assert.ok(skip, 'the synthetic #import-warning -> #records skip edge is drawn');
  assert.equal(skip.points.length, 6, 'a back-skip edge routes via a lane (6 points)');
});

/* ----------------- regression: same-pair skips & duplicate ids ------------ */

// Two skip-rank edges on ONE frame pair must nest on lanes by anchor proximity to
// the side, not declaration index -- else the nearer-anchored edge lands on the
// INNER lane and sweeps across the other (a crossing). Neither invariant fixture
// contains a multi-edge same-pair skip, so these guard it directly. (tasks/FLOW.md)
const SAME_PAIR_SKIPS = {
  'back-link to an ancestor (a->d forward skip + d->a back skip)': [
    'Wireframe #a w=400 h=200', '  Button "Start" to=#b', '  Button "Jump to D" to=#d',
    'Wireframe #b w=400 h=200', '  Button "n" to=#c',
    'Wireframe #c w=400 h=200', '  Button "n" to=#d',
    'Wireframe #d w=400 h=200', '  Link "Back to A" to=#a',
  ].join('\n'),
  'two distinct controls linking to one deep screen (two a->d skips)': [
    'Wireframe #a w=600 h=200', '  Button "Open D" to=#d', '  Button "Jump to D" to=#d', '  Button "Next" to=#b',
    'Wireframe #b w=400 h=200', '  Button "n" to=#c',
    'Wireframe #c w=400 h=200', '  Button "n" to=#d',
    'Wireframe #d w=400 h=200', '  Typography h6 "D"',
  ].join('\n'),
};

for (const [shape, src] of Object.entries(SAME_PAIR_SKIPS)) {
  for (const dir of /** @type {const} */ (['TD', 'LR'])) {
    test(`regression (${dir}): same-pair skip edges never cross -- ${shape}`, () => {
      const { placed, geom } = sceneFromSrc(src, dir);
      // the pathological pair really is routed as skips (6-point lane routes)
      const skips = geom.filter((g) => g.points.length === 6);
      assert.ok(skips.length >= 2, 'at least two skip (lane) edges are present');
      for (let i = 0; i < geom.length; i++)
        for (let j = i + 1; j < geom.length; j++) {
          assert.ok(!polylinesCross(geom[i].points, geom[j].points),
            `${geom[i].from}->${geom[i].to} crosses ${geom[j].from}->${geom[j].to}`);
          assert.ok(polylineOverlap(geom[i].points, geom[j].points) <= 1,
            `${geom[i].from}->${geom[i].to} overlaps ${geom[j].from}->${geom[j].to}`);
        }
      for (const g of geom)
        for (const p of placed)
          assert.ok(!polylineHitsRect(g.points, p), `${g.from}->${g.to} cuts through #${p.frame.id}`);
    });
  }
}

test('regression: a duplicate frame id resolves first-wins in BOTH stages (no through-frame)', () => {
  // frame-layout sizes the channel for the FIRST #dup; inferComponents must target
  // the same one, or the connector is drawn to a different physical frame and slices
  // through the others. (Degenerate input -- the language has no duplicate-frame-id
  // diagnostic yet -- but the two stages must still agree.)
  const src = [
    'Wireframe #a w=300 h=100', '  Button "go" to=#dup',
    'Wireframe #dup w=300 h=100', '  Typography h6 "first"',
    'Wireframe #dup w=900 h=400', '  Typography h6 "second"',
  ].join('\n');
  for (const dir of /** @type {const} */ (['TD', 'LR'])) {
    const { placed, geom } = sceneFromSrc(src, dir);
    for (const g of geom)
      for (const p of placed)
        assert.ok(!polylineHitsRect(g.points, p), `${g.from}->${g.to} cuts through #${p.frame.id} (${dir})`);
  }
});

/* ------------------------------- determinism ------------------------------ */

test('flow-routing renders byte-identically across runs (TD and LR)', () => {
  for (const dir of /** @type {const} */ (['TD', 'LR'])) {
    const a = render(fixture('flow-routing.wiremark'), { direction: dir }).svg;
    const b = render(fixture('flow-routing.wiremark'), { direction: dir }).svg;
    assert.equal(a, b);
  }
});
