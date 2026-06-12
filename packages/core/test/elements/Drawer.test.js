// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout, isOverlay } from '../../src/layout.js';

/**
 * Drawer (SPEC: MUI Navigation, v1.0). Three variants:
 *  - `permanent` (default) -- a DOCKED in-flow panel; content flows beside it.
 *  - `overlay` -- a TRUE OVERLAY (the shared out-of-flow layer): consumes no flow
 *    space, pinned to the `anchor` edge at 100% of the parent cross extent, paints
 *    last, carries an elevation shadow.
 *  - `rail` -- a thin in-flow mini-drawer (icon strip).
 * `anchor` (default left): for overlay it TRULY pins; for permanent/rail it sets
 * the axis (left/right=col, top/bottom=row) + which edge the divider hugs (it does
 * NOT teleport an in-flow drawer). `divider` (default true) toggles the inner seam.
 * `background`/`denseBackground` opaque-tint the panel (task-1 base).
 *
 * A non-overlay Drawer is the frame's first child; an overlay Drawer is appended
 * last (out of flow), so `drawerBox` finds it by component.
 */

const drawerBox = (src) => findByComponent(layout(parse(src))[0].root, 'Drawer');

/** @param {*} box @param {string} component @returns {*} */
function findByComponent(box, component) {
  if (box.node.component === component) return box;
  for (const child of box.children) {
    const hit = findByComponent(child, component);
    if (hit) return hit;
  }
  return null;
}

// --- Parsing: defaults + clean parse -----------------------------------------

test('a bare Drawer parses clean as a container with the spec defaults unset in props', () => {
  const doc = parse('Wireframe\n  Drawer');
  assert.deepEqual(doc.diagnostics, []);
  const drawer = doc.frames[0].children[0];
  assert.equal(drawer.component, 'Drawer');
  // The resolver injects no defaults; the strategy applies anchor=left /
  // variant=permanent / divider(true) itself.
  assert.equal(drawer.props.anchor, undefined);
  assert.equal(drawer.props.variant, undefined);
  assert.equal(drawer.props.divider, undefined);
});

test('an empty (permanent) Drawer lays out to a finite, positive docked panel (minSize floor)', () => {
  const box = drawerBox('Wireframe\n  Drawer');
  assert.equal(box.node.component, 'Drawer');
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
  assert.ok(box.w >= 220, `left panel width should floor to >= 220, got ${box.w}`);
});

test('a Drawer stacks its children inside, in order', () => {
  const SRC = 'Wireframe\n  Drawer\n    Typography "Inbox"\n    Typography "Sent"';
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);
  const box = findByComponent(layout(doc)[0].root, 'Drawer');
  assert.deepEqual(box.children.map((c) => c.node.component), ['Typography', 'Typography']);
});

// --- anchor: keyless + keyed, and REAL axis/stretch geometry ------------------

test('anchor is keyless and accepts each enum value', () => {
  for (const a of ['left', 'right', 'top', 'bottom']) {
    const doc = parse(`Wireframe\n  Drawer ${a}`);
    assert.deepEqual(doc.diagnostics, [], `anchor=${a} should parse clean`);
    assert.equal(doc.frames[0].children[0].props.anchor, a);
  }
});

test('anchor also resolves in keyed form', () => {
  const doc = parse('Wireframe\n  Drawer anchor=right');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.anchor, 'right');
});

test('left/right anchors are vertical panels; they stack children in a column', () => {
  for (const a of ['left', 'right']) {
    const SRC = `Wireframe\n  Drawer ${a}\n    Typography "A"\n    Typography "B"`;
    const [c0, c1] = findByComponent(layout(parse(SRC))[0].root, 'Drawer').children;
    assert.ok(c1.y > c0.y, `${a}: second child should sit below the first (col)`);
    assert.equal(c0.x, c1.x, `${a}: column children share an x`);
  }
});

test('orientation sets the AXIS: vertical stacks children in a column, horizontal in a row', () => {
  const vert = findByComponent(layout(parse('Wireframe\n  Drawer vertical\n    Typography "A"\n    Typography "B"'))[0].root, 'Drawer').children;
  assert.ok(vert[1].y > vert[0].y && vert[0].x === vert[1].x, 'vertical: children stack in a column');
  const horiz = findByComponent(layout(parse('Wireframe\n  Drawer horizontal\n    Typography "A"\n    Typography "B"'))[0].root, 'Drawer').children;
  assert.ok(horiz[1].x > horiz[0].x, 'horizontal: children sit side by side in a row');
});

