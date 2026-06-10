// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';
import TableRow from '../../src/elements/TableRow.js';

/** Laid-out root box of the first frame for `src`. */
const root = (src) => layout(parse(src))[0].root;
/** The frame's first child box (the TableRow in these fixtures). */
const firstBox = (src) => root(src).children[0];

/** A standalone TableRow holding two cells (no Table wrapper needed). */
const ROW2 = 'Wireframe\n  TableRow\n    TableCell "A"\n    TableCell "B"';

test('TableRow parses cleanly and is registered as a v1.0 content element', () => {
  const doc = parse(ROW2);
  assert.deepEqual(doc.diagnostics, []);

  const row = doc.frames[0].children[0];
  assert.equal(row.component, 'TableRow');

  assert.equal(TableRow.tier, 'v1.0');
  assert.equal(TableRow.category, 'content');
});

test('TableRow is a CONTAINER (overrides its slice children:false): it holds its cells', () => {
  // The slice says children:false; the family ruling overrides that so a row can
  // hold TableCells. A layoutSpec makes it a container regardless of the slice.
  assert.equal(typeof TableRow.layoutSpec, 'function');
  assert.equal(TableRow.intrinsic, undefined, 'a container must NOT also define intrinsic');
  assert.equal(TableRow.container, true);

  const box = firstBox(ROW2);
  assert.ok(Array.isArray(box.children), 'row box should have child cell boxes');
  assert.equal(box.children.length, 2);
  assert.deepEqual(
    box.children.map((c) => c.node.component),
    ['TableCell', 'TableCell'],
  );

  // The deviation must be documented for reviewers (FAMILIES.md requirement).
  assert.match(TableRow.notes, /children:false/);
});

test('the override is honest: declares no intrinsic and uses a row layoutSpec', () => {
  const spec = TableRow.layoutSpec({ props: {} });
  assert.equal(spec.axis, 'row');
  assert.equal(spec.pad, 0, 'pad:0 so cells abut');
  assert.equal(spec.gap, 0, 'gap:0 so equal-flex cells abut into aligned columns');
});

test('cells lay out left-to-right (row axis): increasing x, shared y', () => {
  const cells = firstBox(ROW2).children;
  assert.ok(cells[1].x > cells[0].x, 'second cell sits to the right of the first');
  assert.equal(cells[0].y, cells[1].y, 'cells share a baseline y in a row');
});

test('equal-flex cells split the row width evenly (aligned columns)', () => {
  // Three equal-flex cells in one row => three equal-width cell boxes. This is the
  // mechanism that aligns columns for rows of equal cell count.
  const src = 'Wireframe\n  TableRow\n    TableCell "X"\n    TableCell "Y"\n    TableCell "Z"';
  const cells = firstBox(src).children;
  assert.equal(cells.length, 3);
  assert.equal(cells[0].w, cells[1].w);
  assert.equal(cells[1].w, cells[2].w);
});

test('a TableRow draws a faint bottom divider rule across its full width', () => {
  // The muted separator stroke (#9aa7b2) is the row's own chrome -- present for
  // every row, selected or not, so adjacent rows read as separated.
  const { svg } = render(ROW2);
  assert.match(svg, /stroke="#9aa7b2"/);
});

test('selected is a keyless boolean: a bare `selected` token tints the row', () => {
  const doc = parse('Wireframe\n  TableRow selected\n    TableCell "A"');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.selected, true);
});

test('selected also accepts the keyed spelling selected=true', () => {
  const doc = parse('Wireframe\n  TableRow selected=true\n    TableCell "A"');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.selected, true);
});

test('selected is unset by default (resolver injects no PropDef defaults)', () => {
  const row = parse(ROW2).frames[0].children[0];
  assert.equal(row.props.selected, undefined);
});

test('selected discriminates at render: tint present only when selected', () => {
  // The light hatch tint (#c4c4c4 hashes) is emitted ONLY for a selected row, so a
  // selected row is assertably distinct from a plain one in the SVG.
  const selected = render('Wireframe\n  TableRow selected\n    TableCell "A"').svg;
  const plain = render(ROW2).svg;
  assert.match(selected, /stroke="#c4c4c4"/, 'selected row should emit a hatch tint');
  assert.doesNotMatch(plain, /stroke="#c4c4c4"/, 'a plain row must not tint');
});

// --- Composed family integration test (Table > Head/Body > Row > Cell) --------
// TableRow is the structural keystone (the container override), so per the Table
// devs' agreement this single composed assertion lives here. It exercises the whole
// family against the canonical FAMILIES.md wireframe.
test('FAMILY: the canonical Table renders a border, equal-width cells, and a selected-row tint', () => {
  const src = [
    'Wireframe',
    '  Table small',
    '    TableHead',
    '      TableRow',
    '        TableCell "Name"',
    '        TableCell "Role"',
    '        TableCell "Status"',
    '    TableBody',
    '      TableRow',
    '        TableCell "Ada"',
    '        TableCell "Eng"',
    '        TableCell "Active"',
    '      TableRow selected',
    '        TableCell "Grace"',
    '        TableCell "Eng"',
    '        TableCell "Away"',
  ].join('\n');

  const doc = parse(src);
  assert.deepEqual(doc.diagnostics, [], 'the canonical Table should parse cleanly');

  // Collect every TableRow box in document order.
  const rows = [];
  const walk = (box) => {
    if (box.node && box.node.component === 'TableRow') rows.push(box);
    (box.children || []).forEach(walk);
  };
  walk(layout(doc)[0].root);

  assert.equal(rows.length, 3, 'three rows: one head, two body');
  for (const row of rows) {
    const widths = row.children.map((c) => c.w);
    assert.equal(widths.length, 3, 'each row has 3 cells');
    assert.equal(widths[0], widths[1], 'columns 0 and 1 share a width');
    assert.equal(widths[1], widths[2], 'columns 1 and 2 share a width');
  }

  // Exactly the last (body) row is selected.
  assert.equal(rows[0].node.props.selected, undefined);
  assert.equal(rows[1].node.props.selected, undefined);
  assert.equal(rows[2].node.props.selected, true);

  const { svg } = render(src);
  assert.match(svg, /<path/, 'Table draws hand-drawn paths (its border, the cells, ...)');
  assert.match(svg, /stroke="#c4c4c4"/, 'the selected row contributes a hatch tint');
});

test('FAMILY: Table size small|medium both parse cleanly', () => {
  for (const size of ['small', 'medium']) {
    const doc = parse(`Wireframe\n  Table ${size}\n    TableRow\n      TableCell "A"`);
    assert.deepEqual(doc.diagnostics, [], `Table ${size} should parse cleanly`);
  }
});
