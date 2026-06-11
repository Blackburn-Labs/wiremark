// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';
import { FRAME_PAD, SPACING, PRESET_SIZES } from '../../src/metrics.js';

/**
 * Anchor -- an invisible, named region (tasks/FOREGROUND.md; proposed SPEC
 * ss.5.1.2). A background frame declares `Anchor #id` where foreground content
 * belongs; a foreground frame composes into it with `background=#B anchor=#id`
 * (alias `at=`), adopting the region's laid-out box and the background's canvas.
 * Layout strategy: a zero-intrinsic leaf like Spacer, but `block:true` as well --
 * unsized it fills its container's leftover space on BOTH axes. It draws nothing.
 *
 * Diagnostics are staged: Anchor-without-#id and duplicate-#id surface at
 * parse() (resolve post-walk); anchor-without-background, anchor-not-found and
 * preset-ignored surface in doc.diagnostics only AFTER layout(doc).
 */

// The canonical shell (mirrors docs/guides/06): app bar, 240px rail with a
// #side region, and #content filling everything right of the rail.
const SHELL = [
  'Wireframe #shell landscape visible=false',
  '  AppBar',
  '    Toolbar',
  '      Typography h6 "Acme"',
  '  Stack row 100% *',
  '    Box 240px *',
  '      Anchor #side',
  '    Anchor #content',
].join('\n');

const HOME = [
  'Wireframe #home background=#shell anchor=#content',
  '  Typography h1 "Dashboard"',
  '  Grid cols=3',
  '    Card to=#details',
].join('\n');

/** DFS a laid-out box tree for the box whose node carries `id`. @param {*} box @param {string} id @returns {*} */
function findBox(box, id) {
  if (box.node.id === id) return box;
  for (const child of box.children) {
    const hit = findBox(child, id);
    if (hit) return hit;
  }
  return undefined;
}

/** Parse + lay out a multi-frame source. @param {string} src */
function compose(src) {
  const doc = parse(src);
  const frames = layout(doc);
  return { doc, frames, byId: (/** @type {string} */ id) => /** @type {*} */ (frames.find((f) => f.id === id)) };
}

/** {x,y,w,h} of a box, for deepEqual. @param {*} b */
const rect = (b) => ({ x: b.x, y: b.y, w: b.w, h: b.h });

// --- parse ---------------------------------------------------------------------

test('Anchor parses with clean diagnostics and records its #id on node.id', () => {
  const doc = parse('Wireframe\n  Anchor #content');
  assert.deepEqual(doc.diagnostics, []);
  const anchor = doc.frames[0].children[0];
  assert.equal(anchor.component, 'Anchor');
  assert.equal(anchor.id, 'content');
});

test('Anchor parses keyless `w h` sizing tokens onto node.size, width then height', () => {
  const doc = parse('Wireframe\n  Anchor #console 100px 200px');
  assert.deepEqual(doc.diagnostics, []);
  const anchor = doc.frames[0].children[0];
  assert.deepEqual(anchor.size?.w, { unit: 'px', value: 100 });
  assert.deepEqual(anchor.size?.h, { unit: 'px', value: 200 });
});

