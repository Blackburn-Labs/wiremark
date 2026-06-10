// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];
/** Rendered SVG for `src`. */
const svgOf = (src) => render(src).svg;

const VARIANTS = ['text', 'circular', 'rectangular', 'rounded'];

test('Skeleton parses with clean diagnostics', () => {
  const doc = parse('Wireframe\n  Skeleton');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].component, 'Skeleton');
});

test('variant is absent when omitted (strategy applies the rectangular default)', () => {
  // The resolver does not inject PropDef defaults; an unset prop is absent and
  // the render strategy supplies `rectangular`.
  assert.equal(firstChild('Wireframe\n  Skeleton').props.variant, undefined);
});

test('variant is a keyless enum accepting each value', () => {
  for (const v of VARIANTS) {
    const doc = parse(`Wireframe\n  Skeleton ${v}`);
    assert.deepEqual(doc.diagnostics, [], `Skeleton ${v} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.variant, v);
  }
});

test('variant also accepts the keyed spelling', () => {
  const child = firstChild('Wireframe\n  Skeleton variant=circular');
  assert.equal(child.props.variant, 'circular');
});

test('an unknown variant value is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Skeleton wavy'), /unexpected token `wavy`/);
});

test('setting variant twice is a hard error (keyless dup and keyless-vs-keyed)', () => {
  assert.throws(() => parse('Wireframe\n  Skeleton text rectangular'), /"variant" set more than once/);
  assert.throws(() => parse('Wireframe\n  Skeleton text variant=circular'), /"variant" set more than once/);
});

test('width/height are positional sizing tokens that pin the box', () => {
  const box = firstBox('Wireframe\n  Skeleton 200px 24px');
  assert.equal(box.w, 200);
  assert.equal(box.h, 24);
});

test('a single sizing token pins width only; height falls back to intrinsic', () => {
  const box = firstBox('Wireframe\n  Skeleton 250px');
  assert.equal(box.w, 250);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `height should fall back, got ${box.h}`);
});

test('width/height are positional-only -- there is no keyed w=/h= prop', () => {
  // The spec lists w/h aliases, but sizing is positional (Box 240px 40px); a
  // keyed spelling must NOT silently become a prop.
  assert.throws(() => parse('Wireframe\n  Skeleton w=200px'), /unknown property "w="/);
});

test('a bare circular Skeleton is square; rectangular is not', () => {
  const circ = firstBox('Wireframe\n  Skeleton circular');
  assert.equal(circ.w, circ.h, `circular intrinsic should be square, got ${circ.w}x${circ.h}`);

  const rect = firstBox('Wireframe\n  Skeleton rectangular');
  assert.notEqual(rect.w, rect.h, 'rectangular intrinsic should not be square');
});

test('every variant lays out to a finite, positive box', () => {
  for (const v of VARIANTS) {
    const box = firstBox(`Wireframe\n  Skeleton ${v}`);
    assert.ok(Number.isFinite(box.w) && box.w > 0, `${v} w should be finite & positive, got ${box.w}`);
    assert.ok(Number.isFinite(box.h) && box.h > 0, `${v} h should be finite & positive, got ${box.h}`);
  }
});

test('every variant renders at least one hand-drawn path', () => {
  for (const v of VARIANTS) {
    assert.match(svgOf(`Wireframe\n  Skeleton ${v}`), /<path/, `${v} should draw a path`);
  }
});

test('text variant draws muted filler lines with no hatch tint', () => {
  // text -> ghosted copy: muted strokes (#9aa7b2), and NOT the gray hatch fill.
  const svg = svgOf('Wireframe\n  Skeleton text 120px 48px');
  assert.match(svg, /stroke="#9aa7b2"/);
  assert.doesNotMatch(svg, /stroke="#c4c4c4"/);
});

test('taller text Skeleton draws more filler lines', () => {
  // Filler line count scales with the box height, so a taller box has more lines
  // (more muted strokes) than a short one.
  const lines = (src) => (svgOf(src).match(/stroke="#9aa7b2"/g) || []).length;
  const short = lines('Wireframe\n  Skeleton text 120px 16px');
  const tall = lines('Wireframe\n  Skeleton text 120px 64px');
  assert.ok(tall > short, `tall (${tall}) should draw more filler lines than short (${short})`);
});

test('rectangular and rounded draw the gray hatch tint; text does not', () => {
  assert.match(svgOf('Wireframe\n  Skeleton rectangular'), /stroke="#c4c4c4"/);
  assert.match(svgOf('Wireframe\n  Skeleton rounded'), /stroke="#c4c4c4"/);
  assert.doesNotMatch(svgOf('Wireframe\n  Skeleton text'), /stroke="#c4c4c4"/);
});

test('rounded is rendered distinctly from rectangular (denser cross-hatch fill)', () => {
  // Same box, different chrome: rounded fills with a heavier cross-hatch, so its
  // SVG carries strictly more path data than the single-direction rectangular tint.
  const rect = svgOf('Wireframe\n  Skeleton rectangular 120px 40px');
  const rounded = svgOf('Wireframe\n  Skeleton rounded 120px 40px');
  assert.notEqual(rounded, rect, 'rounded and rectangular should not render identically');
  assert.ok(rounded.length > rect.length, `rounded (${rounded.length}) should be denser than rectangular (${rect.length})`);
});

test('circular draws the hatch tint inside an ellipse border', () => {
  // Circular emits the gray tint plus an ellipse; render differs from the
  // rectangular box of the same dimensions.
  const circ = svgOf('Wireframe\n  Skeleton circular 60px 60px');
  assert.match(circ, /stroke="#c4c4c4"/);
  const rect = svgOf('Wireframe\n  Skeleton rectangular 60px 60px');
  assert.notEqual(circ, rect, 'circular and rectangular should not render identically');
});

test('a to= link wraps the Skeleton in an anchor (facade, universal prop)', () => {
  const svg = svgOf('Wireframe\n  Skeleton text to=#next');
  assert.match(svg, /<a /);
});
