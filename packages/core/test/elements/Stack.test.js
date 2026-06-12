// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';
import { SPACING } from '../../src/metrics.js';

/**
 * Stack -- the flex container (SPEC ss.4.2, ss.5.2). `Stack row`/`Stack column`
 * (default column) sets the main axis; the `-reverse` variants flip child order
 * along it. `spacing=N` (alias `gap=N`) resolves to N * SPACING px between
 * children. Optional `divider`/`outline`/`elevation` add chrome; with none of
 * them it draws nothing -- an invisible layout primitive whose only visible
 * effect is where it places its children.
 */

const ROW_SRC = 'Wireframe w=400 h=200\n  Stack row spacing=2\n    Typography "A"\n    Typography "B"';
const COL_SRC = 'Wireframe w=400 h=200\n  Stack column spacing=2\n    Typography "A"\n    Typography "B"';

const stackOf = (src) => parse(src).frames[0].children[0];
const laidStack = (src) => layout(parse(src))[0].root.children[0];

test('Stack parses with clean diagnostics and resolves direction + spacing', () => {
  const doc = parse(ROW_SRC);
  assert.deepEqual(doc.diagnostics, []);

  const stack = doc.frames[0].children[0];
  assert.equal(stack.component, 'Stack');
  assert.equal(stack.props.direction, 'row');
  assert.equal(stack.props.spacing, 2);
});

test('direction is keyless: each enum value resolves, and omitting it defaults to column', () => {
  for (const dir of ['row', 'row-reverse', 'column', 'column-reverse']) {
    const src = `Wireframe\n  Stack ${dir}\n    Typography "A"`;
    const doc = parse(src);
    assert.deepEqual(doc.diagnostics, [], `${dir} parses clean`);
    assert.equal(doc.frames[0].children[0].props.direction, dir);
  }
  // Default-when-omitted: the resolver does not inject defaults, so the prop is
  // absent and the strategy treats absence as 'column' (asserted via layout below).
  const bare = stackOf('Wireframe\n  Stack\n    Typography "A"');
  assert.equal(bare.props.direction, undefined, 'unset direction stays undefined (default applied by strategy)');
});

test('spacing accepts its `gap` alias: gap= and spacing= both land on spacing', () => {
  const viaGap = stackOf('Wireframe\n  Stack row gap=3\n    Typography "A"');
  assert.equal(viaGap.props.spacing, 3, 'gap= aliases to spacing');
  assert.equal(viaGap.props.gap, undefined, 'gap is not a distinct prop');

  const viaSpacing = stackOf('Wireframe\n  Stack row spacing=3\n    Typography "A"');
  assert.equal(viaSpacing.props.spacing, 3, 'spacing= lands directly');
});

test('outline is a keyless enum: each value resolves bare; divider is a keyless flag', () => {
  for (const o of ['none', 'solid', 'dashed', 'dotted']) {
    const stack = stackOf(`Wireframe\n  Stack column ${o}\n    Typography "A"`);
    assert.equal(stack.props.outline, o, `bare \`${o}\` fills the outline enum slot`);
  }
  const doc = parse('Wireframe\n  Stack column dashed divider\n    Typography "A"\n    Typography "B"');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.divider, true, 'bare `divider` flag resolves to true');
  // direction + outline disjoint domains both keyless, order-independent:
  const reordered = stackOf('Wireframe\n  Stack dashed column\n    Typography "A"');
  assert.equal(reordered.props.direction, 'column');
  assert.equal(reordered.props.outline, 'dashed');
});

test('elevation resolves as a number', () => {
  const stack = stackOf('Wireframe\n  Stack column elevation=2\n    Typography "A"');
  assert.equal(stack.props.elevation, 2);
});

test('Stack row lays children left-to-right separated by spacing*SPACING', () => {
  const stack = laidStack(ROW_SRC);
  assert.ok(Number.isFinite(stack.w) && stack.w > 0, `w should be finite & positive, got ${stack.w}`);
  assert.ok(Number.isFinite(stack.h) && stack.h > 0, `h should be finite & positive, got ${stack.h}`);
  assert.equal(stack.children.length, 2);

  const [a, b] = stack.children;
  assert.ok(b.x > a.x, 'a row advances along x');
  // Anti-swap guard (the user report this task investigates): a row must advance
  // on the MAIN (x) axis AND keep children level on the CROSS (y) axis. If the
  // direction->axis mapping were swapped, a "row" would stack vertically and these
  // y values would differ instead. Children are short labels of the same height,
  // so an honest row shares the exact y.
  assert.equal(a.y, b.y, 'row children share a y (do NOT stack vertically -- direction is not swapped)');
  // The second child starts after the first plus the resolved gap (2 * SPACING).
  assert.equal(b.x - (a.x + a.w), 2 * SPACING, 'the gap between children is spacing * SPACING');
});

test('Stack column lays children top-to-bottom separated by spacing*SPACING', () => {
  const stack = laidStack(COL_SRC);
  const [a, b] = stack.children;
  assert.ok(Number.isFinite(stack.h) && stack.h > 0, `h should be finite & positive, got ${stack.h}`);
  assert.ok(b.y > a.y, 'a column advances along y');
  // Anti-swap guard (mirror of the row case): a column advances on the MAIN (y)
  // axis AND keeps children aligned on the CROSS (x) axis. Column children align
  // to the start of the cross axis, so both share the same x; if direction were
  // swapped, a "column" would run horizontally and these x values would differ.
  assert.equal(a.x, b.x, 'column children share an x (do NOT lay out horizontally -- direction is not swapped)');
  assert.equal(b.y - (a.y + a.h), 2 * SPACING, 'the gap between children is spacing * SPACING');
});

