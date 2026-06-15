// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';
import { PRESET_SIZES } from '../../src/metrics.js';

const SRC = 'Wireframe\n  Divider';
const SRC_LANDSCAPE = 'Wireframe landscape\n  Divider';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];

test('Divider parses with clean diagnostics and resolves its component', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const div = doc.frames[0].children[0];
  assert.equal(div.component, 'Divider');
});

test('orientation and variant default to undefined when omitted (strategy applies defaults)', () => {
  // The resolver does not inject PropDef defaults; an unset prop is absent.
  const div = firstChild(SRC);
  assert.equal(div.props.orientation, undefined);
  assert.equal(div.props.variant, undefined);
});

test('orientation is a keyless enum accepting both values', () => {
  for (const o of ['horizontal', 'vertical']) {
    const doc = parse(`Wireframe\n  Divider ${o}`);
    assert.deepEqual(doc.diagnostics, [], `Divider ${o} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.orientation, o);
  }
});

test('variant is a keyless enum accepting each value', () => {
  for (const v of ['solid', 'dashed', 'dotted']) {
    const doc = parse(`Wireframe\n  Divider ${v}`);
    assert.deepEqual(doc.diagnostics, [], `Divider ${v} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.variant, v);
  }
});

test('the two keyless enums resolve independent of token order', () => {
  // Disjoint value domains (CONVENTION s.2.1) => either ordering is unambiguous.
  const a = firstChild('Wireframe\n  Divider vertical dashed');
  const b = firstChild('Wireframe\n  Divider dashed vertical');
  const expected = { orientation: 'vertical', variant: 'dashed' };
  assert.deepEqual({ orientation: a.props.orientation, variant: a.props.variant }, expected);
  assert.deepEqual({ orientation: b.props.orientation, variant: b.props.variant }, expected);
});

test('a horizontal Divider lays out to a finite box and stretches to the frame width', () => {
  // In a sized frame the block-level rule fills the cross axis (width in a
  // column), so its width is the frame's content width (frame is flush -- padding
  // defaults to 0 -- so that equals the full frame width).
  const doc = parse(SRC_LANDSCAPE);
  const box = layout(doc)[0].root.children[0];

  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);

  const contentW = PRESET_SIZES.landscape.w;
  assert.ok(
    Math.abs(box.w - contentW) <= 1,
    `divider should stretch to the frame content width (~${contentW}), got ${box.w}`,
  );
});

test('a vertical Divider lays out finite & positive and stretches to the row height', () => {
  // The idiomatic placement: a vertical rule between row children. The block
  // leaf fills the cross axis (height in a row), so it spans the row's height.
  const src = 'Wireframe landscape\n  Stack row 240px 80px\n    Divider vertical';
  const doc = parse(src);
  assert.deepEqual(doc.diagnostics, []);
  const box = layout(doc)[0].root.children[0].children[0];

  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
  // Thin on its own (horizontal) axis, tall on the cross axis.
  assert.ok(box.h > box.w, `vertical divider should be taller than it is wide, got ${box.w}x${box.h}`);
  assert.ok(
    Math.abs(box.h - 80) <= 1,
    `vertical divider should fill the row height (~80), got ${box.h}`,
  );
});

test('Divider renders a hand-drawn path for both orientations', () => {
  assert.match(render(SRC).svg, /<path/);
  assert.match(render('Wireframe landscape\n  Stack row 240px 80px\n    Divider vertical').svg, /<path/);
});

test('a dashed Divider emits a stroke-dasharray', () => {
  // variant selects the shared outline dash arrays (CONVENTION s.8).
  const { svg } = render('Wireframe\n  Divider dashed');
  assert.match(svg, /stroke-dasharray=/);
});
