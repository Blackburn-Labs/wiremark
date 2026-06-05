// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * Grid -- the explicit grid container (SPEC ss.5.2). `cols=N` sets the column
 * count; children flow into equal-width cells row by row. `gap=` folds row and
 * column spacing. It draws nothing itself.
 */

// Three cells in a 2-column grid -> two cells on row 1, one on row 2.
const SRC = 'Wireframe w=400 h=400\n  Grid cols=2\n    Box 10px 10px\n    Box 10px 10px\n    Box 10px 10px';

test('Grid parses with clean diagnostics and resolves its column count', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const grid = doc.frames[0].children[0];
  assert.equal(grid.component, 'Grid');
  assert.equal(grid.props.cols, 2);
});

test('Grid lays out to a finite, positive box', () => {
  const grid = layout(parse(SRC))[0].root.children[0];
  assert.ok(Number.isFinite(grid.w) && grid.w > 0, `w should be finite & positive, got ${grid.w}`);
  assert.ok(Number.isFinite(grid.h) && grid.h > 0, `h should be finite & positive, got ${grid.h}`);
});

test('Grid flows children into equal columns and wraps to the next row', () => {
  const grid = layout(parse(SRC))[0].root.children[0];
  assert.equal(grid.children.length, 3);
  const [c0, c1, c2] = grid.children;

  // Row 1: two cells side by side at the same y, equal width, c1 to the right of c0.
  assert.equal(c0.y, c1.y, 'the first two cells share a row');
  assert.ok(c1.x > c0.x, 'columns advance along x');
  assert.equal(c0.w, c1.w, 'columns are equal width');

  // Row 2: the third cell wraps under the first column.
  assert.ok(c2.y > c0.y, 'the third cell wraps to the next row');
  assert.equal(c2.x, c0.x, 'the wrapped cell returns to the first column');
});

test('Grid draws nothing of its own but flows its cells to the SVG', () => {
  const { svg } = render('Wireframe\n  Grid cols=2\n    Typography "Cell"');
  assert.match(svg, /Cell/);  // the cell content reached the SVG through the grid layoutSpec
});
