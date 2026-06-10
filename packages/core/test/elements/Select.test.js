// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

// A Select is a col container drawing its own closed field; its children are
// Options. We wrap it in a Wireframe frame and reach the Select node/box as the
// frame's first child.
const wrap = (body) => `Wireframe\n  ${body}`;

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

test('value (when set) is shown in the field instead of the label', () => {
  const { svg } = render(wrap('Select "Country" value="Canada"'));
  assert.match(svg, /Canada/);
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
