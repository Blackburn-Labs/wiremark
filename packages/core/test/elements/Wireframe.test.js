// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';
import { PRESET_SIZES, DEFAULT_FRAME } from '../../src/metrics.js';

/**
 * Wireframe -- the frame root (SPEC ss.5.1). It owns the frame's pixel size
 * (preset / explicit w,h / default), draws the frame border, and lays its
 * children in a padded column. Frame composition is exercised by the smoke
 * suite; here we pin sizing and the root chrome.
 */

test('a #id + preset Wireframe parses to a frame with id and preset', () => {
  const doc = parse('Wireframe #home mobile\n  Typography "x"');
  assert.deepEqual(doc.diagnostics, []);

  assert.equal(doc.frames.length, 1);
  const frame = doc.frames[0];
  assert.equal(frame.id, 'home');
  assert.equal(frame.preset, 'mobile');
});

test('frame size follows explicit w,h, then preset, then the default', () => {
  assert.deepEqual(
    { w: layout(parse('Wireframe w=500 h=300\n  Typography "x"'))[0].w, h: layout(parse('Wireframe w=500 h=300\n  Typography "x"'))[0].h },
    { w: 500, h: 300 },
    'explicit w,h win',
  );

  const mobile = layout(parse('Wireframe mobile\n  Typography "x"'))[0];
  assert.deepEqual({ w: mobile.w, h: mobile.h }, PRESET_SIZES.mobile, 'preset sizes the frame');

  const bare = layout(parse('Wireframe\n  Typography "x"'))[0];
  assert.deepEqual({ w: bare.w, h: bare.h }, DEFAULT_FRAME, 'a bare Wireframe falls back to the default');
});

test('the root box fills the frame and stacks children inside the padding', () => {
  const frame = layout(parse('Wireframe w=400 h=300\n  Typography "x"'))[0];
  const root = frame.root;
  assert.equal(root.node.component, 'Wireframe');
  assert.deepEqual({ x: root.x, y: root.y, w: root.w, h: root.h }, { x: 0, y: 0, w: 400, h: 300 });

  // The child is inset by the frame padding, not flush to the frame edge.
  const child = root.children[0];
  assert.ok(child.x > 0 && child.y > 0, `child should be inset by the frame padding, got (${child.x}, ${child.y})`);
});

test('Wireframe renders its frame border and its child content', () => {
  const { svg } = render('Wireframe\n  Typography "Hello"');
  assert.match(svg, /<path/);   // the hand-drawn frame border
  assert.match(svg, /Hello/);   // the child reached the SVG through the column layoutSpec
});
