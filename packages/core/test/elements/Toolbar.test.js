// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

// A Toolbar holding a brand Typography -- the dashboard/shell idiom (SPEC ss.5.3).
const SRC = 'Wireframe landscape\n  Toolbar\n    Typography h6 "Acme"';

test('Toolbar parses with clean diagnostics', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  // The Toolbar is the frame's first (and only) child.
  const toolbar = doc.frames[0].children[0];
  assert.equal(toolbar.component, 'Toolbar');
});

test('Toolbar lays out to a finite, positive box', () => {
  const doc = parse(SRC);
  const box = layout(doc)[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});

test('Toolbar is invisible but flows its child through a row', () => {
  const { svg } = render(SRC);
  // The child Typography text reaches the SVG, proving the row layoutSpec ran.
  assert.match(svg, /Acme/);
});

test('variant is a keyless enum: `dense` sets it, a bare Toolbar defaults to regular', () => {
  const dense = parse('Wireframe landscape\n  Toolbar dense\n    Typography h6 "A"');
  assert.deepEqual(dense.diagnostics, []);
  assert.equal(dense.frames[0].children[0].props.variant, 'dense');
  // Defaults aren't injected (CONVENTION s.6): an omitted variant is absent and
  // the strategy treats it as `regular`.
  assert.equal(parse(SRC).frames[0].children[0].props.variant, undefined);
});

test('a dense Toolbar packs its items tighter than a regular one', () => {
  // The dense variant halves the inter-item gap (SPACING -> SPACING/2), so the
  // second child sits closer to the first. Two items so the gap is observable.
  const boxOf = (variant) => layout(parse(
    `Wireframe landscape\n  Toolbar ${variant}\n    Typography h6 "A"\n    Typography h6 "B"`,
  ))[0].root.children[0];
  const gapOf = (b) => b.children[1].x - (b.children[0].x + b.children[0].w);
  assert.ok(gapOf(boxOf('dense')) < gapOf(boxOf('regular')),
    'dense inter-item gap should be smaller than regular');
});
