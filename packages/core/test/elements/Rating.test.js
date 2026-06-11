// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];

/**
 * How many star glyphs are drawn FILLED in the rendered SVG. A filled star adds an
 * inner "ink" star stroked at width 1.4 (10 segments per star); hollow stars use
 * the muted 1.0-width outline only. The render carries exactly one other 1.4-width
 * path as constant chrome, so `(count - 1) / 10` is the filled-star tally and is
 * stable regardless of rough.js wobble.
 * @param {string} src @returns {number}
 */
const filledStars = (src) => {
  const svg = render(src).svg;
  const paths = (svg.match(/stroke-width="1\.4"/g) || []).length;
  return (paths - 1) / 10;
};

/**
 * Total star GLYPHS drawn, recovered from the leaf's intrinsic box width. Each
 * glyph is STAR=18px wide with a GUTTER=3px between adjacent stars, so the box is
 * `n*18 + (n-1)*3 = 21n - 3`; inverting gives the glyph count. Rating is block:false
 * so the box stays at its intrinsic width (no parent stretch). Mirrors the element's
 * own geometry without re-importing its private constants.
 * @param {string} src @returns {number}
 */
const glyphCount = (src) => (firstBox(src).w + 3) / 21;

test('Rating parses cleanly as an inputs leaf with no diagnostics', () => {
  const doc = parse('Wireframe\n  Rating');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].component, 'Rating');
});

test('the resolver injects no defaults; props are absent until set', () => {
  // Defaults (value=0, max=5, icon=Star, emptyIcon=StarBorder) live in the
  // strategy, not the resolved node -- mirrors Chip/Slider behavior. The icon
  // defaults DO resolve into the node.icons annotation (tasks/ICONS.md ss.3),
  // but props stay untouched -- and Rating's render never reads the artwork.
  const r = firstChild('Wireframe\n  Rating');
  assert.equal(r.props.value, undefined);
  assert.equal(r.props.max, undefined);
  assert.equal(r.props.icon, undefined);
  assert.equal(r.props.emptyIcon, undefined);
});

test('a bare number is the keyless `value` slot (MUST-FIX)', () => {
  const r = firstChild('Wireframe\n  Rating 4');
  assert.equal(r.props.value, 4);
  assert.equal(typeof r.props.value, 'number');
});

test('keyless `value` accepts zero, negative, and fractional numbers', () => {
  assert.equal(firstChild('Wireframe\n  Rating 0').props.value, 0);
  assert.equal(firstChild('Wireframe\n  Rating -2').props.value, -2);
  assert.equal(firstChild('Wireframe\n  Rating 3.6').props.value, 3.6);
});

test('value can be set with the keyed spelling', () => {
  assert.equal(firstChild('Wireframe\n  Rating value=3').props.value, 3);
});

