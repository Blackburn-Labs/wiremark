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

test('the keyless name may be bare: `Icon Search` === `Icon "Search"` (tasks/ICONS.md ss.3)', () => {
  const bare = parse('Wireframe\n  Icon Search');
  assert.deepEqual(bare.diagnostics, []);
  assert.equal(bare.frames[0].children[0].props.name, 'Search');

  // ...and the two spellings render byte-identically.
  const { svg: bareSvg } = render('Wireframe\n  Icon Search');
  const { svg: quotedSvg } = render('Wireframe\n  Icon "Search"');
  assert.equal(bareSvg, quotedSvg);
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

test('a known built-in name renders clean vector artwork (tasks/ICONS.md ss.3)', () => {
  const { svg, diagnostics } = render('Wireframe\n  Icon "Check"');
  assert.deepEqual(diagnostics, []);
  // iconBody's translate+scale group is the clean-vector signature, and
  // 'Check' resolves to the Material body starting at M9 16.17.
  assert.match(svg, /<g transform="translate\([^"]*\) scale\(/);
  assert.match(svg, /M9 16\.17/);
});

test('an unknown name renders the placeholder glyph and warns', () => {
  const { svg, diagnostics } = render('Wireframe\n  Icon "NoSuchIconXyz"');
  // No clean-vector group -- only iconBody emits a scale() transform.
  assert.doesNotMatch(svg, /\) scale\(/);
  assert.match(svg, /<path/); // the rough placeholder strokes are still drawn
  assert.ok(
    diagnostics.some((d) => /unknown icon/.test(d.message)),
    `expected an "unknown icon" warning, got ${JSON.stringify(diagnostics)}`,
  );

  // The fallback is pixel-compatible with a nameless Icon (same box, same
  // placeholder artwork) -- the unknown name only adds the warning.
  const bare = render('Wireframe\n  Icon');
  assert.deepEqual(bare.diagnostics, []);
  assert.equal(svg, bare.svg);
});
