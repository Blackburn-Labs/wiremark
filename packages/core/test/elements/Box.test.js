// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * Box -- the generic sized container (SPEC ss.4, ss.5.2). Sizing tokens `w h`
 * are order-significant and interpreted by the parent's distribution; with none
 * given it stacks its children in a column and fills naturally. By default it is
 * invisible, but per spec it accepts an `outline` border (none/solid/dashed/
 * dotted, keyless) and a numeric `elevation` shadow.
 */

const SIZED_SRC = 'Wireframe w=400 h=200\n  Box 120px 40px\n    Typography "X"';

/** Count of `<path>` elements emitted to the SVG (a proxy for "drew something"). */
const paths = (svg) => (svg.match(/<path/g) || []).length;

test('Box parses with clean diagnostics and resolves its sizing tokens', () => {
  const doc = parse(SIZED_SRC);
  assert.deepEqual(doc.diagnostics, []);

  const box = doc.frames[0].children[0];
  assert.equal(box.component, 'Box');
  // Sizing is order-significant: the first token is width, the second height.
  assert.deepEqual(box.size?.w, { unit: 'px', value: 120 });
  assert.deepEqual(box.size?.h, { unit: 'px', value: 40 });
});

test('a px-sized Box lays out to exactly those dimensions', () => {
  const box = layout(parse(SIZED_SRC))[0].root.children[0];
  assert.equal(box.node.component, 'Box');
  assert.equal(box.w, 120);
  assert.equal(box.h, 40);
});

test('a Box with no tokens still lays out to a finite, positive box', () => {
  const box = layout(parse('Wireframe w=400 h=200\n  Box\n    Typography "X"'))[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});

test('Box draws nothing of its own but flows its child to the SVG', () => {
  const { svg } = render('Wireframe\n  Box\n    Typography "Inside"');
  assert.match(svg, /Inside/);  // the child reached the SVG through the column layoutSpec
});

// --- new props: outline (keyless enum) + elevation (keyed number) -------------

test('outline resolves keyless and clean for each enum value', () => {
  for (const style of ['none', 'solid', 'dashed', 'dotted']) {
    const doc = parse(`Wireframe w=400 h=200\n  Box ${style}`);
    assert.deepEqual(doc.diagnostics, [], `'${style}' should resolve cleanly`);
    assert.equal(doc.frames[0].children[0].props.outline, style);
  }
});

test('elevation resolves as a keyed number', () => {
  const doc = parse('Wireframe w=400 h=200\n  Box elevation=3');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.elevation, 3);
});

test('outline and elevation coexist on one Box and stay clean', () => {
  const doc = parse('Wireframe w=400 h=200\n  Box dashed elevation=2');
  assert.deepEqual(doc.diagnostics, []);
  const box = doc.frames[0].children[0];
  assert.equal(box.props.outline, 'dashed');
  assert.equal(box.props.elevation, 2);
});

test('a bare Box (defaults) draws no chrome of its own', () => {
  // Only the Typography child paints; the Box itself is invisible by default.
  const child = render('Wireframe w=400 h=200\n  Typography "X"');
  const boxed = render('Wireframe w=400 h=200\n  Box\n    Typography "X"');
  assert.equal(paths(boxed.svg), paths(child.svg), 'Box with defaults should add zero paths');
});

test('outline=solid draws a border the bare Box does not', () => {
  const bare = render('Wireframe w=400 h=200\n  Box\n    Typography "X"');
  const solid = render('Wireframe w=400 h=200\n  Box solid\n    Typography "X"');
  assert.ok(paths(solid.svg) > paths(bare.svg), 'a solid outline should add a border path');
});

test('outline=dashed/dotted emit the matching stroke-dasharray', () => {
  const dashed = render('Wireframe w=400 h=200\n  Box dashed\n    Typography "X"').svg;
  const dotted = render('Wireframe w=400 h=200\n  Box dotted\n    Typography "X"').svg;
  assert.match(dashed, /stroke-dasharray="6 4"/);
  assert.match(dotted, /stroke-dasharray="1 4"/);
});

test('elevation>0 paints a shadow even without an outline', () => {
  const bare = render('Wireframe w=400 h=200\n  Box\n    Typography "X"');
  const elev = render('Wireframe w=400 h=200\n  Box elevation=3\n    Typography "X"');
  assert.ok(paths(elev.svg) > paths(bare.svg), 'elevation should add a shadow path');
  assert.match(elev.svg, /opacity=/);  // the shadow is drawn at reduced opacity
});

test('an outlined, elevated Box still lays out finite & positive', () => {
  const box = layout(parse('Wireframe w=400 h=200\n  Box solid elevation=2 200px 80px'))[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});
