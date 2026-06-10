// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  ButtonGroup\n    Button "One"\n    Button "Two"\n    Button "Three"';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** First laid-out child box of the frame for `src` (the ButtonGroup itself). */
const firstBox = (src) => layout(parse(src))[0].root.children[0];

test('ButtonGroup parses cleanly and is a container holding its Button children', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const grp = doc.frames[0].children[0];
  assert.equal(grp.component, 'ButtonGroup');
  assert.equal(grp.children.length, 3);
  assert.deepEqual(grp.children.map((c) => c.component), ['Button', 'Button', 'Button']);
});

test('variant is a keyless enum accepting each value', () => {
  for (const v of ['text', 'outlined', 'contained']) {
    const doc = parse(`Wireframe\n  ButtonGroup ${v}\n    Button "Go"`);
    assert.deepEqual(doc.diagnostics, [], `ButtonGroup ${v} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.variant, v);
  }
});

test('orientation is a second keyless enum accepting each value', () => {
  for (const o of ['horizontal', 'vertical']) {
    const doc = parse(`Wireframe\n  ButtonGroup ${o}\n    Button "Go"`);
    assert.deepEqual(doc.diagnostics, [], `ButtonGroup ${o} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.orientation, o);
  }
});

test('variant also resolves via the keyed spelling', () => {
  const b = firstChild('Wireframe\n  ButtonGroup variant=contained\n    Button "Go"');
  assert.equal(b.props.variant, 'contained');
});

test('orientation also resolves via the keyed spelling', () => {
  const b = firstChild('Wireframe\n  ButtonGroup orientation=vertical\n    Button "Go"');
  assert.equal(b.props.orientation, 'vertical');
});

test('variant and orientation (two keyless enums) resolve independent of token order', () => {
  // Disjoint value domains (CONVENTION s.2.1) => either ordering is unambiguous.
  const expected = { variant: 'contained', orientation: 'vertical' };
  for (const src of [
    'Wireframe\n  ButtonGroup contained vertical\n    Button "Go"',
    'Wireframe\n  ButtonGroup vertical contained\n    Button "Go"',
  ]) {
    const g = firstChild(src);
    assert.deepEqual({ variant: g.props.variant, orientation: g.props.orientation }, expected, src);
  }
});

test('variant and orientation default to undefined when omitted (strategy applies defaults)', () => {
  // The resolver does not inject PropDef defaults; an unset prop is absent and the
  // strategy treats it as variant=outlined / orientation=horizontal.
  const g = firstChild('Wireframe\n  ButtonGroup\n    Button "Go"');
  assert.equal(g.props.variant, undefined);
  assert.equal(g.props.orientation, undefined);
});

test('an unknown token is rejected with a hard error', () => {
  assert.throws(
    () => parse('Wireframe\n  ButtonGroup zonk\n    Button "Go"'),
    /unexpected token `zonk`/,
  );
});

test('a value from the wrong enum is rejected (orientation token is not a variant)', () => {
  // `text` belongs to variant; passing it twice with another variant would also
  // collide, but here we assert a non-enum word stays an error.
  assert.throws(
    () => parse('Wireframe\n  ButtonGroup sideways\n    Button "Go"'),
    /unexpected token `sideways`/,
  );
});

test('a duplicate keyed prop is a hard error', () => {
  assert.throws(
    () => parse('Wireframe\n  ButtonGroup variant=text variant=contained\n    Button "Go"'),
    /variant/,
  );
});

test('to=#id and href=#id both populate the universal node.props.to', () => {
  // href is the spec alias for the universal nav prop (CONVENTION s.7).
  assert.equal(firstChild('Wireframe\n  ButtonGroup to=#home\n    Button "Go"').props.to, 'home');
  assert.equal(firstChild('Wireframe\n  ButtonGroup href=#home\n    Button "Go"').props.to, 'home');
});

test('ButtonGroup lays out to a finite, positive box', () => {
  const box = firstBox(SRC);
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});

