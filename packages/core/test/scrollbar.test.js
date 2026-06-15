// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../src/index.js';
import { layout } from '../src/layout.js';
import { COLORS, scrollHandleGeometry } from '../src/draw.js';
import { SCROLLBAR_THICKNESS as THICK } from '../src/metrics.js';

/**
 * The universal `scrollbar` prop (vertical|horizontal|both|none) + `scrollbarValue`
 * (0-100 position) + `scrollbarHandle` (handle length %). Available on EVERY element
 * (merged by registry.js like `to=`). It RESERVES a gutter on the scrolled edge --
 * right for vertical, bottom for horizontal -- so the strip the render facade draws
 * there never covers content. Keyed-only (the enum would collide with axis tokens).
 */

/** @param {*} box @param {string} comp @returns {*} */
function findByComponent(box, comp) {
  if (box.node.component === comp) return box;
  for (const c of box.children) {
    const hit = findByComponent(c, comp);
    if (hit) return hit;
  }
  return null;
}
/** All boxes of `comp`, document order. @param {*} box @param {string} comp @param {*[]} [acc] */
function allByComponent(box, comp, acc = []) {
  if (box.node.component === comp) acc.push(box);
  for (const c of box.children) allByComponent(c, comp, acc);
  return acc;
}
const rootOf = (src) => layout(parse(src))[0].root;

// --- parse / resolve ----------------------------------------------------------

test('scrollbar / scrollbarValue / scrollbarHandle resolve as keyed universal props on any element', () => {
  const doc = parse('Wireframe\n  Box scrollbar=vertical scrollbarValue=50 scrollbarHandle=40');
  assert.deepEqual(doc.diagnostics, []);
  const box = doc.frames[0].children[0];
  assert.equal(box.props.scrollbar, 'vertical');
  assert.equal(box.props.scrollbarValue, 50);
  assert.equal(box.props.scrollbarHandle, 40);
});

test('scrollbar is available on a leaf too (universal), and accepts every enum value', () => {
  for (const v of ['vertical', 'horizontal', 'both', 'none']) {
    const doc = parse(`Wireframe\n  Button "Go" scrollbar=${v}`);
    assert.deepEqual(doc.diagnostics, [], `scrollbar=${v} should parse clean`);
    assert.equal(doc.frames[0].children[0].props.scrollbar, v);
  }
});

test('a bad scrollbar enum value is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Box scrollbar=sideways'), /scrollbar/);
});

// --- the reserved gutter keeps content clear ----------------------------------

test('scrollbar=vertical reserves a right gutter: a filling child is inset by the thickness', () => {
  const root = rootOf('Wireframe landscape\n  Box 400px 300px scrollbar=vertical\n    Box * * outline=solid');
  const [outer, inner] = allByComponent(root, 'Box');
  assert.ok(Math.abs(inner.w - (outer.w - THICK)) < 1e-6, `child width (${inner.w}) should be outer (${outer.w}) minus the gutter (${THICK})`);
  assert.ok(Math.abs(inner.h - outer.h) < 1e-6, 'child keeps full height (no bottom gutter)');
  // The strip sits in the reserved gutter, to the RIGHT of the child -- never over it.
  const strip = outer.scrollbars[0];
  assert.equal(strip.orientation, 'vertical');
  assert.ok(Math.abs(strip.x - (inner.x + inner.w)) < 1e-6, 'the strip starts exactly where the content ends (no overlap)');
  assert.ok(Math.abs((strip.x + strip.w) - (outer.x + outer.w)) < 1e-6, 'the strip hugs the outer right edge');
  assert.ok(Math.abs(strip.h - inner.h) < 1e-6, 'the strip spans the full content height');
});

test('scrollbar=horizontal reserves a bottom gutter: a filling child is inset by the thickness', () => {
  const root = rootOf('Wireframe landscape\n  Box 400px 300px scrollbar=horizontal\n    Box * * outline=solid');
  const [outer, inner] = allByComponent(root, 'Box');
  assert.ok(Math.abs(inner.h - (outer.h - THICK)) < 1e-6, `child height (${inner.h}) should be outer (${outer.h}) minus the gutter`);
  assert.ok(Math.abs(inner.w - outer.w) < 1e-6, 'child keeps full width (no right gutter)');
  const strip = outer.scrollbars[0];
  assert.equal(strip.orientation, 'horizontal');
  assert.ok(Math.abs(strip.y - (inner.y + inner.h)) < 1e-6, 'the strip starts where the content ends');
  assert.ok(Math.abs((strip.y + strip.h) - (outer.y + outer.h)) < 1e-6, 'the strip hugs the outer bottom edge');
});

