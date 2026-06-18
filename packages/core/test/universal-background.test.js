// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../src/index.js';

/**
 * Universal background (SPEC s.8). `background` (hatch|crosshatch|none),
 * `denseBackground`, and `opaque` are injected onto EVERY element by registry.js;
 * the render facade paints `backgroundHatch` behind any node from its
 * `background(node)` strategy, or the default opt-in for elements that don't define
 * one. draw.js COLORS: paper `#ffffff` is the opaque base; hatch `#c4c4c4` the hash
 * strokes. The opaque base is a borderless `<path fill="#ffffff" stroke="none">`;
 * the frame backdrop is a `<rect>`, so the path regex never matches it.
 */
const wrap = (line) => `Wireframe w=400 h=200\n  ${line}`;
const hasHatch = (svg) => /stroke="#c4c4c4"/.test(svg);
const hasBase = (svg) => /<path[^>]*fill="#ffffff"[^>]*stroke="none"/.test(svg);

test('the universal props resolve cleanly on an element that never declared them', () => {
  for (const src of [
    'Typography "X" background=hatch',
    'Typography "X" background=crosshatch denseBackground',
    'Typography "X" opaque',
    'Divider opaque=false',
  ]) {
    assert.deepEqual(parse(wrap(src)).diagnostics, [], `${src} should resolve clean`);
  }
});

test('a plain element opts into a TRANSLUCENT hatch (base off by default)', () => {
  const svg = render(wrap('Typography "X" background=hatch')).svg;
  assert.ok(hasHatch(svg), 'background=hatch draws the hash strokes');
  assert.ok(!hasBase(svg), 'a plain element lays no opaque paper base unless opaque is set');
});

test('opaque adds the solid paper knockout under the hatch', () => {
  const svg = render(wrap('Typography "X" background=hatch opaque')).svg;
  assert.ok(hasHatch(svg), 'hatch strokes present');
  assert.ok(hasBase(svg), 'opaque lays the solid paper base under the hashes');
});

test('opaque alone (no pattern) is a plain opaque block -- base, no hashes', () => {
  const svg = render(wrap('Typography "X" opaque')).svg;
  assert.ok(hasBase(svg), 'opaque draws the solid paper base');
  assert.ok(!hasHatch(svg), 'with no pattern there are no hash strokes');
});

test('a bare element draws no backdrop at all (unchanged): no base, no hatch', () => {
  const svg = render(wrap('Typography "X"')).svg;
  assert.ok(!hasBase(svg) && !hasHatch(svg), 'a plain element with nothing set stays clean of backdrop paths');
});

test('denseBackground packs the hash lines closer than the standard gap', () => {
  const moves = (svg) => (svg.match(/M/g) || []).length; // each hatch line starts with a move
  const std = render(wrap('Typography "X" background=hatch opaque')).svg;
  const dense = render(wrap('Typography "X" background=hatch denseBackground opaque')).svg;
  assert.ok(moves(dense) > moves(std), 'a denser hatch emits more line segments');
});

test('Box and Stack are opaque by default; opaque=false makes them see-through', () => {
  assert.ok(hasBase(render(wrap('Box\n    Typography "X"')).svg), 'a bare Box lays an opaque base');
  assert.ok(hasBase(render(wrap('Stack\n    Typography "X"')).svg), 'a bare Stack lays an opaque base');
  assert.ok(!hasBase(render(wrap('Box opaque=false\n    Typography "X"')).svg), 'Box opaque=false is transparent');
  assert.ok(!hasBase(render(wrap('Stack opaque=false\n    Typography "X"')).svg), 'Stack opaque=false is transparent');
});

test('background is keyed everywhere; an element that opts in keeps its keyless slot (Button)', () => {
  const doc = parse(wrap('Button "Go" contained crosshatch'));
  assert.deepEqual(doc.diagnostics, [], 'Button keeps its keyless background enum slot');
  assert.equal(doc.frames[0].children[0].props.background, 'crosshatch');
});

test('opaque overrides an element default: a contained Button can go translucent', () => {
  // The contained variant defaults to an opaque hatch; opaque=false drops the base.
  const solid = render(wrap('Button "Go" contained')).svg;
  const translucent = render(wrap('Button "Go" contained opaque=false')).svg;
  assert.ok(hasBase(solid), 'a contained Button is opaque by default');
  assert.ok(!hasBase(translucent), 'opaque=false removes the paper base from a contained Button');
  assert.ok(hasHatch(translucent), 'the hatch hashes still draw, just see-through');
});

test('a Wireframe background=#id frame ref is not mistaken for a hatch backdrop', () => {
  const doc = 'Wireframe #a w=200 h=100\n  Typography "A"\n\nWireframe w=200 h=100 background=#a\n  Typography "B"';
  const { svg, diagnostics } = render(doc);
  assert.deepEqual(diagnostics, [], 'frame composition resolves clean');
  assert.ok(!hasHatch(svg), 'the frame ref drives composition, not a hatch tint');
});
