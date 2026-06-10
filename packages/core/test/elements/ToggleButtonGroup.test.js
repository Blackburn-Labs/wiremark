// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

// A group with three ToggleButton children. These isolation tests use BARE
// ToggleButtons (no label) so they hold whether ToggleButton is still the stub
// (empty props) or the landed element -- the group's axis/geometry/border
// behavior is independent of the child's intrinsic size or props. The labeled
// canonical wireframe is exercised by the joint sibling test at the end, which is
// enabled once dev-togglebutton's element (with a keyless icon literal) lands.
const SRC = [
  'Wireframe',
  '  ToggleButtonGroup',
  '    ToggleButton',
  '    ToggleButton',
  '    ToggleButton',
].join('\n');

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** Laid-out box of the frame's first child (the group) for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];

test('ToggleButtonGroup parses with clean diagnostics and holds its buttons', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const group = doc.frames[0].children[0];
  assert.equal(group.component, 'ToggleButtonGroup');
  assert.equal(group.children.length, 3);
  assert.equal(group.children[0].component, 'ToggleButton');
});

test('orientation is a keyless enum accepting each value', () => {
  for (const o of ['horizontal', 'vertical']) {
    const doc = parse(`Wireframe\n  ToggleButtonGroup ${o}`);
    assert.deepEqual(doc.diagnostics, [], `ToggleButtonGroup ${o} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.orientation, o);
  }
});

test('orientation also accepts the keyed spelling', () => {
  const g = firstChild('Wireframe\n  ToggleButtonGroup orientation=vertical');
  assert.equal(g.props.orientation, 'vertical');
});

test('size is a second keyless enum accepting each value (parse-only/best-effort)', () => {
  // Per FAMILIES.md Family 5: the group can't resize its children (the engine
  // gives a child no parent context), so `size` is best-effort -- the contract is
  // only that it PARSES and lands on node.props.size.
  for (const s of ['small', 'medium', 'large']) {
    const doc = parse(`Wireframe\n  ToggleButtonGroup ${s}`);
    assert.deepEqual(doc.diagnostics, [], `ToggleButtonGroup ${s} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.size, s);
  }
});

test('size also accepts the keyed spelling', () => {
  const g = firstChild('Wireframe\n  ToggleButtonGroup size=large');
  assert.equal(g.props.size, 'large');
});

test('orientation and size (two keyless enums) resolve independent of token order', () => {
  // Disjoint value domains (CONVENTION s.2.1) => either ordering is unambiguous.
  const expected = { orientation: 'vertical', size: 'large' };
  for (const src of [
    'Wireframe\n  ToggleButtonGroup vertical large',
    'Wireframe\n  ToggleButtonGroup large vertical',
  ]) {
    const g = firstChild(src);
    assert.deepEqual({ orientation: g.props.orientation, size: g.props.size }, expected, src);
  }
});

test('orientation and size default to undefined when omitted (strategy applies defaults)', () => {
  // The resolver does not inject PropDef defaults; an unset prop is absent and the
  // strategy treats it as orientation=horizontal / size=medium.
  const g = firstChild('Wireframe\n  ToggleButtonGroup');
  assert.equal(g.props.orientation, undefined);
  assert.equal(g.props.size, undefined);
});

test('a bad orientation value is rejected', () => {
  assert.throws(() => parse('Wireframe\n  ToggleButtonGroup sideways'), /unexpected token `sideways`/);
});

test('a bad size value is rejected', () => {
  assert.throws(() => parse('Wireframe\n  ToggleButtonGroup huge'), /unexpected token `huge`/);
});

test('to=#id and href=#id both populate the universal node.props.to', () => {
  // The group must NOT redeclare to/href (CONVENTION s.7); the universal prop still works.
  assert.equal(firstChild('Wireframe\n  ToggleButtonGroup to=#home').props.to, 'home');
  assert.equal(firstChild('Wireframe\n  ToggleButtonGroup href=#home').props.to, 'home');
});