test('scrollbar=both reserves right + bottom gutters and leaves the corner clear', () => {
  const root = rootOf('Wireframe landscape\n  Box 400px 300px scrollbar=both\n    Box * * outline=solid');
  const [outer, inner] = allByComponent(root, 'Box');
  assert.ok(Math.abs(inner.w - (outer.w - THICK)) < 1e-6, 'child inset on width');
  assert.ok(Math.abs(inner.h - (outer.h - THICK)) < 1e-6, 'child inset on height');
  const strips = outer.scrollbars;
  assert.equal(strips.length, 2, 'both -> two strips');
  const v = strips.find((s) => s.orientation === 'vertical');
  const h = strips.find((s) => s.orientation === 'horizontal');
  // The vertical strip stops above the bottom gutter; the horizontal stops left of
  // the right gutter -> the bottom-right corner square is left empty.
  assert.ok(Math.abs(v.h - inner.h) < 1e-6, 'vertical strip stops at the corner (content height)');
  assert.ok(Math.abs(h.w - inner.w) < 1e-6, 'horizontal strip stops at the corner (content width)');
});

test('no scrollbar (or scrollbar=none) reserves nothing: child geometry is byte-identical', () => {
  const plain = rootOf('Wireframe landscape\n  Box 400px 300px\n    Box * * outline=solid');
  const none = rootOf('Wireframe landscape\n  Box 400px 300px scrollbar=none\n    Box * * outline=solid');
  const a = allByComponent(plain, 'Box')[1];
  const b = allByComponent(none, 'Box')[1];
  assert.deepEqual({ x: a.x, y: a.y, w: a.w, h: a.h }, { x: b.x, y: b.y, w: b.w, h: b.h });
  assert.equal(allByComponent(none, 'Box')[0].scrollbars, undefined, 'scrollbar=none draws no strip');
});

test('an auto-sized container GROWS by the gutter so content + strip both fit (measure pass)', () => {
  // In a row, the Box width is content-sized -> with a vertical scrollbar it is one
  // gutter wider than the same Box without, proving the gutter is reserved in measure
  // (not just carved out of a fixed box, which would squeeze the content).
  const withSb = findByComponent(rootOf('Wireframe landscape\n  Stack row\n    Box scrollbar=vertical\n      Box 100px 50px'), 'Box');
  const without = findByComponent(rootOf('Wireframe landscape\n  Stack row\n    Box\n      Box 100px 50px'), 'Box');
  assert.ok(Math.abs((withSb.w - without.w) - THICK) < 1e-6, `the scrollbar Box (${withSb.w}) should be one gutter wider than without (${without.w})`);
});

test('a leaf carrying scrollbar draws a finite strip hugging its own edge', () => {
  const root = rootOf('Wireframe\n  Button "Go" scrollbar=vertical');
  const btn = findByComponent(root, 'Button');
  assert.ok(Array.isArray(btn.scrollbars) && btn.scrollbars.length === 1, 'the leaf gets a strip');
  const strip = btn.scrollbars[0];
  assert.ok(Math.abs((strip.x + strip.w) - (btn.x + btn.w)) < 1e-6, 'strip hugs the leaf right edge');
  for (const v of [strip.x, strip.y, strip.w, strip.h]) assert.ok(Number.isFinite(v), `finite geometry, got ${v}`);
});

// --- overflow is clipped (a scroll container hides overflow) ------------------

