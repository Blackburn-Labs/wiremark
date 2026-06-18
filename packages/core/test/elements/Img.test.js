// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const RATIO_SRC = 'Wireframe landscape\n  Img ratio=16:9';
const BARE_SRC = 'Wireframe\n  Img';
const FULL_SRC = 'Wireframe landscape\n  Img ratio=16:9 alt="A photo" src="hero.png"';

const RATIO_16_9 = 16 / 9;

/** Lay out `src` and return the first Img box (depth-first). @param {string} src */
function imgBox(src) {
  const doc = parse(src);
  const frame = layout(doc)[0];
  /** @type {import('../../src/layout.js').Box | null} */
  let found = null;
  (function walk(/** @type {import('../../src/layout.js').Box} */ b) {
    if (found) return;
    if (b.node.component === 'Img') { found = b; return; }
    for (const c of b.children) walk(c);
  })(frame.root);
  if (!found) throw new Error('no Img box laid out');
  return /** @type {import('../../src/layout.js').Box} */ (found);
}

// --- parse / resolve ----------------------------------------------------------

test('Img with ratio parses cleanly and resolves its ratio prop', () => {
  const doc = parse(RATIO_SRC);
  assert.deepEqual(doc.diagnostics, []);

  // The Img is the frame's first (and only) child.
  const img = doc.frames[0].children[0];
  assert.equal(img.component, 'Img');
  assert.equal(img.props.ratio, '16:9');
});

test('Img resolves ratio + alt + src together', () => {
  const doc = parse(FULL_SRC);
  assert.deepEqual(doc.diagnostics, []);

  const img = doc.frames[0].children[0];
  assert.equal(img.props.ratio, '16:9');
  assert.equal(img.props.alt, 'A photo');
  assert.equal(img.props.src, 'hero.png');
});

test('Img accepts box-style sizing tokens (w then h) as a size, not props', () => {
  const doc = parse('Wireframe\n  Img 300px 200px');
  assert.deepEqual(doc.diagnostics, []);
  const img = doc.frames[0].children[0];
  assert.deepEqual(img.size, { w: { unit: 'px', value: 300 }, h: { unit: 'px', value: 200 } });
});

test('Img accepts percent and flex sizing tokens', () => {
  const pct = parse('Wireframe\n  Img 50%').frames[0].children[0];
  assert.deepEqual(pct.size?.w, { unit: '%', value: 50 });
  const flex = parse('Wireframe\n  Img *').frames[0].children[0];
  assert.deepEqual(flex.size?.w, { unit: 'fill' });
});

// --- render: alt caption ------------------------------------------------------

test('Img with alt and no src draws the alt as a centered caption over the box', () => {
  const { svg, diagnostics } = render('Wireframe\n  Img alt="Hero photo"');
  assert.deepEqual(diagnostics, []);
  assert.match(svg, /<path/, 'the crossed box is still drawn');
  const texts = svg.match(/<text/g) ?? [];
  assert.equal(texts.length, 1, 'exactly the alt caption line');
  assert.match(svg, /text-anchor="middle"/);
  assert.match(svg, /Hero photo/);
});

test('Img with both alt and src draws no caption (a real src is the picture)', () => {
  const { svg } = render('Wireframe\n  Img alt="Hero photo" src="hero.png"');
  assert.match(svg, /<path/);
  assert.doesNotMatch(svg, /<text/, 'a real src suppresses the alt caption');
});

test('a bare Img (no alt) draws no caption text', () => {
  const { svg } = render(BARE_SRC);
  assert.doesNotMatch(svg, /<text/);
});

// --- layout: precedence -------------------------------------------------------

test('both dimensions pinned -> the explicit sizes win and ratio is IGNORED', () => {
  // 300x200 is 3:2; the 16:9 ratio must NOT reshape it.
  const box = imgBox('Wireframe\n  Img 300px 200px ratio=16:9');
  assert.equal(box.w, 300);
  assert.equal(box.h, 200);
});

test('exactly one dimension (px width) + ratio -> ratio derives the height', () => {
  const box = imgBox('Wireframe\n  Img 200px ratio=16:9');
  assert.equal(box.w, 200);
  assert.ok(Math.abs(box.h - 200 / RATIO_16_9) < 0.01, `h should be 200/(16/9)=112.5, got ${box.h}`);
});

test('exactly one dimension (percent width) + ratio -> ratio derives the height', () => {
  // 50% of the landscape frame's inner width; height tracks 16:9 off that width.
  const box = imgBox('Wireframe landscape\n  Img 50% ratio=16:9');
  assert.ok(box.w > 0, `w should resolve from the percent, got ${box.w}`);
  assert.ok(Math.abs(box.w / box.h - RATIO_16_9) < 0.01, `w/h should be ~16/9, got ${box.w / box.h}`);
});

test('exactly one dimension (flex/* width) + ratio -> fills width, ratio derives height', () => {
  const box = imgBox('Wireframe landscape\n  Img * ratio=16:9');
  assert.ok(box.w > 0, `w should fill, got ${box.w}`);
  assert.ok(Math.abs(box.w / box.h - RATIO_16_9) < 0.01, `w/h should be ~16/9, got ${box.w / box.h}`);
});

test('ratio alone -> cross axis fills and the main extent is ratio-derived (today behavior)', () => {
  const box = imgBox(RATIO_SRC);
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
  assert.ok(Math.abs(box.w / box.h - RATIO_16_9) < 0.05, `w/h should be ~16/9, got ${box.w / box.h}`);
});

