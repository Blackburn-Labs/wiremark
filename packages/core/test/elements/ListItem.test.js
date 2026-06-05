// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  ListItem "Home" to=#home';

test('ListItem parses with clean diagnostics and resolves label + to', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  // The ListItem is the frame's first (and only) child.
  const item = doc.frames[0].children[0];
  assert.equal(item.component, 'ListItem');
  assert.equal(item.props.label, 'Home');
  // to=#home -> the frame anchor with its leading '#' stripped (SPEC ss.7).
  assert.equal(item.props.to, 'home');
});

test('ListItem lays out to a finite, positive ~40px-tall row box', () => {
  const doc = parse(SRC);
  const box = layout(doc)[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
  assert.equal(box.h, 40, `row height should be ROW_H (40), got ${box.h}`);
});

test('ListItem renders its label inside the to= link wrapper', () => {
  const { svg } = render(SRC);
  assert.match(svg, /Home/);
  // The render facade wraps a to= node in a link anchor (SPEC ss.7.2).
  assert.match(svg, /href="#home"/);
});
