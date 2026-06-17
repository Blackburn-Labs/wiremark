// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';
import {
  seriesOf, variantOf, barFrac, humpFrac, lineFrac, linePts, sliceAngles,
} from '../../src/elements/Chart.js';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];
/** Rendered SVG for `src`. */
const svgOf = (src) => render(src).svg;
/** Count of `<path` elements (a proxy for distinct drawn marks). */
const pathCount = (svg) => (svg.match(/<path\b/g) ?? []).length;
/** Count of SOLID-accent fills -- one per bar/column/histogram bar (and per area strip). */
const accentFills = (svg) => (svg.match(/fill="#cfe0ee"/g) ?? []).length;

// --- parse: keyless wiring + props ---------------------------------------------

test('Chart parses cleanly as a content leaf with no diagnostics', () => {
  const doc = parse('Wireframe\n  Chart');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].component, 'Chart');
});

test('the resolver injects no defaults; props are absent until set', () => {
  // Defaults (variant=bar, series per-variant, axes/labels=true, legend=false) live
  // in the strategy, not the resolved node -- the Calendar/Rating convention.
  const c = firstChild('Wireframe\n  Chart');
  for (const p of ['variant', 'title', 'series', 'legend', 'axes', 'labels']) {
    assert.equal(c.props[p], undefined, `props.${p} should be absent`);
  }
});

test('a quoted literal is the keyless `title` slot', () => {
  assert.equal(firstChild('Wireframe\n  Chart "Revenue"').props.title, 'Revenue');
  assert.equal(firstChild('Wireframe\n  Chart line "Q3 traffic"').props.title, 'Q3 traffic');
});

test('`label=` is an alias for title', () => {
  const doc = parse('Wireframe\n  Chart label="Sales"');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.title, 'Sales');
});

test('a bare enum token is the keyless `variant` slot', () => {
  for (const v of ['bar', 'column', 'line', 'area', 'histogram', 'pie', 'donut']) {
    const c = firstChild(`Wireframe\n  Chart ${v}`);
    assert.equal(c.props.variant, v, `${v} should set variant`);
  }
});

test('variant is also keyed, with type/kind aliases', () => {
  assert.equal(firstChild('Wireframe\n  Chart variant=pie').props.variant, 'pie');
  for (const alias of ['type', 'kind']) {
    const doc = parse(`Wireframe\n  Chart ${alias}=donut`);
    assert.deepEqual(doc.diagnostics, [], `Chart ${alias}=donut should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.variant, 'donut', `${alias}= should map to variant`);
  }
});

test('series is KEYED only; a bare number is a sizing token, not series', () => {
  // `series` has no keyless number slot (a bare number is sizing here, exactly like
  // Box/Skeleton/Calendar.value). `Chart 6` therefore sets a flex sizing token.
  const c = firstChild('Wireframe\n  Chart 6');
  assert.equal(c.props.series, undefined, 'bare 6 must not set series');
  assert.deepEqual(c.size, { w: { unit: 'flex', value: 6 }, h: undefined });
});

test('series is set with the keyed spelling and each alias', () => {
  assert.equal(firstChild('Wireframe\n  Chart series=8').props.series, 8);
  for (const alias of ['bars', 'slices', 'points', 'n']) {
    const doc = parse(`Wireframe\n  Chart ${alias}=7`);
    assert.deepEqual(doc.diagnostics, [], `Chart ${alias}=7 should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.series, 7, `${alias}= should map to series`);
  }
});

test('legend / axes / labels are keyless boolean flags (and keyed)', () => {
  const c = firstChild('Wireframe\n  Chart legend axes=false labels=false');
  assert.equal(c.props.legend, true);
  assert.equal(c.props.axes, false);
  assert.equal(c.props.labels, false);
  // keyed grid= alias for axes
  assert.equal(firstChild('Wireframe\n  Chart grid=false').props.axes, false);
});

