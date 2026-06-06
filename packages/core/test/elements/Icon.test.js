// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  Icon "home"';

/** Lay out a one-Icon doc and return the icon's box. */
const iconBox = (src) => layout(parse(src))[0].root.children[0];

test('Icon parses with clean diagnostics and the keyless name resolves', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  // The Icon is the frame's first (and only) child.
  const icon = doc.frames[0].children[0];
  assert.equal(icon.component, 'Icon');
  assert.equal(icon.props.name, 'home');
});

test('fontSize is keyed and its alias size= lands on the same prop', () => {
  const keyed = parse('Wireframe\n  Icon "home" fontSize=large');
  assert.deepEqual(keyed.diagnostics, []);
  assert.equal(keyed.frames[0].children[0].props.fontSize, 'large');

  const aliased = parse('Wireframe\n  Icon "home" size=large');
  assert.deepEqual(aliased.diagnostics, []);
  assert.equal(aliased.frames[0].children[0].props.fontSize, 'large');
});

test('each fontSize scales the (square) glyph box; default is medium', () => {
  // medium (24) is the default when fontSize is omitted.
  const def = iconBox('Wireframe\n  Icon "home"');
  assert.equal(def.w, 24);
  assert.equal(def.h, 24);

  const small = iconBox('Wireframe\n  Icon "home" fontSize=small');
  const medium = iconBox('Wireframe\n  Icon "home" fontSize=medium');
  const large = iconBox('Wireframe\n  Icon "home" fontSize=large');
  const inherit = iconBox('Wireframe\n  Icon "home" fontSize=inherit');

  // Square at every size.
  for (const b of [small, medium, large, inherit]) assert.equal(b.w, b.h);
  // Monotonic scale; default == explicit medium; inherit falls back to medium.
  assert.ok(small.w < medium.w, `small (${small.w}) should be < medium (${medium.w})`);
  assert.ok(medium.w < large.w, `medium (${medium.w}) should be < large (${large.w})`);
  assert.equal(medium.w, def.w);
  assert.equal(inherit.w, medium.w);
});

test('Icon lays out to finite, positive boxes at every fontSize', () => {
  for (const fs of ['small', 'medium', 'large', 'inherit']) {
    const box = iconBox(`Wireframe\n  Icon "home" fontSize=${fs}`);
    assert.ok(Number.isFinite(box.w) && box.w > 0, `w finite & positive for ${fs}, got ${box.w}`);
    assert.ok(Number.isFinite(box.h) && box.h > 0, `h finite & positive for ${fs}, got ${box.h}`);
  }
});

test('Icon renders a hand-drawn path', () => {
  const { svg } = render(SRC);
  assert.match(svg, /<path/);
});