test('a vertical panel keeps its panel width; a horizontal panel stretches full-width', () => {
  const frameW = layout(parse('Wireframe\n  Drawer vertical'))[0].w;
  const vert = drawerBox('Wireframe\n  Drawer vertical');
  const horiz = drawerBox('Wireframe\n  Drawer horizontal');
  assert.ok(vert.w < frameW, `vertical panel (${vert.w}) should be narrower than the frame (${frameW})`);
  assert.ok(horiz.w > vert.w, `horizontal panel (${horiz.w}) should be wider than the vertical panel (${vert.w})`);
  assert.ok(horiz.w >= frameW - 40, `horizontal panel (${horiz.w}) should span ~the full frame width (${frameW})`);
});

test('the seam edge follows anchor (the content-facing side), drawing distinct chrome per side', () => {
  // Within each axis, the two anchors put the seam on opposite (content-facing)
  // edges, so they render differently. (anchor is normalized to the axis, so we
  // pair each orientation with its valid edges.)
  const vLeft = render('Wireframe\n  Drawer vertical left').svg;   // seam right
  const vRight = render('Wireframe\n  Drawer vertical right').svg; // seam left
  const hTop = render('Wireframe\n  Drawer horizontal top').svg;   // seam bottom
  const hBottom = render('Wireframe\n  Drawer horizontal bottom').svg; // seam top
  for (const svg of [vLeft, vRight, hTop, hBottom]) assert.match(svg, /stroke-width="2"/);
  assert.equal(new Set([vLeft, vRight, hTop, hBottom]).size, 4, 'each (orientation, anchor) puts the seam on a distinct edge');
});

// --- variant: keyless + keyed, each value ------------------------------------

test('variant is keyless and accepts each enum value (permanent/overlay/rail)', () => {
  for (const v of ['permanent', 'overlay', 'rail']) {
    const doc = parse(`Wireframe\n  Drawer ${v}`);
    assert.deepEqual(doc.diagnostics, [], `variant=${v} should parse clean`);
    assert.equal(doc.frames[0].children[0].props.variant, v);
  }
});

test('variant also resolves in keyed form', () => {
  const doc = parse('Wireframe\n  Drawer variant=overlay');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.variant, 'overlay');
});

// --- the THREE variants are distinct: in-flow vs out-of-flow vs thin ----------

test('permanent is in-flow (NOT an overlay); overlay IS an overlay; rail is in-flow', () => {
  assert.equal(isOverlay(parse('Wireframe\n  Drawer permanent').frames[0].children[0]), false);
  assert.equal(isOverlay(parse('Wireframe\n  Drawer overlay').frames[0].children[0]), true);
  assert.equal(isOverlay(parse('Wireframe\n  Drawer rail').frames[0].children[0]), false);
});

test('an overlay Drawer consumes NO flow space: a sibling is byte-identical with vs without it', () => {
  // The reuse proof: the overlay variant goes through the shared out-of-flow layer
  // (isOverlay -> excluded from flow), so a sibling Box does not move.
  const without = layout(parse('Wireframe w=1000 h=800\n  Stack row\n    Box 120px 120px outline=solid'))[0];
  const withDrawer = layout(parse('Wireframe w=1000 h=800\n  Stack row\n    Drawer overlay left\n      List\n        ListItem "x"\n    Box 120px 120px outline=solid'))[0];
  const a = findByComponent(without.root, 'Box');
  const b = findByComponent(withDrawer.root, 'Box');
  assert.deepEqual(
    { x: a.x, y: a.y, w: a.w, h: a.h }, { x: b.x, y: b.y, w: b.w, h: b.h },
    'the sibling Box must not move when an overlay Drawer is present',
  );
});

test('a permanent Drawer consumes flow space: a sibling docks beside it', () => {
  // In-flow: the Box sibling starts to the RIGHT of the permanent drawer's width.
  const root = layout(parse('Wireframe w=1000 h=800\n  Stack row\n    Drawer permanent left\n      List\n        ListItem "x"\n    Box * *'))[0].root;
  const drawer = findByComponent(root, 'Drawer');
  const box = findByComponent(root, 'Box');
  assert.ok(box.x >= drawer.x + drawer.w - 0.01, `the sibling Box (x=${box.x}) should start at/after the drawer's right edge (${drawer.x + drawer.w})`);
});

