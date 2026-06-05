// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  Switch checked';

test('Switch parses with clean diagnostics and resolves checked', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  // The Switch is the frame's first (and only) child.
  const sw = doc.frames[0].children[0];
  assert.equal(sw.component, 'Switch');
  assert.equal(sw.props.checked, true);
});

test('Switch lays out to a finite, positive box', () => {
  const doc = parse(SRC);
  const box = layout(doc)[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});

test('Switch renders a hand-drawn path', () => {
  const { svg } = render(SRC);
  assert.match(svg, /<path/);
});
