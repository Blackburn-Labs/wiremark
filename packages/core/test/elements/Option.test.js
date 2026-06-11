// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

// Option is a menu row: it only renders meaningfully inside a container. A bare
// `List` parent is enough to exercise it in isolation (Select is its real parent,
// added in the composed test once that sibling lands).
const wrap = (line) => `Wireframe\n  List\n    ${line}`;

/** The Option node (first child of the List, which is the frame's first child). */
const optNode = (line) => parse(wrap(line)).frames[0].children[0].children[0];
/** The laid-out box of that Option. */
const optBox = (line) => layout(parse(wrap(line)))[0].root.children[0].children[0];

test('Option parses cleanly and resolves its keyless label', () => {
  const doc = parse(wrap('Option "United States"'));
  assert.deepEqual(doc.diagnostics, []);
  const opt = doc.frames[0].children[0].children[0];
  assert.equal(opt.component, 'Option');
  assert.equal(opt.props.label, 'United States');
});

test('label accepts its `text` alias as a keyed spelling', () => {
  const opt = optNode('Option text="Canada"');
  assert.equal(opt.props.label, 'Canada');
});

test('label can also be given keyed as label=', () => {
  const opt = optNode('Option label="Mexico"');
  assert.equal(opt.props.label, 'Mexico');
});

test('selected is a keyless boolean flag', () => {
  assert.equal(optNode('Option "US" selected').props.selected, true);
  // Absent by default (the resolver does not inject PropDef defaults).
  assert.equal(optNode('Option "US"').props.selected, undefined);
});

test('subtext is a keyed string secondary line', () => {
  const opt = optNode('Option "Mexico" subtext="MX"');
  assert.equal(opt.props.subtext, 'MX');
});

test('startIcon and endIcon are keyed icon-typed props (values are the names)', () => {
  const opt = optNode('Option "Home" startIcon="Home" endIcon="ChevronRight"');
  assert.equal(opt.props.startIcon, 'Home');
  assert.equal(opt.props.endIcon, 'ChevronRight');
});

test('icon names may be given bare -- icon-typed props accept unquoted values', () => {
  // type:'icon' parses like a string but takes BARE or quoted spellings
  // (tasks/ICONS.md ss.3): startIcon=Check === startIcon="Check".
  const opt = optNode('Option "Home" startIcon=Check');
  assert.equal(opt.props.startIcon, 'Check');
});

test('a duplicate keyed prop is an error', () => {
  assert.throws(() => parse(wrap('Option "A" subtext="x" subtext="y"')), /subtext/);
});

test('a duplicate keyless label (two string literals) is an error', () => {
  // At most one keyless literal slot; a second quoted string has nowhere to land.
  assert.throws(() => parse(wrap('Option "One" "Two"')));
});

test('Option is block-stretched to its container cross axis', () => {
  // block:true -> the row fills the List width rather than sizing to its label.
  const box = optBox('Option "Hi"');
  const listBox = layout(parse(wrap('Option "Hi"')))[0].root.children[0];
  assert.ok(box.w > 200, `a stretched option should be wide, got ${box.w}`);
  assert.ok(box.w >= listBox.w - 1, 'option width should fill the list cross axis');
});

test('a subtext row is taller than a single-line row', () => {
  const plain = optBox('Option "Mexico"');
  const withSub = optBox('Option "Mexico" subtext="MX"');
  assert.ok(withSub.h > plain.h, `subtext row (${withSub.h}) should exceed plain (${plain.h})`);
});

test('Option renders its label and a hand-drawn path', () => {
  const { svg } = render(wrap('Option "United States"'));
  assert.match(svg, /United States/);
  assert.match(svg, /<path/);
});

