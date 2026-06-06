// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';
import { SPACING } from '../../src/metrics.js';

/**
 * Grid -- the explicit grid container (SPEC ss.5.2). `columns=N` (alias `cols=`)
 * sets the column count; children flow into equal-width cells row by row.
 * `spacing=` (alias `gap=`) folds row and column spacing. It draws nothing
 * itself. Width defaults to fill (engine-natural for a container); columns
 * defaults to 12, spacing to 0.
 */

// Three cells in a 2-column grid -> two cells on row 1, one on row 2.
const SRC = 'Wireframe w=400 h=400\n  Grid columns=2\n    Box 10px 10px\n    Box 10px 10px\n    Box 10px 10px';

test('Grid parses with clean diagnostics and resolves its column count', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const grid = doc.frames[0].children[0];
  assert.equal(grid.component, 'Grid');
  assert.equal(grid.props.columns, 2);
});

test('Grid accepts cols= as an alias for columns=', () => {
  const doc = parse('Wireframe\n  Grid cols=3');
  assert.deepEqual(doc.diagnostics, []);
  const grid = doc.frames[0].children[0];
  assert.equal(grid.props.columns, 3, 'cols= lands on the canonical columns prop');
});

test('Grid accepts spacing= and its alias gap=', () => {
  const viaSpacing = parse('Wireframe\n  Grid spacing=2');
  assert.deepEqual(viaSpacing.diagnostics, []);
  assert.equal(viaSpacing.frames[0].children[0].props.spacing, 2);

  const viaGap = parse('Wireframe\n  Grid gap=2');
  assert.deepEqual(viaGap.diagnostics, []);
  assert.equal(viaGap.frames[0].children[0].props.spacing, 2, 'gap= lands on the canonical spacing prop');
});

test('Grid resolves spacing to spacing*SPACING px between columns', () => {
  // layoutSpec folds spacing through SPACING; lock the resolved geometry, not
  // just the prop value. Two sized cells in a 2-column grid -> the inter-column
  // gap is spacing * SPACING px.
  const src = 'Wireframe w=400 h=400\n  Grid columns=2 spacing=2\n    Box 10px 10px\n    Box 10px 10px';
  const [c0, c1] = layout(parse(src))[0].root.children[0].children;
  assert.equal(c1.x - (c0.x + c0.w), 2 * SPACING, 'inter-column gap is spacing * SPACING px');
});

test('Grid floors a fractional column count rather than crashing the layout', () => {
  // The grid engine indexes cells by r*cols + c; a fractional columns would miss
  // the cell array and throw. layoutSpec floors it -> columns=2.5 behaves as 2.
  const src = 'Wireframe w=400 h=400\n  Grid columns=2.5\n    Box 10px 10px\n    Box 10px 10px\n    Box 10px 10px';
  const grid = layout(parse(src))[0].root.children[0];
  assert.ok(Number.isFinite(grid.w) && grid.w > 0, `w should be finite & positive, got ${grid.w}`);
  assert.equal(grid.children.length, 3);
  const [c0, c1, c2] = grid.children;
  assert.equal(c0.y, c1.y, 'floor(2.5)=2 -> first two cells share row 1');
  assert.ok(c2.y > c0.y, 'the third cell wraps to row 2 (2 columns, not 3)');
  assert.equal(c2.x, c0.x, 'the wrapped cell returns to the first column');
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
  assert.ok(Number.isFinite(c0.w) && c0.w > 0, `cell width should be finite & positive, got ${c0.w}`);

  // Row 2: the third cell wraps under the first column.
  assert.ok(c2.y > c0.y, 'the third cell wraps to the next row');
  assert.equal(c2.x, c0.x, 'the wrapped cell returns to the first column');
});

test('Grid defaults to 12 columns when columns= is omitted', () => {
  // Defaults are not injected into node.props (CONVENTION s.6); verify the
  // default through layout: three sized cells stay on one row (3 <= 12 columns)
  // at distinct, advancing x positions and equal width.
  const src = 'Wireframe w=400 h=400\n  Grid\n    Box 10px 10px\n    Box 10px 10px\n    Box 10px 10px';
  const grid = layout(parse(src))[0].root.children[0];
  assert.equal(grid.children.length, 3);
  const [c0, c1, c2] = grid.children;
  assert.equal(c0.y, c1.y, 'all three cells share the first row under the 12-column default');
  assert.equal(c1.y, c2.y, 'all three cells share the first row under the 12-column default');
  assert.ok(c1.x > c0.x && c2.x > c1.x, 'cells advance along x');
  assert.equal(c0.w, c1.w, 'columns are equal width');
  assert.equal(c1.w, c2.w, 'columns are equal width');
});

test('Grid draws nothing of its own but flows its cells to the SVG', () => {
  const { svg } = render('Wireframe\n  Grid columns=2\n    Typography "Cell"');
  assert.match(svg, /Cell/);  // the cell content reached the SVG through the grid layoutSpec
});