test('ToggleButtonGroup is a container: it lays out its buttons', () => {
  const box = firstBox(SRC);
  assert.equal(box.children.length, 3, 'the group should arrange its three buttons');
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});

test('default (horizontal) lays buttons out in a row: shared y, increasing x', () => {
  const box = firstBox(SRC);
  const [a, b, c] = box.children;
  // Row axis: same top, x advances left-to-right.
  assert.equal(a.y, b.y, 'row children share a y');
  assert.equal(b.y, c.y, 'row children share a y');
  assert.ok(a.x < b.x && b.x < c.x, `x should increase across the row (${a.x}, ${b.x}, ${c.x})`);
});

test('orientation=vertical lays buttons out in a column: shared x, increasing y', () => {
  const src = [
    'Wireframe',
    '  ToggleButtonGroup vertical',
    '    ToggleButton',
    '    ToggleButton',
    '    ToggleButton',
  ].join('\n');
  const box = firstBox(src);
  const [a, b, c] = box.children;
  assert.equal(a.x, b.x, 'column children share an x');
  assert.equal(b.x, c.x, 'column children share an x');
  assert.ok(a.y < b.y && b.y < c.y, `y should increase down the column (${a.y}, ${b.y}, ${c.y})`);
});

test('buttons abut (pad:0 gap:0): segmented-control layout has no gap between siblings', () => {
  // pad:0 gap:0 -> adjacent buttons share an edge on the main axis.
  const box = firstBox(SRC);
  const [a, b] = box.children;
  assert.equal(a.x + a.w, b.x, 'no gap between abutting buttons');
});

test('ToggleButtonGroup renders a unifying border (a hand-drawn surface)', () => {
  const { svg } = render(SRC);
  // The group draws its own surface (a stroked rect) tying the buttons together.
  assert.match(svg, /<path/);
  assert.match(svg, /stroke="#22303f"/); // COLORS.ink -- the surface border
});

// --- joint sibling test: ToggleButtonGroup + real ToggleButton ---------------
// The FAMILIES.md Family 5 canonical wireframe. This exercises labeled
// ToggleButton children (icon literal + `selected` + `size`), so it only runs
// once dev-togglebutton2's ToggleButton has landed. It asserts the GROUP's own
// contract (clean parse, holds its buttons, row arrangement); the buttons'
// internal chrome is ToggleButton's own test's concern, kept out here so the two
// suites don't couple.
const FAMILY_SRC = [
  'Wireframe',
  '  ToggleButtonGroup',
  '    ToggleButton "FormatBold" selected',
  '    ToggleButton "FormatItalic"',
  '    ToggleButton "FormatUnderlined" large',
].join('\n');

test('composes with real ToggleButton children: clean parse, three buttons, row layout', () => {
  const doc = parse(FAMILY_SRC);
  assert.deepEqual(doc.diagnostics, [], 'the canonical TBG family wireframe should parse cleanly');

  const group = doc.frames[0].children[0];
  assert.equal(group.component, 'ToggleButtonGroup');
  assert.equal(group.children.length, 3);
  assert.ok(group.children.every((c) => c.component === 'ToggleButton'), 'all three children are ToggleButtons');

  // The group lays its real buttons in a row (its own contract), default
  // orientation. The `large` button is taller than the default ones, and a row
  // centers children on the cross (vertical) axis, so their TOP y's differ -- the
  // row invariant is that x advances and every button shares the row's vertical
  // CENTER (they don't stack into a column).
  const box = firstBox(FAMILY_SRC);
  const [a, b, c] = box.children;
  assert.ok(a.x < b.x && b.x < c.x, `x should increase across the row (${a.x}, ${b.x}, ${c.x})`);
  const centerY = (k) => k.y + k.h / 2;
  assert.ok(Math.abs(centerY(a) - centerY(b)) < 1, 'row children share a vertical center');
  assert.ok(Math.abs(centerY(b) - centerY(c)) < 1, 'row children share a vertical center');
});
