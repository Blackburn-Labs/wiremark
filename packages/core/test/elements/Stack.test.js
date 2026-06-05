// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';
import { SPACING } from '../../src/metrics.js';

/**
 * Stack -- the flex container (SPEC ss.4.2, ss.5.2). `Stack row`/`Stack col`
 * (default col) sets the main axis; `gap=N` resolves to N * SPACING px between
 * children. It draws nothing itself -- an invisible layout primitive whose only
 * visible effect is where it places its children.
 */

const ROW_SRC = 'Wireframe w=400 h=200\n  Stack row gap=2\n    Typography "A"\n    Typography "B"';
const COL_SRC = 'Wireframe w=400 h=200\n  Stack col gap=2\n    Typography "A"\n    Typography "B"';

test('Stack parses with clean diagnostics and resolves direction + gap', () => {
  const doc = parse(ROW_SRC);
  assert.deepEqual(doc.diagnostics, []);

  const stack = doc.frames[0].children[0];
  assert.equal(stack.component, 'Stack');
  assert.equal(stack.props.direction, 'row');
  assert.equal(stack.props.gap, 2);
});

test('Stack row lays children left-to-right separated by gap*SPACING', () => {
  const stack = layout(parse(ROW_SRC))[0].root.children[0];
  assert.ok(Number.isFinite(stack.w) && stack.w > 0, `w should be finite & positive, got ${stack.w}`);
  assert.equal(stack.children.length, 2);

  const [a, b] = stack.children;
  assert.ok(b.x > a.x, 'a row advances along x');
  // The second child starts after the first plus the resolved gap (2 * SPACING).
  assert.equal(b.x - (a.x + a.w), 2 * SPACING, 'the gap between children is gap * SPACING');
});

test('Stack col lays children top-to-bottom separated by gap*SPACING', () => {
  const stack = layout(parse(COL_SRC))[0].root.children[0];
  const [a, b] = stack.children;
  assert.ok(b.y > a.y, 'a column advances along y');
  assert.equal(b.y - (a.y + a.h), 2 * SPACING, 'the gap between children is gap * SPACING');
});

test('Stack draws nothing of its own but flows its children to the SVG', () => {
  const { svg } = render('Wireframe\n  Stack row\n    Typography "A"\n    Typography "B"');
  // Both children reach the output, proving the row layoutSpec ran.
  assert.match(svg, /A/);
  assert.match(svg, /B/);
});
