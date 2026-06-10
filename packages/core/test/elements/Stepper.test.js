// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

// A horizontal Stepper holding three Steps -- the canonical wireframe (FAMILIES
// Family 3). Step is a sibling element; these tests assert Stepper's OWN
// behavior (axis, child box count, connector chrome, props) and only rely on
// Step laying out to a box, which it does whether stubbed or fully implemented.
const SRC = 'Wireframe\n  Stepper\n    Step "Cart"\n    Step "Address"\n    Step "Payment"';

/** The Stepper box (frame's first child) laid out from `src`. */
const stepperBox = (src) => layout(parse(src))[0].root.children[0];

test('Stepper parses with clean diagnostics', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);
  const stepper = doc.frames[0].children[0];
  assert.equal(stepper.component, 'Stepper');
});

test('Stepper lays out to a finite, positive box with one child box per Step', () => {
  const box = stepperBox(SRC);
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
  assert.equal(box.children.length, 3);
});

test('orientation defaults to horizontal (a row): steps share y, increasing x', () => {
  // Defaults aren't injected (CONVENTION s.6): a bare Stepper has no
  // `orientation` prop and the strategy treats it as the horizontal default.
  const doc = parse(SRC);
  assert.equal(doc.frames[0].children[0].props.orientation, undefined);

  const [a, b, c] = stepperBox(SRC).children;
  assert.equal(a.y, b.y, 'row steps share a top edge');
  assert.equal(b.y, c.y, 'row steps share a top edge');
  assert.ok(a.x < b.x && b.x < c.x, `row steps advance in x, got ${a.x},${b.x},${c.x}`);
});

test('orientation=vertical (keyword) stacks steps in a column: shared x, increasing y', () => {
  const src = 'Wireframe\n  Stepper vertical\n    Step "One"\n    Step "Two"';
  const doc = parse(src);
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.orientation, 'vertical');

  const [a, b] = stepperBox(src).children;
  assert.equal(a.x, b.x, 'column steps share a left edge');
  assert.ok(a.y < b.y, `column steps advance in y, got ${a.y} then ${b.y}`);
});

test('orientation is a keyless enum accepting each value', () => {
  for (const o of ['horizontal', 'vertical']) {
    const doc = parse(`Wireframe\n  Stepper ${o}\n    Step "A"`);
    assert.deepEqual(doc.diagnostics, [], `Stepper ${o} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.orientation, o);
  }
});

test('orientation also accepts the keyed spelling', () => {
  const doc = parse('Wireframe\n  Stepper orientation=vertical\n    Step "A"');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.orientation, 'vertical');
});

test('a bad orientation value is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Stepper orientation=diagonal\n    Step "A"'), /diagonal|orientation/i);
});

test('setting orientation twice is a duplicate-token error', () => {
  assert.throws(() => parse('Wireframe\n  Stepper vertical horizontal\n    Step "A"'), /orientation/i);
});

test('Stepper draws a muted connector rule between each consecutive pair of Steps', () => {
  // Three steps -> two gaps -> two connector rules, each a muted-stroke path.
  const { svg } = render(SRC);
  const muted = svg.match(/<path d="[^"]*"[^>]*stroke="#9aa7b2"[^>]*\/>/g) || [];
  assert.equal(muted.length, 2, 'two connector rules for three steps');
});

test('a single Step draws no connector (no gap to bridge)', () => {
  const { svg } = render('Wireframe\n  Stepper\n    Step "Only"');
  const muted = svg.match(/<path d="[^"]*"[^>]*stroke="#9aa7b2"[^>]*\/>/g) || [];
  assert.equal(muted.length, 0, 'one step has no gaps, so no connectors');
});

test('horizontal connectors run across the gap at the steps shared vertical midline', () => {
  // The horizontal connector is a near-horizontal line: its endpoints share a y
  // at the steps' vertical center, and it spans rightward from one step's right
  // edge toward the next step's left edge.
  const box = stepperBox(SRC);
  const [a, b] = box.children;
  const { svg } = render(SRC);
  const muted = svg.match(/<path d="[^"]*"[^>]*stroke="#9aa7b2"[^>]*\/>/g) || [];
  assert.ok(muted.length >= 1, 'at least one connector path');

  const midY = a.y + a.h / 2;
  const ys = (/** @type {string} */ (muted[0]).match(/[-\d.]+ ([-\d.]+)/g) || [])
    .map((p) => Number(p.split(' ')[1]));
  assert.ok(ys.length > 0, 'connector path exposes coordinates');
  assert.ok(ys.every((y) => Math.abs(y - midY) < 4),
    `horizontal connector should hug the steps' midline (${midY}), got ys ${ys.join(',')}`);
  // The first gap sits between step a's right edge and step b's left edge.
  assert.ok(a.x + a.w <= b.x, 'steps advance in x with a gap between them');
});

test('horizontal and vertical Steppers differ in their rendered chrome', () => {
  // The connectors run along a different axis per orientation, so the two renders
  // are not byte-identical -- orientation discrimination is real, not parse-only.
  const horiz = render('Wireframe\n  Stepper horizontal\n    Step "A"\n    Step "B"').svg;
  const vert = render('Wireframe\n  Stepper vertical\n    Step "A"\n    Step "B"').svg;
  assert.notEqual(horiz, vert);
});
