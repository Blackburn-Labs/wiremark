// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  Link "Forgot?" to=#reset';

test('Link parses with clean diagnostics and resolves label + normalized anchor', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  // The Link is the frame's first (and only) child.
  const link = doc.frames[0].children[0];
  assert.equal(link.component, 'Link');
  assert.equal(link.props.label, 'Forgot?');
  assert.equal(link.props.to, 'reset'); // `to=#reset` -> anchor with the leading # stripped
});

test('Link lays out to a finite, positive box', () => {
  const doc = parse(SRC);
  const box = layout(doc)[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});

test('Link renders its label inside the facade link wrapper', () => {
  const { svg } = render(SRC);
  assert.match(svg, /Forgot\?/); // the visible label
  assert.match(svg, /<a /); // the facade wraps the to= node in an anchor
  assert.match(svg, /href="#reset"/); // pointing at the normalized frame id
});