test('a selected Option tints its row with a hand-drawn hatch; unselected does not', () => {
  // selected -> a hand-drawn accent HATCH (the house state-highlight look), so the
  // accent (#cfe0ee) appears as hachure STROKES, never as a solid block fill.
  const sel = render(wrap('Option "On" selected')).svg;
  assert.match(sel, /stroke="#cfe0ee"/, 'tint is hatched (stroke), not solid');
  assert.doesNotMatch(sel, /fill="#cfe0ee"/, 'tint must not be a solid fill');
  assert.doesNotMatch(render(wrap('Option "Off"')).svg, /#cfe0ee/);
});

test('subtext text appears in the rendered SVG', () => {
  const { svg } = render(wrap('Option "Mexico" subtext="MX"'));
  assert.match(svg, /MX/);
});

test('unknown startIcon/endIcon names each add a placeholder glyph (extra paths) to the render', () => {
  const plain = render(wrap('Option "Plain"')).svg;
  const withIcons = render(wrap('Option "Iconed" startIcon="NoSuchIconAaa" endIcon="NoSuchIconBbb"')).svg;
  const count = (s) => (s.match(/<path/g) || []).length;
  assert.ok(count(withIcons) > count(plain),
    `icons should add paths (${count(withIcons)} vs ${count(plain)})`);
});

test('a known built-in icon renders clean vectors in place of the placeholder', () => {
  // 'Check' resolves at parse time onto node.icons and drawIcon emits a clean
  // <g translate/scale> wrapping the real artwork (the M9 16.17... check mark).
  const { svg, diagnostics } = render(wrap('Option "Done" startIcon=Check'));
  assert.deepEqual(diagnostics, []);
  assert.match(svg, /<g transform="translate\([^)]+\) scale\([^)]+\)" fill="/);
  assert.match(svg, /M9 16.17/);
});

test('a known endIcon renders clean vectors too (and still suppresses the selected check)', () => {
  const { svg, diagnostics } = render(wrap('Option "Next" selected endIcon=ArrowForward'));
  assert.deepEqual(diagnostics, []);
  assert.match(svg, /<g transform="translate\([^)]+\) scale\([^)]+\)" fill="/);
  // endIcon wins the right slot over the selected check mark, whose two
  // hand-drawn strokes are the only strokeWidth-1.6 marks Option ever draws.
  assert.doesNotMatch(svg, /stroke-width="1\.6"/, 'an explicit endIcon suppresses the selected check');
});

test('an unknown icon name renders the placeholder and warns at resolve time', () => {
  const doc = parse(wrap('Option "Hm" startIcon=NoSuchIconXyz'));
  // Annotated null (unresolved) + a soft "unknown icon" diagnostic.
  assert.equal(optNode('Option "Hm" startIcon=NoSuchIconXyz').icons.startIcon, null);
  assert.ok(
    doc.diagnostics.some((d) => /unknown icon "NoSuchIconXyz"/.test(d.message)),
    `diagnostics should warn about the unknown icon, got ${JSON.stringify(doc.diagnostics)}`,
  );
  // The fallback is the classic bordered square -- no clean-vector <g> appears.
  const { svg } = render(wrap('Option "Hm" startIcon=NoSuchIconXyz'));
  assert.doesNotMatch(svg, /scale\([^)]+\)" fill="/);
  assert.match(svg, /<path/);
});

test('an unlabeled Option falls back to a default label, no filler input', () => {
  // Option reads a quoted-string label directly (no `text: true`), so a filler
  // token must be rejected rather than silently swallowed.
  assert.throws(() => parse(wrap('Option ~3')), /text components/);
  // With nothing at all, it still renders a sensible placeholder.
  assert.match(render(wrap('Option')).svg, /Option/);
});

test('to= makes an Option navigate (facade wraps it in a link)', () => {
  // `to` is a universal prop (injected by the registry); Option must not redeclare it.
  const src = 'Wireframe\n  List\n    Option "Go" to=#next\nWireframe #next\n  Typography "There"';
  const { svg } = render(src);
  assert.match(svg, /<a /);
});

// --- composition with the real Select parent (FAMILIES Select/Option canonical) ---
// Sequenced with the Select dev: Options stack as the open menu beneath Select's
// closed field band (a col container reserving the band via top pad).
const SELECT_MENU = [
  'Wireframe',
  '  Select "Country" outlined',
  '    Option "United States" selected',
  '    Option "Canada"',
  '    Option "Mexico" subtext="MX"',
].join('\n');

test('Options compose under a Select: clean parse, full-width stack, real markers', () => {
  const doc = parse(SELECT_MENU);
  assert.deepEqual(doc.diagnostics, []);

  const select = layout(doc)[0].root.children[0];
  const opts = select.children;
  assert.equal(opts.length, 3, 'all three Options are children of the Select menu');

  // They stack vertically: shared left edge, strictly increasing top.
  assert.ok(opts.every((o) => o.x === opts[0].x), 'Options share a left edge (column)');
  assert.ok(opts[0].y < opts[1].y && opts[1].y < opts[2].y, 'Options stack top-to-bottom');

  // Equal full menu width (block-stretched to the Select's inner width).
  assert.ok(opts.every((o) => o.w === opts[0].w), 'Options are equal full menu width');
  assert.ok(opts[0].w > 200, `menu width should be substantial, got ${opts[0].w}`);

  // The menu sits below the field band: every Option starts below the Select top.
  assert.ok(opts[0].y > select.y, 'the first Option sits below the Select field band');

  // The subtext Option is the taller row; the plain ones share the base height.
  assert.equal(opts[0].h, opts[1].h, 'the two plain Options share a row height');
  assert.ok(opts[2].h > opts[0].h, 'the subtext Option is a taller row');

  // Render-level: the field label, the selected tint, and the subtext all appear.
  const { svg } = render(SELECT_MENU);
  assert.match(svg, /Country/, 'Select draws its field label');
  assert.match(svg, /United States/, 'the selected Option draws its label');
  assert.match(svg, /stroke="#cfe0ee"/, 'the selected Option tints its row with a hand-drawn hatch');
  assert.match(svg, /MX/, 'the subtext Option draws its secondary line');
});
