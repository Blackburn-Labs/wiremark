// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  Avatar "RB"';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];

test('Avatar parses with clean diagnostics and resolves its label (initials)', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const avatar = doc.frames[0].children[0];
  assert.equal(avatar.component, 'Avatar');
  assert.equal(avatar.props.label, 'RB');
});

test('the quoted literal is keyless -> label (the initials)', () => {
  assert.equal(firstChild('Wireframe\n  Avatar "AB"').props.label, 'AB');
});

test('variant defaults to undefined when omitted (strategy applies the circular default)', () => {
  // The resolver does not inject PropDef defaults; an unset prop is absent.
  assert.equal(firstChild(SRC).props.variant, undefined);
});

test('variant is a keyless enum accepting each value', () => {
  for (const v of ['circular', 'rounded', 'square']) {
    const doc = parse(`Wireframe\n  Avatar ${v}`);
    assert.deepEqual(doc.diagnostics, [], `Avatar ${v} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.variant, v);
  }
});

test('variant also resolves in its keyed form', () => {
  const doc = parse('Wireframe\n  Avatar variant=square "RB"');
  assert.deepEqual(doc.diagnostics, []);
  const avatar = doc.frames[0].children[0];
  assert.equal(avatar.props.variant, 'square');
  assert.equal(avatar.props.label, 'RB');
});

test('the keyless literal and keyless enum resolve independent of token order', () => {
  // label (literal) and variant (enum) are different keyless kinds, so any
  // ordering is unambiguous.
  for (const src of [
    'Wireframe\n  Avatar "RB" rounded',
    'Wireframe\n  Avatar rounded "RB"',
  ]) {
    const doc = parse(src);
    assert.deepEqual(doc.diagnostics, [], `${src} should parse cleanly`);
    const avatar = doc.frames[0].children[0];
    assert.equal(avatar.props.variant, 'rounded', src);
    assert.equal(avatar.props.label, 'RB', src);
  }
});

test('src is a keyed string prop', () => {
  const doc = parse('Wireframe\n  Avatar src="user.png"');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.src, 'user.png');
});

test('src must be quoted -> a bare value is an author error', () => {
  assert.throws(() => parse('Wireframe\n  Avatar src=user.png'), /must be quoted/);
});

test('an unknown variant token is an author error', () => {
  assert.throws(() => parse('Wireframe\n  Avatar "RB" triangular'), /unexpected token `triangular`/);
});

test('setting variant twice is an author error', () => {
  assert.throws(() => parse('Wireframe\n  Avatar "RB" circular square'), /set more than once/);
});

test('two text literals is an author error (at most one keyless literal)', () => {
  assert.throws(() => parse('Wireframe\n  Avatar "RB" "XY"'), /more than one text literal/);
});

test('to= / href= resolve to the universal nav prop', () => {
  assert.equal(firstChild('Wireframe\n  Avatar "RB" to=#profile').props.to, 'profile');
  assert.equal(firstChild('Wireframe\n  Avatar "RB" href=#profile').props.to, 'profile');
});

test('Avatar lays out to a finite, positive square for every variant', () => {
  for (const variant of ['circular', 'rounded', 'square']) {
    const box = firstBox(`Wireframe\n  Avatar "RB" ${variant}`);
    assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive for ${variant}, got ${box.w}`);
    assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive for ${variant}, got ${box.h}`);
    assert.equal(box.w, box.h, `${variant} should be a square (w=${box.w}, h=${box.h})`);
  }
});

test('Avatar renders its initials and a hand-drawn path', () => {
  const { svg } = render(SRC);
  assert.match(svg, /RB/);
  assert.match(svg, /<path/);
});

test('circular draws an ellipse; square/rounded draw a rectangle (variant chrome is real)', () => {
  // A circle is one closed curve (no straight axis-aligned edges); a rectangle
  // outline contains an explicit straight run. The cheapest robust discriminator
  // here is that the circular SVG differs from both rect variants byte-for-byte.
  const circular = render('Wireframe\n  Avatar circular').svg;
  const square = render('Wireframe\n  Avatar square').svg;
  const rounded = render('Wireframe\n  Avatar rounded').svg;
  assert.notEqual(circular, square, 'circular and square should render differently');
  assert.notEqual(circular, rounded, 'circular and rounded should render differently');
});

test('rounded differs from square (the chamfered corners add strokes square lacks)', () => {
  // `rounded` cuts each corner with an extra diagonal stroke, so it emits strictly
  // more <path> elements than the plain square rectangle.
  const square = render('Wireframe\n  Avatar square').svg;
  const rounded = render('Wireframe\n  Avatar rounded').svg;
  const paths = (s) => (s.match(/<path/g) || []).length;
  assert.ok(paths(rounded) > paths(square), `rounded (${paths(rounded)} paths) should have more than square (${paths(square)})`);
});

test('src= flips the chrome to an image placeholder (crossed strokes), not initials', () => {
  // With a real source a wireframe draws the crossed-box placeholder (like Img),
  // regardless of any label, rather than rendering the actual image.
  const withSrc = render('Wireframe\n  Avatar "RB" square src="user.png"').svg;
  const withLabel = render('Wireframe\n  Avatar "RB" square').svg;
  // The placeholder adds the two crossing diagonals -> more strokes than the
  // plain labelled shape, and it does NOT print the initials.
  const paths = (s) => (s.match(/<path/g) || []).length;
  assert.ok(paths(withSrc) > paths(withLabel), `src placeholder (${paths(withSrc)}) should add strokes vs plain (${paths(withLabel)})`);
  assert.doesNotMatch(withSrc, />RB</, 'an image placeholder should not print the initials');
});

test('a bare Avatar (no label, no src) still draws its shape', () => {
  const { svg } = render('Wireframe\n  Avatar circular');
  assert.match(svg, /<path/, 'an empty avatar should still draw its outline');
});
