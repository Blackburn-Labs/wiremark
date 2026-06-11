// @ts-check
/**
 * `theme` render option (tasks/THEME.md): light output stays byte-identical
 * under any theme value except 'dark'; dark swaps the whole palette; the swap
 * is scoped per call (finally-restored). Light hexes are pinned by the
 * existing element tests -- this file owns only the theme mechanism.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render } from '../src/index.js';
import { COLORS, PALETTES, setTheme } from '../src/draw.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');
/** @param {string} name */
const fixture = (name) => readFileSync(join(FIXTURES, `${name}.wiremark`), 'utf8');

const FIXTURE_NAMES = ['hello-world', 'dashboard', 'library', 'multi-frame'];

test('theme: omitted, explicit light, and unknown values render byte-identically', () => {
  for (const name of FIXTURE_NAMES) {
    const src = fixture(name);
    const base = render(src).svg;
    assert.equal(render(src, { theme: 'light' }).svg, base, `${name}: explicit light`);
    assert.equal(render(src, { theme: 'banana' }).svg, base, `${name}: unknown string -> light`);
    assert.equal(render(src, { theme: { ink: '#ff0000' } }).svg, base, `${name}: non-string -> light`);
  }
});

test('theme: dark differs, paints the dark paper, and leaks no light-only hex', () => {
  // Computed from PALETTES so dark-hex tuning can't desynchronize this test.
  // Exact 7-char substrings, NOT a generic hex regex: fixture frame ids leak
  // into the SVG and #feedback contains the valid-hex prefix #feedba.
  const lightOnly = Object.values(PALETTES.light)
    .filter((hex) => !Object.values(PALETTES.dark).includes(hex));
  assert.ok(lightOnly.length > 0, 'palettes fully overlap; the absence check below would be vacuous');

  for (const name of FIXTURE_NAMES) {
    const src = fixture(name);
    const light = render(src).svg;
    const dark = render(src, { theme: 'dark' }).svg;
    assert.notEqual(dark, light, `${name}: dark must differ from light`);
    assert.ok(dark.includes(PALETTES.dark.paper), `${name}: dark paper hex present`);
    for (const hex of lightOnly) {
      assert.ok(!dark.includes(hex), `${name}: light-only ${hex} leaked into the dark svg`);
    }
  }
});

test('theme: after a dark render, COLORS and subsequent renders are light again', () => {
  const src = fixture('dashboard');
  const before = render(src).svg;
  render(src, { theme: 'dark' });
  assert.deepEqual({ ...COLORS }, { ...PALETTES.light }, 'COLORS restored to light');
  assert.equal(render(src).svg, before, 'next themeless render is byte-identical');
});

test('setTheme: inherited-key and coercing non-string names mean light, never a stale palette', () => {
  try {
    setTheme('dark');
    assert.deepEqual({ ...COLORS }, { ...PALETTES.dark });
    setTheme('constructor'); // inherited Object.prototype key -- must mean light, not no-op
    assert.deepEqual({ ...COLORS }, { ...PALETTES.light });
    setTheme('dark');
    setTheme(['dark']); // non-string that COERCES to a real key -- still light
    assert.deepEqual({ ...COLORS }, { ...PALETTES.light });
  } finally {
    setTheme('light');
  }
});

test('theme: TextField error inks with the themed error role', () => {
  const src = 'Wireframe\n  TextField "Email" error=true helperText="Required"';
  const light = render(src).svg;
  const dark = render(src, { theme: 'dark' }).svg;
  assert.match(light, /stroke="#c2473d"/, 'light error hex is frozen public output');
  assert.ok(dark.includes(PALETTES.dark.error), 'dark renders the dark error hex');
  assert.ok(!dark.includes(PALETTES.light.error), 'light error hex absent from dark');
});
