// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * CardMedia -- the media region of a Card (SPEC ss.5.3). A flush column that
 * draws nothing itself; the Img it holds bleeds to the edges. A `minSize` floor
 * keeps an empty media slot from collapsing.
 *
 * The CardMedia is the Card's first child: layout(doc)[0].root.children[0].children[0].
 */

const SRC = 'Wireframe\n  Card\n    CardMedia\n      Img ratio=16:9';

test('CardMedia parses cleanly inside a Card', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const media = doc.frames[0].children[0].children[0];
  assert.equal(media.component, 'CardMedia');
});

test('CardMedia lays out to a finite, positive box and holds its Img', () => {
  const media = layout(parse(SRC))[0].root.children[0].children[0];
  assert.equal(media.node.component, 'CardMedia');
  assert.ok(Number.isFinite(media.w) && media.w > 0, `w should be finite & positive, got ${media.w}`);
  assert.ok(Number.isFinite(media.h) && media.h > 0, `h should be finite & positive, got ${media.h}`);

  assert.equal(media.children.length, 1);
  assert.equal(media.children[0].node.component, 'Img');
});

test('an empty CardMedia still lays out at its minSize floor', () => {
  const media = layout(parse('Wireframe\n  Card\n    CardMedia'))[0].root.children[0].children[0];
  assert.ok(media.h >= 100, `minSize should floor the height to >= 100, got ${media.h}`);
});

test('CardMedia flows its media child to the SVG', () => {
  const { svg } = render(SRC);
  assert.match(svg, /<path/);  // the Img placeholder draws through the media region
});
