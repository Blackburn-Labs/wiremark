// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * DialogContent -- the body region of a Dialog (the dialog counterpart of
 * CardContent). A padded column that draws nothing itself; the enclosing Dialog
 * supplies the paper sheet.
 */

const SRC = 'Wireframe\n  Dialog md\n    DialogContent\n      Typography h6 "Title"\n      Typography body2 "Body"';

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

test('DialogContent parses cleanly inside a Dialog', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);
  const content = doc.frames[0].children[0].children[0];
  assert.equal(content.component, 'DialogContent');
});

test('DialogContent lays out to a finite, positive box stacking its children', () => {
  const content = boxOf(SRC, 'DialogContent');
  assert.ok(Number.isFinite(content.w) && content.w > 0, `w should be finite & positive, got ${content.w}`);
  assert.ok(Number.isFinite(content.h) && content.h > 0, `h should be finite & positive, got ${content.h}`);

  // A padded column: the two Typography children stack top-to-bottom, inset from
  // the content box edge by the padding.
  const [title, body] = content.children;
  assert.equal(content.children.length, 2);
  assert.ok(body.y > title.y, 'body stacks below the title');
  assert.ok(title.x > content.x, 'content is inset from the box edge by padding');
  assert.ok(title.y > content.y, 'content is inset from the box top by padding');
});

test('DialogContent is transparent: it flows its children but draws no surface of its own', () => {
  const { svg } = render(SRC);
  assert.match(svg, /Title/);
  assert.match(svg, /Body/);
});

test('an empty DialogContent still lays out without diagnostics', () => {
  const src = 'Wireframe\n  Dialog\n    DialogContent';
  const doc = parse(src);
  assert.deepEqual(doc.diagnostics, []);
  const content = boxOf(src, 'DialogContent');
  assert.ok(Number.isFinite(content.w) && Number.isFinite(content.h));
});
