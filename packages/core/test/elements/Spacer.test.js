// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * Spacer -- a gap between siblings (SPEC ss.5.2). Two behaviors share one
 * element via `sizing:true` + `flex:true`:
 *   - SIZED (`Spacer 16px`, `Spacer 24px 8px`): a fixed gap. The keyless `w h`
 *     tokens land on `node.size` (width then height) and pin the box.
 *   - UNSIZED: it flexes, absorbing the leftover main-axis space of its Stack
 *     to push the following siblings to the far edge. A bare number is a flex
 *     weight (`Spacer 2` is twice the pull of a plain `Spacer`).
 * Intrinsic is 0x0: when there is no slack on its main axis it collapses to
 * nothing rather than injecting a phantom gap (the "default 1 unit" is the
 * leftover space when there is some, else zero). It draws nothing of its own.
 */

// Two fixed 50px boxes in a 300px-wide row: the Spacer between them takes the slack.
const SRC = 'Wireframe w=300 h=100\n  Stack row\n    Box 50px 20px\n    Spacer\n    Box 50px 20px';

test('Spacer parses with clean diagnostics and resolves its component', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const spacer = doc.frames[0].children[0].children[1];
  assert.equal(spacer.component, 'Spacer');
});

test('Spacer parses keyless `w h` sizing tokens onto node.size, width then height', () => {
  const doc = parse('Wireframe w=300 h=100\n  Stack row\n    Spacer 16px 24px');
  assert.deepEqual(doc.diagnostics, []);

  const spacer = doc.frames[0].children[0].children[0];
  // Sizing is order-significant: the first token is width, the second height.
  assert.deepEqual(spacer.size?.w, { unit: 'px', value: 16 });
  assert.deepEqual(spacer.size?.h, { unit: 'px', value: 24 });
});

test('a px-sized Spacer lays out to exactly that size on the main axis', () => {
  // A stretched row whose other children flex (`*`), so the Spacer is the only
  // fixed item: its 16px must be honored verbatim, not absorbed into the slack.
  const row = layout(parse('Wireframe w=300 h=100\n  Stack row 100% *\n    Box *\n    Spacer 16px\n    Box *'))[0].root.children[0];
  const spacer = row.children[1];
  assert.equal(spacer.node.component, 'Spacer');
  assert.equal(spacer.w, 16);
});

test('a bare flex weight on a Spacer splits the leftover space proportionally', () => {
  // `Spacer 2` next to a plain `Spacer` (weight 1) -> a 2:1 division of the row.
  const row = layout(parse('Wireframe w=300 h=100\n  Stack row 100% *\n    Spacer 2\n    Spacer'))[0].root.children[0];
  const [two, one] = row.children;
  assert.ok(one.w > 0, `the weight-1 Spacer should take a positive share, got ${one.w}`);
  assert.equal(Math.round(two.w / one.w), 2, `weight 2 vs 1 should be a 2:1 split, got ${two.w}:${one.w}`);
});

test('an unsized Spacer absorbs the leftover main-axis space and pushes its sibling to the edge', () => {
  const row = layout(parse(SRC))[0].root.children[0];
  const [first, spacer, last] = row.children;

  // The Spacer takes the slack, so it is the widest item in the row...
  assert.ok(spacer.w > first.w && spacer.w > last.w, `Spacer should absorb the slack, got ${spacer.w}`);
  // ...and the trailing fixed box is pushed flush to the row's right edge.
  assert.equal(Math.round(last.x + last.w), Math.round(row.x + row.w), 'the trailing box is pushed to the far edge');
});

test('in a stretched `Stack row 100% *` a Spacer pushes the trailing item to the right edge', () => {
  // The canonical case: the Stack itself is stretched (100% wide, * tall) so its
  // row has free main-axis space for the Spacer to consume.
  const row = layout(parse('Wireframe landscape\n  Stack row 100% *\n    Button "A"\n    Spacer\n    Button "B"'))[0].root.children[0];
  const [first, spacer, last] = row.children;

  assert.ok(spacer.w > first.w && spacer.w > last.w, `Spacer should consume the leftover space, got ${spacer.w}`);
  assert.equal(Math.round(last.x + last.w), Math.round(row.x + row.w), 'the trailing Button is pushed to the right edge');
});

test('an unsized Spacer with no main-axis slack collapses, injecting no phantom gap', () => {
  // A content-sized column has no leftover on its main (vertical) axis, so the
  // Spacer cannot flex. With a 0x0 intrinsic it must add nothing -- the column
  // is exactly as tall as the same stack without the Spacer.
  const withSpacer = layout(parse('Wireframe w=200 h=400\n  Stack\n    Typography "A"\n    Spacer\n    Typography "B"'))[0].root.children[0];
  const baseline = layout(parse('Wireframe w=200 h=400\n  Stack\n    Typography "A"\n    Typography "B"'))[0].root.children[0];

  const spacer = withSpacer.children.find((k) => k.node.component === 'Spacer');
  assert.ok(spacer, 'the Spacer should be present in the laid-out column');
  assert.ok(Number.isFinite(spacer.h) && spacer.h >= 0, `Spacer height stays finite & non-negative, got ${spacer.h}`);
  assert.equal(Math.round(withSpacer.h), Math.round(baseline.h), 'a non-flexing Spacer adds no height');
});

test('a Spacer rejects keyed sizing (`w=`/`h=`): sizing is positional only', () => {
  // The spec lists width/height with aliases w/h, but those are realized by the
  // positional `w h` tokens (CONVENTION s.4), NOT a keyed `w=`/`h=` prop -- there
  // is no such prop, so `w=` is an unknown property. Lock that contract.
  assert.throws(() => parse('Wireframe\n  Stack\n    Spacer w=16px'), /unknown property "w="/);
});

test('Spacer draws nothing of its own; surrounding content still renders', () => {
  const { svg } = render('Wireframe\n  Stack row\n    Typography "Left"\n    Spacer\n    Typography "Right"');
  assert.match(svg, /Left/);
  assert.match(svg, /Right/);
});