test('value accepts each alias (n / v / val)', () => {
  for (const alias of ['n', 'v', 'val']) {
    const doc = parse(`Wireframe\n  Rating ${alias}=2`);
    assert.deepEqual(doc.diagnostics, [], `Rating ${alias}=2 should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.value, 2, `${alias}= should map to value`);
  }
});

test('max is a keyed numeric prop', () => {
  assert.equal(firstChild('Wireframe\n  Rating max=4').props.max, 4);
});

test('icon and emptyIcon are keyed icon props (bare or quoted)', () => {
  // type:'icon' parses like a string but accepts BARE names too (tasks/ICONS.md
  // ss.3) -- `icon=Favorite` and `icon="Favorite"` are the same prop value.
  const quoted = firstChild('Wireframe\n  Rating icon="Favorite" emptyIcon="FavoriteBorder"');
  assert.equal(quoted.props.icon, 'Favorite');
  assert.equal(quoted.props.emptyIcon, 'FavoriteBorder');
  const bare = firstChild('Wireframe\n  Rating icon=Favorite emptyIcon=FavoriteBorder');
  assert.equal(bare.props.icon, 'Favorite');
  assert.equal(bare.props.emptyIcon, 'FavoriteBorder');
});

test('two bare numbers is an error (value set more than once)', () => {
  assert.throws(() => parse('Wireframe\n  Rating 3 4'), /value.*more than once/);
});

test('a bare number plus keyed value= is an error', () => {
  assert.throws(() => parse('Wireframe\n  Rating 3 value=4'), /more than once/);
});

test('a bare number plus an alias is an error (same canonical prop)', () => {
  assert.throws(() => parse('Wireframe\n  Rating 3 n=4'), /more than once/);
});

test('a quoted literal is rejected (Rating takes no text)', () => {
  assert.throws(() => parse('Wireframe\n  Rating "label"'), /does not take a text literal/);
});

test('max= must be numeric', () => {
  assert.throws(() => parse('Wireframe\n  Rating max=lots'), /expects a number/);
});

test('an unknown bare token is an error', () => {
  assert.throws(() => parse('Wireframe\n  Rating sparkly'), /unexpected token/);
});

test('Rating lays out to a finite, positive box', () => {
  const box = firstBox('Wireframe\n  Rating 3');
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w finite/positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h finite/positive, got ${box.h}`);
});

test('the footprint grows with max (more glyphs => wider box)', () => {
  const few = firstBox('Wireframe\n  Rating max=3').w;
  const many = firstBox('Wireframe\n  Rating max=8').w;
  assert.ok(many > few, `max=8 (${many}) should be wider than max=3 (${few})`);
});

test('a bare Rating draws exactly 5 star glyphs (architect-ruled default)', () => {
  // The spec slice lists max default 100, but the strategy falls back to
  // DEFAULT_MAX=5 (a sanctioned deviation -- 100 stars are unreadable). The
  // resolver injects no default, so this fallback is what actually renders.
  assert.equal(glyphCount('Wireframe\n  Rating'), 5);
});

test('max= sets the glyph count exactly (rounded)', () => {
  assert.equal(glyphCount('Wireframe\n  Rating max=3'), 3);
  assert.equal(glyphCount('Wireframe\n  Rating max=8'), 8);
});

test('a large max is clamped to MAX_GLYPHS=12 so layout cannot blow up', () => {
  assert.equal(glyphCount('Wireframe\n  Rating max=99'), 12);
});

test('value fills exactly that many stars (real render-level discrimination)', () => {
  assert.equal(filledStars('Wireframe\n  Rating 0'), 0);
  assert.equal(filledStars('Wireframe\n  Rating 2'), 2);
  assert.equal(filledStars('Wireframe\n  Rating 5'), 5);
});

test('fractional value rounds to the nearest filled-star count', () => {
  // 3.6 rounds up to 4 filled; 3.2 rounds down to 3.
  assert.equal(filledStars('Wireframe\n  Rating 3.6'), 4);
  assert.equal(filledStars('Wireframe\n  Rating 3.2'), 3);
});

test('value is clamped to [0, glyphs] (above the star count pins to full)', () => {
  // Only 3 glyphs are drawn (max=3); value=9 fills all 3, none beyond.
  assert.equal(filledStars('Wireframe\n  Rating value=9 max=3'), 3);
});

test('a negative value fills no stars (clamped at 0)', () => {
  assert.equal(filledStars('Wireframe\n  Rating -2'), 0);
});

// drawIcon's clean <g> -- translate AND scale -- distinguishable from the frame
// wrapper's plain translate-only <g> (render.js). It appears in Rating output
// ONLY when icon=/emptyIcon= is explicitly set (icon-mode); the default row is
// hand-drawn stars.
const CLEAN_ICON_G = /<g transform="translate\([^"]+\) scale\([^"]+\)"/;
/** The built-in Favorite (heart) body's leading path fragment. */
const FAVORITE_D = /m12 21\.35/;

test('a default Rating keeps its hand-drawn stars (no icon artwork)', () => {
  // The PropDef defaults (Star/StarBorder) are annotated by the resolver but
  // deliberately NOT drawn: the sketchy star is the wireframe-fidelity default.
  const { svg, diagnostics } = render('Wireframe\n  Rating 3');
  assert.deepEqual(diagnostics, []);
  assert.equal(filledStars('Wireframe\n  Rating 3'), 3);
  assert.doesNotMatch(svg, CLEAN_ICON_G);
});

test('an explicit known icon= swaps the row to that artwork (ink filled, muted empty)', () => {
  const { svg, diagnostics } = render('Wireframe\n  Rating 2 max=3 icon=Favorite');
  assert.deepEqual(diagnostics, []);
  assert.match(svg, CLEAN_ICON_G, 'icon-mode draws clean vector cells');
  assert.match(svg, FAVORITE_D, 'the Favorite artwork should be present');
  assert.equal((svg.match(/m12 21\.35/g) ?? []).length, 3, 'every cell draws the icon');
  assert.match(svg, /fill="#22303f"/, 'filled cells draw in ink');
  assert.match(svg, /fill="#9aa7b2"/, 'empty cells draw muted');
  assert.equal(filledStars('Wireframe\n  Rating 2 max=3 icon=Favorite'), 0, 'no hand-drawn stars in icon-mode');
});

test('an explicit emptyIcon= pairs with the icon artwork for empty cells', () => {
  const { svg, diagnostics } = render('Wireframe\n  Rating 1 max=2 icon=Favorite emptyIcon=FavoriteBorder');
  assert.deepEqual(diagnostics, []);
  assert.match(svg, FAVORITE_D, 'filled cell draws Favorite');
  assert.match(svg, /M16\.5 3c-1\.74/, 'empty cell draws FavoriteBorder');
});

test('an unknown icon name warns and icon-mode falls back to placeholder cells', () => {
  const { svg, diagnostics } = render('Wireframe\n  Rating 3 icon=NoSuchIconXyz');
  assert.ok(
    diagnostics.some((d) => /unknown icon "NoSuchIconXyz"/.test(d.message)),
    `expected an unknown-icon warning, got ${JSON.stringify(diagnostics)}`,
  );
  // Unresolved icon-mode cells degrade to the shared placeholder glyph.
  assert.match(svg, /stroke="#9aa7b2"/);
  assert.doesNotMatch(svg, CLEAN_ICON_G);
});

test('Rating renders hollow stars in the muted ink', () => {
  const svg = render('Wireframe\n  Rating 0 max=3').svg;
  assert.match(svg, /<path/);
  assert.match(svg, /stroke="#9aa7b2"/, 'hollow star outlines should use the muted stroke');
});

test('filled stars add ink strokes that empty ratings lack', () => {
  const empty = render('Wireframe\n  Rating 0 max=5').svg;
  const full = render('Wireframe\n  Rating 5 max=5').svg;
  const inkOf = (svg) => (svg.match(/stroke-width="1\.4"/g) || []).length;
  assert.ok(inkOf(full) > inkOf(empty), 'a full rating should carry more ink strokes than an empty one');
});

test('a Rating carrying to= is wrapped in a link by the facade', () => {
  const svg = render('Wireframe\n  Rating 3 to=#next').svg;
  assert.match(svg, /<a class="wm-link" href="#next">/);
});

test('href= is accepted as the to= alias (universal prop)', () => {
  const svg = render('Wireframe\n  Rating 3 href=#next').svg;
  assert.match(svg, /<a class="wm-link" href="#next">/);
});
