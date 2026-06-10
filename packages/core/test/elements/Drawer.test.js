// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * Drawer (SPEC: MUI Navigation, v1.0). With no overlay layer in this engine a
 * Drawer is drawn honestly as a DOCKED side panel; each of its three props drives
 * real geometry or chrome we can assert:
 *
 *  - `anchor` (keyless enum, default left) -- left/right are vertical `col` panels
 *    that keep their own width; top/bottom are horizontal `row` sheets that stretch
 *    full width. The edge divider sits on the edge the drawer slides from.
 *  - `variant` (keyless enum, default temporary) -- temporary floats (drop shadow),
 *    persistent/permanent sit flush (no shadow).
 *  - `open` (keyless boolean, drawn open by default) -- open=false collapses to a
 *    slim closed rail.
 *
 * The Drawer box is the frame's first child: layout(doc)[0].root.children[0].
 */

const drawerBox = (src) => layout(parse(src))[0].root.children[0];

// --- Parsing: defaults + clean parse -----------------------------------------

test('a bare Drawer parses clean as a container with the spec defaults unset in props', () => {
  const doc = parse('Wireframe\n  Drawer');
  assert.deepEqual(doc.diagnostics, []);
  const drawer = doc.frames[0].children[0];
  assert.equal(drawer.component, 'Drawer');
  // The resolver does not inject defaults; the strategy applies anchor=left /
  // variant=temporary / open(drawn-open) itself.
  assert.equal(drawer.props.anchor, undefined);
  assert.equal(drawer.props.variant, undefined);
  assert.equal(drawer.props.open, undefined);
});

test('an empty Drawer lays out to a finite, positive docked panel (minSize floor)', () => {
  const box = drawerBox('Wireframe\n  Drawer');
  assert.equal(box.node.component, 'Drawer');
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
  // The panel-width floor keeps a left drawer narrow rather than collapsing.
  assert.ok(box.w >= 220, `left panel width should floor to >= 220, got ${box.w}`);
});

test('a Drawer stacks its children inside, in order', () => {
  const SRC = 'Wireframe\n  Drawer\n    Typography "Inbox"\n    Typography "Sent"';
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);
  const box = layout(doc)[0].root.children[0];
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
  // Two children stacked vertically: the second sits BELOW the first (greater y),
  // same x -- a column.
  for (const a of ['left', 'right']) {
    const SRC = `Wireframe\n  Drawer ${a}\n    Typography "A"\n    Typography "B"`;
    const [c0, c1] = layout(parse(SRC))[0].root.children[0].children;
    assert.ok(c1.y > c0.y, `${a}: second child should sit below the first (col)`);
    assert.equal(c0.x, c1.x, `${a}: column children share an x`);
  }
});

test('top/bottom anchors are horizontal sheets; they place children in a row', () => {
  // Two children side by side: the second sits to the RIGHT of the first (greater
  // x) -- a row.
  for (const a of ['top', 'bottom']) {
    const SRC = `Wireframe\n  Drawer ${a}\n    Typography "A"\n    Typography "B"`;
    const [c0, c1] = layout(parse(SRC))[0].root.children[0].children;
    assert.ok(c1.x > c0.x, `${a}: second child should sit to the right of the first (row)`);
  }
});

test('left/right side panels keep their panel width; top/bottom sheets stretch full-width', () => {
  const frameW = layout(parse('Wireframe\n  Drawer left'))[0].w;
  const left = drawerBox('Wireframe\n  Drawer left');
  const top = drawerBox('Wireframe\n  Drawer top');
  // A side panel must be narrower than the whole frame (it docks, not fills)...
  assert.ok(left.w < frameW, `left panel (${left.w}) should be narrower than the frame (${frameW})`);
  // ...while a top sheet stretches across the full content area (the frame minus
  // its surrounding pad), so it is markedly wider than the docked side panel.
  assert.ok(top.w > left.w, `top sheet (${top.w}) should be wider than the side panel (${left.w})`);
  assert.ok(top.w >= frameW - 40, `top sheet (${top.w}) should span ~the full frame width (${frameW})`);
});

