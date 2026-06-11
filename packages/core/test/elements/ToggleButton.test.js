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

test('a bare keyless token also reads as the icon name', () => {
  // icon is type 'icon' (tasks/ICONS.md ss.2-3): the bare spelling is tried LAST,
  // after enum/boolean, so `selected` still flips the flag rather than naming an icon.
  const doc = parse('Wireframe\n  ToggleButton FormatBold selected');
  assert.deepEqual(doc.diagnostics, []);
  const tb = doc.frames[0].children[0];
  assert.equal(tb.props.icon, 'FormatBold');
  assert.equal(tb.props.selected, true);
});

test('icon also accepts the keyed spelling, bare or quoted', () => {
  // icon-typed props parse like strings but take BARE keyed values too
  // (tasks/ICONS.md ss.3 -- icon names are identifiers, not prose).
  assert.equal(firstChild('Wireframe\n  ToggleButton icon="FormatUnderlined"').props.icon, 'FormatUnderlined');
  assert.equal(firstChild('Wireframe\n  ToggleButton icon=FormatUnderlined').props.icon, 'FormatUnderlined');
});

test('selected resolves as a keyless flag and as the keyed form', () => {
  assert.equal(firstChild('Wireframe\n  ToggleButton "Check" selected').props.selected, true);
  assert.equal(firstChild('Wireframe\n  ToggleButton "Check" selected=true').props.selected, true);
  assert.equal(firstChild('Wireframe\n  ToggleButton "Check" selected=false').props.selected, false);
  // Default: absent when not given (the resolver injects no PropDef defaults).
  assert.equal(firstChild('Wireframe\n  ToggleButton "Check"').props.selected, undefined);
});

