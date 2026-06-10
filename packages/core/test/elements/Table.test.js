// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * Table -- the outer chrome of the Table family (SPEC ss.5; FAMILIES.md FAMILY 1).
 *
 * Table is a `col` container with `pad:0`/`gap:0` that draws ONE thing of its own:
 * a bordered `surface` around the whole table. Its groupings (TableHead/Body/
 * Footer) and rows are invisible/row-drawn by their own strategies, so these tests
 * own Table's behavior only: the keyless `size` prop, the column layout that flush-
 * stacks children, the border chrome, and the empty-Table minSize floor.
 *
 * The Table box is the frame's first child: layout(doc)[0].root.children[0].
 *
 * The COMPOSED family integration test (the canonical Table>Head/Body>Row>Cell
 * wireframe, asserting equal-width cells + selected-row tint) is owned by the LAST
 * family member to land, to avoid depending on sibling stubs here.
 */

const tableBox = (src) => layout(parse(src))[0].root.children[0];

// --- size: keyless enum, both values, keyed spelling, defaults ----------------

test('Table size is keyless and accepts each enum value', () => {
  for (const v of ['small', 'medium']) {
    const doc = parse(`Wireframe\n  Table ${v}`);
    assert.deepEqual(doc.diagnostics, [], `size=${v} should parse clean`);
    assert.equal(doc.frames[0].children[0].props.size, v);
  }
});

test('Table size also resolves in keyed form', () => {
  const doc = parse('Wireframe\n  Table size=small');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.size, 'small');
});

test('Table size unset stays undefined (resolver injects no default)', () => {
  // The resolver does not inject prop defaults; an omitted size stays undefined and
  // the default 'medium' lives only in the schema (matches Card's elevation/variant).
  const doc = parse('Wireframe\n  Table');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.size, undefined);
});

test('Table size is parse-only: small vs medium produce the same border geometry', () => {
  // Per the architect's FAMILIES ruling, a child cannot read its Table's size
  // through the engine, so size carries no visual effect -- both values lay out and
  // draw identically. This test pins that documented behavior so a future "real"
  // effect is a deliberate, visible change rather than an accident.
  const small = tableBox('Wireframe\n  Table small');
  const medium = tableBox('Wireframe\n  Table medium');
  assert.equal(small.w, medium.w);
  assert.equal(small.h, medium.h);
});

test('Table rejects an unknown size value', () => {
  // `huge` is neither a valid size enum value nor any other keyless slot, so the
  // resolver throws a hard author-must-fix error rather than swallowing it.
  assert.throws(() => parse('Wireframe\n  Table huge'), /unexpected token `huge`/);
});

test('Table rejects a duplicate size token', () => {
  // Two enum tokens both target `size`; the second has no slot to land in, so the
  // resolver throws a "set more than once" error rather than parsing silently clean.
  assert.throws(() => parse('Wireframe\n  Table small medium'), /"size" set more than once/);
});

// --- container layout: col, flush stacking ------------------------------------

test('Table is a container that stacks its children in a flush column', () => {
  // Use Typography children so this test stands alone regardless of which sibling
  // family elements have landed yet -- it asserts Table's own col layout.
  const src = [
    'Wireframe',
    '  Table',
    '    Typography body2 "A"',
    '    Typography body2 "B"',
  ].join('\n');
  const box = tableBox(src);
  assert.equal(box.node.component, 'Table');
  assert.equal(box.children.length, 2);
  // col axis: children share x, and the second sits below the first.
  assert.equal(box.children[0].x, box.children[1].x);
  assert.ok(box.children[1].y > box.children[0].y, 'second child should stack below the first');
});

test('Table flush-stacks children: no inter-child gap (gap:0)', () => {
  const src = [
    'Wireframe',
    '  Table',
    '    Typography body2 "A"',
    '    Typography body2 "B"',
  ].join('\n');
  const [a, b] = tableBox(src).children;
  // gap:0 means the second child's top abuts the first child's bottom.
  assert.equal(b.y, a.y + a.h);
});

test('Table insets no padding (pad:0): first child sits at the table top-left', () => {
  const src = 'Wireframe\n  Table\n    Typography body2 "A"';
  const box = tableBox(src);
  const first = box.children[0];
  assert.equal(first.x, box.x);
  assert.equal(first.y, box.y);
});

// --- chrome: the outer border -------------------------------------------------

test('Table draws a hand-drawn border surface', () => {
  const { svg } = render('Wireframe\n  Table\n    Typography body2 "A"');
  assert.match(svg, /<path/, 'Table should emit its border as a hand-drawn path');
});

test('an empty Table still lays out to a positive box and draws (minSize floor)', () => {
  const src = 'Wireframe\n  Table';
  const doc = parse(src);
  assert.deepEqual(doc.diagnostics, []);

  const box = tableBox(src);
  assert.ok(Number.isFinite(box.w) && box.w >= 160, `minSize floors width to >= 160, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h >= 40, `minSize floors height to >= 40, got ${box.h}`);

  const { svg } = render(src);
  assert.match(svg, /<path/, 'an empty Table still draws its border');
});

// --- universal props: to= wraps the table in a link, never redeclared ---------

test('Table carries the universal to= without redeclaring it', () => {
  // to= is injected by registry.js; Table must not declare it. A to= link still
  // resolves onto props.to (the resolver stores the bare frame id, sans `#`) and
  // the facade wraps the table in an <a>.
  const doc = parse('Wireframe\n  Table to=#next\n  Wireframe #next');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.to, 'next');
});
