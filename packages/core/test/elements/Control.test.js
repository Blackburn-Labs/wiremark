// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  Control';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** First laid-out child box of the frame for `src`. Control sits in a row so it
 * keeps its intrinsic footprint (a lone column child would stretch its cross axis). */
const rowControlBox = (tokens) =>
  layout(parse(`Wireframe\n  Stack row\n    Control ${tokens}`))[0].root.children[0].children[0];
/** Count hand-drawn paths in the SVG for `src` (proxy for "more strokes drawn"). */
const pathCount = (src) => (render(src).svg.match(/<path/g) ?? []).length;

test('Control parses with clean diagnostics and resolves its component', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].component, 'Control');
});

test('variant is a keyless enum accepting each value', () => {
  for (const v of ['radio', 'checkbox', 'switch']) {
    const doc = parse(`Wireframe\n  Control ${v}`);
    assert.deepEqual(doc.diagnostics, [], `Control ${v} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.variant, v);
  }
});

test('size is a second keyless enum accepting each value', () => {
  for (const s of ['small', 'medium', 'large']) {
    const doc = parse(`Wireframe\n  Control ${s}`);
    assert.deepEqual(doc.diagnostics, [], `Control ${s} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.size, s);
  }
});

test('variant and size (two keyless enums) resolve independent of token order', () => {
  // Disjoint value domains (CONVENTION s.2.1) => any ordering is unambiguous.
  const expected = { variant: 'switch', size: 'large' };
  for (const src of [
    'Wireframe\n  Control switch large',
    'Wireframe\n  Control large switch',
  ]) {
    const c = firstChild(src);
    assert.deepEqual({ variant: c.props.variant, size: c.props.size }, expected, src);
  }
});

test('checked and disabled resolve as implicit bare flags and as the keyed form', () => {
  // Bare boolean name => true (CONVENTION s.3); the keyed form still works.
  assert.equal(firstChild('Wireframe\n  Control checked').props.checked, true);
  assert.equal(firstChild('Wireframe\n  Control disabled').props.disabled, true);
  assert.equal(firstChild('Wireframe\n  Control checked=true').props.checked, true);
  assert.equal(firstChild('Wireframe\n  Control checked=false').props.checked, false);
});

test('all four keyless tokens combine in any order', () => {
  const c = firstChild('Wireframe\n  Control switch checked large disabled');
  assert.deepEqual(
    { variant: c.props.variant, size: c.props.size, checked: c.props.checked, disabled: c.props.disabled },
    { variant: 'switch', size: 'large', checked: true, disabled: true },
  );
});

test('variant/size/checked/disabled are absent when omitted (strategy applies defaults)', () => {
  // The resolver does not inject PropDef defaults; the strategy treats absent
  // variant as checkbox, size as medium, the booleans as false.
  const c = firstChild(SRC);
  assert.equal(c.props.variant, undefined);
  assert.equal(c.props.size, undefined);
  assert.equal(c.props.checked, undefined);
  assert.equal(c.props.disabled, undefined);
});

test('Control lays out to a finite, positive box', () => {
  const box = rowControlBox('');
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});

test('size scales the glyph (large is bigger than small)', () => {
  const small = rowControlBox('small');
  const large = rowControlBox('large');
  assert.ok(large.w > small.w && large.h > small.h, `large (${large.w}x${large.h}) should exceed small (${small.w}x${small.h})`);
});

test('a switch is wider than a checkbox at the same size', () => {
  assert.ok(rowControlBox('switch').w > rowControlBox('checkbox').w, 'switch pill should be wider than the checkbox square');
});

test('each variant renders a hand-drawn path and stays valid SVG', () => {
  for (const v of ['radio', 'checkbox', 'switch']) {
    const { svg } = render(`Wireframe\n  Control ${v}`);
    assert.match(svg, /<path/, `${v} should draw a path`);
  }
});

test('checking a checkbox or radio adds strokes (the tick / the dot)', () => {
  // checkbox + radio express "checked" with extra geometry (more paths); the
  // switch expresses it via the track FILL instead (covered by the next test).
  for (const v of ['checkbox', 'radio']) {
    const off = pathCount(`Wireframe\n  Control ${v}`);
    const on = pathCount(`Wireframe\n  Control ${v} checked`);
    assert.ok(on > off, `${v}: checked (${on} paths) should draw more than unchecked (${off})`);
  }
});

test('a checked switch hatches the track; an off switch does not', () => {
  // The switch signals "on" by hatching the pill (gray hand-drawn hashes) rather
  // than by adding strokes, so this is its checked-vs-unchecked discriminator.
  assert.match(render('Wireframe\n  Control switch checked').svg, /stroke="#c4c4c4"/); // COLORS.hatch
  assert.doesNotMatch(render('Wireframe\n  Control switch').svg, /stroke="#c4c4c4"/);
});

test('a disabled checked switch hatches in muted gray, not the default hatch', () => {
  const svg = render('Wireframe\n  Control switch checked disabled').svg;
  assert.match(svg, /stroke="#9aa7b2"/);        // muted hatch + muted border
  assert.doesNotMatch(svg, /stroke="#c4c4c4"/); // not the default hatch gray
});

test('disabled mutes the glyph stroke', () => {
  const svg = render('Wireframe\n  Control checkbox disabled').svg;
  assert.match(svg, /stroke="#9aa7b2"/); // COLORS.muted
});
