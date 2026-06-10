// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';
import { getComponent } from '../../src/registry.js';

// TableFooter is an invisible row-group container (FAMILIES.md FAMILY 1): a `col`
// stack of TableRows with pad:0 gap:0 and no chrome of its own. The spec lists no
// properties, so the schema is empty beyond the universal `to=`. These tests use
// already-implemented leaves (Typography) as stand-in children so TableFooter can
// be exercised standalone before its sibling TableRow/TableCell land; the composed
// full-family integration test is added by the last family member to land.

/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];

test('TableFooter parses cleanly with no props', () => {
  const doc = parse('Wireframe\n  TableFooter');
  assert.deepEqual(doc.diagnostics, []);
  const tf = doc.frames[0].children[0];
  assert.equal(tf.component, 'TableFooter');
  assert.deepEqual(tf.props, {});
});

test('TableFooter is a container (layoutSpec, not intrinsic)', () => {
  const def = getComponent('TableFooter');
  assert.equal(typeof def.layoutSpec, 'function', 'should define layoutSpec');
  assert.equal(def.intrinsic, undefined, 'a container must not define intrinsic');
  assert.equal(def.container, true);
});

test("TableFooter's layoutSpec is a col with no padding or gap", () => {
  const def = getComponent('TableFooter');
  // Strategy is called with only its own node (engine fact 1); props are empty.
  const spec = def.layoutSpec(/** @type {any} */ ({ props: {} }));
  assert.equal(spec.axis, 'col');
  assert.equal(spec.pad, 0);
  assert.equal(spec.gap, 0);
});

test('TableFooter stacks its children vertically (col axis)', () => {
  const src = 'Wireframe\n  TableFooter\n    Typography "a"\n    Typography "b"';
  const box = firstBox(src);
  assert.equal(box.children.length, 2);
  const [a, b] = box.children;
  // col layout => same x, strictly increasing y.
  assert.equal(a.x, b.x, 'stacked children share an x');
  assert.ok(b.y > a.y, `second child should sit below the first (${a.y} -> ${b.y})`);
});

test('TableFooter inserts no gap between rows (pad:0 gap:0)', () => {
  const src = 'Wireframe\n  TableFooter\n    Typography "a"\n    Typography "b"';
  const box = firstBox(src);
  const [a, b] = box.children;
  // gap:0 => the second child's top abuts the first child's bottom.
  assert.equal(b.y, a.y + a.h, 'rows abut with zero gap');
  // pad:0 => children start flush with the group's left edge.
  assert.equal(a.x, box.x, 'no left padding around the row group');
  assert.equal(a.y, box.y, 'no top padding around the row group');
});

test('TableFooter draws no chrome of its own', () => {
  // The footer is an invisible grouping (no `render`); the Table supplies the
  // border. An empty TableFooter must therefore add nothing to its frame: the
  // rendered SVG is identical to an empty frame (whose lone <path> is the frame
  // border itself, not anything the footer drew).
  const emptyFrame = render('Wireframe').svg;
  const withFooter = render('Wireframe\n  TableFooter').svg;
  assert.equal(withFooter, emptyFrame, 'an empty TableFooter must draw no chrome');
});

test('TableFooter lays out to a finite, positive box', () => {
  const box = firstBox('Wireframe\n  TableFooter\n    Typography "row"');
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});

test('TableFooter accepts the universal to= link without redeclaring it', () => {
  // `to=`/`href=` is injected by the registry onto every element; TableFooter must
  // not declare it but must accept it cleanly, and the render facade wraps it.
  const doc = parse('Wireframe\n  TableFooter to=#summary\n    Typography "Total"');
  assert.deepEqual(doc.diagnostics, []);
  // The resolver strips the anchor sigil: `to=#summary` -> props.to === 'summary'.
  assert.equal(doc.frames[0].children[0].props.to, 'summary');
  // A second frame named with the keyless `#summary` anchor is the real link
  // target (keyed `id=` lands as a prop, not a frame anchor); the facade wraps a
  // to=-bearing footer in an <a> regardless of whether the target resolves.
  const { svg } = render('Wireframe\n  TableFooter to=#summary\n    Typography "Total"\nWireframe #summary');
  assert.match(svg, /<a /, 'a to=-bearing footer is wrapped in an anchor by the facade');
});
