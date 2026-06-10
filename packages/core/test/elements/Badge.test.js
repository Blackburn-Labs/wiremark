// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  Badge "9"';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];

test('Badge parses with clean diagnostics and resolves its content', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const badge = doc.frames[0].children[0];
  assert.equal(badge.component, 'Badge');
  assert.equal(badge.props.badgeContent, '9');
});

test('the quoted literal is keyless -> badgeContent', () => {
  const badge = firstChild('Wireframe\n  Badge "42"');
  assert.equal(badge.props.badgeContent, '42');
});

test('badgeContent also resolves via its keyed spelling', () => {
  const doc = parse('Wireframe\n  Badge badgeContent="7"');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.badgeContent, '7');
});

test('variant defaults to undefined when omitted (strategy applies the default)', () => {
  // The resolver does not inject PropDef defaults; an unset prop is absent.
  const badge = firstChild(SRC);
  assert.equal(badge.props.variant, undefined);
});

test('variant is a keyless enum accepting each value', () => {
  for (const v of ['standard', 'dot']) {
    const doc = parse(`Wireframe\n  Badge ${v}`);
    assert.deepEqual(doc.diagnostics, [], `Badge ${v} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.variant, v);
  }
});

test('variant also resolves via its keyed spelling', () => {
  const doc = parse('Wireframe\n  Badge variant=dot');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.variant, 'dot');
});

test('the literal and the keyless enum resolve independent of token order', () => {
  // A literal slot + an enum slot are disjoint kinds, so any ordering is unambiguous.
  const expected = { badgeContent: '9', variant: 'dot' };
  for (const src of [
    'Wireframe\n  Badge "9" dot',
    'Wireframe\n  Badge dot "9"',
  ]) {
    const doc = parse(src);
    assert.deepEqual(doc.diagnostics, [], `${src} should parse cleanly`);
    const badge = doc.frames[0].children[0];
    assert.deepEqual({ badgeContent: badge.props.badgeContent, variant: badge.props.variant }, expected);
  }
});

test('an unknown variant value is rejected', () => {
  // A bad keyed enum value is an author-must-fix error, not a silent pass.
  assert.throws(() => parse('Wireframe\n  Badge variant=blink'), /blink|variant/i);
});

test('a duplicate variant token is an error', () => {
  assert.throws(() => parse('Wireframe\n  Badge standard dot'));
});

test('a filler token is rejected -- Badge is not text-bearing', () => {
  // badgeContent is a quoted string literal, not free text: Badge does NOT set
  // `text: true`, so filler (`~5`, `___`) must hard-error rather than silently
  // resolve into an indicator that ignores it.
  assert.throws(() => parse('Wireframe\n  Badge ~5'), /filler.*text/i);
  assert.throws(() => parse('Wireframe\n  Badge ___'), /filler.*text/i);
});

test('Badge lays out to a finite, positive box for every variant', () => {
  for (const variant of ['standard', 'dot']) {
    const box = firstBox(`Wireframe\n  Badge "9" ${variant}`);
    assert.ok(
      Number.isFinite(box.w) && box.w > 0,
      `w should be finite & positive for ${variant}, got ${box.w}`,
    );
    assert.ok(
      Number.isFinite(box.h) && box.h > 0,
      `h should be finite & positive for ${variant}, got ${box.h}`,
    );
  }
});

test('the dot variant is a small fixed square, ignoring content length', () => {
  // MUI's dot ignores badgeContent: a long count must not widen the dot.
  const short = firstBox('Wireframe\n  Badge "1" dot');
  const long = firstBox('Wireframe\n  Badge "9999" dot');
  assert.deepEqual({ w: short.w, h: short.h }, { w: long.w, h: long.h });
  assert.equal(short.w, short.h, 'dot should be square');
});

test('the standard pill widens with longer content', () => {
  // The standard variant carries the label, so a longer count is a wider pill.
  const short = firstBox('Wireframe\n  Badge "1"');
  const long = firstBox('Wireframe\n  Badge "9999"');
  assert.ok(long.w > short.w, `"9999" pill (${long.w}) should be wider than "1" (${short.w})`);
});

test('a bare Badge falls back to a "3" count token', () => {
  // Filler default keeps a content-less standard badge legible.
  const doc = parse('Wireframe\n  Badge');
  assert.deepEqual(doc.diagnostics, []);
  assert.match(render('Wireframe\n  Badge').svg, /<text[^>]*>3<\/text>/);
});

test('the standard variant draws its label inside a hand-drawn pill', () => {
  const { svg } = render(SRC);
  assert.match(svg, /<text[^>]*>9<\/text>/);
  assert.match(svg, /<path/);
});

test('the dot variant draws a filled circle and NO text label', () => {
  // dot is a contentless indicator: a solid ink-filled ellipse, no <text>.
  const { svg } = render('Wireframe\n  Badge "9" dot');
  assert.match(svg, /fill="#22303f"/);
  assert.doesNotMatch(svg, /<text/);
});