test('a scroll container clips its content to the content rect (overflow hidden)', () => {
  // The inner Box is 400px tall inside a 100px outer -> it overflows, and a scroll
  // container hides that (the strip implies the rest scrolls).
  const SRC = 'Wireframe landscape\n  Box 200px 100px scrollbar=vertical\n    Box * 400px outline=solid';
  const outer = findByComponent(rootOf(SRC), 'Box');
  assert.ok(outer.clip, 'a scroll container annotates a clip rect');
  assert.ok(Math.abs(outer.clip.w - (outer.w - THICK)) < 1e-6, 'the clip width excludes the scrollbar gutter');
  assert.ok(Math.abs(outer.clip.h - outer.h) < 1e-6, 'the clip height is the content height (no bottom gutter for a vertical bar)');
  const svg = render(SRC).svg;
  assert.match(svg, /<clipPath id="wm-sb-clip-[^"]+"><rect /, 'emits a scroll clipPath');
  assert.match(svg, /<g clip-path="url\(#wm-sb-clip-/, 'wraps the children in the clip');
});

test('a padded scroll container clips at the BOX edge, not inside the padding (room for hand-drawn wobble)', () => {
  // A Drawer has padding; the clip must hug the box edges (only the gutter excluded),
  // so the padding -- and the wobble of hand-drawn strokes within it -- is NOT shaved.
  const d = findByComponent(rootOf('Wireframe landscape\n  Stack row 100% *\n    Drawer left scrollbar=vertical\n      List\n        ListItem "x"'), 'Drawer');
  assert.ok(d.clip, 'the drawer is a scroll container');
  assert.ok(Math.abs(d.clip.x - d.x) < 1e-6, 'clip left = box left (padding stays inside the clip)');
  assert.ok(Math.abs(d.clip.y - d.y) < 1e-6, 'clip top = box top');
  assert.ok(Math.abs(d.clip.w - (d.w - THICK)) < 1e-6, 'clip right stops at the gutter (excludes the strip)');
  assert.ok(Math.abs(d.clip.h - d.h) < 1e-6, 'clip bottom = box bottom (no bottom gutter)');
});

test('a non-scroll container does NOT clip (no clip rect, no scroll clipPath)', () => {
  const SRC = 'Wireframe landscape\n  Box 200px 100px\n    Box * 400px outline=solid';
  assert.equal(findByComponent(rootOf(SRC), 'Box').clip, undefined);
  assert.doesNotMatch(render(SRC).svg, /wm-sb-clip-/);
});

// --- the handle geometry (value / handle, clamped) ----------------------------

test('scrollHandleGeometry: handle length is handle% of the track long axis (vertical)', () => {
  const rect = { x: 0, y: 0, w: THICK, h: 200 };
  const t = scrollHandleGeometry(rect, false, 0, 50);
  assert.ok(Math.abs(t.h - 100) < 1e-6, `handle should be 50% of 200, got ${t.h}`);
  assert.ok(t.w < rect.w, 'handle is inset within the track width');
  assert.ok(Math.abs(t.y - rect.y) < 1e-6, 'value=0 seats the handle at the top');
});

test('scrollHandleGeometry: value seats the handle along the leftover travel; ends never overflow', () => {
  const rect = { x: 0, y: 0, w: THICK, h: 200 };
  const end = scrollHandleGeometry(rect, false, 100, 30);
  assert.ok(Math.abs((end.y + end.h) - (rect.y + rect.h)) < 1e-6, 'value=100 seats the handle flush with the bottom');
  for (const val of [-50, 0, 50, 150]) {
    const t = scrollHandleGeometry(rect, false, val, 35);
    assert.ok(t.y >= rect.y - 1e-6 && t.y + t.h <= rect.y + rect.h + 1e-6, `value=${val}: handle stays within the track`);
  }
});

test('scrollHandleGeometry: handle floors to a visible minimum and caps to the full track', () => {
  const rect = { x: 0, y: 0, w: THICK, h: 200 };
  assert.ok(scrollHandleGeometry(rect, false, 50, 0).h >= 16 - 1e-6, 'a 0% handle floors to a visible minimum');
  assert.ok(Math.abs(scrollHandleGeometry(rect, false, 50, 200).h - 200) < 1e-6, 'a >100% handle caps to the track length');
});

// --- render -------------------------------------------------------------------

test('a scrollbar renders a hand-drawn track + handle, no diagnostics, no NaN', () => {
  const { svg, diagnostics } = render('Wireframe landscape\n  Box 360px 160px scrollbar=vertical scrollbarValue=50 scrollbarHandle=40\n    Typography "x"');
  assert.deepEqual(diagnostics, []);
  assert.ok((svg.match(/<path/g) || []).length >= 2, 'at least a track + handle path');
  assert.ok(svg.includes(`fill="${COLORS.muted}"`), 'the handle is filled muted');
  assert.ok(!/NaN|Infinity/.test(svg), 'no NaN/Infinity');
});

test('scrollbar render is deterministic (seeds derive from geometry)', () => {
  const src = 'Wireframe landscape\n  Box 360px 160px scrollbar=both scrollbarValue=60 scrollbarHandle=30\n    Typography "x"';
  assert.equal(render(src).svg, render(src).svg);
});

test('a degenerate (zero-area) scrollable Box stays finite and renders no NaN', () => {
  const src = 'Wireframe\n  Box 0px 0px scrollbar=both scrollbarValue=50';
  const { svg, diagnostics } = render(src);
  assert.deepEqual(diagnostics, []);
  assert.ok(!/NaN|Infinity/.test(svg), 'no NaN/Infinity in the SVG');
});
