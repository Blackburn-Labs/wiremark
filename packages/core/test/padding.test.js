// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../src/index.js';
import { layout } from '../src/layout.js';
import { SPACING } from '../src/metrics.js';

/**
 * The universal `padding` prop (alias `pad`): overrides an element's inner padding
 * in MUI spacing units (`padding=2` -> 16px, like `gap`/`spacing`). Unset keeps the
 * element's own hardcoded default pad; `padding=0` removes it. Keyed-only, available
 * on every element (merged by registry.js). Applied by the layout's `specFor`.
 */

/** @param {*} box @param {string} comp @returns {*} */
function findByComponent(box, comp) {
  if (box.node.component === comp) return box;
  for (const c of box.children) {
    const hit = findByComponent(c, comp);
    if (hit) return hit;
  }
  return null;
}
/** All boxes of `comp`, document order. @param {*} box @param {string} comp @param {*[]} [acc] */
function allByComponent(box, comp, acc = []) {
  if (box.node.component === comp) acc.push(box);
  for (const c of box.children) allByComponent(c, comp, acc);
  return acc;
}
const rootOf = (src) => layout(parse(src))[0].root;

// --- parse / resolve ----------------------------------------------------------

test('padding resolves as a keyed universal number prop, with `pad` as an alias', () => {
  const a = parse('Wireframe\n  Box padding=2').frames[0].children[0];
  assert.equal(a.props.padding, 2);
  const b = parse('Wireframe\n  Box pad=3').frames[0].children[0];
  assert.equal(b.props.padding, 3, '`pad=` aliases `padding`');
});

// --- it insets children in spacing units --------------------------------------

test('padding=N insets children by N * SPACING on every side', () => {
  const root = rootOf('Wireframe landscape\n  Box 200px 200px padding=2\n    Box * * outline=solid');
  const [outer, inner] = allByComponent(root, 'Box');
  const pad = 2 * SPACING; // 16px
  assert.ok(Math.abs(inner.x - (outer.x + pad)) < 1e-6, `child left inset by ${pad}, got ${inner.x - outer.x}`);
  assert.ok(Math.abs(inner.y - (outer.y + pad)) < 1e-6, `child top inset by ${pad}`);
  assert.ok(Math.abs(inner.w - (outer.w - 2 * pad)) < 1e-6, `child width is outer minus 2*${pad}`);
  assert.ok(Math.abs(inner.h - (outer.h - 2 * pad)) < 1e-6, `child height is outer minus 2*${pad}`);
});

test('padding adds an inset even to a primitive that defaults to 0 (e.g. Box)', () => {
  // A plain Box has pad 0; padding=1 gives it an 8px inset.
  const flush = allByComponent(rootOf('Wireframe landscape\n  Box 200px 200px\n    Box * * outline=solid'), 'Box')[1];
  const padded = allByComponent(rootOf('Wireframe landscape\n  Box 200px 200px padding=1\n    Box * * outline=solid'), 'Box')[1];
  assert.ok(Math.abs((flush.x) - (padded.x - SPACING)) < 1e-6, 'padding=1 shifts the child in by 8px');
  assert.ok(Math.abs((flush.w) - (padded.w + 2 * SPACING)) < 1e-6, 'padding=1 shrinks the child by 16px total');
});

// --- it overrides (and can remove) an element's hardcoded default --------------

test('an element keeps its default pad when padding is unset; padding=0 removes it', () => {
  // Drawer defaults to an 8px pad -> its child is inset 8; padding=0 flushes it.
  const def = rootOf('Wireframe landscape\n  Stack row 100% *\n    Drawer left\n      Box * * outline=solid');
  const zero = rootOf('Wireframe landscape\n  Stack row 100% *\n    Drawer left padding=0\n      Box * * outline=solid');
  const dDef = findByComponent(def, 'Drawer');
  const cDef = findByComponent(dDef, 'Box');
  const dZero = findByComponent(zero, 'Drawer');
  const cZero = findByComponent(dZero, 'Box');
  assert.ok(Math.abs((cDef.x - dDef.x) - SPACING) < 1e-6, `default drawer pad is ${SPACING}px, got ${cDef.x - dDef.x}`);
  assert.ok(Math.abs(cZero.x - dZero.x) < 1e-6, `padding=0 flushes the child to the drawer edge, got ${cZero.x - dZero.x}`);
});

// --- it grows an auto-sized container (measure pass) --------------------------

test('padding grows an auto-sized container by 2 * N * SPACING (measure reserves it)', () => {
  // In a row, a Box is content-sized; padding=2 makes it 2*16 wider than padding=0.
  const p0 = findByComponent(rootOf('Wireframe landscape\n  Stack row\n    Box padding=0\n      Box 100px 50px'), 'Box');
  const p2 = findByComponent(rootOf('Wireframe landscape\n  Stack row\n    Box padding=2\n      Box 100px 50px'), 'Box');
  assert.ok(Math.abs((p2.w - p0.w) - 2 * 2 * SPACING) < 1e-6, `padding=2 adds 2*16 width, got ${p2.w - p0.w}`);
  assert.ok(Math.abs((p2.h - p0.h) - 2 * 2 * SPACING) < 1e-6, `padding=2 adds 2*16 height, got ${p2.h - p0.h}`);
});

// --- it composes with the scrollbar gutter ------------------------------------

test('padding composes with a scrollbar: content clears both the pad and the gutter', () => {
  const root = rootOf('Wireframe landscape\n  Box 300px 200px padding=2 scrollbar=vertical\n    Box * * outline=solid');
  const [outer, inner] = allByComponent(root, 'Box');
  const pad = 2 * SPACING;
  // content width = box - 2*pad - gutter(12); the strip still hugs the box edge.
  assert.ok(Math.abs(inner.w - (outer.w - 2 * pad - 12)) < 1e-6, `content clears pad + gutter, got ${inner.w}`);
  assert.ok(Math.abs((outer.scrollbars[0].x + outer.scrollbars[0].w) - (outer.x + outer.w)) < 1e-6, 'the strip is still flush to the box edge');
});

// --- render stays clean -------------------------------------------------------

test('padding renders without diagnostics', () => {
  const { diagnostics } = render('Wireframe landscape\n  Box 200px 200px padding=3\n    Typography "x"');
  assert.deepEqual(diagnostics, []);
});

test('a bad padding value (non-number) is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Box padding=wide'), /padding/);
});
