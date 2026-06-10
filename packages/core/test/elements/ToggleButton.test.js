// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  ToggleButton "FormatBold" selected';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** First laid-out child box of the frame for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];

/**
 * Lay out a single ToggleButton inside a row Stack and return its box. In a row
 * the MAIN axis is width, so the button's intrinsic width shows through (at the
 * frame top level a lone child is stretched to the content width, masking
 * intrinsic-width differences -- same trick Button's tests use).
 * @param {string} tokens  the ToggleButton's tokens after `ToggleButton`
 */
const rowToggleBox = (tokens) =>
  layout(parse(`Wireframe\n  Stack row\n    ToggleButton ${tokens}`))[0].root.children[0].children[0];

test('ToggleButton parses cleanly and resolves its icon + selected', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const tb = doc.frames[0].children[0];
  assert.equal(tb.component, 'ToggleButton');
  assert.equal(tb.props.icon, 'FormatBold');
  assert.equal(tb.props.selected, true);
});

test('the quoted literal is the keyless icon name', () => {
  assert.equal(firstChild('Wireframe\n  ToggleButton "FormatItalic"').props.icon, 'FormatItalic');
});

test('icon also accepts the keyed string spelling', () => {
  const tb = firstChild('Wireframe\n  ToggleButton icon="FormatUnderlined"');
  assert.equal(tb.props.icon, 'FormatUnderlined');
});

test('a keyed icon must be quoted (it is a string prop)', () => {
  // string props are quoted (SPEC ss.3.2.1); a bare keyed value is rejected.
  assert.throws(() => parse('Wireframe\n  ToggleButton icon=FormatBold'), /must be quoted/);
});

test('selected resolves as a keyless flag and as the keyed form', () => {
  assert.equal(firstChild('Wireframe\n  ToggleButton "B" selected').props.selected, true);
  assert.equal(firstChild('Wireframe\n  ToggleButton "B" selected=true').props.selected, true);
  assert.equal(firstChild('Wireframe\n  ToggleButton "B" selected=false').props.selected, false);
  // Default: absent when not given (the resolver injects no PropDef defaults).
  assert.equal(firstChild('Wireframe\n  ToggleButton "B"').props.selected, undefined);
});

test('size is a keyless enum accepting each value', () => {
  for (const s of ['small', 'medium', 'large']) {
    const doc = parse(`Wireframe\n  ToggleButton "B" ${s}`);
    assert.deepEqual(doc.diagnostics, [], `ToggleButton ${s} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.size, s);
  }
});

test('size also accepts the keyed enum spelling', () => {
  assert.equal(firstChild('Wireframe\n  ToggleButton "B" size=large').props.size, 'large');
});

test('a bad size enum value is rejected', () => {
  assert.throws(() => parse('Wireframe\n  ToggleButton "B" size=huge'), /not valid for "size="/);
});

test('icon, selected, and size resolve independent of token order', () => {
  // literal + boolean + enum are three distinct keyless KINDS (CONVENTION s.2),
  // so any ordering of the three tokens is unambiguous.
  const expected = { icon: 'FormatBold', selected: true, size: 'large' };
  for (const src of [
    'Wireframe\n  ToggleButton "FormatBold" selected large',
    'Wireframe\n  ToggleButton large "FormatBold" selected',
    'Wireframe\n  ToggleButton selected large "FormatBold"',
  ]) {
    const tb = firstChild(src);
    assert.deepEqual(
      { icon: tb.props.icon, selected: tb.props.selected, size: tb.props.size },
      expected, src,
    );
  }
});

test('a duplicate selected token is an error', () => {
  assert.throws(() => parse('Wireframe\n  ToggleButton "B" selected selected'), /"selected" set more than once/);
});

test('a duplicate size enum is an error', () => {
  assert.throws(() => parse('Wireframe\n  ToggleButton "B" small large'), /"size" set more than once/);
});

test('a second text literal is rejected', () => {
  assert.throws(() => parse('Wireframe\n  ToggleButton "A" "B"'), /more than one text literal/);
});

test('an unexpected bare token is rejected', () => {
  assert.throws(() => parse('Wireframe\n  ToggleButton "B" wobble'), /unexpected token `wobble`/);
});

test('ToggleButton is not text-bearing: filler is rejected', () => {
  // The icon name is read as a string prop, never routed through filler, so a
  // filler token is a dead input -- the resolver rejects it (text:true is unset).
  assert.throws(() => parse('Wireframe\n  ToggleButton ~3'), /only valid on text components/);
});

test('to=#id and href=#id both populate the universal node.props.to', () => {
  assert.equal(firstChild('Wireframe\n  ToggleButton "B" to=#home').props.to, 'home');
  assert.equal(firstChild('Wireframe\n  ToggleButton "B" href=#home').props.to, 'home');
});

test('ToggleButton lays out to a finite, positive square for every size', () => {
  for (const size of ['small', 'medium', 'large']) {
    const box = firstBox(`Wireframe\n  ToggleButton "B" ${size}`);
    assert.ok(Number.isFinite(box.w) && box.w > 0, `w finite & positive for ${size}, got ${box.w}`);
    assert.ok(Number.isFinite(box.h) && box.h > 0, `h finite & positive for ${size}, got ${box.h}`);
  }
});

test('larger sizes produce a bigger box than smaller sizes', () => {
  // Height differs at the frame top level (cross-axis width is stretched there,
  // but height is intrinsic); width differs on a row main axis.
  const small = firstBox('Wireframe\n  ToggleButton "B" small');
  const large = firstBox('Wireframe\n  ToggleButton "B" large');
  assert.ok(large.h > small.h, `large (${large.h}) should be taller than small (${small.h})`);
  assert.ok(rowToggleBox('"B" large').w > rowToggleBox('"B" small').w, 'large should be wider than small');
});

test('default size (omitted) lays out like medium', () => {
  const plain = rowToggleBox('"B"');
  const medium = rowToggleBox('"B" medium');
  assert.equal(plain.w, medium.w);
  assert.equal(plain.h, medium.h);
});

test('ToggleButton renders a hand-drawn path (its chrome + icon glyph)', () => {
  const { svg } = render('Wireframe\n  ToggleButton "FormatBold"');
  assert.match(svg, /<path/);
});

test('a selected button emits a hatch tint; an unselected one does not', () => {
  // selected -> hand-drawn hatch tint (gray hashes, COLORS.hatch); the pressed
  // look is what discriminates selected at render.
  assert.match(render('Wireframe\n  ToggleButton "B" selected').svg, /stroke="#c4c4c4"/);
  assert.doesNotMatch(render('Wireframe\n  ToggleButton "B"').svg, /stroke="#c4c4c4"/);
});
