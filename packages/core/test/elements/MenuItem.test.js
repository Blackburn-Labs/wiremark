// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

// MenuItem is a label leaf for a horizontal menu bar; it renders meaningfully
// only inside a row container. `Stack row` stands in for the Menubar so MenuItem
// can be exercised in isolation (the composed Menubar test is sequenced with the
// sibling dev once Menubar lands). `opaque=false` keeps the stand-in transparent so
// it adds no paper base of its own (Stack is opaque by default) -- these tests probe
// MenuItem's own paint, not the wrapper's.
const wrap = (line) => `Wireframe\n  Stack row opaque=false\n    ${line}`;

/** The MenuItem node (first child of the Stack, the frame's first child). */
const itemNode = (line) => parse(wrap(line)).frames[0].children[0].children[0];
/** The laid-out box of that MenuItem. */
const itemBox = (line) => layout(parse(wrap(line)))[0].root.children[0].children[0];

test('MenuItem parses cleanly and resolves its keyless label', () => {
  const doc = parse(wrap('MenuItem "File"'));
  assert.deepEqual(doc.diagnostics, []);
  const item = doc.frames[0].children[0].children[0];
  assert.equal(item.component, 'MenuItem');
  assert.equal(item.props.label, 'File');
});

test('label can also be given keyed as label=', () => {
  assert.equal(itemNode('MenuItem label="Edit"').props.label, 'Edit');
});

test('selected is a keyless boolean flag', () => {
  assert.equal(itemNode('MenuItem "File" selected').props.selected, true);
  // Absent by default (the resolver does not inject PropDef defaults).
  assert.equal(itemNode('MenuItem "File"').props.selected, undefined);
});

test('disabled is a keyless boolean flag', () => {
  assert.equal(itemNode('MenuItem "View" disabled').props.disabled, true);
  assert.equal(itemNode('MenuItem "View"').props.disabled, undefined);
});

test('selected and disabled can be combined in any order', () => {
  const item = itemNode('MenuItem disabled "Help" selected');
  assert.equal(item.props.label, 'Help');
  assert.equal(item.props.selected, true);
  assert.equal(item.props.disabled, true);
});

test('a duplicate keyless label (two string literals) is an error', () => {
  // At most one keyless literal slot; a second quoted string has nowhere to land.
  assert.throws(() => parse(wrap('MenuItem "One" "Two"')));
});

test('an unknown bare token is rejected (no silent swallow)', () => {
  // `enabled` is not a prop name, enum value, or sizing/filler token here.
  assert.throws(() => parse(wrap('MenuItem "File" enabled')));
});

test('MenuItem is NOT block-stretched: it sizes to its label', () => {
  // block:false -> a short label is narrow, a long one wider; neither fills the bar.
  const shortBox = itemBox('MenuItem "Hi"');
  const longBox = itemBox('MenuItem "A much longer menu label"');
  const stackBox = layout(parse(wrap('MenuItem "Hi"')))[0].root.children[0];
  assert.ok(longBox.w > shortBox.w,
    `a longer label should be wider (${longBox.w} vs ${shortBox.w})`);
  assert.ok(shortBox.w < stackBox.w,
    `a short item should not fill the bar width (${shortBox.w} vs ${stackBox.w})`);
});

test('MenuItem renders its label and a hand-drawn path', () => {
  const { svg } = render(wrap('MenuItem "File"'));
  assert.match(svg, /File/);
  assert.match(svg, /<text/);
});

test('a selected MenuItem tints its box with a hand-drawn hatch; an unselected one does not', () => {
  // selected -> a borderless hand-drawn hatch across the box (COLORS.hatch =
  // #c4c4c4 strokes), the house state-tint precedent (ToggleButton / TableRow),
  // NOT a solid flat fill. The hatch hashes are emitted only for a selected item.
  assert.match(render(wrap('MenuItem "On" selected')).svg, /stroke="#c4c4c4"/);
  assert.doesNotMatch(render(wrap('MenuItem "Off"')).svg, /stroke="#c4c4c4"/);
});

