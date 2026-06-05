// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * Box -- the generic sized container (SPEC ss.4, ss.5.2). Sizing tokens `w h`
 * are order-significant and interpreted by the parent's distribution; with none
 * given it stacks its children in a column and fills naturally. It draws nothing
 * itself -- an invisible region that carries a size and groups content.
 */

const SIZED_SRC = 'Wireframe w=400 h=200\n  Box 120px 40px\n    Typography "X"';

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
