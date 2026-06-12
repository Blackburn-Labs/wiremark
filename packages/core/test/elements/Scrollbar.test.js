// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';
import { COLORS } from '../../src/draw.js';
import { thumbGeometry } from '../../src/elements/Scrollbar.js';

/**
 * Scrollbar (SPEC: a wireframe affordance, v1.0). An ordinary IN-FLOW leaf (NOT an
 * overlay): a slim strip drawn where it is placed. As a `block` leaf it stretches
 * its LONG axis to the container's cross extent -- vertical strips fill the height
 * of a full-height row, horizontal strips fill the width of a column. The track
 * carries a hand-drawn thumb whose length is `thumb`% of the track and whose
 * position along the long axis comes from `scrolled`%.
 */

/** Find the first box of `comp` in a frame (depth-first). @param {import('../../src/layout.js').Box} root @param {string} comp */
function findByComponent(root, comp) {
  /** @type {import('../../src/layout.js').Box | null} */
  let hit = null;
  (function walk(/** @type {import('../../src/layout.js').Box} */ b) {
    if (hit) return;
    if (b.node.component === comp) { hit = b; return; }
    for (const c of b.children) walk(c);
  })(root);
  if (!hit) throw new Error(`no ${comp} box laid out`);
  return /** @type {import('../../src/layout.js').Box} */ (hit);
}

/** The laid-out Scrollbar box in the first frame of `src`. @param {string} src */
const scrollbarBox = (src) => findByComponent(layout(parse(src))[0].root, 'Scrollbar');

// A 400x300 host Box at the frame's content origin (16,16 in a default frame). A
// vertical strip placed in a row that fills this Box reaches its full height.
const HOST = 'Wireframe landscape\n  Box 400px 300px';
// A row that fills the host's WIDTH (a `*` sibling) and HEIGHT (a 300px sibling),
// so a trailing vertical Scrollbar stretches to full height and hugs the right edge.
const VROW = `${HOST}\n    Stack row\n      Box * 300px\n`;

// --- parse / resolve ----------------------------------------------------------

test('Scrollbar parses a keyless orientation enum and a keyless scrolled number together', () => {
  const doc = parse(`${HOST}\n    Scrollbar horizontal 60 thumb=40`);
  assert.deepEqual(doc.diagnostics, []);
  const sb = findByComponent(layout(doc)[0].root, 'Scrollbar').node;
  assert.equal(sb.props.orientation, 'horizontal');
  assert.equal(sb.props.scrolled, 60);
  assert.equal(sb.props.thumb, 40);
});

test('orientation and scrolled are order-independent (disjoint keyless slots)', () => {
  const a = findByComponent(layout(parse(`${HOST}\n    Scrollbar 70 horizontal`))[0].root, 'Scrollbar').node;
  assert.equal(a.props.orientation, 'horizontal');
  assert.equal(a.props.scrolled, 70);
});

test('a bare Scrollbar resolves clean (defaults applied by the strategy, not the resolver)', () => {
  const doc = parse(`${HOST}\n    Scrollbar`);
  assert.deepEqual(doc.diagnostics, []);
  const sb = findByComponent(layout(doc)[0].root, 'Scrollbar').node;
  assert.equal(sb.props.orientation ?? 'unset', 'unset');
  assert.equal(sb.props.scrolled ?? 'unset', 'unset');
  assert.equal(sb.props.thumb ?? 'unset', 'unset');
});

// --- strip geometry: thin short axis, stretched long axis ---------------------

test('a vertical Scrollbar is a thin strip that stretches its height to a full-height row', () => {
  const root = layout(parse(`${VROW}      Scrollbar 30`))[0].root;
  const box = findByComponent(root, 'Box'); // the outer host Box
  const sb = findByComponent(root, 'Scrollbar');
  assert.ok(sb.w < 24, `vertical strip should be thin on the width axis, got ${sb.w}`);
  assert.ok(Math.abs(sb.h - box.h) < 1e-6, `height should stretch to the row/host height: ${sb.h} vs ${box.h}`);
  // Last child of the row -> hugs the right edge of the host.
  assert.ok(Math.abs((sb.x + sb.w) - (box.x + box.w)) < 1e-6, `should hug the right edge: ${sb.x + sb.w} vs ${box.x + box.w}`);
});

test('a horizontal Scrollbar is a thin strip that stretches its width across a column', () => {
  const root = layout(parse(`${HOST}\n    Scrollbar horizontal 30`))[0].root;
  const box = findByComponent(root, 'Box');
  const sb = findByComponent(root, 'Scrollbar');
  assert.ok(sb.h < 24, `horizontal strip should be thin on the height axis, got ${sb.h}`);
  assert.ok(Math.abs(sb.w - box.w) < 1e-6, `width should stretch to the column width: ${sb.w} vs ${box.w}`);
});