test('an unquoted non-enum token is an error (title must be quoted)', () => {
  assert.throws(() => parse('Wireframe\n  Chart Revenue'), /unexpected token/);
});

test('an unknown bare token is an error', () => {
  assert.throws(() => parse('Wireframe\n  Chart sparkly'), /unexpected token/);
});

test('a bad enum value for variant= is rejected', () => {
  assert.throws(() => parse('Wireframe\n  Chart variant=spiral'), /not valid for "variant="/);
});

test('series= must be numeric', () => {
  assert.throws(() => parse('Wireframe\n  Chart series=lots'), /expects a number/);
});

// --- deterministic logic (pure helpers; no clock, no randomness) ---------------

test('seriesOf applies the per-variant default and clamps to [2, 12]', () => {
  assert.equal(seriesOf({ props: {} }), 5, 'cartesian default is 5');
  assert.equal(seriesOf({ props: { variant: 'pie' } }), 4, 'pie default is 4');
  assert.equal(seriesOf({ props: { variant: 'donut' } }), 4, 'donut default is 4');
  assert.equal(seriesOf({ props: { series: 7 } }), 7, 'an in-range count passes through');
  assert.equal(seriesOf({ props: { series: 6.7 } }), 7, 'a fractional count rounds');
  assert.equal(seriesOf({ props: { series: 99 } }), 12, 'a large count clamps to 12');
  assert.equal(seriesOf({ props: { series: 1 } }), 2, 'fewer than 2 clamps to 2');
});

test('variantOf defaults to bar and rejects unknown values', () => {
  assert.equal(variantOf({ props: {} }), 'bar');
  assert.equal(variantOf({ props: { variant: 'pie' } }), 'pie');
  assert.equal(variantOf({ props: { variant: 'spiral' } }), 'bar', 'unknown -> bar');
});

test('barFrac is a deterministic per-index fraction clamped to [0.15, 1]', () => {
  const approx = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ~= ${b}`);
  approx(barFrac(0, 5), 0.35 + 11 / 80);
  approx(barFrac(1, 5), 0.95);
  approx(barFrac(2, 5), 0.75);
  for (let i = 0; i < 12; i++) {
    const v = barFrac(i, 12);
    assert.ok(v >= 0.15 && v <= 1, `barFrac(${i}) in range, got ${v}`);
  }
  // Pure: same index -> same value across calls.
  assert.equal(barFrac(3, 5), barFrac(3, 5));
});

test('humpFrac is a symmetric bump peaking at the center index', () => {
  assert.equal(humpFrac(2, 5), 1, 'the center bin peaks at 1');
  assert.ok(Math.abs(humpFrac(0, 5) - humpFrac(4, 5)) < 1e-9, 'the bump is symmetric');
  assert.ok(humpFrac(2, 5) > humpFrac(1, 5), 'rises toward the center');
  assert.ok(humpFrac(1, 5) > humpFrac(0, 5), 'falls toward the ends');
  for (let i = 0; i < 9; i++) {
    const v = humpFrac(i, 9);
    assert.ok(v >= 0.14 && v <= 1, `humpFrac(${i}) in range, got ${v}`);
  }
});

test('lineFrac is a deterministic walk clamped to [0.1, 0.95]', () => {
  const approx = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ~= ${b}`);
  approx(lineFrac(0, 5), 0.35 + 13 / 70);
  approx(lineFrac(3, 5), 0.95);
  for (let i = 0; i < 12; i++) {
    const v = lineFrac(i, 12);
    assert.ok(v >= 0.1 && v <= 0.95, `lineFrac(${i}) in range, got ${v}`);
  }
});

