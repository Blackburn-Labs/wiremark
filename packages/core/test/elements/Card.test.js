// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * The Card family (SPEC ss.5.3). A Card is a paper surface that stacks Card*
 * sub-parts in a column. Two authoring forms collapse to one shape by layout
 * time: a Card with no explicit Card* children has its content wrapped in an
 * implicit CardContent (the resolver's flatten rule), while a Card with explicit
 * CardContent/CardActions keeps them as written.
 *
 * Card has one look, governed by `elevation` (keyed numeric, default 1):
 * `elevation=0` is a bordered paper with no shadow (the look the removed
 * `variant=outlined` used to select), and any `elevation>=1` lifts the paper with
 * a drop shadow (the old default). The redundant `variant` enum was removed -- it
 * carried no information the number didn't already (`outlined` just forced
 * elevation 0), so old `Card variant=...` / `Card outlined` sources now fail as a
 * deliberate unknown-token error (asserted below).
 *
 * The Card box is the frame's first (and only) child: layout(doc)[0].root.children[0].
 */

// --- Form 1: implicit -- a bare Card whose content becomes one CardContent ----

const IMPLICIT_SRC = 'Wireframe\n  Card\n    Typography h3 "Card 1"\n    Typography body2';

test('implicit Card parses cleanly and flattens its content into one CardContent', () => {
  const doc = parse(IMPLICIT_SRC);
  assert.deepEqual(doc.diagnostics, []);

  // The flatten rule wraps the loose Typography children in a single CardContent,
  // so by layout time the Card's only child is that implicit CardContent.
  const card = doc.frames[0].children[0];
  assert.equal(card.component, 'Card');
  assert.equal(card.children.length, 1);
  assert.equal(card.children[0].component, 'CardContent');
});

test('implicit Card lays out to a finite, positive box', () => {
  const doc = parse(IMPLICIT_SRC);
  const box = layout(doc)[0].root.children[0];
  assert.equal(box.node.component, 'Card');
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});

test('implicit Card renders its content and a hand-drawn card surface', () => {
  const { svg } = render(IMPLICIT_SRC);
  // The child Typography text reaches the SVG, proving the column layoutSpec ran
  // through the implicit CardContent.
  assert.match(svg, /Card 1/);
  // The Card draws its paper surface as a hand-drawn path.
  assert.match(svg, /<path/);
});

// --- Form 2: explicit -- the product-card shape with its sub-parts ------------

const EXPLICIT_SRC = [
  'Wireframe',
  '  Card',
  '    CardContent',
  '      Typography h5 "Product"',
  '      Typography body2 "Description"',
  '    CardActions',
  '      Button "Buy"',
  '      Button "More"',
].join('\n');

test('explicit Card parses cleanly and preserves its Card* sub-parts unwrapped', () => {
  const doc = parse(EXPLICIT_SRC);
  assert.deepEqual(doc.diagnostics, []);

  // With explicit Card* children present, the flatten rule must NOT fire: the
  // sub-parts stay exactly as authored, in order, not re-wrapped in a CardContent.
  const card = doc.frames[0].children[0];
  assert.equal(card.component, 'Card');
  assert.deepEqual(
    card.children.map((c) => c.component),
    ['CardContent', 'CardActions'],
  );
});

test('explicit Card lays out to a finite, positive box stacking its sub-parts', () => {
  const doc = parse(EXPLICIT_SRC);
  const box = layout(doc)[0].root.children[0];
  assert.equal(box.node.component, 'Card');
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);

  // The Card arranges its sub-parts as its laid-out children, in order.
  assert.deepEqual(
    box.children.map((c) => c.node.component),
    ['CardContent', 'CardActions'],
  );
});

test('explicit Card renders a hand-drawn card surface', () => {
  const { svg } = render(EXPLICIT_SRC);
  // The Card's own paper surface is drawn regardless of which leaf children other
  // developers have implemented yet.
  assert.match(svg, /<path/);
  // Leaf text is supplied by Typography/Button (implemented concurrently); assert
  // it only when present so this test owns the Card family, not its children.
  const { svg: probe } = render('Wireframe\n  Typography h5 "Product"\n  Button "Buy"');
  if (/Product/.test(probe)) assert.match(svg, /Product/);
  if (/Buy/.test(probe)) assert.match(svg, /Buy/);
});

// --- Props: elevation (keyed numeric) -- the sole look control -----------------

