// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';
import { PRESET_SIZES, DEFAULT_FRAME } from '../../src/metrics.js';

/**
 * Wireframe -- the frame root (SPEC ss.5.1). It owns the frame's pixel size
 * (preset / explicit w,h / default), draws the frame border, and lays its
 * children like a Stack -- axis from `direction`, gap from `spacing=`/`gap=`,
 * edge inset from `padding=`/`pad=` (both default 0). Frame composition is
 * exercised by the smoke suite; here we pin sizing, the root chrome, and layout.
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

test('the root box fills the frame and stacks children flush by default', () => {
  const frame = layout(parse('Wireframe w=400 h=300\n  Typography "x"'))[0];
  const root = frame.root;
  assert.equal(root.node.component, 'Wireframe');
  assert.deepEqual({ x: root.x, y: root.y, w: root.w, h: root.h }, { x: 0, y: 0, w: 400, h: 300 });

  // No default padding: the first child sits flush against the frame's top-left.
  const child = root.children[0];
  assert.deepEqual({ x: child.x, y: child.y }, { x: 0, y: 0 }, `child should be flush by default, got (${child.x}, ${child.y})`);
});

test('padding= insets the children by spacing units (pad=/padding= alias)', () => {
  for (const src of ['Wireframe w=400 h=300 padding=2\n  Typography "x"', 'Wireframe w=400 h=300 pad=2\n  Typography "x"']) {
    const child = layout(parse(src))[0].root.children[0];
    assert.deepEqual({ x: child.x, y: child.y }, { x: 16, y: 16 }, `padding=2 should inset by 2*8=16px (${src})`);
  }
});

test('direction lays children in a row; bare `row` keyless matches `direction=row`', () => {
  for (const src of ['Wireframe w=400 h=120 row\n  Button "A"\n  Button "B"', 'Wireframe w=400 h=120 direction=row\n  Button "A"\n  Button "B"']) {
    const kids = layout(parse(src))[0].root.children;
    assert.equal(kids.length, 2);
    assert.equal(kids[0].y, kids[1].y, `row lays children on one baseline (${src})`);
    assert.ok(kids[1].x > kids[0].x, `row advances along x (${src})`);
  }
});

test('gap= (alias spacing=) sets the inter-child gap in spacing units', () => {
  const flush = layout(parse('Wireframe w=400 h=200\n  Button "A"\n  Button "B"'))[0].root.children;
  assert.equal(flush[1].y, flush[0].y + flush[0].h, 'no gap by default: second child abuts the first');

  const gapped = layout(parse('Wireframe w=400 h=200 gap=2\n  Button "A"\n  Button "B"'))[0].root.children;
  assert.equal(gapped[1].y, gapped[0].y + gapped[0].h + 16, 'gap=2 leaves 2*8=16px between children');
});

test('the flow-chart direction (TD/LR) is no longer a frame prop -- it is the `Flow` directive', () => {
  assert.throws(() => parse('Wireframe direction=LR\n  Typography "x"'), /direction/, 'direction=LR is rejected on a frame');
});

test('Wireframe renders its frame border and its child content', () => {
  const { svg } = render('Wireframe\n  Typography "Hello"');
  assert.match(svg, /<path/);   // the hand-drawn frame border
  assert.match(svg, /Hello/);   // the child reached the SVG through the column layoutSpec
});