test('a rail is a thin in-flow strip (~56), much narrower than a permanent panel (220)', () => {
  // Empty/icon rail floors to the thin RAIL width; permanent floors to PANEL_W.
  const rail = drawerBox('Wireframe\n  Stack row\n    Drawer rail left\n    Box * *');
  const permanent = drawerBox('Wireframe\n  Stack row\n    Drawer permanent left\n    Box * *');
  assert.ok(rail.w <= 60, `rail width should be ~56 (thin strip), got ${rail.w}`);
  assert.ok(permanent.w >= 220, `permanent width should be >= 220, got ${permanent.w}`);
  assert.ok(rail.w < permanent.w, 'rail must be thinner than permanent');
  // A rail is in flow (consumes space): a sibling docks beside it.
  const root = layout(parse('Wireframe w=1000 h=800\n  Stack row\n    Drawer rail left\n    Box * *'))[0].root;
  const box = findByComponent(root, 'Box');
  const railBox = findByComponent(root, 'Drawer');
  assert.ok(box.x >= railBox.x + railBox.w - 0.01, 'a sibling flows beside the in-flow rail');
});

// --- overlay: pinned geometry on all four edges + paints last ----------------

test('an overlay Drawer pins to its anchor edge at 100% of the parent cross extent (all 4 edges)', () => {
  // Frame 1000x800 -> content rect {16,16,968,768} (frame minus FRAME_PAD=16).
  // anchor lives on the orientation's axis, so pair them: vertical+left/right,
  // horizontal+top/bottom.
  const at = (o, a) => drawerBox(`Wireframe w=1000 h=800\n  Drawer overlay ${o} ${a}\n    List\n      ListItem "x"`);
  const near = (v, e, msg) => assert.ok(Math.abs(v - e) <= 1, `${msg}: ${v} vs ${e}`);

  const left = at('vertical', 'left');
  near(left.x, 16, 'left x hugs content origin'); near(left.h, 768, 'left full parent height'); assert.ok(left.w >= 220, 'left panel width');
  const right = at('vertical', 'right');
  near(right.x + right.w, 984, 'right far edge meets content right edge'); near(right.h, 768, 'right full height');
  const top = at('horizontal', 'top');
  near(top.y, 16, 'top y hugs content origin'); near(top.w, 968, 'top full parent width');
  const bottom = at('horizontal', 'bottom');
  near(bottom.y + bottom.h, 784, 'bottom far edge meets content bottom edge'); near(bottom.w, 968, 'bottom full width');
});

test('an overlay Drawer carries an elevation shadow and paints after a later in-flow sibling', () => {
  const SRC = 'Wireframe w=900 h=700\n  Drawer overlay left\n    List\n      ListItem "DRAWERITEM"\n  Typography "LATERSIBLING"';
  const svg = render(SRC).svg;
  // Elevation shadow present (the overlay floats).
  assert.match(svg, /<path opacity=/, 'overlay drawer should carry an elevation shadow');
  // Frame-global paint order: the overlay's content comes AFTER the later sibling.
  const later = svg.indexOf('LATERSIBLING');
  const item = svg.indexOf('DRAWERITEM');
  assert.ok(later >= 0 && item >= 0, 'both texts present');
  assert.ok(item > later, `the overlay drawer (idx ${item}) must paint after the later sibling (idx ${later})`);
});

test('an overlay Drawer in a collapsed parent fills ~0 on the stretched axis (EDGE A degenerate, finite)', () => {
  // Consistent with Dialog's overlay-in-collapsed-parent: a stretch overlay fills
  // the parent extent, and an overlay-only Box collapses to ~0 -> the drawer's
  // stretched (height, for a left anchor) axis is ~0. Finite, documented, pinned.
  const root = layout(parse('Wireframe\n  Box outline=solid\n    Drawer overlay left\n      List\n        ListItem "x"'))[0].root;
  const boxBox = findByComponent(root, 'Box');
  const drawer = findByComponent(root, 'Drawer');
  assert.ok(boxBox.h <= 1, `the overlay-only Box collapses to ~0 height, got ${boxBox.h}`);
  assert.ok(drawer.h <= 1, `a left overlay drawer stretches its height to the ~0 parent (honest degenerate), got ${drawer.h}`);
  for (const v of [drawer.x, drawer.y, drawer.w, drawer.h]) assert.ok(Number.isFinite(v), `geometry stays finite, got ${v}`);
});

