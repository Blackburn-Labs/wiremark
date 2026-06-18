// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * Typography -- the text leaf (SPEC ss.5.4, ss.6). Keyless slots are the text
 * literal (-> label) and the variant enum, in any order. A bare amount (`~N`)
 * renders squiggle filler instead of a string; the variant drives the font
 * size, so a larger variant lays out taller.
 */

const LABEL_SRC = 'Wireframe w=400 h=300\n  Typography h4 "Sign in"';
const FILLER_SRC = 'Wireframe w=400 h=300\n  Typography ~3';

test('Typography parses keyless literal + variant in either order', () => {
  const doc = parse(LABEL_SRC);
  assert.deepEqual(doc.diagnostics, []);

  const t = doc.frames[0].children[0];
  assert.equal(t.component, 'Typography');
  assert.equal(t.props.label, 'Sign in');
  assert.equal(t.props.variant, 'h4');
});

test('Typography lays out to a finite, positive box and grows with the variant', () => {
  const small = layout(parse('Wireframe w=400 h=300\n  Typography caption "x"'))[0].root.children[0];
  const large = layout(parse('Wireframe w=400 h=300\n  Typography h1 "x"'))[0].root.children[0];

  assert.ok(Number.isFinite(small.h) && small.h > 0, `h should be finite & positive, got ${small.h}`);
  assert.ok(large.h > small.h, `a larger variant should be taller (h1 ${large.h} vs caption ${small.h})`);
});

test('Typography renders its label as a <text> element', () => {
  const { svg } = render(LABEL_SRC);
  assert.match(svg, /<text/);
  assert.match(svg, /Sign in/);
});

test('a bare Typography ~N renders squiggle filler, not a label', () => {
  const filler = layout(parse(FILLER_SRC))[0].root.children[0];
  assert.deepEqual(filler.node.filler, { amount: 3, unit: 'units' });
  assert.ok(filler.h > 0, `filler should occupy vertical space, got ${filler.h}`);

  const { svg } = render(FILLER_SRC);
  assert.match(svg, /<path/);  // squiggle rows are drawn as hand-drawn paths
});

test('filler=lorem draws real-ish lorem words instead of squiggles (ss.6)', () => {
  const { svg } = render('Wireframe w=400 h=300\n  Typography ~3 filler=lorem');
  assert.match(svg, /Lorem ipsum/);
  assert.equal((svg.match(/<text/g) ?? []).length, 3, 'one <text> row per filler line');
});

test('filler=lorem honors an exact ~Nw word count on a single line', () => {
  const { svg } = render('Wireframe w=400 h=300\n  Typography ~4w filler=lorem');
  assert.match(svg, />Lorem ipsum dolor sit</);
  assert.equal((svg.match(/<text/g) ?? []).length, 1);
});

test('filler=blocks draws solid grey bars, distinct from squiggle strokes', () => {
  const { svg } = render('Wireframe w=400 h=300\n  Typography ~3 filler=blocks');
  assert.match(svg, /fill="#c4c4c4"/, 'blocks fills solid grey bars (hatch gray)');
  assert.doesNotMatch(svg, /<text/, 'blocks is greeking, never real glyphs');
});

test('filler=squiggle and filler=blocks no longer render identically', () => {
  const sq = render('Wireframe w=400 h=300\n  Typography ~3 filler=squiggle').svg;
  const bl = render('Wireframe w=400 h=300\n  Typography ~3 filler=blocks').svg;
  assert.notEqual(sq, bl, 'the two greeking styles must be visually different');
  assert.doesNotMatch(sq, /fill="#c4c4c4"/, 'squiggle draws no solid bar fill');
  assert.match(bl, /fill="#c4c4c4"/, 'blocks does');
});

test('a bare ~N with no filler= defaults to the squiggle style', () => {
  const bare = render('Wireframe w=400 h=300\n  Typography ~3').svg;
  const sq = render('Wireframe w=400 h=300\n  Typography ~3 filler=squiggle').svg;
  assert.equal(bare, sq, 'the default greeking style is squiggle');
});

test('a frame-level filler= is inherited by text descendants (ss.6, two levels)', () => {
  const src = 'Wireframe w=400 h=300 filler=lorem\n  Stack column\n    Typography ~2';
  const t = parse(src).frames[0].children[0].children[0];
  assert.equal(t.props.filler, 'lorem', 'the frame default reaches a nested Typography');
  assert.match(render(src).svg, /Lorem ipsum/);
});

