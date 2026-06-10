// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  Breadcrumbs\n    Link "Home" to=#home\n    Link "Library"\n    Typography "Data"';

/** The Breadcrumbs node (first child of the frame) for `src`. */
const node = (src) => parse(src).frames[0].children[0];
/** The Breadcrumbs laid-out box (first child box of the frame) for `src`. */
const box = (src) => layout(parse(src))[0].root.children[0];

/**
 * Lay out a Breadcrumbs with two equal-label children inside a row Stack and
 * return its box. The row's main axis is width, so the inter-child gap (which
 * carries the separator) shows through rather than being absorbed by the frame's
 * top-level cross-axis stretch.
 * @param {string} tokens  the Breadcrumbs tokens after `Breadcrumbs`
 */
const rowBox = (tokens) =>
  layout(parse(`Wireframe\n  Stack row\n    Breadcrumbs ${tokens}\n      Link "AA"\n      Link "BB"`))
    [0].root.children[0].children[0];

/** Width of the gap between the first two children of a Breadcrumbs box. */
const childGap = (b) => {
  const [a, c] = b.children;
  return c.x - (a.x + a.w);
};

test('Breadcrumbs parses cleanly as a container holding its children', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const bc = doc.frames[0].children[0];
  assert.equal(bc.component, 'Breadcrumbs');
  assert.equal(bc.children.length, 3);
  assert.equal(bc.children[0].component, 'Link');
});

test('separator is a keyless string literal', () => {
  const bc = node('Wireframe\n  Breadcrumbs ">"\n    Link "A"\n    Link "B"');
  assert.deepEqual(parse('Wireframe\n  Breadcrumbs ">"\n    Link "A"\n    Link "B"').diagnostics, []);
  assert.equal(bc.props.separator, '>');
});

test('separator also resolves as the keyed form', () => {
  const bc = node('Wireframe\n  Breadcrumbs separator=">"\n    Link "A"\n    Link "B"');
  assert.equal(bc.props.separator, '>');
});

test('separator is absent when omitted (strategy applies the "/" default)', () => {
  // The resolver does not inject PropDef defaults; the strategy treats an unset
  // separator as "/".
  const bc = node('Wireframe\n  Breadcrumbs\n    Link "A"\n    Link "B"');
  assert.equal(bc.props.separator, undefined);
});

test('children lay out left to right in a row', () => {
  const bc = box(SRC);
  const xs = bc.children.map((c) => c.x);
  assert.ok(xs[0] < xs[1] && xs[1] < xs[2], `children should advance rightward, got ${xs}`);
});

test('the reserved inter-child gap honestly fits the separator glyph', () => {
  // A wider separator must reserve a wider gap, so the glyph render draws into is
  // real space rather than overlapping the children.
  const slash = childGap(rowBox('"/"'));
  const wide = childGap(rowBox('"-->"'));
  assert.ok(slash > 0, `default "/" should reserve a positive gap, got ${slash}`);
  assert.ok(wide > slash, `a wider separator should reserve a wider gap: ${wide} vs ${slash}`);
});

test('renders the default "/" separator between children', () => {
  const { svg } = render(SRC);
  // Two gaps for three children => the separator glyph appears twice.
  const seps = svg.match(/<text[^>]*>\/<\/text>/g) || [];
  assert.equal(seps.length, 2, `expected 2 "/" separators, got ${seps.length}`);
});

test('renders a custom separator instead of "/"', () => {
  const src = 'Wireframe\n  Breadcrumbs ">"\n    Link "A"\n    Link "B"\n    Link "C"';
  const { svg } = render(src);
  assert.match(svg, /<text[^>]*>&gt;<\/text>/); // ">" is escaped in SVG text
  assert.doesNotMatch(svg, /<text[^>]*>\/<\/text>/);
});

test('one separator is drawn between each adjacent pair of children', () => {
  const two = render('Wireframe\n  Breadcrumbs\n    Link "A"\n    Link "B"').svg;
  const three = render('Wireframe\n  Breadcrumbs\n    Link "A"\n    Link "B"\n    Link "C"').svg;
  const count = (svg) => (svg.match(/<text[^>]*>\/<\/text>/g) || []).length;
  assert.equal(count(two), 1, 'two children => one separator');
  assert.equal(count(three), 2, 'three children => two separators');
});

test('a Breadcrumbs with a single child draws no separator', () => {
  const { svg } = render('Wireframe\n  Breadcrumbs\n    Link "Only"');
  assert.doesNotMatch(svg, /<text[^>]*>\/<\/text>/);
});

test('an empty Breadcrumbs lays out without error and draws no separator', () => {
  const doc = parse('Wireframe\n  Breadcrumbs');
  assert.deepEqual(doc.diagnostics, []);
  const { svg } = render('Wireframe\n  Breadcrumbs');
  assert.doesNotMatch(svg, /<text[^>]*>\/<\/text>/);
});

test('separator color is muted so it reads as chrome, not content', () => {
  const { svg } = render(SRC);
  // The "/" glyph is drawn in COLORS.muted (#9aa7b2).
  assert.match(svg, /<text[^>]*fill="#9aa7b2"[^>]*>\/<\/text>/);
});

test('to=#id on the Breadcrumbs wraps the whole trail in a link (universal nav)', () => {
  const { svg } = render('Wireframe\n  Breadcrumbs to=#home\n    Link "A"\n    Link "B"');
  assert.match(svg, /<a class="wm-link" href="#home">/);
});

test('an empty-string separator falls back to the "/" default at render', () => {
  // separatorOf guards length > 0, so `separator=""` degrades to "/" rather than
  // rendering an empty <text> the author can't see.
  const src = 'Wireframe\n  Breadcrumbs separator=""\n    Link "A"\n    Link "B"';
  assert.deepEqual(parse(src).diagnostics, []);
  const { svg } = render(src);
  assert.equal((svg.match(/<text[^>]*>\/<\/text>/g) || []).length, 1);
});