test('linePts returns n finite points marching left-to-right across the plot', () => {
  const plot = { x: 10, y: 20, w: 200, h: 100 };
  const pts = linePts(plot, 5);
  assert.equal(pts.length, 5);
  assert.equal(pts[0].x, 10, 'first point at the left edge');
  assert.equal(pts[4].x, 210, 'last point at the right edge');
  for (let i = 0; i < pts.length; i++) {
    assert.ok(Number.isFinite(pts[i].x) && Number.isFinite(pts[i].y), `point ${i} finite`);
    assert.ok(pts[i].y >= plot.y && pts[i].y <= plot.y + plot.h, `point ${i} y in plot`);
    if (i > 0) assert.ok(pts[i].x > pts[i - 1].x, 'x strictly increases');
  }
});

test('sliceAngles divides the disc into n evenly spaced spokes', () => {
  const a = sliceAngles(4);
  assert.equal(a.length, 4);
  const expected = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  for (let k = 0; k < 4; k++) assert.ok(Math.abs(a[k] - expected[k]) < 1e-9, `spoke ${k}`);
  assert.equal(sliceAngles(6).length, 6);
});

// --- layout: intrinsic + sizing ------------------------------------------------

test('every variant lays out to a finite, positive box', () => {
  for (const v of ['bar', 'column', 'line', 'area', 'histogram', 'pie', 'donut']) {
    const box = firstBox(`Wireframe\n  Chart ${v}`);
    assert.ok(Number.isFinite(box.w) && box.w > 0, `${v} w finite/positive, got ${box.w}`);
    assert.ok(Number.isFinite(box.h) && box.h > 0, `${v} h finite/positive, got ${box.h}`);
  }
});

test('cartesian variants are landscape; pie/donut are square', () => {
  const bar = firstBox('Wireframe\n  Chart bar');
  assert.ok(bar.w > bar.h, 'a bar chart is wider than it is tall');
  const pie = firstBox('Wireframe\n  Chart pie');
  assert.ok(Math.abs(pie.w - pie.h) <= 1, `a pie is square, got ${pie.w}x${pie.h}`);
});

test('positional px tokens pin the exact box (w then h)', () => {
  const box = firstBox('Wireframe\n  Chart 400px 150px');
  assert.equal(Math.round(box.w), 400);
  assert.equal(Math.round(box.h), 150);
});

test('a pinned width drives a proportional height (preserves the natural aspect)', () => {
  const nat = firstBox('Wireframe\n  Chart');
  const box = firstBox('Wireframe\n  Chart 240px');
  assert.equal(Math.round(box.w), 240);
  assert.ok(Math.abs(box.h / box.w - nat.h / nat.w) < 0.02, `aspect should match natural, got ${box.w}x${box.h}`);
});

test('w=100% fills the column and scales the height proportionally', () => {
  const nat = firstBox('Wireframe\n  Chart');
  const box = layout(parse('Wireframe\n  Stack column 240px\n    Chart 100%'))[0].root.children[0].children[0];
  assert.equal(Math.round(box.w), 240);
  assert.ok(Math.abs(box.h - 240 * (nat.h / nat.w)) <= 2, `height should follow width proportionally, got ${box.h}`);
});

test('a pie fills a sidebar column as a square', () => {
  const box = layout(parse('Wireframe\n  Stack column 240px\n    Chart pie 100%'))[0].root.children[0].children[0];
  assert.equal(Math.round(box.w), 240);
  assert.ok(Math.abs(box.h - 240) <= 1, `pie stays square at the column width, got ${box.h}`);
});

// --- render --------------------------------------------------------------------

test('a bare Chart renders a clean bar chart with no diagnostics', () => {
  const { svg, diagnostics } = render('Wireframe\n  Chart');
  assert.deepEqual(diagnostics, []);
  assert.match(svg, /<path /);
  assert.equal(accentFills(svg), 5, 'five bars by default');
});

test('the title is the one real glyph; drawn only when set', () => {
  assert.ok(svgOf('Wireframe\n  Chart line "Revenue"').includes('Revenue'), 'the title is drawn');
  assert.ok(!svgOf('Wireframe\n  Chart line').includes('Revenue'), 'no title without one');
});