test('the edge divider moves with the anchor: all four anchors draw distinct chrome', () => {
  // Every open drawer draws the heavier stroke-width:2 divider...
  const svgs = ['left', 'right', 'top', 'bottom'].map((a) => render(`Wireframe\n  Drawer ${a}`).svg);
  for (const svg of svgs) assert.match(svg, /stroke-width="2"/);
  // ...but on a different edge each time, so no two anchors render identically
  // (the divider's coordinates -- right edge for left, etc. -- are baked into the
  // path geometry).
  const unique = new Set(svgs);
  assert.equal(unique.size, 4, 'each anchor should put the divider on a distinct edge');
});

// --- variant: keyless + keyed, and REAL elevation chrome ----------------------

test('variant is keyless and accepts each enum value', () => {
  for (const v of ['permanent', 'persistent', 'temporary']) {
    const doc = parse(`Wireframe\n  Drawer ${v}`);
    assert.deepEqual(doc.diagnostics, [], `variant=${v} should parse clean`);
    assert.equal(doc.frames[0].children[0].props.variant, v);
  }
});

test('variant also resolves in keyed form', () => {
  const doc = parse('Wireframe\n  Drawer variant=persistent');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.variant, 'persistent');
});

test('temporary (default) floats with an elevation shadow; docked variants do not', () => {
  // temporary is the default -> a shadow path (opacity-bearing) is emitted.
  assert.match(render('Wireframe\n  Drawer').svg, /<path opacity=/);
  assert.match(render('Wireframe\n  Drawer temporary').svg, /<path opacity=/);
  // persistent / permanent sit flush -> no shadow.
  assert.doesNotMatch(render('Wireframe\n  Drawer persistent').svg, /<path opacity=/);
  assert.doesNotMatch(render('Wireframe\n  Drawer permanent').svg, /<path opacity=/);
});

// --- open: keyless boolean + keyed, drawn-open default, closed rail -----------

test('open is a keyless boolean: a bare `open` token sets it true', () => {
  const doc = parse('Wireframe\n  Drawer open');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.open, true);
});

test('open also resolves in keyed boolean form (open=false)', () => {
  const doc = parse('Wireframe\n  Drawer open=false');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.open, false);
});

test('a drawer is drawn OPEN by default: it renders the paper panel + divider', () => {
  const svg = render('Wireframe\n  Drawer permanent').svg;
  // open default -> a stroke-width:2 divider line is present (the closed rail has none).
  assert.match(svg, /stroke-width="2"/);
});

test('open=false collapses to a slim closed rail with no divider', () => {
  const openSvg = render('Wireframe\n  Drawer permanent').svg;
  const closedSvg = render('Wireframe\n  Drawer permanent open=false').svg;
  // The open panel carries the heavier divider; the closed rail does not.
  assert.match(openSvg, /stroke-width="2"/);
  assert.doesNotMatch(closedSvg, /stroke-width="2"/);
  // The two states draw differently.
  assert.notEqual(openSvg, closedSvg, 'open vs closed must produce different chrome');
});

// --- Keyless: both enums + the boolean co-resolve in any order ----------------

test('anchor, variant, and open all resolve keyless together, in any token order', () => {
  const doc = parse('Wireframe\n  Drawer open right persistent');
  assert.deepEqual(doc.diagnostics, []);
  const drawer = doc.frames[0].children[0];
  assert.equal(drawer.props.anchor, 'right');
  assert.equal(drawer.props.variant, 'persistent');
  assert.equal(drawer.props.open, true);
});

// --- Errors: duplicate keyless slot + bad enum value --------------------------

test('two anchor tokens (same keyless enum slot twice) is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Drawer left right'), /Drawer/);
});

test('two variant tokens (same keyless enum slot twice) is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Drawer temporary persistent'), /Drawer/);
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
  // Child Typography text reaches the SVG only when Typography is implemented;
  // guard so this test owns Drawer, not its children.
  const probe = render('Wireframe\n  Typography "Inbox"').svg;
  if (/Inbox/.test(probe)) assert.match(svg, /Inbox/);
  assert.match(svg, /<path/);
});
