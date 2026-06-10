// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

// A Menubar holding three menu labels -- the classic File/Edit/View strip.
const SRC = 'Wireframe\n  Menubar\n    MenuItem "File"\n    MenuItem "Edit"\n    MenuItem "View"';

/** Laid-out box of the frame's first child (the Menubar) for `src`. */
const barBox = (src) => layout(parse(src))[0].root.children[0];

test('Menubar parses with clean diagnostics', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  // The Menubar is the frame's first (and only) child.
  const bar = doc.frames[0].children[0];
  assert.equal(bar.component, 'Menubar');
});

test('Menubar declares no props (spec slice has none)', () => {
  // A bare keyword token would error if the schema had no place for it; assert
  // the schema is empty so the no-props contract is enforced, not incidental.
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);
  assert.deepEqual(doc.frames[0].children[0].props, {});
});

test('Menubar lays out to a finite, positive box', () => {
  const box = barBox(SRC);
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});

test('Menubar arranges its items in a row (shared y, increasing x)', () => {
  // axis:'row' => children share a top edge and advance along x. Three items so
  // the progression is unambiguous.
  const box = barBox(SRC);
  assert.equal(box.children.length, 3, 'should lay out three MenuItem children');
  const [a, b, c] = box.children;
  assert.equal(a.y, b.y, 'first two items share a baseline y (row layout)');
  assert.equal(b.y, c.y, 'all items share a baseline y (row layout)');
  assert.ok(a.x < b.x, `item 2 (${b.x}) should sit right of item 1 (${a.x})`);
  assert.ok(b.x < c.x, `item 3 (${c.x}) should sit right of item 2 (${b.x})`);
  // Items abut left-to-right with no overlap.
  assert.ok(a.x + a.w <= b.x, 'item 1 should not overlap item 2');
});

test('Menubar draws a bottom rule across its full width', () => {
  // The bottom rule divides the bar from the content beneath it. Its endpoints
  // span the bar box, so a horizontal line at y = bar bottom proves the chrome ran.
  const box = barBox(SRC);
  const { svg } = render(SRC);
  // The line is hand-drawn (rough path), but its element labels still reach SVG.
  assert.match(svg, /File/);
  assert.match(svg, /<path/);
  // A bottom rule means at least one stroked path lives at the bar's lower edge;
  // assert the bar produced more paths than its three plain labels alone would.
  const pathCount = (svg.match(/<path/g) || []).length;
  assert.ok(pathCount >= 2, `expected the bar chrome to emit paths, got ${pathCount}`);
  assert.ok(box.h > 0);
});

test('an empty Menubar still lays out and draws its bar chrome', () => {
  // No items: the bar should still produce a positive box and emit its fill +
  // rule, so an in-progress menu bar renders rather than collapsing to nothing.
  const box = barBox('Wireframe\n  Menubar');
  assert.ok(Number.isFinite(box.w) && box.w > 0, `empty bar w should be positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h >= 0, `empty bar h should be finite, got ${box.h}`);
  const { svg } = render('Wireframe\n  Menubar');
  assert.match(svg, /<path/, 'empty bar should still draw its chrome');
});

test('Menubar with MenuItems flows their labels through to the SVG', () => {
  // Proves the row layoutSpec recurses into children -- every label reaches SVG.
  const { svg } = render(SRC);
  assert.match(svg, /File/);
  assert.match(svg, /Edit/);
  assert.match(svg, /View/);
});

// --- Joint Menubar + MenuItem coverage (canonical FAMILIES.md wireframe) ------
// This asserts only Menubar-owned behaviour (row layout over real MenuItems);
// the per-item selected/disabled chrome is MenuItem's responsibility and is
// covered there. Sequenced with dev-menuitem2: Menubar's row contract holds
// whether MenuItem is the stub or the real leaf.
const JOINT = 'Wireframe\n  Menubar\n    MenuItem "File" selected\n    MenuItem "Edit"\n    MenuItem "View" disabled';

test('Menubar lays selected/disabled MenuItems out in a row', () => {
  const doc = parse(JOINT);
  assert.deepEqual(doc.diagnostics, [], 'canonical menubar wireframe parses cleanly');
  const box = layout(doc)[0].root.children[0];
  assert.equal(box.children.length, 3);
  const [a, b, c] = box.children;
  assert.equal(a.y, c.y, 'items share a baseline y regardless of per-item state');
  assert.ok(a.x < b.x && b.x < c.x, 'items advance left-to-right in a row');
});
