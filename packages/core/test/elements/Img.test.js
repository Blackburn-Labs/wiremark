// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const RATIO_SRC = 'Wireframe landscape\n  Img ratio=16:9';
const BARE_SRC = 'Wireframe\n  Img';

test('Img with ratio parses cleanly and resolves its ratio prop', () => {
  const doc = parse(RATIO_SRC);
  assert.deepEqual(doc.diagnostics, []);

  // The Img is the frame's first (and only) child.
  const img = doc.frames[0].children[0];
  assert.equal(img.component, 'Img');
  assert.equal(img.props.ratio, '16:9');
});

test('Img ratio=16:9 lays out to a finite box honoring the aspect', () => {
  const doc = parse(RATIO_SRC);
  const box = layout(doc)[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);

  // The engine derives the main extent from the filled cross extent via aspect,
  // so the box's proportions should track 16:9 (allow slack for rounding).
  const ratio = box.w / box.h;
  assert.ok(Math.abs(ratio - 16 / 9) < 0.05, `w/h should be ~16/9, got ${ratio}`);
});

test('a bare Img (no ratio) still lays out and renders a hand-drawn path', () => {
  const doc = parse(BARE_SRC);
  assert.deepEqual(doc.diagnostics, []);

  const box = layout(doc)[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);

  const { svg } = render(BARE_SRC);
  assert.match(svg, /<path/);
});
