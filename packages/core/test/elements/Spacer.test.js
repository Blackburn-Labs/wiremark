// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * Spacer -- an invisible flexible filler (SPEC ss.5.2). It carries no intrinsic
 * size but flexes: in a Stack with free main-axis space it absorbs the leftover
 * and pushes the following siblings to the far edge. With no slack (a column
 * sized to its content) it collapses harmlessly.
 */

// Two fixed 50px boxes in a 300px-wide row: the Spacer between them takes the slack.
const SRC = 'Wireframe w=300 h=100\n  Stack row\n    Box 50px 20px\n    Spacer\n    Box 50px 20px';

test('Spacer parses with clean diagnostics and resolves its component', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const spacer = doc.frames[0].children[0].children[1];
  assert.equal(spacer.component, 'Spacer');
});

test('Spacer absorbs the leftover main-axis space and pushes its sibling to the edge', () => {
  const row = layout(parse(SRC))[0].root.children[0];
  const [first, spacer, last] = row.children;

  // The Spacer takes the slack, so it is the widest item in the row...
  assert.ok(spacer.w > first.w && spacer.w > last.w, `Spacer should absorb the slack, got ${spacer.w}`);
  // ...and the trailing fixed box is pushed flush to the row's right edge.
  assert.equal(Math.round(last.x + last.w), Math.round(row.x + row.w), 'the trailing box is pushed to the far edge');
});

test('in a stretched `Stack row 100% *` a Spacer pushes the trailing item to the right edge', () => {
  // The canonical case: the Stack itself is stretched (100% wide, * tall) so its
  // row has free main-axis space for the Spacer to consume.
  const row = layout(parse('Wireframe landscape\n  Stack row 100% *\n    Button "A"\n    Spacer\n    Button "B"'))[0].root.children[0];
  const [first, spacer, last] = row.children;

  assert.ok(spacer.w > first.w && spacer.w > last.w, `Spacer should consume the leftover space, got ${spacer.w}`);
  assert.equal(Math.round(last.x + last.w), Math.round(row.x + row.w), 'the trailing Button is pushed to the right edge');
});

test('Spacer draws nothing of its own; surrounding content still renders', () => {
  const { svg } = render('Wireframe\n  Stack row\n    Typography "Left"\n    Spacer\n    Typography "Right"');
  assert.match(svg, /Left/);
  assert.match(svg, /Right/);
});
