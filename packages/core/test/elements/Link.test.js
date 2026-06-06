// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  Link "Forgot?" to=#reset';

/** Count rough.js drawing primitives (the underline rule renders as a <path>). */
const paths = (svg) => (svg.match(/<path/g) || []).length;

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

test('label resolves keyless from the quoted literal', () => {
  const doc = parse('Wireframe\n  Link "Sign up"');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.label, 'Sign up');
});

test('to=#x and href=#x both populate props.to (universal nav, href alias)', () => {
  const viaTo = parse('Wireframe\n  Link "A" to=#home');
  const viaHref = parse('Wireframe\n  Link "A" href=#home');
  assert.deepEqual(viaTo.diagnostics, []);
  assert.deepEqual(viaHref.diagnostics, []);
  assert.equal(viaTo.frames[0].children[0].props.to, 'home');
  assert.equal(viaHref.frames[0].children[0].props.to, 'home');
});

test('underline is keyed and accepts each enum value', () => {
  for (const v of ['none', 'hover', 'always']) {
    const doc = parse(`Wireframe\n  Link "X" underline=${v}`);
    assert.deepEqual(doc.diagnostics, [], `underline=${v} should parse clean`);
    assert.equal(doc.frames[0].children[0].props.underline, v);
  }
});

test('underline=none suppresses the underline rule; default/always draws it', () => {
  // Both render the label...
  const none = render('Wireframe\n  Link "Home" underline=none');
  const always = render('Wireframe\n  Link "Home" underline=always');
  const dflt = render('Wireframe\n  Link "Home"'); // default is `always`
  assert.match(none.svg, /Home/);
  assert.match(always.svg, /Home/);

  // ...but `none` drops the underline <path>, so it has strictly fewer primitives.
  assert.ok(paths(none.svg) < paths(always.svg),
    `none (${paths(none.svg)}) should draw fewer paths than always (${paths(always.svg)})`);
  // Default behaves like `always` (the rule is drawn).
  assert.equal(paths(dflt.svg), paths(always.svg));
});

test('variant is keyless and accepts the Typography scale values', () => {
  for (const v of ['h1', 'h6', 'subtitle2', 'body2', 'caption', 'overline', 'button']) {
    const doc = parse(`Wireframe\n  Link "X" ${v}`); // bare token -> keyless variant
    assert.deepEqual(doc.diagnostics, [], `keyless variant ${v} should parse clean`);
    assert.equal(doc.frames[0].children[0].props.variant, v);
  }
});

test('keyless label + keyless variant resolve together, order-independent', () => {
  const a = parse('Wireframe\n  Link "Docs" h4');
  const b = parse('Wireframe\n  Link h4 "Docs"');
  for (const doc of [a, b]) {
    assert.deepEqual(doc.diagnostics, []);
    const link = doc.frames[0].children[0];
    assert.equal(link.props.label, 'Docs');
    assert.equal(link.props.variant, 'h4');
  }
});

test('variant scales the rendered font off the shared Typography scale', () => {
  // h1 is larger than the inherited base, so its box (and font) is bigger.
  const big = layout(parse('Wireframe\n  Link "Home" h1'))[0].root.children[0];
  const base = layout(parse('Wireframe\n  Link "Home"'))[0].root.children[0];
  assert.ok(Number.isFinite(big.w) && big.w > 0);
  assert.ok(Number.isFinite(big.h) && big.h > 0);
  assert.ok(big.h > base.h, `h1 height (${big.h}) should exceed inherited base (${base.h})`);
});
