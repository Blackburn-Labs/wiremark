// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

// A Select is a col container drawing its own closed field; its children are
// Options. We wrap it in a Wireframe frame and reach the Select node/box as the
// frame's first child. The frame opts into padding=2: the frame is flush by
// default, and a Select hard against the top edge would float its label above the
// frame (clipped). The inset gives the floated label its room, as in real use.
const wrap = (body) => `Wireframe padding=2\n  ${body}`;

/** The Select node (first child of the frame). */
const selNode = (line) => parse(wrap(line)).frames[0].children[0];
/** The laid-out box of that Select. */
const selBox = (src) => layout(parse(src))[0].root.children[0];

test('Select parses cleanly and resolves its keyless label', () => {
  const doc = parse(wrap('Select "Country"'));
  assert.deepEqual(doc.diagnostics, []);
  const sel = doc.frames[0].children[0];
  assert.equal(sel.component, 'Select');
  assert.equal(sel.props.label, 'Country');
});

test('label can also be given keyed as label=', () => {
  assert.equal(selNode('Select label="Region"').props.label, 'Region');
});

test('variant is a keyless enum (one of outlined|filled|standard)', () => {
  assert.equal(selNode('Select "Country" filled').props.variant, 'filled');
  assert.equal(selNode('Select "Country" standard').props.variant, 'standard');
  // The resolver does not inject PropDef defaults, so an unset variant is absent;
  // render falls back to outlined.
  assert.equal(selNode('Select "Country"').props.variant, undefined);
});

test('variant can also be given keyed as variant=', () => {
  assert.equal(selNode('Select "Country" variant=filled').props.variant, 'filled');
});

test('an unknown variant value is a hard error', () => {
  assert.throws(() => parse(wrap('Select "Country" plaid')), /plaid|variant/);
});

test('value is a keyed string with v/val aliases', () => {
  assert.equal(selNode('Select "Country" value="Canada"').props.value, 'Canada');
  assert.equal(selNode('Select "Country" v="Mexico"').props.value, 'Mexico');
  assert.equal(selNode('Select "Country" val="Brazil"').props.value, 'Brazil');
});

test('a duplicate keyed prop is an error', () => {
  assert.throws(() => parse(wrap('Select "C" value="a" value="b"')), /value/);
});

test('two string literals (a second keyless label) is an error', () => {
  // At most one keyless literal slot; a second quoted string has nowhere to land.
  assert.throws(() => parse(wrap('Select "One" "Two"')));
});

test('Select is a container: its Options stack as children', () => {
  const src = 'Wireframe\n  Select "Country"\n    Option "United States"\n    Option "Canada"';
  const box = selBox(src);
  assert.equal(box.children.length, 2);
  assert.equal(box.children[0].node.component, 'Option');
  assert.equal(box.children[1].node.component, 'Option');
  // Options stack vertically: the second sits below the first.
  assert.ok(box.children[1].y > box.children[0].y,
    'options should stack top-to-bottom');
});

test('the closed-field band reserves space above the first option', () => {
  // pad=FIELD_H reserves a top band, so the first option clears the field.
  const src = 'Wireframe\n  Select "Country"\n    Option "United States"';
  const box = selBox(src);
  assert.ok(box.children[0].y >= box.y + 30,
    `first option (${box.children[0].y}) should clear the field band below the Select top (${box.y})`);
});

test('Select draws the field label when no value is set', () => {
  const { svg } = render(wrap('Select "Country"'));
  assert.match(svg, /Country/);
});

test('value (when set) is shown in the field, and the label floats above it (MUI)', () => {
  // Once a value is shown (outlined), the field shows the value AND the label
  // lifts onto the top border in a smaller font -- the label is no longer hidden.
  const { svg } = render(wrap('Select "Country" value="Canada"'));
  assert.match(svg, /Canada/, 'the value occupies the field');
  assert.match(svg, /Country/, 'the label is still drawn (floating), not dropped');
  // The floating label uses the small float font (11), distinct from the field
  // text size (13), which proves it is the floating treatment, not field content.
  assert.match(svg, /font-size="11"[^>]*>Country</, 'label floats in the small font');
});