// --- divider: toggles the inner seam -----------------------------------------

test('divider is a keyless boolean defaulting on; divider=false suppresses the inner seam', () => {
  // A bare `divider` token and the default both draw the heavier seam.
  assert.equal(parse('Wireframe\n  Drawer divider').frames[0].children[0].props.divider, true);
  assert.match(render('Wireframe\n  Drawer permanent').svg, /stroke-width="2"/);
  assert.match(render('Wireframe\n  Drawer permanent divider').svg, /stroke-width="2"/);
  // divider=false removes the seam.
  assert.equal(parse('Wireframe\n  Drawer divider=false').frames[0].children[0].props.divider, false);
  assert.doesNotMatch(render('Wireframe\n  Drawer permanent divider=false').svg, /stroke-width="2"/);
});

// --- background / denseBackground: opaque tint per task 1 ----------------------

test('a plain Drawer is paper (no hatch); background= adds an OPAQUE hatch tint', () => {
  // No background/denseBackground -> no hatch fillStyle in the SVG.
  const plain = render('Wireframe\n  Drawer permanent').svg;
  assert.doesNotMatch(plain, /fill="#c4c4c4"/, 'a plain drawer should draw no hatch');
  // background=hatch -> an opaque paper base (#ffffff) under the gray hatch (task-1).
  const tinted = render('Wireframe\n  Drawer permanent hatch').svg;
  assert.match(tinted, /fill="#ffffff"/, 'a tinted drawer lays an opaque paper base under the hatch');
});

test('background is keyless and resolves; denseBackground is a keyless boolean', () => {
  const doc = parse('Wireframe\n  Drawer crosshatch denseBackground');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.background, 'crosshatch');
  assert.equal(doc.frames[0].children[0].props.denseBackground, true);
});

// --- Keyless: enums + booleans co-resolve in any order ------------------------

test('anchor, variant, background, and the booleans all resolve keyless together, any order', () => {
  const doc = parse('Wireframe\n  Drawer overlay right crosshatch divider denseBackground');
  assert.deepEqual(doc.diagnostics, []);
  const d = doc.frames[0].children[0];
  assert.equal(d.props.anchor, 'right');
  assert.equal(d.props.variant, 'overlay');
  assert.equal(d.props.background, 'crosshatch');
  assert.equal(d.props.divider, true);
  assert.equal(d.props.denseBackground, true);
});

// --- BREAKING CHANGE: open + the old variant values are gone, deliberately ----

test('the removed `open` prop is a hard error (unknown prop), not silently accepted', () => {
  assert.throws(() => parse('Wireframe\n  Drawer open'), /open/i);
  assert.throws(() => parse('Wireframe\n  Drawer open=false'), /open/i);
});

test('the dropped `persistent`/`temporary` variant values are hard errors (bad enum)', () => {
  assert.throws(() => parse('Wireframe\n  Drawer persistent'), /Drawer/);
  assert.throws(() => parse('Wireframe\n  Drawer temporary'), /Drawer/);
  assert.throws(() => parse('Wireframe\n  Drawer variant=persistent'), /variant/);
  assert.throws(() => parse('Wireframe\n  Drawer variant=temporary'), /variant/);
});

// --- Errors: duplicate keyless slot + bad enum value --------------------------

test('two anchor tokens (same keyless enum slot twice) is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Drawer left right'), /Drawer/);
});

test('two variant tokens (same keyless enum slot twice) is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Drawer permanent overlay'), /Drawer/);
});

test('an unknown bare token is a hard error (not a silent drop)', () => {
  assert.throws(() => parse('Wireframe\n  Drawer sideways'), /Drawer/);
});

test('a bad keyed anchor value is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Drawer anchor=middle'), /anchor/);
});

test('a bad keyed variant value is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Drawer variant=floating'), /variant/);
});

// --- A whole render path stays clean ------------------------------------------

test('a populated Drawer renders without diagnostics and reaches its children', () => {
  const SRC = 'Wireframe\n  Drawer left permanent\n    Typography "Inbox"\n    Typography "Drafts"';
  const { svg, diagnostics } = render(SRC);
  assert.deepEqual(diagnostics, []);
  const probe = render('Wireframe\n  Typography "Inbox"').svg;
  if (/Inbox/.test(probe)) assert.match(svg, /Inbox/);
  assert.match(svg, /<path/);
});
