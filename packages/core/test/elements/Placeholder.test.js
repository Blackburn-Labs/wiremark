// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const BARE_SRC = 'Wireframe\n  Placeholder';
const LABEL_SRC = 'Wireframe\n  Placeholder "Chart goes here"';
const FULL_SRC = 'Wireframe\n  Placeholder "Chart" description="Q3 revenue by region"';

/** Lay out `src` and return the first Placeholder box (depth-first). @param {string} src */
function phBox(src) {
  const frame = layout(parse(src))[0];
  /** @type {import('../../src/layout.js').Box | null} */
  let found = null;
  (function walk(/** @type {import('../../src/layout.js').Box} */ b) {
    if (found) return;
    if (b.node.component === 'Placeholder') { found = b; return; }
    for (const c of b.children) walk(c);
  })(frame.root);
  if (!found) throw new Error('no Placeholder box laid out');
  return /** @type {import('../../src/layout.js').Box} */ (found);
}

// --- parse / resolve ----------------------------------------------------------

test('a bare Placeholder parses cleanly with no props', () => {
  const doc = parse(BARE_SRC);
  assert.deepEqual(doc.diagnostics, []);
  const ph = doc.frames[0].children[0];
  assert.equal(ph.component, 'Placeholder');
  assert.deepEqual(ph.props, {});
});

test('the keyless string literal resolves to label', () => {
  const doc = parse(LABEL_SRC);
  assert.deepEqual(doc.diagnostics, []);
  const ph = doc.frames[0].children[0];
  assert.equal(ph.props.label, 'Chart goes here');
  // description is keyed-only: it stays undefined (resolver injects no defaults -- s.6).
  assert.equal(ph.props.description, undefined);
});

test('label (keyless) + description (keyed) resolve together', () => {
  const doc = parse(FULL_SRC);
  assert.deepEqual(doc.diagnostics, []);
  const ph = doc.frames[0].children[0];
  assert.equal(ph.props.label, 'Chart');
  assert.equal(ph.props.description, 'Q3 revenue by region');
});

test('description is keyed-only (a second bare literal is rejected)', () => {
  // Only ONE literal slot exists (label); a second text literal must throw.
  assert.throws(
    () => parse('Wireframe\n  Placeholder "Chart" "second"'),
    /more than one text literal/,
  );
});

test('label and the sizing token are order-independent', () => {
  // label before size, and size before label, must resolve identically.
  const a = parse('Wireframe\n  Placeholder "Chart" 200px 100px').frames[0].children[0];
  const b = parse('Wireframe\n  Placeholder 200px 100px "Chart"').frames[0].children[0];
  assert.equal(a.props.label, 'Chart');
  assert.equal(b.props.label, 'Chart');
  assert.deepEqual(a.size, b.size);
  assert.deepEqual(a.size, { w: { unit: 'px', value: 200 }, h: { unit: 'px', value: 100 } });
});

test('Placeholder accepts box-style sizing tokens (w then h) as a size, not props', () => {
  const doc = parse('Wireframe\n  Placeholder 300px 200px');
  assert.deepEqual(doc.diagnostics, []);
  const ph = doc.frames[0].children[0];
  assert.deepEqual(ph.size, { w: { unit: 'px', value: 300 }, h: { unit: 'px', value: 200 } });
  assert.deepEqual(ph.props, {}); // the tokens are geometry, not props
});

test('Placeholder accepts percent and flex sizing tokens', () => {
  const pct = parse('Wireframe\n  Placeholder 50%').frames[0].children[0];
  assert.deepEqual(pct.size?.w, { unit: '%', value: 50 });
  const flex = parse('Wireframe\n  Placeholder *').frames[0].children[0];
  assert.deepEqual(flex.size?.w, { unit: 'fill' });
});

// --- layout -------------------------------------------------------------------

test('a bare Placeholder lays out at its intrinsic size, floored by minSize', () => {
  const box = phBox(BARE_SRC);
  assert.equal(box.w, 160); // intrinsic w (above the 80 floor)
  assert.equal(box.h, 120); // intrinsic h (above the 72 floor)
});

test('explicit w/h tokens are honored verbatim', () => {
  const box = phBox('Wireframe\n  Placeholder 300px 200px');
  assert.equal(box.w, 300);
  assert.equal(box.h, 200);
});

test('minSize floors a deliberately tiny unconstrained Placeholder', () => {
  // No explicit size: a Placeholder with only a label still floors to minSize so
  // an empty stand-in never collapses. (intrinsic 160x120 already exceeds the
  // floor; this asserts a positive, finite box regardless.)
  const box = phBox(LABEL_SRC);
  assert.ok(Number.isFinite(box.w) && box.w >= 80, `w >= floor, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h >= 72, `h >= floor, got ${box.h}`);
});

test('an explicit size BELOW the floor is not inflated', () => {
  // Both dimensions are explicit, so minSize must not fight them.
  const box = phBox('Wireframe\n  Placeholder 20px 20px');
  assert.equal(box.w, 20);
  assert.equal(box.h, 20);
});

test('a percent width resolves against the frame and stays finite/positive', () => {
  const box = phBox('Wireframe landscape\n  Placeholder 50%');
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should resolve from the percent, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});

// --- render -------------------------------------------------------------------

test('a bare Placeholder renders the crossed box and NO text', () => {
  const { svg } = render(BARE_SRC);
  // rcrossbox emits the rectangle outline + two diagonals, all <path>.
  assert.match(svg, /<path/);
  assert.doesNotMatch(svg, /<text/); // nothing to label
});

test('a labeled Placeholder renders the crossed box plus one centered label', () => {
  const { svg } = render(LABEL_SRC);
  assert.match(svg, /<path/);
  const texts = svg.match(/<text/g) ?? [];
  assert.equal(texts.length, 1, 'exactly the label line');
  assert.match(svg, /text-anchor="middle"/);
  assert.match(svg, /Chart goes here/);
});

test('label + description render as two centered lines, the description muted', () => {
  const { svg } = render(FULL_SRC);
  const texts = svg.match(/<text/g) ?? [];
  assert.equal(texts.length, 2, 'label line + description line');
  assert.match(svg, /Chart/);
  assert.match(svg, /Q3 revenue by region/);
  // the description uses the muted palette color (light theme).
  assert.match(svg, /fill="#9aa7b2"/);
});

test('a description with no label still renders, in the finer muted style', () => {
  const { svg } = render('Wireframe\n  Placeholder description="just a note"');
  const texts = svg.match(/<text/g) ?? [];
  assert.equal(texts.length, 1);
  assert.match(svg, /just a note/);
  assert.match(svg, /fill="#9aa7b2"/);
});

test('a long label in a small box is ellipsized, not spilled', () => {
  const { svg } = render('Wireframe\n  Placeholder 40px 40px "A very long label that cannot possibly fit"');
  assert.match(svg, /…/); // truncateText cut the line to the box width
  assert.doesNotMatch(svg, /A very long label that cannot possibly fit/);
});

test('output is deterministic (same source -> byte-identical SVG)', () => {
  assert.equal(render(FULL_SRC).svg, render(FULL_SRC).svg);
});
