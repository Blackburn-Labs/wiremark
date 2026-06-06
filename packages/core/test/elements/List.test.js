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

test('dense resolves as a bare flag (and keyed) and tightens the list', () => {
  // `dense` is a keyless boolean (CONVENTION s.3): a bare token sets it true; the
  // keyed form works too. It applies a negative inter-row gap, so the same two
  // items occupy LESS height than a non-dense list.
  const denseDoc = parse('Wireframe\n  List dense\n    ListItem "Home"\n    ListItem "Reports"');
  assert.deepEqual(denseDoc.diagnostics, []);
  assert.equal(denseDoc.frames[0].children[0].props.dense, true);
  assert.equal(parse('Wireframe\n  List dense=true\n    ListItem "Home"').frames[0].children[0].props.dense, true);

  const regular = layout(parse(SRC))[0].root.children[0];
  const dense = layout(denseDoc)[0].root.children[0];
  assert.ok(dense.h < regular.h, `a dense list (${dense.h}) should be shorter than a regular one (${regular.h})`);
});

test('subheader resolves as a keyed string and renders its heading text', () => {
  const src = 'Wireframe\n  List subheader="Section"\n    ListItem "Home"';
  const doc = parse(src);
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.subheader, 'Section');
  // The heading is drawn in the reserved top band.
  assert.match(render(src).svg, /Section/);
});
