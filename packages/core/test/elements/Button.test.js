// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  Button "Buy" primary';

test('Button parses with a clean diagnostics and resolves its props', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  // The Button is the frame's first (and only) child.
  const btn = doc.frames[0].children[0];
  assert.equal(btn.component, 'Button');
  assert.equal(btn.props.label, 'Buy');
  assert.equal(btn.props.primary, true);
});

test('Button lays out to a finite, positive box', () => {
  const doc = parse(SRC);
  const box = layout(doc)[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});

test('Button renders its label and a hand-drawn path', () => {
  const { svg } = render(SRC);
  assert.match(svg, /Buy/);
  assert.match(svg, /<path/);
});
