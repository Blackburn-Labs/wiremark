// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  Fab "edit"';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];

test('Fab parses with clean diagnostics and resolves its icon name', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const fab = doc.frames[0].children[0];
  assert.equal(fab.component, 'Fab');
  assert.equal(fab.props.icon, 'edit');
});

test('the quoted literal is keyless -> icon', () => {
  const fab = firstChild('Wireframe\n  Fab "home"');
  assert.equal(fab.props.icon, 'home');
});

test('variant and size default to undefined when omitted (strategy applies defaults)', () => {
  // The resolver does not inject PropDef defaults; an unset prop is absent.
  const fab = firstChild(SRC);
  assert.equal(fab.props.variant, undefined);
  assert.equal(fab.props.size, undefined);
});

test('variant is a keyless enum accepting each value', () => {
  for (const v of ['circular', 'extended']) {
    const doc = parse(`Wireframe\n  Fab ${v}`);
    assert.deepEqual(doc.diagnostics, [], `Fab ${v} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.variant, v);
  }
});

test('size is a keyless enum accepting each value', () => {
  for (const s of ['small', 'medium', 'large']) {
    const doc = parse(`Wireframe\n  Fab ${s}`);
    assert.deepEqual(doc.diagnostics, [], `Fab ${s} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.size, s);
  }
});

test('variant accepts the keyed spelling too', () => {
  const fab = firstChild('Wireframe\n  Fab variant=extended');
  assert.equal(fab.props.variant, 'extended');
});

test('size accepts the keyed spelling too', () => {
  const fab = firstChild('Wireframe\n  Fab size=large');
  assert.equal(fab.props.size, 'large');
});

test('icon accepts the keyed spelling too', () => {
  const fab = firstChild('Wireframe\n  Fab icon="share"');
  assert.equal(fab.props.icon, 'share');
});

test('the two keyless enums + literal resolve independent of token order', () => {
  // Disjoint value domains (CONVENTION s.2.1) => any ordering is unambiguous.
  const expected = { variant: 'extended', size: 'large', icon: 'edit' };
  for (const src of [
    'Wireframe\n  Fab "edit" extended large',
    'Wireframe\n  Fab "edit" large extended',
    'Wireframe\n  Fab extended large "edit"',
    'Wireframe\n  Fab large "edit" extended',
  ]) {
    const doc = parse(src);
    assert.deepEqual(doc.diagnostics, [], `${src} should parse cleanly`);
    const fab = doc.frames[0].children[0];
    assert.deepEqual(
      { variant: fab.props.variant, size: fab.props.size, icon: fab.props.icon },
      expected,
    );
  }
});

test('a bad enum value is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Fab variant=square'), /not valid for "variant="/);
  assert.throws(() => parse('Wireframe\n  Fab size=huge'), /not valid for "size="/);
});

test('a duplicate variant token is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Fab circular extended'), /"variant" set more than once/);
});

test('a duplicate size token is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Fab small large'), /"size" set more than once/);
});

test('a second text literal is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Fab "edit" "delete"'), /more than one text literal/);
});

test('a circular Fab lays out to a true circle (w === h) at every size', () => {
  for (const size of ['small', 'medium', 'large']) {
    const box = firstBox(`Wireframe\n  Fab "edit" ${size}`);
    assert.ok(Number.isFinite(box.w) && box.w > 0, `w finite/positive for ${size}, got ${box.w}`);
    assert.equal(box.w, box.h, `circular ${size} should be square (a circle), got ${box.w}x${box.h}`);
  }
});

test('size scales the diameter strictly: small < medium < large', () => {
  const small = firstBox('Wireframe\n  Fab "edit" small');
  const medium = firstBox('Wireframe\n  Fab "edit" medium');
  const large = firstBox('Wireframe\n  Fab "edit" large');
  assert.ok(small.w < medium.w, `small (${small.w}) should be < medium (${medium.w})`);
  assert.ok(medium.w < large.w, `medium (${medium.w}) should be < large (${large.w})`);
});

test('an extended Fab is a pill: wider than it is tall, same height as the circle', () => {
  const circular = firstBox('Wireframe\n  Fab "edit" medium');
  const extended = firstBox('Wireframe\n  Fab "edit" extended medium');
  assert.ok(extended.w > extended.h, `extended should be wider than tall, got ${extended.w}x${extended.h}`);
  assert.equal(extended.h, circular.h, 'extended height should match the circular diameter at the same size');
  assert.ok(extended.w > circular.w, `extended (${extended.w}) should be wider than circular (${circular.w})`);
});

test('a longer extended label widens the pill', () => {
  const short = firstBox('Wireframe\n  Fab "go" extended');
  const long = firstBox('Wireframe\n  Fab "navigate forward" extended');
  assert.ok(long.w > short.w, `longer label (${long.w}) should widen the pill beyond short (${short.w})`);
});

test('a circular Fab renders an ellipse-ish circle and the icon glyph, no label text', () => {
  const { svg } = render('Wireframe\n  Fab "edit" circular');
  assert.match(svg, /<path/);
  // circular draws no <text> (the icon name is a glyph, not a printed label).
  assert.doesNotMatch(svg, /<text/);
});

test('an extended Fab renders the icon name as a printed label', () => {
  const { svg } = render('Wireframe\n  Fab "edit" extended');
  assert.match(svg, /<text/);
  assert.match(svg, />edit</);
});

test('a Fab with no icon still renders (a placeholder action label)', () => {
  const { svg } = render('Wireframe\n  Fab');
  assert.match(svg, /<path/);
});

test('to= makes a Fab navigate (universal nav, wrapped by the facade)', () => {
  const { svg } = render('Wireframe\n  Fab "edit" to=#next');
  assert.match(svg, /<a /);
});
