// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * CardContent -- the body region of a Card (SPEC ss.5.3). A padded column that
 * draws nothing itself; the surrounding Card supplies the paper. Its padding
 * insets the body from the card edge.
 *
 * The CardContent is the Card's first child here:
 * layout(doc)[0].root.children[0].children[0].
 */

const SRC = 'Wireframe\n  Card\n    CardContent\n      Typography h5 "Title"\n      Typography body2 "Body"';

test('CardContent parses cleanly inside a Card', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const content = doc.frames[0].children[0].children[0];
  assert.equal(content.component, 'CardContent');
});

test('CardContent lays out to a finite, positive box stacking its children', () => {
  const content = layout(parse(SRC))[0].root.children[0].children[0];
  assert.equal(content.node.component, 'CardContent');
  assert.ok(Number.isFinite(content.w) && content.w > 0, `w should be finite & positive, got ${content.w}`);
  assert.ok(Number.isFinite(content.h) && content.h > 0, `h should be finite & positive, got ${content.h}`);

  // A padded column: the two Typography children stack top-to-bottom, inset from
  // the content box edge by the padding.
  const [title, body] = content.children;
  assert.equal(content.children.length, 2);
  assert.ok(body.y > title.y, 'body stacks below the title');
  assert.ok(title.x > content.x, 'content is inset from the box edge by padding');
});

test('CardContent flows its text children to the SVG', () => {
  const { svg } = render(SRC);
  assert.match(svg, /Title/);
  assert.match(svg, /Body/);
});
