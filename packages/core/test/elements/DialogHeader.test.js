// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * DialogHeader -- the title region of a Dialog (the dialog counterpart of
 * CardHeader, MUI DialogTitle). A block title band: bold title + an optional
 * trailing close X. The enclosing Dialog supplies the paper sheet.
 */

const SRC = 'Wireframe\n  Dialog md\n    DialogHeader "Delete file?"';

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

// --- parse / resolve ----------------------------------------------------------

test('DialogHeader resolves its title from the keyless literal', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);
  const header = doc.frames[0].children[0].children[0];
  assert.equal(header.component, 'DialogHeader');
  assert.equal(header.props.title, 'Delete file?');
  // closeIcon is keyed-only; the resolver injects no default into props (s.6).
  assert.equal(header.props.closeIcon, undefined);
});

test('title accepts the label/text aliases', () => {
  const viaLabel = parse('Wireframe\n  Dialog\n    DialogHeader label="Via label"').frames[0].children[0].children[0];
  assert.equal(viaLabel.props.title, 'Via label');
  const viaText = parse('Wireframe\n  Dialog\n    DialogHeader text="Via text"').frames[0].children[0].children[0];
  assert.equal(viaText.props.title, 'Via text');
});

test('DialogHeader takes no children (it is a leaf band)', () => {
  // A leaf: a child element under it is a structural error from the parser's view
  // is NOT asserted here (the tree allows nesting); rather, the header renders
  // from its own props. We assert it carries no `container` semantics by checking
  // a bare header lays out with zero child boxes.
  const header = boxOf(SRC, 'DialogHeader');
  assert.equal(header.children.length, 0, 'header is a leaf, no child boxes');
});

// --- layout -------------------------------------------------------------------

test('DialogHeader lays out as a full-width band with finite, positive height', () => {
  const header = boxOf(SRC, 'DialogHeader');
  assert.ok(Number.isFinite(header.w) && header.w > 0, `w should be finite & positive, got ${header.w}`);
  assert.ok(Number.isFinite(header.h) && header.h > 0, `h should be finite & positive, got ${header.h}`);
  // block:true -> it stretches to the dialog column's content width.
  const dialog = boxOf(SRC, 'Dialog');
  assert.ok(header.w >= dialog.w - 2 * 16 - 1, 'header spans the dialog content width (block)');
});

// --- render -------------------------------------------------------------------

test('DialogHeader draws its title and the default close glyph', () => {
  const { svg } = render(SRC);
  assert.match(svg, /Delete file\?/);
  // closeIcon defaults to Close -> a real dismiss glyph (clean vector <path> or
  // the placeholder). Either way the header emits more than just the title text.
  assert.match(svg, /<path/);
});

test('closeIcon="none" omits the trailing close glyph', () => {
  const withClose = render(SRC).svg;
  const noClose = render('Wireframe\n  Dialog md\n    DialogHeader "Delete file?" closeIcon=none').svg;
  // The title is still present; the no-close render has strictly fewer paths
  // (the close artwork is gone).
  assert.match(noClose, /Delete file\?/);
  const count = (s) => (s.match(/<path/g) ?? []).length;
  assert.ok(count(noClose) < count(withClose), 'closeIcon=none drops the close artwork');
});

test('a bare DialogHeader (no title) falls back gracefully without diagnostics', () => {
  const src = 'Wireframe\n  Dialog\n    DialogHeader';
  const doc = parse(src);
  assert.deepEqual(doc.diagnostics, []);
  const { svg } = render(src);
  assert.match(svg, /Title/); // the fallback label
});
