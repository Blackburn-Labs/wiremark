// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render, WiremarkError } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];

test('Step parses cleanly and resolves its keyless label literal', () => {
  const doc = parse('Wireframe\n  Step "Address"');
  assert.deepEqual(doc.diagnostics, []);
  const step = doc.frames[0].children[0];
  assert.equal(step.component, 'Step');
  assert.equal(step.props.label, 'Address');
});

test('label defaults are not injected by the resolver (strategy supplies "Step")', () => {
  const step = firstChild('Wireframe\n  Step');
  assert.equal(step.props.label, undefined);
  // The render fallback fills it in.
  assert.match(render('Wireframe\n  Step').svg, /Step/);
});

test('active is a keyless boolean flag (bare name -> true)', () => {
  const doc = parse('Wireframe\n  Step "Payment" active');
  assert.deepEqual(doc.diagnostics, []);
  const step = doc.frames[0].children[0];
  assert.equal(step.props.active, true);
  assert.equal(step.props.label, 'Payment');
});

test('completed is a keyless boolean flag (bare name -> true)', () => {
  const doc = parse('Wireframe\n  Step "Cart" completed');
  assert.deepEqual(doc.diagnostics, []);
  const step = doc.frames[0].children[0];
  assert.equal(step.props.completed, true);
  assert.equal(step.props.label, 'Cart');
});

test('active and completed are unset (not defaulted) when omitted', () => {
  const step = firstChild('Wireframe\n  Step "Open"');
  assert.equal(step.props.active, undefined);
  assert.equal(step.props.completed, undefined);
});

test('booleans accept an explicit keyed true/false spelling', () => {
  const step = firstChild('Wireframe\n  Step "X" active=true completed=false');
  assert.equal(step.props.active, true);
  assert.equal(step.props.completed, false);
});

test('label literal + both booleans resolve independent of token order', () => {
  for (const src of [
    'Wireframe\n  Step "Done" completed active',
    'Wireframe\n  Step active completed "Done"',
    'Wireframe\n  Step completed "Done" active',
  ]) {
    const doc = parse(src);
    assert.deepEqual(doc.diagnostics, [], `${src} should parse cleanly`);
    const step = doc.frames[0].children[0];
    assert.deepEqual(
      { label: step.props.label, active: step.props.active, completed: step.props.completed },
      { label: 'Done', active: true, completed: true },
    );
  }
});

test('Step lays out to a finite, positive box for each state', () => {
  for (const src of [
    'Wireframe\n  Step "S"',
    'Wireframe\n  Step "S" active',
    'Wireframe\n  Step "S" completed',
  ]) {
    const box = firstBox(src);
    assert.ok(Number.isFinite(box.w) && box.w > 0, `w finite/positive for ${src}, got ${box.w}`);
    assert.ok(Number.isFinite(box.h) && box.h > 0, `h finite/positive for ${src}, got ${box.h}`);
  }
});

test('a longer label produces a wider box', () => {
  const short = firstBox('Wireframe\n  Step "A"');
  const long = firstBox('Wireframe\n  Step "A much longer label"');
  assert.ok(long.w > short.w, `longer label width (${long.w}) should exceed short (${short.w})`);
});

test('Step renders its label and a hand-drawn path', () => {
  const { svg } = render('Wireframe\n  Step "Review"');
  assert.match(svg, /Review/);
  assert.match(svg, /<path/);
});

test('a completed Step emits a filled circle (distinct from a plain Step)', () => {
  // completed -> a circle filled with the surface fill colour; plain -> no fill.
  const completed = render('Wireframe\n  Step "C" completed').svg;
  const plain = render('Wireframe\n  Step "C"').svg;
  assert.match(completed, /fill="#eef2f5"/, 'completed circle should be filled');
  assert.doesNotMatch(plain, /fill="#eef2f5"/, 'plain circle should not be filled');
});

test('an active Step draws a heavier circle stroke than a plain Step', () => {
  // active ring is stroke-width 2.6; a plain ring uses the default 1.2.
  const active = render('Wireframe\n  Step "A" active').svg;
  const plain = render('Wireframe\n  Step "A"').svg;
  assert.match(active, /stroke-width="2.6"/, 'active ring should use the heavy stroke');
  assert.doesNotMatch(plain, /stroke-width="2.6"/, 'plain ring should not use the heavy stroke');
});

test('completed, active, and plain produce three distinguishable renders', () => {
  const completed = render('Wireframe\n  Step "X" completed').svg;
  const active = render('Wireframe\n  Step "X" active').svg;
  const plain = render('Wireframe\n  Step "X"').svg;
  assert.notEqual(completed, active);
  assert.notEqual(completed, plain);
  assert.notEqual(active, plain);
});

test('a second text literal is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Step "One" "Two"'), WiremarkError);
});

test('an unknown keyed prop is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Step "X" foo=bar'), WiremarkError);
});

test('Step is not a text component, so filler is rejected', () => {
  // `text: true` is deliberately NOT set (no filler consumption), so a filler
  // token must error rather than be silently swallowed.
  assert.throws(() => parse('Wireframe\n  Step ~5'), WiremarkError);
});

test('a bare unknown token is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Step nonsense'), WiremarkError);
});