test('Card elevation is a keyed number coerced from the token', () => {
  const doc = parse('Wireframe\n  Card elevation=4');
  assert.deepEqual(doc.diagnostics, []);
  const card = doc.frames[0].children[0];
  assert.equal(card.props.elevation, 4);
  assert.equal(typeof card.props.elevation, 'number');
});

test('Card default: elevation unset in props, strategy supplies it', () => {
  // The resolver does NOT inject defaults; an omitted prop stays undefined and the
  // render applies elevation default 1 itself (ss.6).
  const doc = parse('Wireframe\n  Card');
  assert.deepEqual(doc.diagnostics, []);
  const card = doc.frames[0].children[0];
  assert.equal(card.props.elevation, undefined);
});

// --- Failure mode: the removed `variant` prop is a deliberate hard error -------
// `variant` (enum [elevation, outlined]) was removed because it was redundant with
// the numeric `elevation` (its only effect was `outlined` -> elevation 0). Old
// sources naming it now hit the resolver's existing author-must-fix throws
// (CONVENTION s.11 / errors.js): unknown keyed prop, and bare enum tokens that no
// longer match any slot become "unexpected token". These assertions PIN that as
// intended, not an accidental regression.

test('removed: keyed `variant=` is a deliberate unknown-property error', () => {
  assert.throws(
    () => parse('Wireframe\n  Card variant=outlined'),
    /unknown property "variant="/,
  );
});

test('removed: bare `outlined` / `elevation` tokens are deliberate unexpected-token errors', () => {
  // These were the keyless `variant` enum values; with the slot gone they match
  // nothing (Card is sizing:true, so only px/%/*/number are geometry -- these bare
  // words are neither sizing nor a boolean prop name nor an icon literal).
  assert.throws(() => parse('Wireframe\n  Card outlined'), /unexpected token `outlined`/);
  assert.throws(() => parse('Wireframe\n  Card elevation'), /unexpected token `elevation`/);
});

// --- Render: elevation alone governs shadow vs. border-only -------------------

test('default Card (elevation 1) draws a drop shadow behind the paper', () => {
  const { svg } = render('Wireframe\n  Card\n    Typography body2');
  // The elevation shadow is an extra opacity-bearing path painted behind the
  // surface; the default elevation (1) must emit it.
  assert.match(svg, /<path opacity=/);
  const box = layout(parse('Wireframe\n  Card'))[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0 && Number.isFinite(box.h) && box.h > 0);
});

test('elevation=0 Card draws a bordered paper with no shadow (old `outlined` look)', () => {
  const { svg } = render('Wireframe\n  Card elevation=0\n    Typography body2');
  // elevation 0 => no shadow, so no opacity-bearing path...
  assert.doesNotMatch(svg, /<path opacity=/);
  // ...but the paper surface (border) is still drawn.
  assert.match(svg, /<path/);
  const box = layout(parse('Wireframe\n  Card elevation=0'))[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0 && Number.isFinite(box.h) && box.h > 0);
});

test('elevation=0 reproduces the removed `variant=outlined` look byte-for-byte', () => {
  // The core proof that nothing was lost: the only thing `variant=outlined` ever
  // did was force elevation to 0, so the same source with `elevation=0` must render
  // identically. (We can't author `variant=outlined` anymore -- it throws -- so we
  // assert the surviving form matches the elevated default's BORDER while omitting
  // only the shadow path.)
  const elevated = render('Wireframe\n  Card\n    Typography body2 "x"').svg;
  const flat = render('Wireframe\n  Card elevation=0\n    Typography body2 "x"').svg;
  // Same geometry/content; the elevated one has exactly one extra opacity path
  // (the shadow) that the flat one lacks. Stripping shadow paths makes them equal.
  const stripShadow = (s) => s.replace(/<path opacity="[^"]*"[^>]*\/>/g, '');
  assert.equal(stripShadow(elevated), flat);
});

test('a larger elevation still renders a finite, positive Card', () => {
  const { svg } = render('Wireframe\n  Card elevation=8\n    Typography body2');
  assert.match(svg, /<path opacity=/);
  const box = layout(parse('Wireframe\n  Card elevation=8'))[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});

// --- Edge: a bare empty Card still draws via minSize (screen-bg case) ---------

test('an empty Card still lays out to a positive box and draws (minSize floor)', () => {
  const SRC = 'Wireframe\n  Card';
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  // No children -> no flatten; the Card stands on its own.
  const card = doc.frames[0].children[0];
  assert.equal(card.children.length, 0);

  const box = layout(doc)[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(box.h >= 100, `minSize should floor the height to >= 100, got ${box.h}`);

  const { svg } = render(SRC);
  assert.match(svg, /<path/);
});