test('a Scrollbar occupies flow space (it is NOT an overlay): a column sibling sits below it', () => {
  // A horizontal Scrollbar then a Typography in a column: the text must sit BELOW
  // the strip (the strip consumed its height), proving in-flow placement.
  const root = layout(parse(`${HOST}\n    Scrollbar horizontal 50\n    Typography "below"`))[0].root;
  const sb = findByComponent(root, 'Scrollbar');
  const txt = findByComponent(root, 'Typography');
  assert.ok(txt.y >= sb.y + sb.h - 1e-6, `the sibling should sit below the in-flow strip: txt.y=${txt.y}, strip bottom=${sb.y + sb.h}`);
});

test('orientation x container-axis: supported pairings stretch long; against-the-grain is a PINNED limitation', () => {
  // A block leaf stretches the container's CROSS axis only -- it cannot grow the
  // parent's MAIN axis (no flex-grow for leaves; same constraint as Divider). So
  // the SUPPORTED pairing is vertical->ROW and horizontal->COLUMN. Placed against
  // the grain, the strip stretches its SHORT axis and reads as the WRONG silhouette.
  // This is a DOCUMENTED limitation (see Scrollbar.js LIMITATION) -- it is pinned
  // here as intent, NOT a defect to "fix" without an engine flex-grow capability.
  const THICKNESS = 12, MIN_LEN = 48;
  const dims = (src) => { const b = scrollbarBox(src); return { w: Math.round(b.w), h: Math.round(b.h) }; };

  // SUPPORTED: vertical in a ROW -> thin width, stretched (full-height) long axis.
  const vRow = dims(`${VROW}      Scrollbar`);
  assert.ok(vRow.w <= THICKNESS + 2 && vRow.h >= 250, `vertical-in-row should be thin-tall, got ${vRow.w}x${vRow.h}`);
  // SUPPORTED: horizontal in a COLUMN -> thin height, stretched (full-width).
  const hCol = dims(`${HOST}\n    Scrollbar horizontal`);
  assert.ok(hCol.h <= THICKNESS + 2 && hCol.w >= 250, `horizontal-in-column should be wide-thin, got ${hCol.w}x${hCol.h}`);

  // AGAINST THE GRAIN (pinned): vertical in a COLUMN stretches WIDTH and keeps the
  // MIN_LEN main-axis height -- it reads as a horizontal bar. Locked so the
  // documented limitation can't silently drift into a phantom "fix".
  const vCol = dims(`${HOST}\n    Scrollbar`);
  assert.ok(vCol.w >= 250 && Math.abs(vCol.h - MIN_LEN) <= 1, `vertical-in-column is the documented wide+MIN_LEN limitation, got ${vCol.w}x${vCol.h}`);
  // AGAINST THE GRAIN (pinned): horizontal in a ROW stretches HEIGHT, keeps MIN_LEN width.
  const hRow = dims(`${VROW}      Scrollbar horizontal`);
  assert.ok(hRow.h >= 250 && Math.abs(hRow.w - MIN_LEN) <= 1, `horizontal-in-row is the documented tall+MIN_LEN limitation, got ${hRow.w}x${hRow.h}`);
});

// --- thumb geometry (the pure helper render uses), both orientations ----------

test('vertical: thumb length is thumb% of the track height; it spans the width (inset)', () => {
  const sb = scrollbarBox(`${VROW}      Scrollbar 0 thumb=50`);
  const t = thumbGeometry(sb, sb.node);
  assert.ok(Math.abs(t.h - 0.5 * sb.h) < 1e-6, `thumb height should be 50% of ${sb.h}, got ${t.h}`);
  assert.ok(t.w < sb.w, 'thumb is inset within the track width');
});

test('horizontal: thumb length is thumb% of the track width; it spans the height (inset)', () => {
  const sb = scrollbarBox(`${HOST}\n    Scrollbar horizontal 0 thumb=50`);
  const t = thumbGeometry(sb, sb.node);
  assert.ok(Math.abs(t.w - 0.5 * sb.w) < 1e-6, `thumb width should be 50% of ${sb.w}, got ${t.w}`);
  assert.ok(t.h < sb.h, 'thumb is inset within the track height');
});

test('vertical: scrolled=0 seats the thumb at the top, scrolled=100 flush with the bottom', () => {
  const top = scrollbarBox(`${VROW}      Scrollbar 0 thumb=30`);
  const tTop = thumbGeometry(top, top.node);
  assert.ok(Math.abs(tTop.y - top.y) < 1e-6, `scrolled=0 thumb top should equal track top: ${tTop.y} vs ${top.y}`);

  const bot = scrollbarBox(`${VROW}      Scrollbar 100 thumb=30`);
  const tBot = thumbGeometry(bot, bot.node);
  assert.ok(Math.abs((tBot.y + tBot.h) - (bot.y + bot.h)) < 1e-6, `scrolled=100 thumb bottom should equal track bottom: ${tBot.y + tBot.h} vs ${bot.y + bot.h}`);
});

