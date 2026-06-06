// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * TextField -- keyless `label` + `variant`; the rest keyed (SPEC ss.5.4). The
 * label sits above the field, with an optional `helperText` (alias `helper`)
 * below. `type` accepts text/password/email/number only (tel/url were dropped).
 * `error`/`disabled`/`size`/`placeholder`/`multiline`+`rows` refine the render.
 */

const SRC = 'Wireframe\n  TextField "Email" type=email';

/** The text content of every `<text>` element -- what the field actually shows. */
const texts = (svg) => (svg.match(/<text[^>]*>([^<]*)<\/text>/g) || [])
  .map((t) => t.replace(/<[^>]*>/g, ''));
/** Count of subpath moves (`M`) -- a rough.js rectangle traces all four sides
 *  (8 moves) where a single underline rule has just 2, so this separates a boxed
 *  field (outlined/filled) from the underline-only `standard` variant. */
const moves = (svg) => (svg.match(/\bM/g) || []).length;

test('TextField parses clean and resolves label + type', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);
  const tf = doc.frames[0].children[0];
  assert.equal(tf.component, 'TextField');
  assert.equal(tf.props.label, 'Email');     // keyless literal
  assert.equal(tf.props.type, 'email');
});

test('variant resolves keyless for each enum value, default outlined when omitted', () => {
  for (const v of ['outlined', 'filled', 'standard']) {
    const doc = parse(`Wireframe\n  TextField "X" ${v}`);
    assert.deepEqual(doc.diagnostics, [], `'${v}' should resolve cleanly`);
    assert.equal(doc.frames[0].children[0].props.variant, v);
  }
  // Default is applied by the strategy, not injected into props.
  const bare = parse('Wireframe\n  TextField "X"');
  assert.equal(bare.frames[0].children[0].props.variant, undefined);
});

test('type resolves each value and rejects the dropped tel/url', () => {
  for (const t of ['text', 'password', 'email', 'number']) {
    const doc = parse(`Wireframe\n  TextField "X" type=${t}`);
    assert.deepEqual(doc.diagnostics, [], `type=${t} should resolve cleanly`);
    assert.equal(doc.frames[0].children[0].props.type, t);
  }
  assert.throws(() => parse('Wireframe\n  TextField "X" type=tel'), /not valid for "type="/);
  assert.throws(() => parse('Wireframe\n  TextField "X" type=url'), /not valid for "type="/);
});

test('helperText resolves via its keyed name and the `helper` alias', () => {
  const viaCanonical = parse('Wireframe\n  TextField "X" helperText="We never share it"');
  assert.deepEqual(viaCanonical.diagnostics, []);
  assert.equal(viaCanonical.frames[0].children[0].props.helperText, 'We never share it');

  const viaAlias = parse('Wireframe\n  TextField "X" helper="We never share it"');
  assert.deepEqual(viaAlias.diagnostics, []);
  assert.equal(viaAlias.frames[0].children[0].props.helperText, 'We never share it');
});

test('new keyed props (placeholder/value/defaultValue/rows/size) resolve clean', () => {
  const src = 'Wireframe\n  TextField "Bio" multiline rows=4 size=small'
    + ' placeholder="Tell us" defaultValue="hi" value="hey" select fullWidth';
  const doc = parse(src);
  assert.deepEqual(doc.diagnostics, []);
  const tf = doc.frames[0].children[0];
  assert.equal(tf.props.multiline, true);
  assert.equal(tf.props.rows, 4);            // numeric coerced to a number
  assert.equal(tf.props.size, 'small');
  assert.equal(tf.props.placeholder, 'Tell us');
  assert.equal(tf.props.defaultValue, 'hi');
  assert.equal(tf.props.value, 'hey');
  assert.equal(tf.props.select, true);
  assert.equal(tf.props.fullWidth, true);
});

test('size rejects values outside small/medium', () => {
  for (const s of ['small', 'medium']) {
    assert.deepEqual(parse(`Wireframe\n  TextField "X" size=${s}`).diagnostics, []);
  }
  assert.throws(() => parse('Wireframe\n  TextField "X" size=large'), /not valid for "size="/);
});

test('error and disabled resolve as keyed booleans', () => {
  const doc = parse('Wireframe\n  TextField "X" error=true disabled=true');
  assert.deepEqual(doc.diagnostics, []);
  const tf = doc.frames[0].children[0];
  assert.equal(tf.props.error, true);
  assert.equal(tf.props.disabled, true);
});

test('to=#id populates the universal nav prop', () => {
  const doc = parse('Wireframe\n  TextField "Search" to=#results');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.to, 'results'); // leading '#' stripped
});

