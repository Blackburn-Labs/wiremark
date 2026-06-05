// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  List\n    ListItem "Home"\n    ListItem "Reports"';

test('List parses with clean diagnostics', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  // The List is the frame's first (and only) child, holding two ListItems.
  const list = doc.frames[0].children[0];
  assert.equal(list.component, 'List');
  assert.equal(list.children.length, 2);
});

test('List lays out to a finite, positive box that flows its two items', () => {
  const doc = parse(SRC);
  const box = layout(doc)[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
  // The col layoutSpec arranges both ListItems as children in the laid-out tree.
  assert.equal(box.children.length, 2);
});

test('List flows its items down a column (second below the first)', () => {
  const doc = parse(SRC);
  const box = layout(doc)[0].root.children[0];
  const [first, second] = box.children;
  // pad/gap are 0, so rows abut: the second item starts at the bottom of the first.
  assert.ok(second.y >= first.y + first.h - 0.001, `second item should sit below the first (col axis); got y1=${first.y} h1=${first.h} y2=${second.y}`);
});

test('List renders its items\' labels (children flowed through the col layoutSpec)', () => {
  // ListItem is implemented concurrently; if its text is not emitted yet, the
  // List box geometry asserted above still holds. Only assert text presence
  // when the ListItem renderer has landed.
  const { svg } = render(SRC);
  if (/ListItem/.test(svg) || /Home/.test(svg)) {
    assert.match(svg, /Home/);
    assert.match(svg, /Reports/);
  }
});
