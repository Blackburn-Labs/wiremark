// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * Container -- a centered max-width wrapper (SPEC ss.5.2); `max=` picks a
 * breakpoint width. It has no custom layoutSpec, so it relies on the engine's
 * default-column fallback for `container:true` elements -- which is exactly what
 * keeps its children from being dropped. These tests pin that fallback.
 */

const SRC = 'Wireframe w=400 h=300\n  Container max=md\n    Typography "Inside"';

test('Container parses with clean diagnostics and resolves its max breakpoint', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const container = doc.frames[0].children[0];
  assert.equal(container.component, 'Container');
  assert.equal(container.props.max, 'md');
});

test('Container lays out to a finite, positive box and keeps its child', () => {
  const box = layout(parse(SRC))[0].root.children[0];
  assert.equal(box.node.component, 'Container');
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);

  // The default-column fallback arranges the child rather than dropping it.
  assert.equal(box.children.length, 1);
  assert.equal(box.children[0].node.component, 'Typography');
});

test('Container flows its child to the SVG via the default-column fallback', () => {
  const { svg } = render(SRC);
  assert.match(svg, /Inside/);  // proves a layoutSpec-less container still recurses
});