test('an Anchor without #id warns at parse time (it can never be targeted)', () => {
  const doc = parse('Wireframe\n  Anchor');
  assert.ok(
    doc.diagnostics.some((d) => d.severity === 'warning' && /Anchor without #id/.test(d.message)),
    `expected the no-id warning, got ${JSON.stringify(doc.diagnostics)}`,
  );
});

test('a duplicate element #id within one frame warns at parse time; first wins', () => {
  const doc = parse('Wireframe #f\n  Anchor #a\n  Anchor #a');
  assert.ok(
    doc.diagnostics.some((d) => d.severity === 'warning' && /duplicate id "#a" in frame "#f"/.test(d.message)),
    `expected the duplicate-id warning, got ${JSON.stringify(doc.diagnostics)}`,
  );
});

test('an Anchor rejects keyed sizing (`w=`/`h=`): sizing is positional only', () => {
  // Same contract as Spacer (CONVENTION s.4): no keyed w=/h= prop exists.
  assert.throws(() => parse('Wireframe\n  Anchor #a w=16px'), /unknown property "w="/);
});

// --- layout (element) ------------------------------------------------------------

test('an unsized Anchor fills the leftover main axis AND the full cross axis', () => {
  const row = layout(parse('Wireframe w=300 h=200\n  Stack row 100% *\n    Box 50px 20px\n    Anchor #rest'))[0].root.children[0];
  const [box, anchor] = row.children;
  assert.equal(anchor.node.component, 'Anchor');
  assert.ok(anchor.w > box.w, `flexes into the main-axis slack, got ${anchor.w}`);
  assert.equal(Math.round(anchor.x + anchor.w), Math.round(row.x + row.w), 'reaches the far edge (flex)');
  assert.equal(Math.round(anchor.h), Math.round(row.h), 'stretches the full cross axis (block, unlike Spacer)');
});

test('a sized Anchor pins its region instead of flexing', () => {
  // The bottom-console pattern: a fixed 200px strip; #main flexes above it.
  const root = layout(parse('Wireframe w=400 h=600\n  Anchor #main\n  Anchor #console * 200px'))[0].root;
  const [main, consoleBox] = root.children;
  assert.equal(consoleBox.h, 200, 'the sized region honors its 200px token');
  const contentH = 600 - 2 * FRAME_PAD;
  assert.equal(Math.round(main.h), contentH - 200 - SPACING, '#main takes everything above the console');
});

test('an Anchor with no slack collapses, injecting no ghost extent', () => {
  const withAnchor = layout(parse('Wireframe w=200 h=400\n  Stack\n    Typography "A"\n    Anchor #slot\n    Typography "B"'))[0].root.children[0];
  const baseline = layout(parse('Wireframe w=200 h=400\n  Stack\n    Typography "A"\n    Typography "B"'))[0].root.children[0];
  assert.equal(Math.round(withAnchor.h), Math.round(baseline.h), 'a non-flexing Anchor adds no height');
});

// --- layout (composition) ---------------------------------------------------------

test('an anchored frame adopts the anchor box (x,y,w,h) and the background canvas (w,h)', () => {
  const { doc, byId } = compose(`${SHELL}\n\n${HOME}`);
  assert.deepEqual(doc.diagnostics, [], 'a resolvable background+anchor pair warns about nothing');
  const shell = byId('shell');
  const home = byId('home');
  const region = findBox(shell.root, 'content');
  assert.ok(region, 'the laid-out shell holds the #content region');
  assert.deepEqual(rect(home.root), rect(region), "the frame's root box IS the anchor's box");
  assert.deepEqual({ w: home.w, h: home.h }, { w: shell.w, h: shell.h }, "the canvas is the background's canvas");
});

test('the `at=` alias spells anchor=', () => {
  const { doc, byId } = compose(`${SHELL}\n\nWireframe #home background=#shell at=#content\n  Typography "x"`);
  assert.deepEqual(doc.diagnostics, []);
  assert.deepEqual(rect(byId('home').root), rect(findBox(byId('shell').root, 'content')));
});

test('anchor= may target any element carrying #id, not only Anchor', () => {
  const src = [
    'Wireframe #bg landscape visible=false',
    '  Box #hero 100% 300px',
    '',
    'Wireframe #fg background=#bg anchor=#hero',
    '  Typography "x"',
  ].join('\n');
  const { doc, byId } = compose(src);
  assert.deepEqual(doc.diagnostics, []);
  assert.deepEqual(rect(byId('fg').root), rect(findBox(byId('bg').root, 'hero')));
});

test('lookup is nearest-background-first: a nearer #content shadows a deeper one', () => {
  const src = [
    'Wireframe #base landscape visible=false',
    '  Anchor #content',
    '',
    'Wireframe #mid landscape visible=false background=#base',
    '  Box 100% 300px',
    '  Anchor #content',
    '',
    'Wireframe #fg background=#mid anchor=#content',
    '  Typography "x"',
  ].join('\n');
  const { doc, byId } = compose(src);
  assert.deepEqual(doc.diagnostics, []);
  const near = findBox(byId('mid').root, 'content');
  const deep = findBox(byId('base').root, 'content');
  assert.notEqual(near.y, deep.y, 'the two regions sit at different geometry (the test is meaningful)');
  assert.deepEqual(rect(byId('fg').root), rect(near), "the nearer background's region wins");
});

test('anchored-on-anchored chains keep coordinates absolute in the shared space', () => {
  const src = [
    SHELL,
    '',
    'Wireframe #page visible=false background=#shell anchor=#content',
    '  Box 100% 100px',
    '  Anchor #inner',
    '',
    'Wireframe #widget background=#page anchor=#inner',
    '  Typography "w"',
  ].join('\n');
  const { doc, byId } = compose(src);
  assert.deepEqual(doc.diagnostics, []);
  const shellRegion = findBox(byId('shell').root, 'content');
  const inner = findBox(byId('page').root, 'inner');
  assert.deepEqual(rect(byId('widget').root), rect(inner), "#widget adopts #inner's re-placed box");
  assert.ok(inner.x >= shellRegion.x && inner.y >= shellRegion.y, "#inner already sits inside #shell's region");
  assert.deepEqual({ w: byId('widget').w, h: byId('widget').h }, { w: byId('page').w, h: byId('page').h },
    "the canvas chains through to the shell's canvas");
});

test('anchor= without background= warns after layout; standalone layout stands', () => {
  const doc = parse('Wireframe #lonely landscape anchor=#content\n  Typography "x"');
  assert.deepEqual(doc.diagnostics, [], 'nothing to warn at parse time -- this is a layout-stage diagnostic');
  const [f] = layout(doc);
  assert.ok(
    doc.diagnostics.some((d) => d.severity === 'warning' && /anchor "#content" requires background=/.test(d.message)),
    `expected the requires-background warning, got ${JSON.stringify(doc.diagnostics)}`,
  );
  assert.deepEqual({ w: f.w, h: f.h }, PRESET_SIZES.landscape, 'normal standalone layout stands');
  assert.equal(f.root.x, 0);
});

test('an anchor id missing from the chain warns after layout; legacy overlay stands', () => {
  const doc = parse(`${SHELL}\n\nWireframe #home landscape background=#shell anchor=#nowhere\n  Typography "x"`);
  const frames = layout(doc);
  assert.ok(
    doc.diagnostics.some((d) => d.severity === 'warning'
      && /anchor "#nowhere" not found in background chain of "#home"/.test(d.message)),
    `expected the not-found warning, got ${JSON.stringify(doc.diagnostics)}`,
  );
  const home = /** @type {*} */ (frames.find((f) => f.id === 'home'));
  assert.equal(home.root.x, 0, 'legacy top-left overlay');
  assert.deepEqual({ w: home.w, h: home.h }, PRESET_SIZES.landscape, 'own preset size stands');
});

test('anchor= alongside a preset warns after layout, and the anchor wins', () => {
  // mobile differs from the shell's landscape canvas, so the winner is observable.
  const doc = parse(`${SHELL}\n\nWireframe #home mobile background=#shell anchor=#content\n  Typography "x"`);
  const frames = layout(doc);
  assert.ok(
    doc.diagnostics.some((d) => d.severity === 'warning'
      && /preset\/size ignored: frame "#home" is sized by anchor "#content"/.test(d.message)),
    `expected the preset-ignored warning, got ${JSON.stringify(doc.diagnostics)}`,
  );
  const home = /** @type {*} */ (frames.find((f) => f.id === 'home'));
  assert.deepEqual({ w: home.w, h: home.h }, PRESET_SIZES.landscape, 'the anchor (shell canvas) wins over mobile');
});

// --- render --------------------------------------------------------------------

/** The frame-border markup: between the clipped-content group close and the frame group close. @param {string} svg */
const borderOf = (svg) => (svg.match(/<\/g>([^]*?)<\/g><\/svg>$/) ?? [])[1];

test('Anchor draws nothing of its own; surrounding content still renders', () => {
  const { svg, diagnostics } = render('Wireframe\n  Stack row\n    Typography "Left"\n    Anchor #gap\n    Typography "Right"');
  assert.deepEqual(diagnostics, []);
  assert.match(svg, /Left/);
  assert.match(svg, /Right/);
});

test("an anchored frame's border outlines the canvas, not the region", () => {
  // rough.js seeds derive from geometry, so two 1280x800 frame borders are
  // byte-identical -- the anchored frame must match a plain landscape frame.
  const anchored = render(`${SHELL}\n\n${HOME}`).svg;
  const standalone = render('Wireframe landscape\n  Typography "x"').svg;
  assert.ok(borderOf(anchored), 'the anchored frame emits a border');
  assert.equal(borderOf(anchored), borderOf(standalone), 'border drawn at canvas size, not region size');
});

test('anchored content lands inside the region, right of the 240px rail', () => {
  const { svg } = render(`${SHELL}\n\n${HOME}`);
  const m = svg.match(/<text x="([\d.]+)"[^>]*>Dashboard/);
  assert.ok(m, 'the Dashboard heading renders as positioned text');
  assert.ok(Number(m[1]) > 240, `content starts inside the #content region, got x=${m[1]}`);
});

test('to= wrapping inside an anchored frame is unaffected', () => {
  const { svg } = render(`${SHELL}\n\n${HOME}`);
  assert.match(svg, /<a class="wm-link" href="#details">/);
});
