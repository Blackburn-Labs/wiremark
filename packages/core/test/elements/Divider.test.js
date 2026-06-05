// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';
import { FRAME_PAD, PRESET_SIZES } from '../../src/metrics.js';

const SRC = 'Wireframe\n  Divider';
const SRC_LANDSCAPE = 'Wireframe landscape\n  Divider';

test('Divider parses with clean diagnostics and resolves its component', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  // The Divider is the frame's first (and only) child.
  const div = doc.frames[0].children[0];
  assert.equal(div.component, 'Divider');
});

test('Divider lays out to a finite box and stretches to the frame width', () => {
  // In a sized frame the block-level rule fills the cross axis, so its width is
  // the frame's content width (frame width minus padding on both edges).
  const doc = parse(SRC_LANDSCAPE);
  const box = layout(doc)[0].root.children[0];

  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);

  const contentW = PRESET_SIZES.landscape.w - 2 * FRAME_PAD;
  assert.ok(
    Math.abs(box.w - contentW) <= 1,
    `divider should stretch to the frame content width (~${contentW}), got ${box.w}`,
  );
});

test('Divider renders a hand-drawn path', () => {
  const { svg } = render(SRC);
  assert.match(svg, /<path/);
});