test('a bare Img (no ratio, no size) lays out at its intrinsic-ish size and renders a path', () => {
  const doc = parse(BARE_SRC);
  assert.deepEqual(doc.diagnostics, []);

  const box = imgBox(BARE_SRC);
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  // Height with no ratio/size comes from intrinsic (120), floored by minSize (60).
  assert.ok(box.h >= 60, `h should be at least the minSize floor, got ${box.h}`);

  const { svg } = render(BARE_SRC);
  assert.match(svg, /<path/);
});

// --- layout: minSize must not fight small explicit / derived sizes ------------

test('minSize does not inflate a deliberately small pinned image', () => {
  // 20x20 is below the {80,60} floor, but both dimensions are explicit.
  const box = imgBox('Wireframe\n  Img 20px 20px');
  assert.equal(box.w, 20);
  assert.equal(box.h, 20);
});

test('minSize does not inflate a small one-dimension + ratio image (derived height stays)', () => {
  // 20px wide at 16:9 -> 11.25 tall; the 60px height floor must NOT apply,
  // because the height is determined by the ratio off the explicit width.
  const box = imgBox('Wireframe\n  Img 20px ratio=16:9');
  assert.equal(box.w, 20);
  assert.ok(Math.abs(box.h - 20 / RATIO_16_9) < 0.01, `h should be 11.25 (not floored to 60), got ${box.h}`);
});

// --- layout: sizing inside a column container --------------------------------

test('both pinned dimensions survive inside a Card column unchanged', () => {
  const box = imgBox('Wireframe\n  Card\n    Img 240px 90px ratio=16:9');
  assert.equal(box.w, 240);
  assert.equal(box.h, 90);
});

// --- layout: precedence in a ROW (the cross axis is height) -------------------
// In a row an explicit WIDTH lands on the MAIN axis, so the height must come from
// the ratio rather than block-filling the row. Each test first confirms the Stack
// actually arranged its children horizontally, so a Stack direction regression
// surfaces as that assertion, not a confusing geometry mismatch.

/** Both Img boxes (in document order) under `src`. @param {string} src */
function imgBoxes(src) {
  const frame = layout(parse(src))[0];
  /** @type {import('../../src/layout.js').Box[]} */
  const found = [];
  (function walk(/** @type {import('../../src/layout.js').Box} */ b) {
    if (b.node.component === 'Img') found.push(b);
    for (const c of b.children) walk(c);
  })(frame.root);
  return found;
}

test('row + one dimension (px width) + ratio -> ratio derives the height', () => {
  // Two siblings so the row axis is unambiguous; the first is the one we measure.
  const [a, b] = imgBoxes('Wireframe landscape\n  Stack row\n    Img 100px ratio=16:9\n    Img 100px ratio=16:9');
  assert.ok(b.x > a.x, `siblings should be laid out horizontally (a.x=${a.x}, b.x=${b.x})`);
  assert.equal(a.w, 100);
  assert.ok(Math.abs(a.h - 100 / RATIO_16_9) < 0.02, `h should be 100/(16/9)=56.25, not the row height, got ${a.h}`);
});

test('row + one dimension (percent width) + ratio -> ratio derives the height', () => {
  const [a, b] = imgBoxes('Wireframe landscape\n  Stack row\n    Img 25% ratio=16:9\n    Img 25% ratio=16:9');
  assert.ok(b.x > a.x, `siblings should be laid out horizontally (a.x=${a.x}, b.x=${b.x})`);
  assert.ok(a.w > 0, `width should resolve from the percent, got ${a.w}`);
  assert.ok(Math.abs(a.w / a.h - RATIO_16_9) < 0.02, `w/h should be ~16/9, got ${a.w / a.h}`);
});

test('row + both dimensions + ratio -> the explicit sizes win and ratio is IGNORED', () => {
  const [a, b] = imgBoxes('Wireframe landscape\n  Stack row\n    Img 200px 200px ratio=16:9\n    Img 200px 200px ratio=16:9');
  assert.ok(b.x > a.x, `siblings should be laid out horizontally (a.x=${a.x}, b.x=${b.x})`);
  assert.equal(a.w, 200);
  assert.equal(a.h, 200);
});

test('row + ratio alone -> fills the row height and derives the width (unchanged)', () => {
  const [a, b] = imgBoxes('Wireframe landscape\n  Stack row\n    Img ratio=16:9\n    Img ratio=16:9');
  assert.ok(b.x > a.x, `siblings should be laid out horizontally (a.x=${a.x}, b.x=${b.x})`);
  assert.ok(Math.abs(a.w / a.h - RATIO_16_9) < 0.05, `w/h should be ~16/9, got ${a.w / a.h}`);
});

test('row + flex/* main width + ratio -> block-fills the cross axis (ratio NOT derived)', () => {
  // A flex `*` width means "fill", not "one explicit dimension": its resolved
  // main extent isn't known when the cross axis is measured, so the height
  // block-fills the row rather than being ratio-derived. This is the documented
  // carve-out, pinned here so the behavior can't silently change. A 200px-tall
  // sibling sets the row's content height; the flexed Img must fill that height,
  // NOT collapse to a ~16:9 height derived off its (large, flexed) width.
  const a = imgBox('Wireframe landscape\n  Stack row\n    Img * ratio=16:9\n    Box 100px 200px');
  assert.equal(a.h, 200, `the flexed Img should block-fill the 200px row height, got ${a.h}`);
  assert.ok(a.w / a.h > RATIO_16_9 + 0.5, `w/h should NOT track 16:9 (the width is flexed wide), got ${a.w / a.h}`);
});
