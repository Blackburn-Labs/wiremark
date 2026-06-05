// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  Icon "home"';

test('Icon parses with clean diagnostics and the keyless name resolves', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  // The Icon is the frame's first (and only) child.
  const icon = doc.frames[0].children[0];
  assert.equal(icon.component, 'Icon');
  assert.equal(icon.props.name, 'home');
});

test('Icon lays out to a finite ~24x24 box', () => {
  const doc = parse(SRC);
  const box = layout(doc)[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
  assert.equal(box.w, 24);
  assert.equal(box.h, 24);
});

test('Icon renders a hand-drawn path', () => {
  const { svg } = render(SRC);
  assert.match(svg, /<path/);
});