test("a node's own filler= wins over the frame default", () => {
  const src = 'Wireframe w=400 h=300 filler=lorem\n  Typography ~2 filler=squiggle';
  const t = parse(src).frames[0].children[0];
  assert.equal(t.props.filler, 'squiggle');
  assert.doesNotMatch(render(src).svg, /Lorem/);
});

test('variant defaults to body1 when omitted (strategy applies the default)', () => {
  // The resolver does not inject PropDef defaults; an unset variant is absent and
  // the strategy treats it as body1.
  const t = parse('Wireframe w=400 h=300\n  Typography "x"').frames[0].children[0];
  assert.equal(t.props.variant, undefined);
});

test('`body` is no longer a valid variant and is rejected', () => {
  // The spec dropped the extra `body` value (use body1/body2); the bare token has
  // no keyless slot to land in, so the resolver throws.
  assert.throws(
    () => parse('Wireframe w=400 h=300\n  Typography body "x"'),
    /unexpected token `body`/,
  );
});

test('align is a keyed enum that drives the SVG text-anchor', () => {
  // center -> middle, right -> end; left / justify / inherit (and the default)
  // all anchor at the start. (placement() in Typography.js.)
  const anchorFor = (align) => {
    const src = `Wireframe w=400 h=300\n  Typography "Hi"${align ? ` align=${align}` : ''}`;
    assert.deepEqual(parse(src).diagnostics, [], `align=${align} should parse cleanly`);
    return (render(src).svg.match(/text-anchor="(start|middle|end)"/) ?? [])[1];
  };
  assert.equal(anchorFor('center'), 'middle');
  assert.equal(anchorFor('right'), 'end');
  assert.equal(anchorFor('left'), 'start');
  assert.equal(anchorFor('justify'), 'start');   // degrades to left at sketch fidelity
  assert.equal(anchorFor('inherit'), 'start');
  assert.equal(anchorFor(''), 'start');           // omitted => default start
});

test('align is ALSO keyless: a bare align value resolves to props.align', () => {
  // The spec marks align keyless; a bare token like `center` lands on align,
  // same as the keyed `align=center` (resolve.js keyless-enum slot).
  for (const a of ['left', 'center', 'right', 'justify', 'inherit']) {
    const n = parse(`Wireframe w=400 h=300\n  Typography "Hi" ${a}`).frames[0].children[0];
    assert.equal(n.props.align, a, `bare \`${a}\` should set props.align`);
  }
});

test('a bare align value drives the SVG text-anchor like the keyed form', () => {
  // Bare and keyed are the same prop, so they produce the same anchor.
  const anchorFor = (a) =>
    (render(`Wireframe w=400 h=300\n  Typography "Hi" ${a}`).svg.match(/text-anchor="(start|middle|end)"/) ?? [])[1];
  assert.equal(anchorFor('center'), 'middle');
  assert.equal(anchorFor('right'), 'end');
  assert.equal(anchorFor('left'), 'start');
});

test('keyless align composes with the variant enum in any order', () => {
  // variant and align are disjoint keyless enums, so order is irrelevant.
  const a = parse('Wireframe w=400 h=300\n  Typography "Hi" caption right').frames[0].children[0];
  assert.deepEqual({ v: a.props.variant, al: a.props.align }, { v: 'caption', al: 'right' });
  const b = parse('Wireframe w=400 h=300\n  Typography "Hi" right caption').frames[0].children[0];
  assert.deepEqual({ v: b.props.variant, al: b.props.align }, { v: 'caption', al: 'right' });
});

test('keyless align composes with a literal and the noWrap flag in any order', () => {
  const n = parse('Wireframe w=400 h=300\n  Typography "Hi" center noWrap').frames[0].children[0];
  assert.deepEqual(
    { l: n.props.label, al: n.props.align, nw: n.props.noWrap },
    { l: 'Hi', al: 'center', nw: true },
  );
});

test('setting align twice (bare + keyed) is an ambiguity error', () => {
  assert.throws(
    () => parse('Wireframe w=400 h=300\n  Typography "Hi" center align=right'),
    /set more than once|more than once/,
  );
});

