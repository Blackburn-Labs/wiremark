// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * TextField -- keyless `label`, `variant` and `size` (disjoint enum domains); the
 * rest keyed (SPEC ss.5.4). The `label` is OPTIONAL: absent, nothing is drawn and
 * no space is reserved. For the outlined variant it rests INSIDE the empty field
 * (muted) and FLOATS onto the top border (small, with a paper knockout) once a
 * value/placeholder shows -- the MUI label behavior, built on the shared
 * `floatingLabel` helper that Select reuses. `startIcon`/`endIcon` are icon-typed
 * adornments. The `type` prop was removed entirely.
 */

const SRC = 'Wireframe\n  TextField "Email"';

/** The text content of every `<text>` element -- what the field actually shows. */
const texts = (svg) => (svg.match(/<text[^>]*>([^<]*)<\/text>/g) || [])
  .map((t) => t.replace(/<[^>]*>/g, ''));
/** Count of subpath moves (`M`) -- a rough.js rectangle traces all four sides
 *  (8 moves) where a single underline rule has just 2, so this separates a boxed
 *  field (outlined/filled) from the underline-only `standard` variant. */
const moves = (svg) => (svg.match(/\bM/g) || []).length;
/** The single laid-out TextField box for a source. @param {string} src */
const tfBox = (src) => layout(parse(src))[0].root.children[0];
/** Whether a FLOATING-label paper knockout is present. The frame always paints
 *  full-bleed `<rect x="0" y="0" ... fill="paper">` backgrounds, so a knockout is
 *  any paper-filled rect NOT anchored at the origin (the small gap behind the
 *  floating label). Distinguishes a true float from the frame chrome. */
const hasKnockout = (svg) => (svg.match(/<rect[^>]*fill="#ffffff"[^>]*\/>/g) || [])
  .some((r) => !/x="0"\s+y="0"/.test(r));

test('TextField parses clean and resolves the keyless label', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);
  const tf = doc.frames[0].children[0];
  assert.equal(tf.component, 'TextField');
  assert.equal(tf.props.label, 'Email');     // keyless literal
});

test('TextField is categorized under inputs', async () => {
  const { getComponent } = await import('../../src/index.js');
  assert.equal(getComponent('TextField').category, 'inputs');
});