test('horizontal (default) fuses the buttons in a row with zero gap', () => {
  const grp = firstBox(SRC);
  const [a, b, c] = grp.children;
  // A row lays children left-to-right; gap 0 means each child abuts the previous.
  assert.ok(b.x > a.x, 'second button is to the right of the first');
  assert.ok(c.x > b.x, 'third button is to the right of the second');
  assert.equal(Math.round(b.x), Math.round(a.x + a.w), 'second button abuts the first (no gap)');
  assert.equal(Math.round(c.x), Math.round(b.x + b.w), 'third button abuts the second (no gap)');
  // Same row => same top edge.
  assert.equal(Math.round(a.y), Math.round(b.y), 'row children share a top edge');
});

test('vertical orientation stacks the buttons in a column with zero gap', () => {
  const grp = firstBox('Wireframe\n  ButtonGroup vertical\n    Button "One"\n    Button "Two"\n    Button "Three"');
  const [a, b, c] = grp.children;
  // A column lays children top-to-bottom; gap 0 means each child abuts the previous.
  assert.ok(b.y > a.y, 'second button is below the first');
  assert.ok(c.y > b.y, 'third button is below the second');
  assert.equal(Math.round(b.y), Math.round(a.y + a.h), 'second button abuts the first (no gap)');
  assert.equal(Math.round(c.y), Math.round(b.y + b.h), 'third button abuts the second (no gap)');
  // Same column => same left edge.
  assert.equal(Math.round(a.x), Math.round(b.x), 'column children share a left edge');
});

test('orientation really changes the layout axis (horizontal vs vertical differ)', () => {
  const horiz = firstBox(SRC);
  const vert = firstBox('Wireframe\n  ButtonGroup vertical\n    Button "One"\n    Button "Two"\n    Button "Three"');
  // Horizontal: children spread on x, share y. Vertical: children spread on y.
  const horizSpreadsX = horiz.children[2].x > horiz.children[0].x
    && Math.round(horiz.children[0].y) === Math.round(horiz.children[2].y);
  const vertSpreadsY = vert.children[2].y > vert.children[0].y
    && Math.round(vert.children[0].x) === Math.round(vert.children[2].x);
  assert.ok(horizSpreadsX, 'horizontal group spreads along x');
  assert.ok(vertSpreadsY, 'vertical group spreads along y');
});

test('ButtonGroup draws no chrome of its own; the Buttons supply the paths', () => {
  // The group is invisible (mirrors Stack): every <path> in the output comes from
  // the Buttons (and their labels), not a group border. We assert the buttons'
  // contained hatch tint and labels are present, and that an EMPTY group emits no
  // path at all (nothing for the group itself to draw).
  const svg = render('Wireframe\n  ButtonGroup\n    Button "One" contained\n    Button "Two" contained').svg;
  assert.match(svg, /One/);
  assert.match(svg, /Two/);
  assert.match(svg, /stroke="#c4c4c4"/); // the contained Buttons' hatch tint

  // An empty ButtonGroup has no chrome of its own: its presence adds nothing to a
  // bare frame's output (the frame border is the only path either way).
  const bareFrame = render('Wireframe').svg;
  const withEmptyGroup = render('Wireframe\n  ButtonGroup').svg;
  assert.equal(withEmptyGroup, bareFrame, 'an empty ButtonGroup should draw no chrome');
});

test('a fused group is wider than a single button (children sum on the main axis)', () => {
  // Nest the group in a row Stack so its INTRINSIC main-axis width shows through:
  // at the frame's top level a lone child is stretched to the content width, which
  // would mask the difference (same trick as Button.test.js's rowButtonBox).
  const rowGroupBox = (inner) =>
    layout(parse(`Wireframe\n  Stack row\n    ButtonGroup\n${inner}`))[0].root.children[0].children[0];
  const one = rowGroupBox('      Button "Go"');
  const three = rowGroupBox('      Button "Go"\n      Button "Go"\n      Button "Go"');
  assert.ok(three.w > one.w, `three-button group (${three.w}) should be wider than one (${one.w})`);
});