test('horizontal: scrolled=0 seats the thumb at the left, scrolled=100 flush with the right', () => {
  const left = scrollbarBox(`${HOST}\n    Scrollbar horizontal 0 thumb=30`);
  const tLeft = thumbGeometry(left, left.node);
  assert.ok(Math.abs(tLeft.x - left.x) < 1e-6, `scrolled=0 thumb left should equal track left: ${tLeft.x} vs ${left.x}`);

  const right = scrollbarBox(`${HOST}\n    Scrollbar horizontal 100 thumb=30`);
  const tRight = thumbGeometry(right, right.node);
  assert.ok(Math.abs((tRight.x + tRight.w) - (right.x + right.w)) < 1e-6, `scrolled=100 thumb right should equal track right: ${tRight.x + tRight.w} vs ${right.x + right.w}`);
});

test('the thumb position is linear in scrolled% (50% sits at half the leftover travel)', () => {
  const sb = scrollbarBox(`${VROW}      Scrollbar 50 thumb=40`);
  const t = thumbGeometry(sb, sb.node);
  const travel = sb.h - t.h;
  assert.ok(Math.abs(t.y - (sb.y + 0.5 * travel)) < 1e-6, `scrolled=50 should sit at half the travel: ${t.y} vs ${sb.y + 0.5 * travel}`);
});

test('the thumb never extends past the track on either end, for any scrolled, both orientations', () => {
  for (const s of [0, 25, 50, 75, 100]) {
    const v = scrollbarBox(`${VROW}      Scrollbar ${s} thumb=35`);
    const tv = thumbGeometry(v, v.node);
    assert.ok(tv.y >= v.y - 1e-6 && tv.y + tv.h <= v.y + v.h + 1e-6, `vertical scrolled=${s}: thumb [${tv.y}, ${tv.y + tv.h}] within [${v.y}, ${v.y + v.h}]`);

    const h = scrollbarBox(`${HOST}\n    Scrollbar horizontal ${s} thumb=35`);
    const th = thumbGeometry(h, h.node);
    assert.ok(th.x >= h.x - 1e-6 && th.x + th.w <= h.x + h.w + 1e-6, `horizontal scrolled=${s}: thumb [${th.x}, ${th.x + th.w}] within [${h.x}, ${h.x + h.w}]`);
  }
});

// --- clamping (soft input degrades, never throws / NaNs; no diagnostics) -------

test('out-of-range scrolled clamps to [0,100] (150 -> end, -10 -> start)', () => {
  const hi = scrollbarBox(`${VROW}      Scrollbar 150 thumb=30`);
  const at100 = scrollbarBox(`${VROW}      Scrollbar 100 thumb=30`);
  assert.deepEqual(thumbGeometry(hi, hi.node), thumbGeometry(at100, at100.node), 'scrolled=150 should clamp to scrolled=100');

  const lo = scrollbarBox(`${VROW}      Scrollbar -10 thumb=30`);
  const at0 = scrollbarBox(`${VROW}      Scrollbar 0 thumb=30`);
  assert.deepEqual(thumbGeometry(lo, lo.node), thumbGeometry(at0, at0.node), 'scrolled=-10 should clamp to scrolled=0');
});

test('thumb=0 floors to a visible minimum; thumb>100 caps to the full track length', () => {
  const tiny = scrollbarBox(`${VROW}      Scrollbar 50 thumb=0`);
  const tTiny = thumbGeometry(tiny, tiny.node);
  assert.ok(tTiny.h >= 16 - 1e-6, `a 0% thumb should floor to a visible minimum, got ${tTiny.h}`);
  assert.ok(tTiny.h <= tiny.h, 'the floor never exceeds the track');

  const huge = scrollbarBox(`${VROW}      Scrollbar 50 thumb=200`);
  const tHuge = thumbGeometry(huge, huge.node);
  assert.ok(Math.abs(tHuge.h - huge.h) < 1e-6, `a >100% thumb should cap to the full track length, got ${tHuge.h} vs ${huge.h}`);
});

test('a Scrollbar in a degenerate (zero-area) parent stays finite and renders no NaN', () => {
  const src = 'Wireframe\n  Box 0px 0px\n    Scrollbar 50 thumb=40';
  const sb = scrollbarBox(src);
  const t = thumbGeometry(sb, sb.node);
  for (const v of [sb.x, sb.y, sb.w, sb.h, t.x, t.y, t.w, t.h]) assert.ok(Number.isFinite(v), `geometry must stay finite, got ${v}`);
  const { svg, diagnostics } = render(src);
  assert.deepEqual(diagnostics, []);
  assert.ok(!/NaN|Infinity/.test(svg), 'no NaN/Infinity in the SVG');
});

// --- render -------------------------------------------------------------------

test('a Scrollbar renders a hand-drawn track and thumb, with no diagnostics', () => {
  const { svg, diagnostics } = render(`${VROW}      Scrollbar 50 thumb=40`);
  assert.deepEqual(diagnostics, []);
  const paths = (svg.match(/<path/g) || []).length;
  assert.ok(paths >= 2, `expected at least a track + thumb path, got ${paths}`);
  assert.ok(svg.includes(`fill="${COLORS.muted}"`), 'the thumb should be filled with the muted color');
});

test('render is deterministic (seeds derive from geometry)', () => {
  const src = `${VROW}      Scrollbar 60 thumb=40`;
  assert.equal(render(src).svg, render(src).svg);
});
