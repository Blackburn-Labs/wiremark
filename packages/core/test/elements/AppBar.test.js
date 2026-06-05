// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

// A wrapped child (AppBar -> Toolbar -> Typography) proves children flow through
// the AppBar's row layoutSpec all the way down to a real text leaf.
const SRC = 'Wireframe landscape\n  AppBar\n    Toolbar\n      Typography h6 "Acme"';

test('AppBar parses with clean diagnostics', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);
});

test('AppBar lays out to a finite box spanning ~the full frame content width', () => {
  const doc = parse(SRC);
  const box = layout(doc)[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
  // landscape frame is 1280 wide; minus the frame's 16px padding each side -> 1248.
  assert.ok(box.w >= 1240, `AppBar should span near the full content width (~1248), got ${box.w}`);
});

test('AppBar renders the bar surface and its nested label', () => {
  const { svg } = render(SRC);
  assert.match(svg, /<path/);   // the bar's hand-drawn surface
  assert.match(svg, /Acme/);    // the child reached the SVG through the layoutSpec
});