test('size is a keyless enum accepting each value', () => {
  for (const s of ['small', 'medium', 'large']) {
    const doc = parse(`Wireframe\n  ToggleButton "Check" ${s}`);
    assert.deepEqual(doc.diagnostics, [], `ToggleButton ${s} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.size, s);
  }
});

test('size also accepts the keyed enum spelling', () => {
  assert.equal(firstChild('Wireframe\n  ToggleButton "Check" size=large').props.size, 'large');
});

test('a bad size enum value is rejected', () => {
  assert.throws(() => parse('Wireframe\n  ToggleButton "Check" size=huge'), /not valid for "size="/);
});

test('icon, selected, and size resolve independent of token order', () => {
  // literal + boolean + enum are three distinct keyless KINDS (CONVENTION s.2),
  // so any ordering of the three tokens is unambiguous -- including the BARE
  // icon spelling, which is tried last and so never shadows selected/large.
  const expected = { icon: 'FormatBold', selected: true, size: 'large' };
  for (const src of [
    'Wireframe\n  ToggleButton "FormatBold" selected large',
    'Wireframe\n  ToggleButton large "FormatBold" selected',
    'Wireframe\n  ToggleButton selected large "FormatBold"',
    'Wireframe\n  ToggleButton FormatBold selected large',
    'Wireframe\n  ToggleButton selected large FormatBold',
  ]) {
    const tb = firstChild(src);
    assert.deepEqual(
      { icon: tb.props.icon, selected: tb.props.selected, size: tb.props.size },
      expected, src,
    );
  }
});

test('a duplicate selected token is an error', () => {
  assert.throws(() => parse('Wireframe\n  ToggleButton "Check" selected selected'), /"selected" set more than once/);
});

test('a duplicate size enum is an error', () => {
  assert.throws(() => parse('Wireframe\n  ToggleButton "Check" small large'), /"size" set more than once/);
});

test('a second text literal is rejected', () => {
  assert.throws(() => parse('Wireframe\n  ToggleButton "A" "Check"'), /more than one text literal/);
});

test('an unexpected bare token is rejected once the icon slot is taken', () => {
  // With the literal slot already filled, a stray bare token has nowhere to go
  // (the bare-icon reading only applies to an UNFILLED slot, tasks/ICONS.md).
  assert.throws(() => parse('Wireframe\n  ToggleButton "Check" wobble'), /unexpected token `wobble`/);
});

test('ToggleButton is not text-bearing: filler is rejected', () => {
  // The icon name is read as a string prop, never routed through filler, so a
  // filler token is a dead input -- the resolver rejects it (text:true is unset).
  assert.throws(() => parse('Wireframe\n  ToggleButton ~3'), /only valid on text components/);
});

test('to=#id and href=#id both populate the universal node.props.to', () => {
  assert.equal(firstChild('Wireframe\n  ToggleButton "Check" to=#home').props.to, 'home');
  assert.equal(firstChild('Wireframe\n  ToggleButton "Check" href=#home').props.to, 'home');
});

test('ToggleButton lays out to a finite, positive square for every size', () => {
  for (const size of ['small', 'medium', 'large']) {
    const box = firstBox(`Wireframe\n  ToggleButton "Check" ${size}`);
    assert.ok(Number.isFinite(box.w) && box.w > 0, `w finite & positive for ${size}, got ${box.w}`);
    assert.ok(Number.isFinite(box.h) && box.h > 0, `h finite & positive for ${size}, got ${box.h}`);
  }
});

test('larger sizes produce a bigger box than smaller sizes', () => {
  // Height differs at the frame top level (cross-axis width is stretched there,
  // but height is intrinsic); width differs on a row main axis.
  const small = firstBox('Wireframe\n  ToggleButton "Check" small');
  const large = firstBox('Wireframe\n  ToggleButton "Check" large');
  assert.ok(large.h > small.h, `large (${large.h}) should be taller than small (${small.h})`);
  assert.ok(rowToggleBox('"Check" large').w > rowToggleBox('"Check" small').w, 'large should be wider than small');
});

test('default size (omitted) lays out like medium', () => {
  const plain = rowToggleBox('"Check"');
  const medium = rowToggleBox('"Check" medium');
  assert.equal(plain.w, medium.w);
  assert.equal(plain.h, medium.h);
});

test('ToggleButton renders a hand-drawn path (its chrome)', () => {
  const { svg } = render('Wireframe\n  ToggleButton "FormatBold"');
  assert.match(svg, /<path/);
});

test('a known built-in icon renders as clean vectors on the button face', () => {
  // 'Check' resolves through the built-in set (tasks/ICONS.md ss.2): drawIcon
  // emits a translate+scale <g> wrapping the real artwork, not the placeholder.
  const { svg, diagnostics } = render('Wireframe\n  ToggleButton "Check" selected');
  assert.deepEqual(diagnostics, []);
  assert.match(svg, /<g transform="translate\([^)]+\) scale\(/);
  assert.match(svg, /M9 16\.17/); // Check's path data -- stable built-in body
});

test('an unknown icon name renders the placeholder glyph + a warning', () => {
  const { svg, diagnostics } = render('Wireframe\n  ToggleButton "NoSuchIconXyz"');
  assert.ok(
    diagnostics.some((d) => d.severity === 'warning' && /unknown icon "NoSuchIconXyz"/.test(d.message)),
    `expected an unknown-icon warning, got: ${JSON.stringify(diagnostics)}`,
  );
  assert.doesNotMatch(svg, /scale\(/); // no clean-artwork group anywhere
  assert.match(svg, /stroke="#9aa7b2"/); // the muted placeholder strokes
});

test('no icon at all renders the placeholder with NO warning', () => {
  // An unset icon slot is fine (today's behavior, unchanged by tasks/ICONS.md):
  // same muted placeholder mark, no diagnostic.
  const { svg, diagnostics } = render('Wireframe\n  ToggleButton selected');
  assert.deepEqual(diagnostics, []);
  assert.doesNotMatch(svg, /scale\(/);
  assert.match(svg, /stroke="#9aa7b2"/);
});

test('a selected button emits a hatch tint; an unselected one does not', () => {
  // selected -> hand-drawn hatch tint (gray hashes, COLORS.hatch); the pressed
  // look is what discriminates selected at render.
  assert.match(render('Wireframe\n  ToggleButton "Check" selected').svg, /stroke="#c4c4c4"/);
  assert.doesNotMatch(render('Wireframe\n  ToggleButton "Check"').svg, /stroke="#c4c4c4"/);
});
