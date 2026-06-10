// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';
import { getComponent } from '../../src/registry.js';

/**
 * TableHead -- the header row-group of a Table (FAMILIES.md, FAMILY 1). An
 * invisible `col` container that stacks its TableRows flush (pad:0, gap:0) and
 * adds ONE bit of chrome: a heavier full-width rule along its bottom edge (ink,
 * strokeWidth 1.6) dividing the header from the body -- drawn only when the head
 * actually has rows.
 *
 * Tested standalone with Stack/Typography stand-in rows so it doesn't depend on
 * the sibling Table* elements landing first; the composed family integration
 * test is added by the last family member to land.
 *
 * TableHead is the Wireframe root's first child here:
 *   layout(doc)[0].root.children[0].
 */

/** The frame's first child node for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** The frame's first laid-out child box for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];

// A TableHead holding two stand-in "rows" (Stacks wrapping Typography). Stack is
// a finished sibling-free container, so this stays valid no matter where the
// real TableRow schema lands.
const TWO_ROWS = [
  'Wireframe',
  '  TableHead',
  '    Stack',
  '      Typography "Name"',
  '    Stack',
  '      Typography "Role"',
].join('\n');

// TableHead's bottom rule is the ONLY stroke it emits, and it's drawn at the
// distinctive strokeWidth 1.6 (rline's default is 1.2) -- so counting strokes at
// that exact width isolates TableHead's chrome from the frame's own border etc.
const headRuleCount = (svg) => (svg.match(/stroke-width="1\.6"/g) || []).length;

test('TableHead parses cleanly and is the expected component', () => {
  const doc = parse(TWO_ROWS);
  assert.deepEqual(doc.diagnostics, []);

  const head = doc.frames[0].children[0];
  assert.equal(head.component, 'TableHead');
  assert.deepEqual(head.props, {}, 'TableHead resolves no props');
});

test('TableHead is registered as a v1.0 content container with no own props', () => {
  const def = getComponent('TableHead');
  assert.ok(def, 'TableHead must be registered');
  assert.equal(def.tier, 'v1.0');
  assert.equal(def.category, 'content');
  assert.equal(def.container, true);
  // The spec slice is empty; a child cannot read Table's size/etc. through the
  // engine, so TableHead deliberately declares no own props. The only schema
  // surface is the universal injected link prop (to/href).
  const own = Object.keys(def.props).filter((k) => k !== 'to' && k !== 'href');
  assert.deepEqual(own, [], `TableHead should declare no own props, got ${own.join(',')}`);
});

test('TableHead is a container (layoutSpec), not a leaf (no intrinsic)', () => {
  const def = getComponent('TableHead');
  assert.equal(typeof def.layoutSpec, 'function');
  assert.equal(def.intrinsic, undefined, 'a container must not also be a leaf');

  const spec = def.layoutSpec(/** @type {any} */ ({ props: {} }));
  assert.equal(spec.axis, 'col', 'TableHead stacks its rows in a column');
  assert.equal(spec.pad, 0, 'rows abut the head edge (pad:0)');
  assert.equal(spec.gap, 0, 'rows abut one another (gap:0)');
});

test('TableHead keeps its children in the tree', () => {
  const head = firstChild(TWO_ROWS);
  assert.equal(head.children.length, 2, 'both stand-in rows are retained as children');
});

test('TableHead lays out to a finite box stacking its rows flush in a column', () => {
  const head = firstBox(TWO_ROWS);
  assert.equal(head.node.component, 'TableHead');
  assert.ok(Number.isFinite(head.w) && head.w > 0, `w should be finite & positive, got ${head.w}`);
  assert.ok(Number.isFinite(head.h) && head.h > 0, `h should be finite & positive, got ${head.h}`);

  assert.equal(head.children.length, 2);
  const [a, b] = head.children;
  // col axis: same x, b strictly below a.
  assert.equal(a.x, b.x, 'children share the same x (column stacking)');
  assert.ok(b.y > a.y, 'second row sits below the first');
  // gap:0 -> rows abut (second row starts exactly where the first ends).
  assert.equal(b.y, a.y + a.h, 'gap is 0: rows abut with no inter-row space');
  // pad:0 -> first row hugs the head's top-left corner.
  assert.equal(a.x, head.x, 'pad is 0: row flush to left edge');
  assert.equal(a.y, head.y, 'pad is 0: row flush to top edge');

  // The head box encloses its rows vertically.
  const childrenBottom = Math.max(...head.children.map((c) => c.y + c.h));
  assert.ok(head.y + head.h >= childrenBottom, 'head box encloses its rows');
});

test('a non-empty TableHead draws exactly one bottom rule to divide head from body', () => {
  const { svg } = render(parse(TWO_ROWS));
  assert.equal(headRuleCount(svg), 1, 'render emits exactly one head/body divider rule (strokeWidth 1.6)');
});

test('an empty TableHead draws nothing of its own (invisible grouping)', () => {
  // A childless TableHead: its render() must early-return '' (no rule to draw),
  // so it contributes no strokeWidth-1.6 rule, unlike the populated head above.
  const { svg, diagnostics } = render(parse('Wireframe\n  TableHead'));
  assert.deepEqual(diagnostics, []);
  assert.equal(headRuleCount(svg), 0, 'empty TableHead adds no bottom-rule stroke');
});

test('TableHead flows its row children through to the SVG', () => {
  const { svg, diagnostics } = render(parse(TWO_ROWS));
  assert.deepEqual(diagnostics, []);
  assert.match(svg, /Name/);
  assert.match(svg, /Role/);
});

test('TableHead accepts the universal to= link without redeclaring it', () => {
  // to= is injected by registry.js onto every element; TableHead must not
  // redeclare it. A TableHead carrying to=#next parses cleanly; the resolver
  // strips the anchor sigil, so `to=#next` normalizes to props.to === 'next'.
  const doc = parse('Wireframe\n  TableHead to=#next\n    Stack\n      Typography "x"');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.to, 'next');
});
