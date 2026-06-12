// @ts-check
/**
 * draw.js primitives -- the `backgroundHatch` OPT-IN opacity contract (CONVENTION
 * s.8 / Task 1). A tinted surface is made opaque ON DEMAND: callers whose hatch
 * IS the element's own surface ((A): AppBar, contained Button, filled Chip/
 * TextField, the switch track, a filled/standard Alert) pass `base:true` to lay a
 * solid paper base under the hashes; callers using the hatch as a translucent
 * highlight/marker over content behind it ((B): selected rows, a partial progress
 * run, the dark Snackbar, a Skeleton) omit it and stay see-through. These tests
 * pin that contract at the helper level (it has many callers; one home for the
 * rules).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { backgroundHatch, rpill, surface, COLORS, PALETTES, setTheme } from '../src/draw.js';

const BOX = { x: 10, y: 20, w: 100, h: 40 };

/** All `<path fill="..." stroke="none">` (a SOLID fill, our opaque base) in `svg`. */
const solidFills = (svg) => [...svg.matchAll(/<path d="[^"]*" fill="(#[0-9a-f]{6})" stroke="none"/g)].map((m) => m[1]);

test('base defaults OFF: a plain backgroundHatch lays NO solid base, only hashes', () => {
  const svg = backgroundHatch(BOX);
  assert.equal(solidFills(svg).length, 0, 'no solid fill without base:true (B callers stay see-through)');
  assert.match(svg, new RegExp(`stroke="${COLORS.hatch}"`), 'the gray hashes are still drawn');
});

test('omitting base is BYTE-IDENTICAL to base:false -- the (B) regression guard', () => {
  // A (B) caller (no base) must emit exactly the hatch pass alone, unchanged from
  // the pre-opt-in single-pass output. Proven by: default === explicit base:false,
  // and the result is pure hashes (no solid base path) in either theme.
  for (const theme of ['light', 'dark']) {
    try {
      setTheme(theme);
      const omitted = backgroundHatch(BOX, 'crosshatch', true);
      const explicitFalse = backgroundHatch(BOX, 'crosshatch', true, { base: false });
      assert.equal(omitted, explicitFalse, `[${theme}] omitting base must equal base:false byte-for-byte`);
      assert.equal(solidFills(omitted).length, 0, `[${theme}] a (B) tint adds no solid base`);
    } finally {
      setTheme('light');
    }
  }
});

test('base:true lays a SOLID paper base under the hashes (the opacity opt-in)', () => {
  const svg = backgroundHatch(BOX, 'hatch', false, { base: true });
  assert.ok(solidFills(svg).includes(COLORS.paper), 'base:true draws an opaque COLORS.paper base');
  assert.match(svg, new RegExp(`stroke="${COLORS.hatch}"`), 'the hashes still ride on top');
  assert.equal(solidFills(svg).filter((c) => c === COLORS.paper).length, 1, 'exactly one base');
});

test('the base is BORDERLESS (stroke none) so the element can draw its own border', () => {
  const svg = backgroundHatch(BOX, 'hatch', false, { base: true });
  assert.doesNotMatch(svg, new RegExp(`fill="${COLORS.paper}" stroke="(?!none)`),
    'the paper base must not carry its own stroke');
});

test('opts.fill recolors the HASHES only -- the base stays paper, never the tint color', () => {
  // A disabled (A) tint = paper base + muted hashes; still opaque, still not a block.
  const svg = backgroundHatch(BOX, 'hatch', false, { base: true, fill: COLORS.muted });
  assert.ok(solidFills(svg).includes(COLORS.paper), 'base is paper, independent of opts.fill');
  assert.ok(!solidFills(svg).includes(COLORS.muted), 'the tint color is hashes (stroke), not a solid base fill');
  assert.match(svg, new RegExp(`stroke="${COLORS.muted}"`), 'muted shows as hatch strokes');
});

test('base:true draws the base in the SAME shape the hatch uses (a pill base, not a rect)', () => {
  // Load-bearing for curved chrome (Control's switch pill, Skeleton's ellipse): a
  // rect base under a pill outline would poke past the rounded ends. Prove the
  // base path equals the dedicated pill primitive and differs from the rect one.
  const fillOpts = { fill: COLORS.paper, fillStyle: 'solid', stroke: 'none', roughness: 0.6 };
  const pillBase = rpill(BOX.x, BOX.y, BOX.w, BOX.h, fillOpts).match(/<path d="(M[^"]*)"/)[1];
  const rectBase = surface(BOX, fillOpts).match(/<path d="(M[^"]*)"/)[1];
  const base = backgroundHatch(BOX, 'hatch', false, { base: true, shape: 'pill' })
    .match(/<path d="(M[^"]*)" fill="[^"]*" stroke="none"/)[1];
  assert.equal(base, pillBase, 'the pill tint must lay a pill base (byte-identical to rpill)');
  assert.notEqual(base, rectBase, 'the pill base must NOT be a plain rectangle');
});

test('every shape variant gets a base when base:true (rect / pill / ellipse / numeric radius)', () => {
  for (const shape of [undefined, 'pill', 'ellipse', 8]) {
    const svg = backgroundHatch(BOX, 'hatch', false, { base: true, shape });
    assert.ok(solidFills(svg).includes(COLORS.paper),
      `shape=${String(shape)} must lay an opaque base when base:true`);
  }
});

test('the base follows the theme (no hard-coded white): dark renders the dark paper, leaks no light hex', () => {
  try {
    setTheme('dark');
    const svg = backgroundHatch(BOX, 'hatch', false, { base: true });
    assert.ok(solidFills(svg).includes(PALETTES.dark.paper), 'dark base uses the dark paper hex');
    assert.ok(!svg.includes(PALETTES.light.paper), 'the light paper hex must not leak into a dark render');
  } finally {
    setTheme('light');
  }
});

test('a PARTIAL base:true tint paints its base over EXACTLY the sub-box given (no white-out beyond it)', () => {
  // When an (A) caller tints only part of a box, it passes the SUB-box; the base
  // must span that sub-box only. Its x-extent must not exceed the box handed in.
  const run = { x: 0, y: 0, w: 30, h: 10 };
  const svg = backgroundHatch(run, 'crosshatch', true, { base: true });
  const basePath = svg.match(/<path d="(M[^"]*)" fill="#[0-9a-f]{6}" stroke="none"/);
  assert.ok(basePath, 'a base path is drawn for the partial tint');
  const xs = [...basePath[1].matchAll(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g)].map((m) => Number(m[1]));
  const maxX = Math.max(...xs);
  assert.ok(maxX <= run.x + run.w + 2, `base right edge ${maxX} must stay within the ${run.w}px run`);
});
