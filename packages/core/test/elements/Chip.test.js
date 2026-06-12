// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  Chip "New"';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];

test('Chip parses with clean diagnostics and resolves its label', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  // The Chip is the frame's first (and only) child.
  const chip = doc.frames[0].children[0];
  assert.equal(chip.component, 'Chip');
  assert.equal(chip.props.label, 'New');
});

test('the quoted literal is keyless -> label', () => {
  const chip = firstChild('Wireframe\n  Chip "Beta"');
  assert.equal(chip.props.label, 'Beta');
});

test('variant and size default to undefined when omitted (strategy applies defaults)', () => {
  // The resolver does not inject PropDef defaults; an unset prop is absent.
  const chip = firstChild(SRC);
  assert.equal(chip.props.variant, undefined);
  assert.equal(chip.props.size, undefined);
});

test('variant is a keyless enum accepting each value', () => {
  for (const v of ['filled', 'outlined']) {
    const doc = parse(`Wireframe\n  Chip ${v}`);
    assert.deepEqual(doc.diagnostics, [], `Chip ${v} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.variant, v);
  }
});

test('size is a keyless enum accepting each value', () => {
  for (const s of ['small', 'medium']) {
    const doc = parse(`Wireframe\n  Chip ${s}`);
    assert.deepEqual(doc.diagnostics, [], `Chip ${s} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.size, s);
  }
});

test('the two keyless enums resolve independent of token order', () => {
  // Disjoint value domains (CONVENTION s.2.1) => any ordering is unambiguous.
  const expected = { variant: 'outlined', size: 'small' };
  for (const src of [
    'Wireframe\n  Chip "Tag" outlined small',
    'Wireframe\n  Chip "Tag" small outlined',
    'Wireframe\n  Chip outlined small "Tag"',
  ]) {
    const doc = parse(src);
    assert.deepEqual(doc.diagnostics, [], `${src} should parse cleanly`);
    const chip = doc.frames[0].children[0];
    assert.deepEqual({ variant: chip.props.variant, size: chip.props.size }, expected);
    assert.equal(chip.props.label, 'Tag');
  }
});

test('Chip lays out to a finite, positive box for every variant/size combo', () => {
  for (const variant of ['filled', 'outlined']) {
    for (const size of ['small', 'medium']) {
      const box = firstBox(`Wireframe\n  Chip "New" ${variant} ${size}`);
      assert.ok(
        Number.isFinite(box.w) && box.w > 0,
        `w should be finite & positive for ${variant}/${size}, got ${box.w}`,
      );
      assert.ok(
        Number.isFinite(box.h) && box.h > 0,
        `h should be finite & positive for ${variant}/${size}, got ${box.h}`,
      );
    }
  }
});

test('size=small lays out tighter than medium', () => {
  // small uses smaller padding + label font, so its pill is strictly smaller.
  const small = firstBox('Wireframe\n  Chip "New" small');
  const medium = firstBox('Wireframe\n  Chip "New" medium');
  assert.ok(small.w < medium.w, `small width (${small.w}) should be < medium (${medium.w})`);
  assert.ok(small.h < medium.h, `small height (${small.h}) should be < medium (${medium.h})`);
});

test('Chip renders its label and a hand-drawn path', () => {
  const { svg } = render(SRC);
  assert.match(svg, /New/);
  assert.match(svg, /<path/);
});

test('a filled Chip emits a hatch tint; an outlined Chip does not', () => {
  // filled -> hand-drawn hatch tint (gray hashes); outlined -> border only.
  assert.match(render('Wireframe\n  Chip "On" filled').svg, /stroke="#c4c4c4"/);
  const outlined = render('Wireframe\n  Chip "Off" outlined').svg;
  assert.doesNotMatch(outlined, /stroke="#c4c4c4"/);
});

test('a filled Chip is OPAQUE (paper base under the hatch); an outlined Chip stays transparent', () => {
  // The tint now lays a solid COLORS.paper base so content behind a filled Chip
  // cannot show through the hash gaps. An outlined Chip draws no tint at all, so
  // it gets NO base and stays see-through (MUI: an outlined chip has no fill).
  const filled = render('Wireframe\n  Chip "On" filled').svg;
  const outlined = render('Wireframe\n  Chip "Off" outlined').svg;
  assert.match(filled, /fill="#ffffff" stroke="none"/, 'filled Chip lays an opaque paper base');
  assert.doesNotMatch(outlined, /fill="#ffffff" stroke="none"/, 'outlined Chip must stay transparent (no base)');
});