test('bar / column / histogram draw exactly `series` accent bars', () => {
  assert.equal(accentFills(svgOf('Wireframe\n  Chart')), 5);
  assert.equal(accentFills(svgOf('Wireframe\n  Chart series=7')), 7);
  assert.equal(accentFills(svgOf('Wireframe\n  Chart column')), 5);
  assert.equal(accentFills(svgOf('Wireframe\n  Chart histogram series=9')), 9);
});

test('bar and column differ in ORIENTATION, not just bar count', () => {
  // Both draw `series` accent bars, so a count alone can't tell them apart -- a
  // swapped-axis regression would be invisible. Assert the geometry from the accent
  // bar boxes: horizontal bars share a left baseline (minX ~constant) and march down
  // the rows (maxY varies); vertical bars share the bottom baseline (maxY ~constant)
  // and march across the columns (minX varies). A solid-fill rect is an M/L polygon,
  // so the path numbers are clean x,y pairs.
  const spread = (vals) => Math.max(...vals) - Math.min(...vals);
  const barBoxes = (src) =>
    [...svgOf(src).matchAll(/<path d="([^"]+)"[^>]*fill="#cfe0ee"/g)].map((m) => {
      const nums = [...m[1].matchAll(/-?\d+(?:\.\d+)?/g)].map((x) => Number(x[0]));
      const xs = nums.filter((_, i) => i % 2 === 0);
      const ys = nums.filter((_, i) => i % 2 === 1);
      return { minX: Math.min(...xs), maxY: Math.max(...ys) };
    });
  const bar = barBoxes('Wireframe\n  Chart bar axes=false labels=false');
  const col = barBoxes('Wireframe\n  Chart column axes=false labels=false');
  assert.equal(bar.length, 5);
  assert.equal(col.length, 5);
  // horizontal bars: shared left edge, spread down the rows.
  assert.ok(spread(bar.map((b) => b.minX)) < 20, `bars share a left baseline, got ${spread(bar.map((b) => b.minX))}`);
  assert.ok(spread(bar.map((b) => b.maxY)) > 100, 'bars span the plot rows');
  // vertical bars: shared bottom edge, spread across the columns.
  assert.ok(spread(col.map((b) => b.maxY)) < 20, `columns share a bottom baseline, got ${spread(col.map((b) => b.maxY))}`);
  assert.ok(spread(col.map((b) => b.minX)) > 100, 'columns span the plot width');
});

test('line draws no fills; area adds an under-curve accent fill the line lacks', () => {
  assert.equal(accentFills(svgOf('Wireframe\n  Chart line')), 0, 'a polyline carries no accent fill');
  assert.ok(accentFills(svgOf('Wireframe\n  Chart area')) > 5, 'area shades a multi-strip region');
  assert.ok(
    pathCount(svgOf('Wireframe\n  Chart area')) > pathCount(svgOf('Wireframe\n  Chart line')),
    'the area fill adds marks over a bare line',
  );
});

test('pie/donut draw a disc plus `series` spokes; donut adds an inner knockout', () => {
  // Spokes scale with series: more slices -> more drawn marks.
  assert.ok(
    pathCount(svgOf('Wireframe\n  Chart pie series=8')) > pathCount(svgOf('Wireframe\n  Chart pie series=3')),
    'more pie slices draw more spokes',
  );
  // The donut hole is an extra concentric ellipse over the same pie.
  assert.ok(
    pathCount(svgOf('Wireframe\n  Chart donut series=6')) > pathCount(svgOf('Wireframe\n  Chart pie series=6')),
    'a donut adds the inner knockout over a pie',
  );
});

