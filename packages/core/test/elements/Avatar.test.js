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

test('size is a second keyless enum accepting each value', () => {
  for (const s of ['small', 'medium', 'large']) {
    const doc = parse(`Wireframe\n  Avatar ${s}`);
    assert.deepEqual(doc.diagnostics, [], `Avatar ${s} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.size, s);
  }
});

test('size defaults to undefined when omitted (strategy applies the medium default)', () => {
  assert.equal(firstChild(SRC).props.size, undefined);
});

test('size scales the square diameter; medium matches the historical 40px default', () => {
  // Bigger size -> bigger square; an unset size renders at the medium diameter so
  // pre-size avatars are byte-stable (the smoke fixtures rely on this).
  const small = firstBox('Wireframe\n  Avatar "RB" small');
  const medium = firstBox('Wireframe\n  Avatar "RB" medium');
  const large = firstBox('Wireframe\n  Avatar "RB" large');
  assert.ok(small.w < medium.w && medium.w < large.w, `sizes should grow: ${small.w} < ${medium.w} < ${large.w}`);
  for (const b of [small, medium, large]) assert.equal(b.w, b.h, 'every size stays square');
  // Default (no size) == medium, and medium is the historical 40px footprint.
  assert.equal(firstBox(SRC).w, medium.w, 'an unset size should render at the medium diameter');
  assert.equal(medium.w, 40, 'medium should remain the historical 40px avatar');
});

test('variant, size and background are three disjoint keyless enums (any order)', () => {
  // circular|rounded|square vs small|medium|large vs hatch|crosshatch -- pairwise
  // disjoint (CONVENTION s.2.1), so all three plus the initials literal resolve
  // regardless of token order.
  const expected = { variant: 'square', size: 'large', background: 'crosshatch', label: 'RB' };
  for (const src of [
    'Wireframe\n  Avatar square large crosshatch "RB"',
    'Wireframe\n  Avatar "RB" crosshatch square large',
    'Wireframe\n  Avatar large "RB" square crosshatch',
  ]) {
    const doc = parse(src);
    assert.deepEqual(doc.diagnostics, [], `${src} should parse cleanly`);
    const a = doc.frames[0].children[0].props;
    assert.deepEqual({ variant: a.variant, size: a.size, background: a.background, label: a.label }, expected, src);
  }
});

test('background is a keyless enum; denseBackground is a keyless flag', () => {
  for (const bg of ['hatch', 'crosshatch']) {
    const doc = parse(`Wireframe\n  Avatar ${bg}`);
    assert.deepEqual(doc.diagnostics, [], `Avatar ${bg} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.background, bg);
  }
  assert.equal(firstChild('Wireframe\n  Avatar denseBackground').props.denseBackground, true);
  assert.equal(firstChild('Wireframe\n  Avatar denseBackground=false').props.denseBackground, false);
  // Absent (no tint asked for): both unset, so a bare avatar stays transparent.
  assert.equal(firstChild(SRC).props.background, undefined);
  assert.equal(firstChild(SRC).props.denseBackground, undefined);
});

test('background tints the avatar with an opaque paper base under the hatch', () => {
  // CONVENTION s.8: Avatar is an (A) surface, so a tint lays a borderless paper
  // base (base:true) under the hand-drawn hashes -- content behind never bleeds
  // through the gaps.
  const tinted = render('Wireframe\n  Avatar circular hatch').svg;
  assert.match(tinted, /<path[^>]*fill="#ffffff"[^>]*>/, 'tinted avatar draws an opaque paper base path');
  assert.match(tinted, /stroke="#c4c4c4"/, 'tinted avatar draws the hatch hashes');
});

test('a bare avatar (no background) stays transparent -- no base, no hatch', () => {
  // The byte-stability guard for the smoke fixtures: omitting background must
  // leave the avatar exactly as it drew before this task (no paper base path).
  const plain = render(SRC).svg;
  assert.doesNotMatch(plain, /<path[^>]*fill="#ffffff"[^>]*>/, 'an untinted avatar draws no paper base');
  assert.doesNotMatch(plain, /stroke="#c4c4c4"/, 'an untinted avatar draws no hatch');
});

test('the tint base + hatch shape-match the variant silhouette (Ruling 4)', () => {
  // circular -> ellipse base (cubic-bezier curves), square -> plain rect base
  // (no curves), rounded -> rounded-rect base (corner curves). The base must
  // trace the variant outline so it never pokes past a curved edge.
  const baseCurves = (svg) => {
    const m = svg.match(/<path d="([^"]*)"[^>]*fill="#ffffff"/);
    return m ? (m[1].match(/C/g) || []).length : -1;
  };
  const circ = baseCurves(render('Wireframe\n  Avatar circular hatch').svg);
  const sq = baseCurves(render('Wireframe\n  Avatar square hatch').svg);
  const rnd = baseCurves(render('Wireframe\n  Avatar rounded hatch').svg);
  assert.ok(circ > 0, `circular base should be a curved ellipse (got ${circ} curves)`);
  assert.equal(sq, 0, `square base should be a straight-edged rect (got ${sq} curves)`);
  assert.ok(rnd > 0 && rnd < circ, `rounded base should curve only at corners (got ${rnd} vs circ ${circ})`);
});

test('denseBackground packs the hatch lines closer', () => {
  const hatchSegs = (svg) => ((svg.match(/<path d="([^"]+)" fill="none" stroke="#c4c4c4"/) || [, ''])[1].match(/M/g) || []).length;
  const standard = render('Wireframe\n  Avatar square hatch').svg;
  const dense = render('Wireframe\n  Avatar square hatch denseBackground').svg;
  assert.ok(hatchSegs(dense) > hatchSegs(standard), `denseBackground should add hash lines: ${hatchSegs(dense)} vs ${hatchSegs(standard)}`);
});

test('a tinted avatar still centers its initials over the base', () => {
  const svg = render('Wireframe\n  Avatar "RB" circular hatch').svg;
  assert.match(svg, />RB</, 'initials still render on a tinted avatar');
  assert.match(svg, /<path[^>]*fill="#ffffff"[^>]*>/, 'and the opaque base is present');
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

test('rounded differs from square (rounded corners, not a sharp rectangle)', () => {
  // `rounded` draws one closed rounded-rect path (corner arcs baked into the
  // outline), not a sharp `rrect` -- so its geometry differs from square's even
  // though both emit a single outline path.
  const square = render('Wireframe\n  Avatar square').svg;
  const rounded = render('Wireframe\n  Avatar rounded').svg;
  assert.notEqual(rounded, square, 'rounded and square should render differently');
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