test('the caption variant inks its label in the muted/disabled color', () => {
  // caption is MUI's de-emphasized text -> COLORS.muted (#9aa7b2 light), the same
  // faded ink Button/TextField use when disabled. Other variants stay ink.
  const captionFill = (svg) => (svg.match(/<text[^>]*fill="(#[0-9a-f]{6})"/i) ?? [])[1];

  const caption = render('Wireframe w=400 h=300\n  Typography caption "Note"').svg;
  assert.equal(captionFill(caption), '#9aa7b2', 'caption draws in muted ink');

  for (const v of ['body1', 'body2', 'h4', 'subtitle1', 'overline', 'button']) {
    const svg = render(`Wireframe w=400 h=300\n  Typography ${v} "Note"`).svg;
    assert.equal(captionFill(svg), '#22303f', `${v} must keep the normal ink, not muted`);
  }
});

test('a wrapped caption keeps muted ink on every line', () => {
  // The fill is per-variant, not per-line, so multi-line captions stay faded.
  const long = 'An extremely long caption that cannot possibly fit on one line at all';
  const svg = render(`Wireframe w=240 h=200\n  Typography caption "${long}"`).svg;
  const fills = svg.match(/<text[^>]*fill="(#[0-9a-f]{6})"/gi) ?? [];
  assert.ok(fills.length >= 2, `expected multiple wrapped lines, got ${fills.length}`);
  for (const f of fills) assert.match(f, /#9aa7b2/, 'every caption line is muted');
});

test('caption is muted in the dark theme too (muted tracks the palette)', () => {
  // The color comes from COLORS.muted, which the dark palette redefines, so a
  // dark-theme caption uses dark muted (#6b7782) while body uses dark ink.
  const fill = (svg) => (svg.match(/<text[^>]*fill="(#[0-9a-f]{6})"/i) ?? [])[1];
  const caption = render('Wireframe w=400 h=300\n  Typography caption "Note"', { theme: 'dark' }).svg;
  const body = render('Wireframe w=400 h=300\n  Typography body1 "Note"', { theme: 'dark' }).svg;
  assert.equal(fill(caption), '#6b7782', 'dark caption uses dark muted');
  assert.equal(fill(body), '#d4dde6', 'dark body uses dark ink');
});

test('noWrap parses both as a bare flag and keyed', () => {
  const bare = parse('Wireframe w=400 h=300\n  Typography "Hi" noWrap');
  assert.deepEqual(bare.diagnostics, []);
  assert.equal(bare.frames[0].children[0].props.noWrap, true);
  assert.equal(parse('Wireframe w=400 h=300\n  Typography "Hi" noWrap=true').frames[0].children[0].props.noWrap, true);
});

test('a label wider than its box word-wraps onto multiple lines (the MUI default)', () => {
  const long = 'An extremely long heading that cannot possibly fit';
  // Flush frame (padding defaults to 0) narrower than the heading, so the h4 must
  // wrap; the content width is the full frame width now.
  const src = `Wireframe w=288 h=200\n  Typography h4 "${long}"`;
  const { svg } = render(src);
  const lines = (svg.match(/<text /g) ?? []).length;
  assert.ok(lines >= 2, `expected multiple wrapped lines, got ${lines}`);
  assert.doesNotMatch(svg, /…/, 'wrapping should not need an ellipsis');
  for (const word of long.split(' ')) assert.match(svg, new RegExp(word));
  // The laid-out box grows to seat the wrapped lines.
  const box = layout(parse(src))[0].root.children[0];
  assert.ok(box.h >= 2 * Math.ceil(24 * 1.4), `box should be at least two h4 lines tall, got ${box.h}`);
});

test('noWrap pins the single-line + ellipsis form', () => {
  const long = 'An extremely long heading that cannot possibly fit';
  const { svg } = render(`Wireframe w=320 h=200\n  Typography h4 "${long}" noWrap`);
  assert.equal((svg.match(/<text /g) ?? []).length, 1, 'noWrap should draw exactly one line');
  assert.match(svg, /…</, 'the single line should trim with …');
  assert.doesNotMatch(svg, new RegExp(long));
});

test('a label that fits renders verbatim on one line', () => {
  const { svg } = render('Wireframe w=400 h=300\n  Typography "Sign in"');
  assert.match(svg, />Sign in</);
  assert.doesNotMatch(svg, /…/);
  assert.equal((svg.match(/<text /g) ?? []).length, 1);
});

test('wrapped lines keep the align anchor', () => {
  const long = 'An extremely long right-aligned line of text that overflows';
  const { svg } = render(`Wireframe w=320 h=200\n  Typography "${long}" align=right`);
  const anchors = (svg.match(/text-anchor="end"/g) ?? []).length;
  assert.ok(anchors >= 2, `every wrapped line should anchor end, got ${anchors}`);
  assert.doesNotMatch(svg, /…/);
});
