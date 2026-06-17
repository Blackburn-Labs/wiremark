// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  Snackbar "Updated"';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];

test('Snackbar parses with clean diagnostics and resolves its message', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const snack = doc.frames[0].children[0];
  assert.equal(snack.component, 'Snackbar');
  assert.equal(snack.props.message, 'Updated');
});

test('the quoted literal is keyless -> message', () => {
  const snack = firstChild('Wireframe\n  Snackbar "Saved"');
  assert.equal(snack.props.message, 'Saved');
});

test('message can be set via the keyed spelling', () => {
  const snack = firstChild('Wireframe\n  Snackbar message="Saved"');
  assert.equal(snack.props.message, 'Saved');
});

test('the `label` alias maps to message', () => {
  const snack = firstChild('Wireframe\n  Snackbar label="Saved"');
  assert.equal(snack.props.message, 'Saved');
});

test('position defaults to undefined when omitted (strategy applies the inline default)', () => {
  // The resolver does not inject PropDef defaults; an unset prop is absent.
  const snack = firstChild(SRC);
  assert.equal(snack.props.position, undefined);
});

test('position is a keyless enum accepting each value', () => {
  for (const p of ['inline', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight']) {
    const doc = parse(`Wireframe\n  Snackbar ${p}`);
    assert.deepEqual(doc.diagnostics, [], `Snackbar ${p} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.position, p);
  }
});

test('position can be set via the keyed spelling', () => {
  const snack = firstChild('Wireframe\n  Snackbar position=topRight');
  assert.equal(snack.props.position, 'topRight');
});

test('the literal and the position enum resolve independent of token order', () => {
  // Disjoint keyless kinds (literal vs enum) => any ordering is unambiguous.
  const expected = { message: 'Saved', position: 'topRight' };
  for (const src of [
    'Wireframe\n  Snackbar "Saved" topRight',
    'Wireframe\n  Snackbar topRight "Saved"',
  ]) {
    const doc = parse(src);
    assert.deepEqual(doc.diagnostics, [], `${src} should parse cleanly`);
    const snack = doc.frames[0].children[0];
    assert.deepEqual({ message: snack.props.message, position: snack.props.position }, expected);
  }
});

test('a bad position value is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Snackbar sideways'), /Snackbar/);
});

test('a bad keyed position value names the valid set', () => {
  assert.throws(() => parse('Wireframe\n  Snackbar position=sideways'), /topLeft|expected/);
});

test('two position tokens is a duplicate error', () => {
  assert.throws(() => parse('Wireframe\n  Snackbar topLeft topRight'), /more than once/);
});

test('filler is rejected (Snackbar is not a text/filler element)', () => {
  // No `text: true` on the element, so `~N` filler is invalid here.
  assert.throws(() => parse('Wireframe\n  Snackbar ~3'), /Snackbar/);
});

test('Snackbar lays out to a finite, positive box for every position', () => {
  for (const position of ['inline', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight']) {
    const box = firstBox(`Wireframe\n  Snackbar "Updated" ${position}`);
    assert.ok(
      Number.isFinite(box.w) && box.w > 0,
      `w should be finite & positive for ${position}, got ${box.w}`,
    );
    assert.ok(
      Number.isFinite(box.h) && box.h > 0,
      `h should be finite & positive for ${position}, got ${box.h}`,
    );
  }
});

test('a longer message lays out wider (the bar tracks its text)', () => {
  const short = firstBox('Wireframe\n  Snackbar "Hi"');
  const long = firstBox('Wireframe\n  Snackbar "A considerably longer toast message"');
  assert.ok(long.w > short.w, `long width (${long.w}) should exceed short (${short.w})`);
});

test('Snackbar renders its message and a hand-drawn path', () => {
  const { svg } = render(SRC);
  assert.match(svg, /Updated/);
  assert.match(svg, /<path/);
});

test('a bare Snackbar falls back to a default toast message', () => {
  const { svg } = render('Wireframe\n  Snackbar');
  assert.match(svg, /Message sent/);
});

test('Snackbar draws a dark (ink) crosshatch tint -- its one dark surface', () => {
  // The toast is conveyed by a dense ink crosshatch fill (#22303f hashes), NOT a
  // solid block -- it's a (B) caller (a translucent dark marker), so it lays NO
  // opaque paper base (that would white-wash the dark toast).
  const { svg } = render(SRC);
  assert.match(svg, /#22303f/, 'the dark ink hatch is present');
  assert.doesNotMatch(svg, /fill="#ffffff" stroke="none"/, 'no opaque paper base under the dark toast');
});

test('a non-inline position renders the corner bracket; inline does not', () => {
  // The position bracket is drawn in the muted color; inline omits it entirely.
  const inline = render('Wireframe\n  Snackbar "X" inline').svg;
  const topRight = render('Wireframe\n  Snackbar "X" topRight').svg;
  assert.doesNotMatch(inline, /stroke="#9aa7b2"/, 'inline should draw no bracket');
  assert.match(topRight, /stroke="#9aa7b2"/, 'topRight should draw the corner bracket');
});

test('opposite corners render different bracket geometry', () => {
  // topLeft and bottomRight anchor the bracket to different corners, so the
  // emitted SVG genuinely differs (position is a real, discriminating prop).
  const topLeft = render('Wireframe\n  Snackbar "X" topLeft').svg;
  const bottomRight = render('Wireframe\n  Snackbar "X" bottomRight').svg;
  assert.notEqual(topLeft, bottomRight);
});