test('the type prop is gone: type= is now an unknown property', () => {
  assert.throws(() => parse('Wireframe\n  TextField "X" type=email'), /unknown property "type="/);
  assert.throws(() => parse('Wireframe\n  TextField "X" type=password'), /unknown property "type="/);
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

test('size is keyless: a bare small/medium resolves the size prop', () => {
  for (const s of ['small', 'medium']) {
    const doc = parse(`Wireframe\n  TextField "X" ${s}`);
    assert.deepEqual(doc.diagnostics, [], `bare '${s}' should resolve cleanly`);
    assert.equal(doc.frames[0].children[0].props.size, s);
  }
  // The keyed spelling still works too.
  assert.equal(parse('Wireframe\n  TextField "X" size=small').frames[0].children[0].props.size, 'small');
  assert.throws(() => parse('Wireframe\n  TextField "X" size=large'), /not valid for "size="/);
  assert.throws(() => parse('Wireframe\n  TextField "X" large'), /unexpected token `large`/);
});

test('keyless variant and size resolve together in any order (disjoint domains)', () => {
  for (const src of ['Wireframe\n  TextField "Bio" filled small',
    'Wireframe\n  TextField "Bio" small filled']) {
    const doc = parse(src);
    assert.deepEqual(doc.diagnostics, [], `'${src}' should resolve cleanly`);
    const tf = doc.frames[0].children[0];
    assert.equal(tf.props.variant, 'filled');
    assert.equal(tf.props.size, 'small');
  }
});

test('helperText resolves via its keyed name and the `helper` alias', () => {
  const viaCanonical = parse('Wireframe\n  TextField "X" helperText="We never share it"');
  assert.deepEqual(viaCanonical.diagnostics, []);
  assert.equal(viaCanonical.frames[0].children[0].props.helperText, 'We never share it');

  const viaAlias = parse('Wireframe\n  TextField "X" helper="We never share it"');
  assert.deepEqual(viaAlias.diagnostics, []);
  assert.equal(viaAlias.frames[0].children[0].props.helperText, 'We never share it');
});

test('keyed props (placeholder/value/defaultValue/rows/select) resolve clean', () => {
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

test('startIcon/endIcon resolve as keyed icon names and annotate node.icons', () => {
  const doc = parse('Wireframe\n  TextField "Search" startIcon=Search endIcon=Close');
  assert.deepEqual(doc.diagnostics, []);
  const tf = doc.frames[0].children[0];
  assert.equal(tf.props.startIcon, 'Search');
  assert.equal(tf.props.endIcon, 'Close');
  // Resolve-time icon annotation drives drawIcon; known names resolve to artwork.
  assert.ok(tf.icons && tf.icons.startIcon, 'startIcon should resolve to artwork');
  assert.ok(tf.icons && tf.icons.endIcon, 'endIcon should resolve to artwork');
});

test('an icon name is keyed only -- a bare token is not read as an icon name', () => {
  // The single literal slot belongs to `label`, so there is no keyless icon path:
  // a second bare word is an error, not a silent startIcon.
  assert.throws(() => parse('Wireframe\n  TextField "Search" Close'), /unexpected token `Close`/);
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

// --- layout / geometry --------------------------------------------------------

test('TextField lays out to a finite, positive box', () => {
  const box = tfBox(SRC);
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite > 0, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite > 0, got ${box.h}`);
});

test('an UNLABELED field reserves NO label height (shorter than a labeled one)', () => {
  // No label at all: just the field box (no inside-label band, no floating band).
  const noLabel = tfBox('Wireframe w=400 h=400\n  TextField');
  // A bare labeled field rests its label INSIDE the box, so it is the SAME height
  // (the inside-label needs no extra band) -- the label costs no vertical space here.
  const insideLabel = tfBox('Wireframe w=400 h=400\n  TextField "Email"');
  assert.equal(noLabel.h, insideLabel.h,
    `unlabeled (${noLabel.h}) and inside-label (${insideLabel.h}) fields share the field height`);
  // A floating label (value present) DOES add the small band above the field, so
  // it is strictly taller than the unlabeled field -- proving the band is the only
  // thing the label ever adds, and only when it floats.
  const floating = tfBox('Wireframe w=400 h=400\n  TextField "Email" value="x"');
  assert.ok(floating.h > noLabel.h,
    `floating-label field (${floating.h}) should exceed the unlabeled field (${noLabel.h})`);
});

test('a multiline field with rows is taller than a single-line one', () => {
  const single = tfBox('Wireframe w=400 h=400\n  TextField "X"');
  const multi = tfBox('Wireframe w=400 h=400\n  TextField "X" multiline rows=5');
  assert.ok(multi.h > single.h, `multiline rows=5 (${multi.h}) should exceed single (${single.h})`);
});

test('size=small yields a shorter field than the medium default', () => {
  const med = tfBox('Wireframe w=400 h=400\n  TextField "X"');
  const sm = tfBox('Wireframe w=400 h=400\n  TextField "X" size=small');
  assert.ok(sm.h < med.h, `size=small (${sm.h}) should be shorter than medium (${med.h})`);
});

test('helperText adds vertical space below the field', () => {
  const plain = tfBox('Wireframe w=400 h=400\n  TextField "X"');
  const helped = tfBox('Wireframe w=400 h=400\n  TextField "X" helper="hint"');
  assert.ok(helped.h > plain.h, `helperText (${helped.h}) should add height over plain (${plain.h})`);
});

// --- render -------------------------------------------------------------------

test('TextField renders its label and an input border', () => {
  const { svg } = render(SRC);
  assert.ok(svg.includes('Email'), 'label text should appear');
  assert.ok(svg.includes('<path'), 'outlined input border should be drawn as a path');
});

test('an UNLABELED field draws no stray label text', () => {
  // The field is empty and has no label -> the only text drawn should be nothing
  // (no 'Label', no filler word). Earlier code fell back to textOf(node,'Label').
  const { svg } = render('Wireframe\n  TextField');
  assert.deepEqual(texts(svg), [], 'an unlabeled, empty field should draw no text');
});

test('filler does not resurrect a label on an unlabeled field', () => {
  // `~2` is filler; with no label it must NOT become label text (regression guard).
  const { svg } = render('Wireframe\n  TextField ~2');
  assert.ok(!texts(svg).some((t) => /Lorem/.test(t)), 'filler must not render as a label');
});

test('outlined label rests INSIDE the field when empty, FLOATS once a value shows', () => {
  // Empty: one label glyph, at the in-field font size (12), no paper knockout.
  const empty = render('Wireframe\n  TextField "Email"').svg;
  assert.ok(texts(empty).includes('Email'), 'empty field shows the resting label');
  assert.ok(!hasKnockout(empty), 'no floating knockout when the label rests inside');
  assert.match(empty, /font-size="12"[^>]*>Email</, 'resting label uses the in-field size');

  // With a value: the label floats small (font-size 11) AND a paper knockout rect
  // is drawn behind it so the outline reads as broken; the value shows too.
  const filled = render('Wireframe\n  TextField "Email" value="jane@x.com"').svg;
  const t = texts(filled);
  assert.ok(t.includes('Email') && t.includes('jane@x.com'), 'floating label + value both show');
  assert.match(filled, /font-size="11"[^>]*>Email</, 'floating label shrinks to 11px');
  assert.ok(hasKnockout(filled), 'floating label paints a paper knockout gap');
});

test('a placeholder also makes the label float (content OR placeholder)', () => {
  const svg = render('Wireframe\n  TextField "Email" placeholder="you@example.com"').svg;
  assert.match(svg, /font-size="11"[^>]*>Email</, 'placeholder triggers the floating label');
  assert.ok(hasKnockout(svg), 'floating label paints a knockout');
});

test('a label with a value but NO label string draws only the value (no float)', () => {
  // Defensive: value present, label absent -> no floating label, just the value.
  const svg = render('Wireframe\n  TextField value="solo"').svg;
  assert.deepEqual(texts(svg), ['solo'], 'only the value text is drawn');
  assert.ok(!hasKnockout(svg), 'no floating label without a label string');
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

test('a value renders verbatim inside the field', () => {
  const plain = render('Wireframe\n  TextField "Name" value="Robert"');
  assert.ok(plain.svg.includes('Robert'), 'a value renders inside the field');
});

test('defaultValue renders like a value when no value is set', () => {
  const def = render('Wireframe\n  TextField "Name" defaultValue="Robert"');
  assert.ok(def.svg.includes('Robert'), 'defaultValue renders as in-field text');
});

test('startIcon and endIcon render as artwork; an unknown name falls back + warns', () => {
  const known = render('Wireframe\n  TextField "Search" startIcon=Search endIcon=Close');
  assert.deepEqual(known.diagnostics, [], 'known icon names resolve without diagnostics');
  assert.ok(known.svg.includes('<g transform'), 'a resolved icon renders as an inked <g> group');

  // An unknown icon name draws the placeholder glyph and emits a soft diagnostic.
  const unknown = render('Wireframe\n  TextField "X" startIcon=NotAnIcon');
  assert.ok(unknown.diagnostics.some((d) => /unknown icon "NotAnIcon"/.test(d.message)),
    'an unknown icon name warns');
});

test('an endIcon reserves the right slot, suppressing the select caret there', () => {
  // `select` would draw a ▾ caret on the right; an endIcon claims that slot, so the
  // caret is not drawn (they would otherwise overlap).
  const withCaret = render('Wireframe\n  TextField "X" select').svg;
  assert.ok(texts(withCaret).some((t) => t.includes('▾')), 'select alone draws a caret');
  const withEndIcon = render('Wireframe\n  TextField "X" select endIcon=Close').svg;
  assert.ok(!texts(withEndIcon).some((t) => t.includes('▾')),
    'an endIcon takes the caret slot, so no caret is drawn');
});

test('icons widen the intrinsic box (content-sized, not stretched)', () => {
  // In a content-sized parent (a row that hugs its children) the field reports its
  // intrinsic width, which must grow to reserve the icon slots -- otherwise the
  // adornments would squeeze the in-field text. A Stack row hugs horizontally, so
  // drill into the row to read the field's own (un-stretched) width.
  const fieldInRow = (extra) =>
    layout(parse(`Wireframe\n  Stack row\n    TextField "Hi"${extra}`))[0].root.children[0].children[0];
  const plain = fieldInRow('');
  const oneIcon = fieldInRow(' startIcon=Search');
  const twoIcons = fieldInRow(' startIcon=Search endIcon=Close');
  assert.ok(oneIcon.w > plain.w, `one icon should widen the field (${oneIcon.w} vs ${plain.w})`);
  assert.ok(twoIcons.w > oneIcon.w, `a second icon widens it further (${twoIcons.w} vs ${oneIcon.w})`);
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

test('a filled field is OPAQUE: it opts into the paper base under the hatch (Ruling 1 (A))', () => {
  // CONVENTIONS.md Ruling 1 classifies a filled TextField as an (A) caller: its
  // backgroundHatch call passes base:true so a SOLID paper-fill <path> grounds the
  // field (vs the frame's full-bleed <rect>), keeping content behind from showing
  // through the hash gaps. Guards against the base:true arg being dropped.
  const paperFillPaths = (svg) => (svg.match(/<path[^>]*fill="#ffffff"[^>]*>/g) || []).length;
  assert.ok(paperFillPaths(render('Wireframe\n  TextField "X" filled').svg) >= 1,
    'a filled field draws an opaque paper base under its hatch');
  assert.equal(paperFillPaths(render('Wireframe\n  TextField "X" outlined').svg), 0,
    'an outlined field has no fill, so no opaque base');
  // Theme-correct: the base follows COLORS.paper, never a hard-coded white.
  const dark = render('Wireframe\n  TextField "X" filled', { theme: 'dark' }).svg;
  assert.match(dark, /<path[^>]*fill="#1e2127"[^>]*>/, 'dark filled base uses the dark paper');
  assert.doesNotMatch(dark, /<path[^>]*fill="#ffffff"[^>]*>/, 'dark filled base leaks no light paper');
});

test('outlined AND filled float the label with a value; standard does not', () => {
  // MUI floats the label for both the outlined notch and the filled field. With a
  // value present, each shrinks the label to 11px and floats it on the top border
  // with a paper knockout behind it.
  for (const v of ['outlined', 'filled']) {
    const svg = render(`Wireframe\n  TextField "Email" ${v} value="x"`).svg;
    assert.match(svg, /font-size="11"[^>]*>Email</, `${v} should float the label`);
    assert.ok(hasKnockout(svg), `${v} should draw a floating knockout`);
  }
  // `standard` is the deliberate exception: a small label hovering over a
  // borderless underline reads oddly, so a standard field with a value drops the
  // label entirely (no floated 11px label, no knockout, and the value takes the
  // in-field baseline so no resting label either).
  const standard = render('Wireframe\n  TextField "Email" standard value="x"').svg;
  assert.doesNotMatch(standard, /font-size="11"[^>]*>Email</, 'standard must not float the label');
  assert.ok(!hasKnockout(standard), 'standard must not draw a floating knockout');
});

test('all the props together render finite, positive and clean', () => {
  const src = 'Wireframe w=420 h=400\n  TextField "Bio" filled error=true size=small'
    + ' multiline rows=3 helper="Keep it short" placeholder="About you" required select'
    + ' startIcon=Search';
  const doc = parse(src);
  assert.deepEqual(doc.diagnostics, []);
  const box = layout(doc)[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w finite > 0, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h finite > 0, got ${box.h}`);
});
