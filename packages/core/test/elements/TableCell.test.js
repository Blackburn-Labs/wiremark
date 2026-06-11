// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * TableCell -- one table cell, implemented as a text LEAF with `flex: true` so
 * equal-flex sibling cells split the row width (FAMILY 1 -- Table). The keyless
 * literal is the label; `align` (keyed, left/center/right) anchors that label.
 */

const SRC = 'Wireframe w=400 h=300\n  TableCell "Name"';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];

test('TableCell parses with clean diagnostics and resolves its keyless label', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const cell = doc.frames[0].children[0];
  assert.equal(cell.component, 'TableCell');
  assert.equal(cell.props.label, 'Name');
});

test('align defaults to undefined when omitted (strategy treats it as left)', () => {
  // The resolver does not inject PropDef defaults; an unset align is absent.
  const cell = firstChild(SRC);
  assert.equal(cell.props.align, undefined);
});

test('align is a KEYED enum accepting each value (not keyless)', () => {
  for (const a of ['left', 'center', 'right']) {
    const doc = parse(`Wireframe w=400 h=300\n  TableCell "X" align=${a}`);
    assert.deepEqual(doc.diagnostics, [], `align=${a} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.align, a);
  }
});

test('align is keyless:false -- a bare alignment token is rejected', () => {
  // align has no keyless slot, so a bare `center` has nowhere to land and the
  // resolver throws (it is not the single keyless literal -- that's the label).
  assert.throws(
    () => parse('Wireframe w=400 h=300\n  TableCell center'),
    /unexpected token `center`/,
  );
});

test('an out-of-domain align value is rejected', () => {
  assert.throws(
    () => parse('Wireframe w=400 h=300\n  TableCell "X" align=top'),
    /align/,
  );
});

test('align drives the SVG text-anchor: left->start, center->middle, right->end', () => {
  const anchorFor = (align) => {
    const src = `Wireframe w=400 h=300\n  TableCell "Hi"${align ? ` align=${align}` : ''}`;
    assert.deepEqual(parse(src).diagnostics, [], `align=${align} should parse cleanly`);
    return (render(src).svg.match(/text-anchor="(start|middle|end)"/) ?? [])[1];
  };
  assert.equal(anchorFor('left'), 'start');
  assert.equal(anchorFor('center'), 'middle');
  assert.equal(anchorFor('right'), 'end');
  assert.equal(anchorFor(''), 'start'); // omitted => default left
});

test('align also moves the anchored x: center is mid-box, right is past left', () => {
  // The anchor change alone could leave x identical; assert the x coordinate the
  // label is anchored at actually shifts with align.
  const anchorX = (src) => Number((render(src).svg.match(/<text x="([\d.]+)"/) ?? [])[1]);
  const left = anchorX('Wireframe w=400 h=300\n  TableCell "Hi" align=left');
  const center = anchorX('Wireframe w=400 h=300\n  TableCell "Hi" align=center');
  const right = anchorX('Wireframe w=400 h=300\n  TableCell "Hi" align=right');
  assert.ok(center > left, `center x (${center}) should be right of left x (${left})`);
  assert.ok(right > center, `right x (${right}) should be right of center x (${center})`);
});

test('the quoted literal is the single keyless slot -> label', () => {
  assert.equal(firstChild('Wireframe w=400 h=300\n  TableCell "Status"').props.label, 'Status');
});

test('a duplicate quoted literal is an error (one keyless literal slot)', () => {
  assert.throws(
    () => parse('Wireframe w=400 h=300\n  TableCell "A" "B"'),
    /TableCell/,
  );
});

test('TableCell lays out to a finite, positive box', () => {
  const box = firstBox(SRC);
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});

test('flex:true -- two cells in a row split its width equally', () => {
  // Two equal-flex cells share the row width; their boxes get equal widths even
  // though their labels differ in intrinsic length. (This is what aligns columns
  // for equal-count rows.) A plain non-flex leaf would keep its intrinsic width.
  const frame = layout(parse(
    'Wireframe w=400 h=300\n  Stack row\n    TableCell "A"\n    TableCell "Wide label here"',
  ))[0].root;
  const stack = frame.children[0];
  const [a, b] = stack.children;
  assert.equal(a.w, b.w, `equal-flex cells should split row width: ${a.w} vs ${b.w}`);
  assert.ok(a.w > 0);
});

test('TableCell renders its label as a <text> element', () => {
  const { svg } = render(SRC);
  assert.match(svg, /<text/);
  assert.match(svg, /Name/);
});

test('a bare TableCell with no label falls back to the default "Cell" text', () => {
  const { svg } = render('Wireframe w=400 h=300\n  TableCell');
  assert.match(svg, /Cell/);
});

test('filler is a keyed enum drawn from the shared style domain', () => {
  // TableCell is text:true, so a bare filler amount is consumed (not an error);
  // the keyed `filler=` style also parses cleanly.
  const doc = parse('Wireframe w=400 h=300\n  TableCell ~2 filler=lorem');
  assert.deepEqual(doc.diagnostics, []);
  const cell = doc.frames[0].children[0];
  assert.equal(cell.props.filler, 'lorem');               // keyed style
  assert.deepEqual(cell.filler, { amount: 2, unit: 'units' }); // bare amount consumed onto node
});

test('a bad filler style value is rejected', () => {
  assert.throws(
    () => parse('Wireframe w=400 h=300\n  TableCell "X" filler=zigzag'),
    /filler/,
  );
});

// --- composed Table-family integration --------------------------------------
// The canonical wireframe from FAMILIES.md Family 1 -- Table. TableCell is the
// last family member to land, so per Table.test.js's handoff note this composed
// test (Table > TableHead/TableBody > TableRow > TableCell) lives here. It is the
// real nested structure (not a Stack stand-in) and proves the column-alignment
// guarantee the equal-flex cells are responsible for.

const TABLE_SRC = [
  'Wireframe w=600 h=400',
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

/** The three rows of the laid-out canonical table, in document order. */
function tableRows() {
  const root = layout(parse(TABLE_SRC))[0].root;
  const table = root.children[0];
  assert.equal(table.node.component, 'Table');
  const [head, body] = table.children;
  assert.equal(head.node.component, 'TableHead');
  assert.equal(body.node.component, 'TableBody');
  return [head.children[0], body.children[0], body.children[1]];
}

test('composed: the canonical Table wireframe parses with clean diagnostics', () => {
  assert.deepEqual(parse(TABLE_SRC).diagnostics, []);
});

test('composed: each row lays out three equal-width TableCells', () => {
  for (const row of tableRows()) {
    const cells = row.children;
    assert.equal(cells.length, 3);
    for (const c of cells) assert.equal(c.node.component, 'TableCell');
    // equal-flex => all three share the row width evenly.
    assert.equal(cells[0].w, cells[1].w, `cells split evenly: ${cells[0].w} vs ${cells[1].w}`);
    assert.equal(cells[1].w, cells[2].w, `cells split evenly: ${cells[1].w} vs ${cells[2].w}`);
    assert.ok(cells[0].w > 0);
  }
});

test('composed: columns ALIGN across rows -- cell k shares an x for equal-count rows', () => {
  // This is the FAMILIES.md guarantee that equal-flex cells produce: every row
  // has the same cell count, so column k lands at the same x in every row.
  const [head, b0, b1] = tableRows();
  for (let k = 0; k < 3; k++) {
    assert.equal(head.children[k].x, b0.children[k].x, `column ${k} x aligns head vs body row 0`);
    assert.equal(b0.children[k].x, b1.children[k].x, `column ${k} x aligns body rows`);
    assert.equal(head.children[k].w, b1.children[k].w, `column ${k} w aligns across rows`);
  }
});

test('composed: the Table draws a border and every cell label renders', () => {
  const { svg } = render(TABLE_SRC);
  assert.match(svg, /<path/);                 // Table surface border (hand-drawn)
  for (const label of ['Name', 'Role', 'Status', 'Ada', 'Grace', 'Away']) {
    assert.match(svg, new RegExp(label), `cell label ${label} should render`);
  }
});

test('composed: the selected row emits a tint the unselected rows do not', () => {
  // The `selected` TableRow draws a hatch fill (#c4c4c4) across its box; a plain
  // row draws no such fill. (TableRow chrome -- asserted here at the family level.)
  const tinted = render([
    'Wireframe w=600 h=400', '  Table', '    TableRow selected',
    '      TableCell "X"',
  ].join('\n')).svg;
  const plain = render([
    'Wireframe w=600 h=400', '  Table', '    TableRow',
    '      TableCell "X"',
  ].join('\n')).svg;
  assert.match(tinted, /#c4c4c4/, 'selected row should emit a hatch tint');
  assert.doesNotMatch(plain, /#c4c4c4/, 'plain row should not emit a hatch tint');
});

test('cell labels wider than their column share are trimmed with a trailing ellipsis', () => {
  // Equal-flex cells split the row; four long labels in a mobile frame each get
  // far less than their intrinsic width, so every one must trim to its cell.
  const labels = [
    'First unreasonably long column header',
    'Second unreasonably long column header',
    'Third unreasonably long column header',
    'Fourth unreasonably long column header',
  ];
  const svg = render([
    'Wireframe mobile', '  Table', '    TableRow',
    ...labels.map((l) => `      TableCell "${l}"`),
  ].join('\n')).svg;
  assert.equal((svg.match(/…</g) ?? []).length, 4, 'all four cells should end in …');
  for (const l of labels) {
    assert.doesNotMatch(svg, new RegExp(l), `full string should not be emitted: ${l}`);
  }
});
