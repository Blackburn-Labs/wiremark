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

test('noWrap parses both as a bare flag and keyed', () => {
  const bare = parse('Wireframe w=400 h=300\n  Typography "Hi" noWrap');
  assert.deepEqual(bare.diagnostics, []);
  assert.equal(bare.frames[0].children[0].props.noWrap, true);
  assert.equal(parse('Wireframe w=400 h=300\n  Typography "Hi" noWrap=true').frames[0].children[0].props.noWrap, true);
});

test('a label wider than its box word-wraps onto multiple lines (the MUI default)', () => {
  const long = 'An extremely long heading that cannot possibly fit';
  const src = `Wireframe w=320 h=200\n  Typography h4 "${long}"`;
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
