// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

// A horizontal Tabs strip holding three Tabs -- the canonical wireframe (FAMILIES
// Family 2). Tab is a sibling element; these tests assert Tabs' OWN behavior
// (axis, chrome, props) and only rely on Tab laying out to a box, which it does
// whether stubbed or fully implemented.
const SRC = 'Wireframe\n  Tabs\n    Tab "Overview"\n    Tab "Details"\n    Tab "Settings"';

/** The Tabs box (frame's first child) laid out from `src`. */
const tabsBox = (src) => layout(parse(src))[0].root.children[0];

test('Tabs parses with clean diagnostics', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);
  const tabs = doc.frames[0].children[0];
  assert.equal(tabs.component, 'Tabs');
});

test('Tabs lays out to a finite, positive box with one child box per Tab', () => {
  const box = tabsBox(SRC);
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
  assert.equal(box.children.length, 3);
});

test('orientation defaults to horizontal (a row): tabs share y, increasing x', () => {
  // Defaults aren't injected (CONVENTION s.6): a bare Tabs has no `orientation`
  // prop and the strategy treats it as the horizontal default -> a `row`.
  const doc = parse(SRC);
  assert.equal(doc.frames[0].children[0].props.orientation, undefined);

  const [a, b, c] = tabsBox(SRC).children;
  assert.equal(a.y, b.y, 'row tabs share a top edge');
  assert.equal(b.y, c.y, 'row tabs share a top edge');
  assert.ok(a.x < b.x && b.x < c.x, `row tabs advance in x, got ${a.x},${b.x},${c.x}`);
});

test('orientation=vertical (keyword) stacks tabs in a column: shared x, increasing y', () => {
  const src = 'Wireframe\n  Tabs vertical\n    Tab "One"\n    Tab "Two"';
  const doc = parse(src);
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.orientation, 'vertical');

  const [a, b] = tabsBox(src).children;
  assert.equal(a.x, b.x, 'column tabs share a left edge');
  assert.ok(a.y < b.y, `column tabs advance in y, got ${a.y} then ${b.y}`);
});

test('orientation is a keyless enum accepting each value', () => {
  for (const o of ['horizontal', 'vertical']) {
    const doc = parse(`Wireframe\n  Tabs ${o}\n    Tab "A"`);
    assert.deepEqual(doc.diagnostics, [], `Tabs ${o} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.orientation, o);
  }
});

test('orientation also accepts the keyed spelling', () => {
  const doc = parse('Wireframe\n  Tabs orientation=vertical\n    Tab "A"');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.orientation, 'vertical');
});

test('variant is a keyless enum accepting each value', () => {
  for (const v of ['standard', 'scrollable', 'fullWidth']) {
    const doc = parse(`Wireframe\n  Tabs ${v}\n    Tab "A"`);
    assert.deepEqual(doc.diagnostics, [], `Tabs ${v} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.variant, v);
  }
});

test('variant also accepts the keyed spelling', () => {
  const doc = parse('Wireframe\n  Tabs variant=fullWidth\n    Tab "A"');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.variant, 'fullWidth');
});

test('the two keyless enums resolve independent of token order', () => {
  // orientation and variant have disjoint value domains (CONVENTION s.2.1), so any
  // ordering is unambiguous.
  const expected = { orientation: 'vertical', variant: 'fullWidth' };
  for (const src of [
    'Wireframe\n  Tabs vertical fullWidth\n    Tab "A"',
    'Wireframe\n  Tabs fullWidth vertical\n    Tab "A"',
  ]) {
    const doc = parse(src);
    assert.deepEqual(doc.diagnostics, [], `${src} should parse cleanly`);
    const tabs = doc.frames[0].children[0];
    assert.deepEqual({ orientation: tabs.props.orientation, variant: tabs.props.variant }, expected);
  }
});

test('a bad orientation value is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Tabs orientation=diagonal\n    Tab "A"'), /diagonal|orientation/i);
});

test('a bad variant value is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Tabs variant=jumbo\n    Tab "A"'), /jumbo|variant/i);
});

test('setting orientation twice is a duplicate-token error', () => {
  assert.throws(() => parse('Wireframe\n  Tabs vertical horizontal\n    Tab "A"'), /orientation/i);
});

test('setting variant twice is a duplicate-token error', () => {
  assert.throws(() => parse('Wireframe\n  Tabs standard fullWidth\n    Tab "A"'), /variant/i);
});

test('Tabs renders a hand-drawn baseline rule along the strip bottom edge', () => {
  // The horizontal strip draws a faint indicator baseline along its bottom edge.
  // A bare Tabs adds exactly one muted-stroke path -- the baseline -- so we can
  // recover its geometry from the SVG and check it sits at the strip's bottom,
  // depending only on the Tabs box (mine), not on the sibling Tab leaf.
  const box = tabsBox(SRC);
  const { svg } = render(SRC);
  const muted = svg.match(/<path d="([^"]*)"[^>]*?stroke="#9aa7b2"[^>]*\/>/g) || [];
  assert.equal(muted.length, 1, 'exactly one muted baseline rule');

  // Pull the path's y-coordinates; the rule is a near-horizontal line at the
  // strip's bottom edge (box.y + box.h), within a hand-drawn wobble tolerance.
  const ys = (/** @type {string} */ (muted[0]).match(/[-\d.]+ ([-\d.]+)/g) || [])
    .map((p) => Number(p.split(' ')[1]));
  const bottom = box.y + box.h;
  assert.ok(ys.length > 0, 'baseline path exposes coordinates');
  assert.ok(ys.every((y) => Math.abs(y - bottom) < 4),
    `baseline should hug the strip bottom (${bottom}), got ys ${ys.join(',')}`);
});

test('horizontal and vertical strips differ in their rendered chrome', () => {
  // The baseline rule runs along a different edge per orientation, so the two
  // renders are not byte-identical -- variant/orientation discrimination is real,
  // not parse-only, for orientation.
  const horiz = render('Wireframe\n  Tabs horizontal\n    Tab "A"\n    Tab "B"').svg;
  const vert = render('Wireframe\n  Tabs vertical\n    Tab "A"\n    Tab "B"').svg;
  assert.notEqual(horiz, vert);
});