/** Small (non-frame) paper knockout rects: the float helper draws one sized to
 *  the label, with a paper fill; the full-frame background rect is excluded by
 *  width (the frame here is 300 wide). */
const floatKnockouts = (svg) =>
  [...svg.matchAll(/<rect x="[\d.]+" y="[\d.]+" width="([\d.]+)" height="[\d.]+" fill="(#[0-9a-f]{6})"\/>/g)]
    .filter((m) => Number(m[1]) < 200)
    .map((m) => m[2]);

test('the floating label paints an opaque paper knockout so the outline breaks', () => {
  // A small paper rect sits behind the floated label so the field border does not
  // strike through it. Paper-colored, so it works in both themes.
  const light = render(wrap('Select "Country" value="Canada"')).svg;
  assert.deepEqual(floatKnockouts(light), ['#ffffff'], 'one paper knockout behind the floated label (light)');
  const dark = render(wrap('Select "Country" value="Canada"'), { theme: 'dark' }).svg;
  assert.deepEqual(floatKnockouts(dark), ['#1e2127'], 'the knockout is the dark paper in dark theme');
});

test('with NO value the label stays inside the field and does not float', () => {
  const { svg } = render(wrap('Select "Country"'));
  assert.match(svg, /Country/, 'the label shows as the field content');
  assert.doesNotMatch(svg, /font-size="11"/, 'no small floating label');
  assert.deepEqual(floatKnockouts(svg), [], 'no knockout rect when nothing floats');
});

test('the filled variant ALSO floats its label when a value is set (matches TextField)', () => {
  // MUI floats the label for outlined AND filled (TextField does the same). The
  // paper knockout sits over the filled field's hatched top edge so neither the
  // border nor the hatch strikes through the label.
  const { svg } = render(wrap('Select "Country" filled value="Canada"'));
  assert.match(svg, /Canada/, 'the value occupies the field');
  assert.match(svg, /font-size="11"[^>]*>Country</, 'filled floats the label in the small font');
  // Exactly one float knockout (a <rect>); the filled field's opaque BASE is a
  // <path>, not a <rect>, so it does not show up here.
  assert.deepEqual(floatKnockouts(svg), ['#ffffff'], 'one paper knockout behind the floated label');
});

test('the standard variant does NOT float: a small label over a bare underline reads oddly', () => {
  // standard is the deliberate exception (same as TextField): with a value it
  // keeps the value inside and drops the label, no float, no knockout.
  const { svg } = render(wrap('Select "Country" standard value="Canada"'));
  assert.match(svg, /Canada/, 'the value still shows');
  assert.doesNotMatch(svg, /font-size="11"/, 'standard must not float the label');
  assert.deepEqual(floatKnockouts(svg), [], 'standard draws no floating knockout');
});

test('a value with no label floats nothing (there is no label to lift)', () => {
  const { svg } = render(wrap('Select value="Canada"'));
  assert.match(svg, /Canada/);
  assert.doesNotMatch(svg, /font-size="11"/, 'nothing to float without a label');
  assert.deepEqual(floatKnockouts(svg), []);
});

test('floating the label adds no layout cost: geometry matches the no-value field', () => {
  // The float overlays the existing top border in the reserved field band, so the
  // box dims are identical with or without a value (minSize/pad untouched).
  const withVal = selBox(wrap('Select "Country" value="Canada"'));
  const noVal = selBox(wrap('Select "Country"'));
  assert.equal(withVal.w, noVal.w, 'width unchanged by floating');
  assert.equal(withVal.h, noVal.h, 'height unchanged by floating');
});

test('Select draws a dropdown caret', () => {
  const { svg } = render(wrap('Select "Country"'));
  assert.match(svg, /▾/);
});

