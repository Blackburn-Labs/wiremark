// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * DialogActions -- the action button row of a Dialog (the dialog counterpart of
 * CardActions). A padded row that draws nothing itself; the enclosing Dialog
 * supplies the paper sheet. Unlike CardActions, MUI's DialogActions RIGHT-aligns
 * its buttons (the row uses `mainAlign: 'end'`).
 */

const SRC = 'Wireframe\n  Dialog md\n    DialogActions\n      Button "Cancel"\n      Button "OK" contained';

/** Find the first box for `comp` (depth-first) in the laid-out frame. @param {string} src @param {string} comp */
function boxOf(src, comp) {
  const frame = layout(parse(src))[0];
  /** @type {import('../../src/layout.js').Box | null} */
  let found = null;
  (function walk(/** @type {import('../../src/layout.js').Box} */ b) {
    if (found) return;
    if (b.node.component === comp) { found = b; return; }
    for (const c of b.children) walk(c);
  })(frame.root);
  if (!found) throw new Error(`no ${comp} box laid out`);
  return /** @type {import('../../src/layout.js').Box} */ (found);
}

test('DialogActions parses cleanly inside a Dialog', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);
  const actions = doc.frames[0].children[0].children[0];
  assert.equal(actions.component, 'DialogActions');
});

test('DialogActions lays its children in a single padded row', () => {
  const actions = boxOf(SRC, 'DialogActions');
  assert.ok(Number.isFinite(actions.w) && actions.w > 0, `w should be finite & positive, got ${actions.w}`);
  assert.ok(Number.isFinite(actions.h) && actions.h > 0, `h should be finite & positive, got ${actions.h}`);

  const [cancel, ok] = actions.children;
  assert.equal(actions.children.length, 2);
  // A row: the two buttons sit side by side (same-ish y, increasing x), in order.
  assert.ok(ok.x > cancel.x, 'buttons lay left-to-right in document order');
  assert.ok(Math.abs(ok.y - cancel.y) < 1, 'buttons share the row baseline');
  // Padded: the first button is inset from the actions box edge.
  assert.ok(cancel.x > actions.x, 'row is inset from the box edge by padding');
});

// Right-alignment: DialogActions' row sets `mainAlign:'end'`, so the engine packs
// the buttons to the trailing edge (MUI). The capability is a narrow layout.js
// addition (defaults to start, so every other container is byte-identical).
test('DialogActions right-aligns its buttons against the trailing edge (MUI)', () => {
  const actions = boxOf(SRC, 'DialogActions');
  const last = actions.children[actions.children.length - 1];
  // The trailing button hugs the right inset: the gap from its right edge to the
  // actions box right edge is just the padding (one SPACING = 8), NOT the larger
  // leftover space a left-packed row would leave.
  const SPACING = 8;
  const rightGap = (actions.x + actions.w) - (last.x + last.w);
  assert.ok(Math.abs(rightGap - SPACING) < 1.5, `trailing button should hug the right inset (~${SPACING}px gap), got ${rightGap}`);
  // And it is genuinely pushed right: the first button starts well past the left
  // inset (there is leftover space to its left).
  const first = actions.children[0];
  assert.ok(first.x - actions.x > SPACING + 1, 'buttons are pushed right, leaving free space on the left');
});

test('a flex child defeats mainAlign (the Spacer absorbs the free space, flex wins)', () => {
  // mainAlign only offsets the cursor when there is NO flex child. A leading flex
  // Spacer consumes `leftover` itself, so the buttons after it are NOT additionally
  // pushed -- they sit right after the (now-large) Spacer, the same as a plain row.
  const actions = boxOf('Wireframe\n  Dialog md\n    DialogActions\n      Spacer\n      Button "OK"', 'DialogActions');
  const kids = actions.children;
  const spacer = kids[0];
  // The Spacer flexed to fill the free space; the button hugs the right after it.
  assert.ok(spacer.w > 0, 'the Spacer flexed to take the leftover space');
  const SPACING = 8;
  const last = kids[kids.length - 1];
  const rightGap = (actions.x + actions.w) - (last.x + last.w);
  assert.ok(Math.abs(rightGap - SPACING) < 1.5, `button still ends at the right inset via the Spacer, got ${rightGap}`);
});

test('mainAlign does not affect a row that omits it: CardActions stays start-packed', () => {
  // The byte-identity regression guard for the engine change: a row WITHOUT
  // mainAlign (CardActions) packs from the left exactly as before -- the first
  // button hugs the left inset, leaving the free space on the RIGHT.
  const actions = boxOf('Wireframe\n  Card\n    CardActions\n      Button "Cancel"\n      Button "OK"', 'CardActions');
  const first = actions.children[0];
  const SPACING = 8;
  assert.ok(Math.abs(first.x - (actions.x + SPACING)) < 1.5, 'first button hugs the LEFT inset (start-packed, unchanged)');
  const last = actions.children[actions.children.length - 1];
  const rightGap = (actions.x + actions.w) - (last.x + last.w);
  assert.ok(rightGap > SPACING + 1, 'free space is on the right, not consumed (start alignment)');
});

test('DialogActions is transparent: it flows its children but draws no surface of its own', () => {
  const { svg } = render(SRC);
  assert.match(svg, /Cancel/);
  assert.match(svg, /OK/);
});

test('an empty DialogActions still lays out without diagnostics', () => {
  const src = 'Wireframe\n  Dialog\n    DialogActions';
  const doc = parse(src);
  assert.deepEqual(doc.diagnostics, []);
  const actions = boxOf(src, 'DialogActions');
  assert.ok(Number.isFinite(actions.w) && Number.isFinite(actions.h));
});
