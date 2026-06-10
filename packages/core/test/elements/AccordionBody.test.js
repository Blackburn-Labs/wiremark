// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];
/** Number of hand-drawn `<path>` elements in the rendered SVG for `src`. */
const pathCount = (src) => (render(src).svg.match(/<path/g) ?? []).length;

const WITH_CHILD = 'Wireframe\n  AccordionBody\n    Typography "Ships in 2-3 days"';

test('AccordionBody parses cleanly as a container holding its children', () => {
  const doc = parse(WITH_CHILD);
  assert.deepEqual(doc.diagnostics, []);

  const body = doc.frames[0].children[0];
  assert.equal(body.component, 'AccordionBody');
  // It is the frame's first child and owns the Typography as its own child.
  assert.equal(body.children.length, 1);
  assert.equal(body.children[0].component, 'Typography');
});

test('AccordionBody takes no props (spec slice declares none)', () => {
  // Nothing resolves onto the node's props -- the body is a pure container.
  const doc = parse('Wireframe\n  AccordionBody\n    Typography "x"');
  assert.deepEqual(doc.frames[0].children[0].props, {});
});

test('AccordionBody stacks its children in a padded column', () => {
  const src = 'Wireframe\n  AccordionBody\n    Typography "One"\n    Typography "Two"';
  const body = firstBox(src);
  const [first, second] = body.children;

  // col axis: children share an x and step down in y.
  assert.equal(first.x, second.x, 'column children share an x');
  assert.ok(second.y > first.y, 'second child is below the first');

  // pad (SPACING=8) insets the first child from the panel's top-left corner.
  assert.equal(first.x, body.x + 8, 'child inset from left by one spacing unit');
  assert.equal(first.y, body.y + 8, 'child inset from top by one spacing unit');

  // gap (SPACING=8) sits between the two children.
  assert.equal(second.y, first.y + first.h + 8, 'one spacing-unit gap between children');
});

test('AccordionBody stretches to the full frame width (reads as a bar with the header)', () => {
  // 800px default frame, 16px frame pad each side => 768px panel.
  const body = firstBox(WITH_CHILD);
  assert.equal(body.w, 768, 'panel spans the full content width');
});

test('AccordionBody draws a bordered panel surface', () => {
  // The surface adds exactly one hand-drawn rect path on top of the bare frame.
  const { svg } = render(WITH_CHILD);
  assert.match(svg, /<path/, 'panel border is a hand-drawn path');
  assert.match(svg, /Ships in 2-3 days/, 'child content renders inside the panel');
});

// Joint composition: AccordionHeader and AccordionBody are SIBLINGS (no Accordion
// parent). This asserts the two read as one stacked unit -- the panel lines up
// edge-to-edge under the bar -- using the canonical FAMILIES wireframe.
test('AccordionBody stacks under an AccordionHeader as one aligned unit', () => {
  const src = [
    'Wireframe',
    '  AccordionHeader "Shipping" expanded',
    '  AccordionBody',
    '    Typography "Ships in 2-3 days"',
    '  AccordionHeader "Returns"',
    '  AccordionHeader "Warranty" disabled',
  ].join('\n');

  const doc = parse(src);
  assert.deepEqual(doc.diagnostics, [], 'header + body compose without diagnostics');

  const root = layout(doc)[0].root;
  const [header, body] = root.children;

  // Both span the same full width and share left/right edges => they read as one
  // continuous panel, the header bar sitting directly above the body.
  assert.equal(body.w, header.w, 'body and header are the same width');
  assert.equal(body.x, header.x, 'body and header share a left edge');
  assert.ok(body.y >= header.y + header.h, 'body sits below the header bar');

  const { svg } = render(src);
  assert.match(svg, /Shipping/, 'header title renders');
  assert.match(svg, /Ships in 2-3 days/, 'body child renders inside the panel');
});

test('an empty AccordionBody still draws a visible panel (minSize)', () => {
  // No children: minSize clamps it to a sensible box instead of collapsing,
  // and it still emits its border path on top of the frame's own path.
  const body = firstBox('Wireframe\n  AccordionBody');
  assert.ok(body.w >= 160 && body.h >= 40, `empty panel clamps to minSize, got ${body.w}x${body.h}`);

  assert.equal(
    pathCount('Wireframe\n  AccordionBody'),
    pathCount('Wireframe') + 1,
    'an empty body adds exactly its own border path',
  );
});
