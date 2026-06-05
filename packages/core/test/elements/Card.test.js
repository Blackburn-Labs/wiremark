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
 * CardMedia/CardContent/CardActions keeps them as written.
 *
 * The Card box is the frame's first (and only) child: layout(doc)[0].root.children[0].
 */

// --- Form 1: implicit -- a bare Card whose content becomes one CardContent ----

const IMPLICIT_SRC = 'Wireframe\n  Card\n    Typography h3 "Card 1"\n    Typography body';

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

// --- Form 2: explicit -- the product-card shape with all three sub-parts ------

const EXPLICIT_SRC = [
  'Wireframe',
  '  Card',
  '    CardMedia',
  '      Img ratio=16:9',
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
    ['CardMedia', 'CardContent', 'CardActions'],
  );
});

test('explicit Card lays out to a finite, positive box stacking its sub-parts', () => {
  const doc = parse(EXPLICIT_SRC);
  const box = layout(doc)[0].root.children[0];
  assert.equal(box.node.component, 'Card');
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);

  // The Card arranges all three sub-parts as its laid-out children, in order.
  assert.deepEqual(
    box.children.map((c) => c.node.component),
    ['CardMedia', 'CardContent', 'CardActions'],
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