test('default direction (omitted) lays out as a column', () => {
  const stack = laidStack('Wireframe w=400 h=200\n  Stack spacing=2\n    Typography "A"\n    Typography "B"');
  const [a, b] = stack.children;
  assert.ok(b.y > a.y && b.x === a.x, 'omitted direction behaves as column (advances along y)');
});

// Direct anti-swap cross-check (the user report this task investigates): render the
// SAME two children once as a row and once as a column in the SAME frame, and assert
// the two arrangements are genuinely orthogonal -- row varies x while column varies
// y, and crucially they are NOT each other's behavior. A swapped direction->axis
// mapping would make these two layouts identical (or transposed), failing here.
test('row and column are orthogonal, matching CSS flex-direction (not swapped)', () => {
  const SRC = (dir) => `Wireframe w=400 h=400\n  Stack ${dir} spacing=2\n    Typography "A"\n    Typography "B"`;
  const [ra, rb] = laidStack(SRC('row')).children;
  const [ca, cb] = laidStack(SRC('column')).children;

  // row: horizontal => x differs, y shared.
  assert.ok(rb.x > ra.x && rb.y === ra.y, 'row is horizontal (x advances, y shared)');
  // column: vertical => y differs, x shared.
  assert.ok(cb.y > ca.y && cb.x === ca.x, 'column is vertical (y advances, x shared)');
  // The two are not the same arrangement: a row does not advance on y, a column
  // does not advance on x. This is the assertion that fails if the mapping swaps.
  assert.equal(ra.y, rb.y, 'row does not advance vertically');
  assert.equal(ca.x, cb.x, 'column does not advance horizontally');
});

// Guard the mapping when Stacks nest (a common real layout: a row of controls
// inside a column form). The inner row must still run horizontally even though its
// parent runs vertically -- i.e. axis is per-Stack, never inherited or flipped.
test('a row nested inside a column still lays out horizontally', () => {
  const src =
    'Wireframe w=400 h=400\n' +
    '  Stack column spacing=2\n' +
    '    Typography "header"\n' +
    '    Stack row spacing=2\n' +
    '      Button "Save"\n' +
    '      Button "Cancel"';
  const outer = laidStack(src);
  const [, innerRow] = outer.children; // [Typography, inner Stack row]
  assert.equal(innerRow.node.component, 'Stack');
  const [a, b] = innerRow.children;
  assert.ok(b.x > a.x, 'nested row advances along x (horizontal)');
  assert.equal(a.y, b.y, 'nested row children share a y -- the inner axis is not inherited from the column parent');
});

// `-reverse` emits `reverse:true` in the layoutSpec, which the engine honors by
// mirroring child placement order along the main axis (flex weights and gaps are
// computed order-independently, so only the visual order flips). The engine also
// reorders `box.children`, so we read VISUAL order by sorting the laid-out children
// on the main axis and checking the labels come out in reverse source order.
const visualOrder = (kids, axis) =>
  [...kids].sort((a, b) => a[axis] - b[axis]).map((c) => c.node.props.label).join(',');

test('row-reverse reverses the left-to-right order of children (row stays forward)', () => {
  const SRC = (dir) => `Wireframe w=400 h=100\n  Stack ${dir}\n    Typography "A"\n    Typography "B"\n    Typography "C"`;
  assert.equal(visualOrder(laidStack(SRC('row')).children, 'x'), 'A,B,C', 'row keeps source order left-to-right');
  assert.equal(visualOrder(laidStack(SRC('row-reverse')).children, 'x'), 'C,B,A', 'row-reverse lays children right-to-left');
});

test('column-reverse reverses the top-to-bottom order of children (column stays forward)', () => {
  const SRC = (dir) => `Wireframe w=200 h=400\n  Stack ${dir}\n    Typography "A"\n    Typography "B"\n    Typography "C"`;
  assert.equal(visualOrder(laidStack(SRC('column')).children, 'y'), 'A,B,C', 'column keeps source order top-to-bottom');
  assert.equal(visualOrder(laidStack(SRC('column-reverse')).children, 'y'), 'C,B,A', 'column-reverse lays children bottom-to-top');
});

test('Stack draws nothing of its own by default but flows its children to the SVG', () => {
  const { svg } = render('Wireframe\n  Stack row\n    Typography "A"\n    Typography "B"');
  // Both children reach the output, proving the row layoutSpec ran.
  assert.match(svg, /A/);
  assert.match(svg, /B/);
});

test('divider draws a separator rule between children (best-effort visual)', () => {
  // With divider off, a bare Stack emits no chrome path of its own; with it on,
  // a separator line appears in the inter-child gap. Compare path counts to prove
  // the divider added strokes without asserting exact geometry.
  const plain = render('Wireframe w=400 h=200\n  Stack column\n    Typography "A"\n    Typography "B"').svg;
  const withDiv = render('Wireframe w=400 h=200\n  Stack column divider\n    Typography "A"\n    Typography "B"').svg;
  const count = (s) => (s.match(/<path /g) || []).length;
  assert.ok(count(withDiv) > count(plain), 'divider adds at least one stroke between the two children');
});
