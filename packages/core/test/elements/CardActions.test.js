// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * CardActions -- the action row of a Card (SPEC ss.5.3). A padded row that draws
 * nothing itself; the Card supplies the paper beneath. Children -- typically a
 * couple of Buttons -- are laid out left-to-right.
 *
 * The CardActions is the Card's first child here:
 * layout(doc)[0].root.children[0].children[0].
 */

const SRC = 'Wireframe\n  Card\n    CardActions\n      Button "Buy"\n      Button "Details"';

test('CardActions parses cleanly inside a Card', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const actions = doc.frames[0].children[0].children[0];
  assert.equal(actions.component, 'CardActions');
});

test('CardActions lays its buttons out in a finite, positive row', () => {
  const actions = layout(parse(SRC))[0].root.children[0].children[0];
  assert.equal(actions.node.component, 'CardActions');
  assert.ok(Number.isFinite(actions.w) && actions.w > 0, `w should be finite & positive, got ${actions.w}`);
  assert.ok(Number.isFinite(actions.h) && actions.h > 0, `h should be finite & positive, got ${actions.h}`);

  // A padded row: the two buttons sit side by side, the second to the right of
  // the first, both inset from the actions box edge by the padding.
  const [buy, details] = actions.children;
  assert.equal(actions.children.length, 2);
  assert.equal(buy.y, details.y, 'actions share a row');
  assert.ok(details.x > buy.x, 'the second action is laid to the right');
  assert.ok(buy.x > actions.x, 'actions are inset from the box edge by padding');
});

test('CardActions flows its button labels to the SVG', () => {
  const { svg } = render(SRC);
  assert.match(svg, /Buy/);
  assert.match(svg, /Details/);
});
