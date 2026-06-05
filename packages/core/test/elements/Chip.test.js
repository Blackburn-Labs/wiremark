// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  Chip "New"';

test('Chip parses with clean diagnostics and resolves its label', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  // The Chip is the frame's first (and only) child.
  const chip = doc.frames[0].children[0];
  assert.equal(chip.component, 'Chip');
  assert.equal(chip.props.label, 'New');
});

test('Chip lays out to a finite, positive box', () => {
  const doc = parse(SRC);
  const box = layout(doc)[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});

test('Chip renders its label and a hand-drawn path', () => {
  const { svg } = render(SRC);
  assert.match(svg, /New/);
  assert.match(svg, /<path/);
});