test('outlined vs standard differ in field chrome (box vs underline)', () => {
  // An outlined field draws a full bordered box (a rough rectangle, four edges); a
  // standard one draws only a bottom underline (a single rough line). The box is
  // materially more geometry, so the outlined render is longer overall -- the only
  // thing that differs between these two renders is the field chrome.
  const outlined = render(wrap('Select "C" outlined')).svg;
  const standard = render(wrap('Select "C" standard')).svg;
  assert.notEqual(outlined, standard, 'outlined and standard should render differently');
  assert.ok(outlined.length > standard.length,
    `outlined box (${outlined.length} chars) should out-draw the standard underline (${standard.length})`);
});

test('filled variant adds a hatch tint the outlined one lacks', () => {
  // backgroundHatch fills with COLORS.hatch (#c4c4c4); outlined has no fill.
  assert.match(render(wrap('Select "C" filled')).svg, /#c4c4c4/);
  assert.doesNotMatch(render(wrap('Select "C" outlined')).svg, /#c4c4c4/);
});

test('the filled field is OPAQUE: its hatch lays down a paper base (task #1 opacity)', () => {
  // A filled Select is its own surface, so backgroundHatch is called with
  // base:true -- a solid COLORS.paper path under the hashes, so content behind a
  // filled Select can't show through the gaps. The base is paper-colored, so it
  // tracks the theme; the outlined variant (no fill) draws no such base.
  const solidPaper = (svg, hex) => (svg.match(new RegExp(`<path[^>]*fill="${hex}"`, 'g')) ?? []).length;
  const filled = render(wrap('Select "C" filled')).svg;
  assert.ok(solidPaper(filled, '#ffffff') >= 1, 'filled field draws an opaque paper base path');
  assert.doesNotMatch(render(wrap('Select "C" outlined')).svg, /<path[^>]*fill="#ffffff"/,
    'outlined draws no paper base (it is not a filled surface)');
  // The base is paper, so in the dark theme it is the dark paper, not white.
  const dark = render(wrap('Select "C" filled'), { theme: 'dark' }).svg;
  assert.ok(solidPaper(dark, '#1e2127') >= 1, 'the base is the dark paper in dark theme');
  assert.equal(solidPaper(dark, '#ffffff'), 0, 'no light paper leaks into the dark base');
});

test('a bare Select with no label still renders a placeholder field', () => {
  const { svg } = render(wrap('Select'));
  assert.match(svg, /Select/);
});

test('Select reads its quoted label directly: a filler token is rejected', () => {
  // Select does not set `text: true`, so a filler token must be a hard error
  // rather than silently swallowed.
  assert.throws(() => parse(wrap('Select ~3')));
});

test('to= makes a Select navigate (facade wraps it in a link)', () => {
  // `to` is a universal prop (injected by the registry); Select must not redeclare it.
  const src = 'Wireframe\n  Select "Go" to=#next\nWireframe #next\n  Typography "There"';
  const { svg } = render(src);
  assert.match(svg, /<a /);
});

test('composed Select + Option: a full dropdown lays out and renders', () => {
  const src = [
    'Wireframe',
    '  Select "Country" outlined',
    '    Option "United States" selected',
    '    Option "Canada"',
    '    Option "Mexico" subtext="MX"',
  ].join('\n');
  const doc = parse(src);
  assert.deepEqual(doc.diagnostics, []);
  const box = selBox(src);
  assert.equal(box.children.length, 3);
  // All three options share the same (full) width within the menu.
  const w0 = box.children[0].w;
  assert.ok(box.children.every((c) => Math.abs(c.w - w0) < 1),
    'all options should share the menu width');
  const { svg } = render(src);
  assert.match(svg, /Country/);   // the field
  assert.match(svg, /United States/);
  assert.match(svg, /#cfe0ee/);   // the selected option's accent tint
  assert.match(svg, /MX/);        // the subtext line
});

test('the closed field asks for enough width to show its value untrimmed', () => {
  // In a row (no cross-axis stretch on the main axis) an optionless Select used
  // to measure just 2*pad wide, trimming its own value; the minSize floor seats
  // the text + insets + caret instead.
  const src = 'Wireframe w=800 h=300\n  Stack row\n    Select v="50 rows"';
  const { svg } = render(src);
  assert.match(svg, />50 rows</);
  assert.doesNotMatch(svg, /…/);
});
