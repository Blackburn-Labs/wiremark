// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';
import { getComponent, UNIVERSAL_PROPS } from '../../src/registry.js';

/**
 * TableBody -- the body row-group of a Table (FAMILIES.md, FAMILY 1). An invisible
 * `col` container that stacks its rows flush (pad:0, gap:0) and draws nothing of
 * its own. Tested standalone with Typography children so it doesn't depend on the
 * sibling Table* elements still being implemented concurrently; the composed
 * family integration test is added by the last family member to land.
 *
 * TableBody is the Wireframe root's first child here:
 *   layout(doc)[0].root.children[0].
 */

// Two stand-in "rows" (Typography lines) so we can assert flush col stacking
// without depending on TableRow/TableCell landing first.
const SRC =
  'Wireframe\n  TableBody\n    Typography "Row one"\n    Typography "Row two"';

test('TableBody parses cleanly and is the expected component', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const body = doc.frames[0].children[0];
  assert.equal(body.component, 'TableBody');
});

test('TableBody is registered as a v1.0 content container with no props', () => {
  const def = getComponent('TableBody');
  assert.ok(def, 'TableBody must be registered');
  assert.equal(def.tier, 'v1.0');
  assert.equal(def.category, 'content');
  assert.equal(def.container, true);
  // No declared props beyond the universal injected ones (to/href, scrollbar*). The
  // spec slice is empty; the only schema surface is the universal props.
  const own = Object.keys(def.props).filter((k) => !(k in UNIVERSAL_PROPS) && k !== 'href');
  assert.deepEqual(own, [], `TableBody should declare no own props, got ${own.join(',')}`);
});

test('TableBody is a container (layoutSpec), not a leaf (no intrinsic)', () => {
  const def = getComponent('TableBody');
  assert.equal(typeof def.layoutSpec, 'function');
  assert.equal(def.intrinsic, undefined, 'a container must not also be a leaf');

  const spec = def.layoutSpec(/** @type {any} */ ({ props: {} }));
  assert.equal(spec.axis, 'col', 'TableBody stacks its rows in a column');
  assert.equal(spec.pad, 0, 'rows abut the body edge (pad:0)');
  assert.equal(spec.gap, 0, 'rows abut one another (gap:0)');
});

test('TableBody lays out to a finite box stacking its children flush in a column', () => {
  const body = layout(parse(SRC))[0].root.children[0];
  assert.equal(body.node.component, 'TableBody');
  assert.ok(Number.isFinite(body.w) && body.w > 0, `w should be finite & positive, got ${body.w}`);
  assert.ok(Number.isFinite(body.h) && body.h > 0, `h should be finite & positive, got ${body.h}`);

  const [first, second] = body.children;
  assert.equal(body.children.length, 2);
  // col axis: second row stacks below the first.
  assert.ok(second.y > first.y, 'second row stacks below the first');
  // pad:0 -- children are not inset on the cross axis from the body edge.
  assert.equal(first.x, body.x, 'pad:0 means no left inset');
  // gap:0 -- the rows abut (next row starts exactly where the previous one ends).
  assert.equal(second.y, first.y + first.h, 'gap:0 means rows abut with no gap');
});

test('TableBody draws no chrome of its own (invisible grouping)', () => {
  // Rendered alone, the only SVG primitives present should come from the children
  // and the frame -- TableBody itself contributes no rect/line/path. We assert it
  // emits no own render by comparing against a frame whose single child is the
  // same Typography content WITHOUT the TableBody wrapper: the body wrapper must
  // not add any drawn primitive of its own.
  const withBody = render(SRC).svg;
  const withoutBody = render(
    'Wireframe\n  Typography "Row one"\n  Typography "Row two"'
  ).svg;

  const paths = (svg) => (svg.match(/<path/g) || []).length;
  const rects = (svg) => (svg.match(/<rect/g) || []).length;
  // The body adds no extra drawn primitives over the bare children.
  assert.equal(paths(withBody), paths(withoutBody), 'TableBody adds no extra <path> chrome');
  assert.equal(rects(withBody), rects(withoutBody), 'TableBody adds no extra <rect> chrome');
});

test('TableBody flows its row children through to the SVG', () => {
  const { svg, diagnostics } = render(SRC);
  assert.deepEqual(diagnostics, []);
  assert.match(svg, /Row one/);
  assert.match(svg, /Row two/);
});

test('TableBody accepts the universal to= link without redeclaring it', () => {
  // to= is injected by registry.js onto every element; TableBody must not redeclare
  // it. A bare TableBody carrying to= should parse cleanly; the resolver strips the
  // anchor sigil, so `to=#next` normalizes to props.to === 'next'.
  const doc = parse('Wireframe\n  TableBody to=#next\n    Typography "x"');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.to, 'next');
});