test('a selected MenuItem is a (B) highlight: it lays NO opaque paper base (stays see-through)', () => {
  // Task 1 / CONVENTION s.8: a selected-row highlight is a (B) caller -- it does
  // NOT opt into backgroundHatch's `base`, so it must add no solid paper fill of
  // its own (the only #ffffff in the frame is the background rect). A paper base
  // here would white out the row over a tinted parent. Regression guard for the
  // opt-in default: this catches a base accidentally leaking onto a (B) caller.
  const selected = render(wrap('MenuItem "On" selected')).svg;
  assert.doesNotMatch(selected, /<path d="[^"]*" fill="#ffffff" stroke="none"/,
    'a selected MenuItem must not draw an opaque paper base path');
});

test('a disabled MenuItem draws its label in muted ink', () => {
  // disabled -> the label fill is the muted color (COLORS.muted = #9aa7b2),
  // which an enabled item does not use for its label.
  const disabled = render(wrap('MenuItem "View" disabled')).svg;
  const enabled = render(wrap('MenuItem "View"')).svg;
  // The muted-ink label appears as a <text ... fill="#9aa7b2"> on the disabled item.
  assert.match(disabled, /<text[^>]*fill="#9aa7b2"/);
  assert.doesNotMatch(enabled, /<text[^>]*fill="#9aa7b2"/);
});

test('an unlabeled MenuItem falls back to a default label, no filler input', () => {
  // MenuItem reads a quoted-string label directly (no `text: true`), so a filler
  // token must be rejected rather than silently swallowed.
  assert.throws(() => parse(wrap('MenuItem ~3')), /text components/);
  // With nothing at all, it still renders a sensible placeholder.
  assert.match(render(wrap('MenuItem')).svg, /Menu/);
});

test('icon= reserves a leading slot so the item is wider than the same label alone', () => {
  // The icon-typed prop adds its slot + gap to the snug intrinsic width.
  const withIcon = itemBox('MenuItem "File" icon=Save');
  const without = itemBox('MenuItem "File"');
  assert.ok(withIcon.w > without.w,
    `an icon should widen the item (${withIcon.w} vs ${without.w})`);
});

test('a known icon name renders clean artwork (a scaled <g>), not the placeholder glyph', () => {
  // drawIcon inks a resolved name as a transformed <g> (iconBody); no diagnostic.
  const { svg, diagnostics } = render(wrap('MenuItem "File" icon=Save'));
  assert.match(svg, /<g transform="translate/);
  assert.deepEqual(diagnostics, []);
});

test('an unknown icon name falls back to the placeholder glyph with a soft diagnostic', () => {
  // An author-written name that resolves nowhere warns once and renders the glyph.
  const { diagnostics } = render(wrap('MenuItem "File" icon=NotARealIcon'));
  assert.ok(diagnostics.some((d) => /unknown icon "NotARealIcon"/.test(d.message)),
    'an unknown icon name should emit a soft diagnostic');
});

test('a bare token is never absorbed as the icon (icon must be keyed)', () => {
  // MenuItem's single literal slot targets the string `label`, so the keyless
  // icon-name fallback (Icon/Fab) does NOT apply: a bare token has nowhere to
  // land and is rejected, rather than silently becoming the icon.
  assert.throws(() => parse(wrap('MenuItem Save')));
  // Keyed, it resolves onto the icon prop as expected.
  assert.equal(itemNode('MenuItem "File" icon=Save').props.icon, 'Save');
});

test('a disabled MenuItem mutes its icon as well as its label', () => {
  // disabled -> drawIcon is inked muted, so the icon artwork uses COLORS.muted.
  const disabled = render(wrap('MenuItem "File" icon=Save disabled')).svg;
  assert.match(disabled, /fill="#9aa7b2"/);
});

test('to= makes a MenuItem navigate (facade wraps it in a link)', () => {
  // `to` is a universal prop (injected by the registry); MenuItem must not redeclare it.
  const src = 'Wireframe\n  Stack row\n    MenuItem "Go" to=#next\nWireframe #next\n  Typography "There"';
  const { svg } = render(src);
  assert.match(svg, /<a /);
});