test('TextField lays out to a finite, positive box', () => {
  const box = layout(parse(SRC))[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite > 0, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite > 0, got ${box.h}`);
});

test('a multiline field with rows is taller than a single-line one', () => {
  const single = layout(parse('Wireframe w=400 h=400\n  TextField "X"'))[0].root.children[0];
  const multi = layout(parse('Wireframe w=400 h=400\n  TextField "X" multiline rows=5'))[0].root.children[0];
  assert.ok(multi.h > single.h, `multiline rows=5 (${multi.h}) should exceed single (${single.h})`);
});

test('size=small yields a shorter field than the medium default', () => {
  const med = layout(parse('Wireframe w=400 h=400\n  TextField "X"'))[0].root.children[0];
  const sm = layout(parse('Wireframe w=400 h=400\n  TextField "X" size=small'))[0].root.children[0];
  assert.ok(sm.h < med.h, `size=small (${sm.h}) should be shorter than medium (${med.h})`);
});

test('helperText adds vertical space below the field', () => {
  const plain = layout(parse('Wireframe w=400 h=400\n  TextField "X"'))[0].root.children[0];
  const helped = layout(parse('Wireframe w=400 h=400\n  TextField "X" helper="hint"'))[0].root.children[0];
  assert.ok(helped.h > plain.h, `helperText (${helped.h}) should add height over plain (${plain.h})`);
});

test('TextField renders its label and an input border', () => {
  const { svg } = render(SRC);
  assert.ok(svg.includes('Email'), 'label text should appear');
  assert.ok(svg.includes('<path'), 'outlined input border should be drawn as a path');
});

test('required appends a marker to the label', () => {
  const { svg } = render('Wireframe\n  TextField "Email" required');
  assert.match(svg, /Email \*/);
});

test('helperText renders as sub-text below the field', () => {
  const { svg } = render('Wireframe\n  TextField "Email" helper="We never share it"');
  assert.ok(svg.includes('We never share it'), 'helper text should appear in the SVG');
});

test('placeholder shows faintly only when there is no value', () => {
  const withPh = render('Wireframe\n  TextField "Name" placeholder="Jane Doe"');
  assert.ok(withPh.svg.includes('Jane Doe'), 'placeholder shows when empty');

  // With a value, the value wins and the placeholder is not drawn.
  const withVal = render('Wireframe\n  TextField "Name" value="Robert" placeholder="Jane Doe"');
  assert.ok(withVal.svg.includes('Robert'), 'value renders');
  assert.ok(!withVal.svg.includes('Jane Doe'), 'placeholder is suppressed when a value is present');
});

test('a password value is masked; a plain value renders verbatim', () => {
  const masked = render('Wireframe\n  TextField "Password" type=password value="hunter2"');
  assert.ok(masked.svg.includes('*******'), 'password renders as a star run');
  assert.ok(!masked.svg.includes('hunter2'), 'password plaintext must not leak into the SVG');

  const plain = render('Wireframe\n  TextField "Name" value="Robert"');
  assert.ok(plain.svg.includes('Robert'), 'a non-password value renders inside the field');
});

test('defaultValue renders like a value when no value is set, and is masked for passwords', () => {
  const def = render('Wireframe\n  TextField "Name" defaultValue="Robert"');
  assert.ok(def.svg.includes('Robert'), 'defaultValue renders as in-field text');

  // Assert on rendered TEXT content, not the whole SVG: short digit runs can
  // coincidentally appear in path coordinates, so check what's actually drawn.
  const masked = render('Wireframe\n  TextField "PIN" type=password defaultValue="secret"');
  const shown = texts(masked.svg);
  assert.ok(shown.includes('******'), 'defaultValue is masked to stars for password type');
  assert.ok(!shown.includes('secret'), 'defaultValue plaintext must not appear in any drawn text');
});

test('error tints the border red; disabled mutes it', () => {
  const err = render('Wireframe\n  TextField "Email" error=true').svg;
  assert.match(err, /stroke="#c2473d"/, 'error should ink the field border red');

  const dis = render('Wireframe\n  TextField "Email" disabled=true').svg;
  assert.match(dis, /stroke="#9aa7b2"/, 'disabled should mute the field border');
});

test('the standard variant draws only an underline, not a full box', () => {
  const outlined = render('Wireframe\n  TextField "X" outlined').svg;
  const standard = render('Wireframe\n  TextField "X" standard').svg;
  // A boxed field traces four sides; the underline-only variant traces one rule,
  // so it emits strictly fewer subpath moves.
  assert.ok(moves(standard) < moves(outlined),
    `standard (${moves(standard)} moves) should draw less chrome than outlined (${moves(outlined)})`);
});

test('a filled (or disabled) field hatches a tint; outlined/standard do not', () => {
  // filled and disabled both tint the field background with the gray hatch.
  assert.match(render('Wireframe\n  TextField "X" filled').svg, /stroke="#c4c4c4"/);
  assert.match(render('Wireframe\n  TextField "X" disabled').svg, /stroke="#c4c4c4"/);
  assert.doesNotMatch(render('Wireframe\n  TextField "X" outlined').svg, /stroke="#c4c4c4"/);
  assert.doesNotMatch(render('Wireframe\n  TextField "X" standard').svg, /stroke="#c4c4c4"/);
});

test('all the new props together render finite, positive and clean', () => {
  const src = 'Wireframe w=420 h=400\n  TextField "Bio" filled error=true size=small'
    + ' multiline rows=3 helper="Keep it short" placeholder="About you" required select';
  const doc = parse(src);
  assert.deepEqual(doc.diagnostics, []);
  const box = layout(doc)[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w finite > 0, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h finite > 0, got ${box.h}`);
});