test('the donut knockout is specifically a PAPER-filled inner disc (reads as hollow)', () => {
  // Pin the donut's defining mark, not just "more paths": a stroke-only inner ring
  // (a hole that reads filled, not hollow) would keep pathCount > pie yet fail here.
  // The default render is light, so paper is #ffffff (the page background contributes
  // a constant count to both, so the donut's surplus of exactly one is the knockout).
  const paper = (src) => (svgOf(src).match(/fill="#ffffff"/g) ?? []).length;
  assert.equal(
    paper('Wireframe\n  Chart donut series=6'),
    paper('Wireframe\n  Chart pie series=6') + 1,
    'the donut adds exactly one paper-filled inner knockout over the pie',
  );
});

test('axes toggles the gridlines (the unique 0.6 stroke)', () => {
  const GRID = /stroke-width="0\.6"/;
  assert.match(svgOf('Wireframe\n  Chart'), GRID, 'axes on draws gridlines');
  assert.doesNotMatch(svgOf('Wireframe\n  Chart axes=false'), GRID, 'axes=false drops them');
});

test('axes/labels are ignored by pie/donut (no gridlines)', () => {
  assert.doesNotMatch(svgOf('Wireframe\n  Chart pie'), /stroke-width="0\.6"/, 'pie has no cartesian chrome');
});

test('legend adds swatch + squiggle marks', () => {
  const without = pathCount(svgOf('Wireframe\n  Chart pie series=6'));
  const withLegend = pathCount(svgOf('Wireframe\n  Chart pie series=6 legend'));
  assert.ok(withLegend > without, `legend should add marks (${withLegend} vs ${without})`);
});

test('labels=false drops the squiggle axis labels', () => {
  const withLabels = pathCount(svgOf('Wireframe\n  Chart column'));
  const without = pathCount(svgOf('Wireframe\n  Chart column labels=false'));
  assert.ok(withLabels > without, `labels should add squiggle marks (${withLabels} vs ${without})`);
});

test('labels draw independently of axes (squiggles survive axes=false)', () => {
  // The labels=false test above holds axes ON, so it can't catch a regression that
  // gated label drawing behind `showAxes`. Hold axes OFF and toggle only labels.
  assert.ok(
    pathCount(svgOf('Wireframe\n  Chart column axes=false')) > pathCount(svgOf('Wireframe\n  Chart column axes=false labels=false')),
    'squiggle labels draw even with axes off',
  );
});

test('a bare plot (axes=false labels=false) still draws its bars', () => {
  const { svg, diagnostics } = render('Wireframe\n  Chart column axes=false labels=false');
  assert.deepEqual(diagnostics, []);
  assert.equal(accentFills(svg), 5, 'the bars still draw');
  assert.doesNotMatch(svg, /stroke-width="0\.6"/, 'no axes chrome');
});

test('the render adapts its geometry to the box width (sizing -> plot)', () => {
  // The headline claim: the SAME element is a small sidebar chart or a full-bleed
  // one. The title centers on box.w, so its text-x tracks the box width.
  const titleX = (svg) => Math.max(...[...svg.matchAll(/<text[^>]*\bx="([\d.]+)"/g)].map((m) => Number(m[1])));
  const small = titleX(svgOf('Wireframe\n  Chart 200px "T"'));
  const large = titleX(svgOf('Wireframe\n  Chart 600px "T"'));
  assert.ok(large > small + 150, `the plot should track box.w (200px->${Math.round(small)}, 600px->${Math.round(large)})`);
});

test('a Chart carrying to= is wrapped in a link by the facade', () => {
  assert.match(svgOf('Wireframe\n  Chart to=#next'), /<a class="wm-link" href="#next">/);
});

test('href= is accepted as the to= alias (universal prop)', () => {
  assert.match(svgOf('Wireframe\n  Chart href=#next'), /<a class="wm-link" href="#next">/);
});

// --- determinism ---------------------------------------------------------------

test('rendering is deterministic (byte-identical across runs)', () => {
  const src = 'Wireframe\n  Chart donut series=6 legend title="Sales"';
  assert.equal(render(src).svg, render(src).svg);
});
