// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * BottomNavigation (FAMILIES.md FAMILY 6) -- the fixed bottom bar. It is a `row`
 * container (`pad:0`, `gap:0`) that draws a paper surface plus a top divider rule,
 * and stacks its children in a row that splits the bar width equally (each child
 * declaring `flex:true`).
 *
 * These tests stand on their own: they use Typography children (always available)
 * to exercise layout/render, and assert flex/equal-width via the sibling
 * BottomNavigationAction only in a guarded block that degrades gracefully until
 * the sibling lands (its stub draws a fixed 40x24 leaf and rejects `icon=`, so the
 * canonical family wireframe is sequenced behind it).
 *
 * The BottomNavigation box is the frame's only child: layout(doc)[0].root.children[0].
 */

const bar = (doc) => layout(doc)[0].root.children[0];

// --- Layout: a row container that fills the frame width -----------------------

test('BottomNavigation parses cleanly and is a container holding its children', () => {
  const doc = parse('Wireframe\n  BottomNavigation\n    Typography "Home"\n    Typography "Search"');
  assert.deepEqual(doc.diagnostics, []);
  const nav = doc.frames[0].children[0];
  assert.equal(nav.component, 'BottomNavigation');
  assert.equal(nav.children.length, 2);
});

test('BottomNavigation lays its children out in a row (shared top, increasing x)', () => {
  const doc = parse('Wireframe\n  BottomNavigation\n    Typography "Home"\n    Typography "Search"\n    Typography "Profile"');
  const box = bar(doc);
  assert.equal(box.node.component, 'BottomNavigation');
  const kids = box.children;
  assert.equal(kids.length, 3);
  // Row axis: children share a y (top) and step rightward in x.
  assert.equal(kids[0].y, kids[1].y);
  assert.equal(kids[1].y, kids[2].y);
  assert.ok(kids[0].x < kids[1].x, `x should increase across the row, got ${kids[0].x} !< ${kids[1].x}`);
  assert.ok(kids[1].x < kids[2].x, `x should increase across the row, got ${kids[1].x} !< ${kids[2].x}`);
});

test('BottomNavigation stretches to the full frame width', () => {
  const doc = parse('Wireframe\n  BottomNavigation\n    Typography "Home"');
  const frame = layout(doc)[0].root;
  const box = frame.children[0];
  // A container stretches to its parent's cross axis (here the frame width minus
  // its symmetric content pad), so the bar spans nearly the whole frame.
  assert.ok(box.w > frame.w * 0.8, `bar width ${box.w} should fill most of frame width ${frame.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});

// --- Render: paper surface + top divider rule ---------------------------------

test('BottomNavigation draws a hand-drawn surface and a top divider rule', () => {
  const { svg } = render('Wireframe\n  BottomNavigation\n    Typography "Home"\n    Typography "Search"');
  // Paper surface + divider are hand-drawn paths.
  assert.match(svg, /<path/);
  // The child text reaches the SVG, proving the row layoutSpec recursed.
  assert.match(svg, /Home/);
  assert.match(svg, /Search/);
});

test('the top divider is a muted thin rule along the bar top edge', () => {
  const doc = parse('Wireframe\n  BottomNavigation\n    Typography "Home"');
  const box = bar(doc);
  const { svg } = render('Wireframe\n  BottomNavigation\n    Typography "Home"');
  // The divider is drawn at strokeWidth 1 in the muted ink -- assert the muted
  // stroke appears (the surface uses ink at 1.2, so muted is the divider's tell).
  assert.match(svg, /stroke="#9aa7b2"/);
  assert.ok(Number.isFinite(box.y));
});

// --- Props: value (keyed string) ----------------------------------------------

test('value is a keyed (quoted) string that round-trips onto props (parse-only)', () => {
  const doc = parse('Wireframe\n  BottomNavigation value="recents"\n    Typography "Home"');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.value, 'recents');
});

test('value accepts a quoted multi-word string', () => {
  const doc = parse('Wireframe\n  BottomNavigation value="my tab"\n    Typography "Home"');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.value, 'my tab');
});

test('value accepts its v/val aliases (keyed string)', () => {
  for (const alias of ['v', 'val']) {
    const doc = parse(`Wireframe\n  BottomNavigation ${alias}="recents"\n    Typography "Home"`);
    assert.deepEqual(doc.diagnostics, [], `${alias}= should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.value, 'recents', `${alias}= should map to value`);
  }
});

test('a bare (unquoted) text value for value= is a hard error', () => {
  // Keyed string props require a quoted value (resolve.js coerce); a bare token is
  // rejected so wireframe authors quote free text explicitly.
  assert.throws(
    () => parse('Wireframe\n  BottomNavigation value=recents\n    Typography "Home"'),
    /value/,
  );
});

// --- Props: showLabels (keyed boolean, also a bare flag) ----------------------

test('showLabels resolves in keyed form', () => {
  const doc = parse('Wireframe\n  BottomNavigation showLabels=true\n    Typography "Home"');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.showLabels, true);
});

test('showLabels resolves as a bare boolean flag (implicit-boolean convention)', () => {
  const doc = parse('Wireframe\n  BottomNavigation showLabels\n    Typography "Home"');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.showLabels, true);
});

test('defaults: value/showLabels are unset in props when omitted', () => {
  // The resolver does not inject defaults (CONVENTION s.6); an omitted prop stays
  // undefined. The strategy treats a missing showLabels as the false default.
  const doc = parse('Wireframe\n  BottomNavigation\n    Typography "Home"');
  assert.deepEqual(doc.diagnostics, []);
  const nav = doc.frames[0].children[0];
  assert.equal(nav.props.value, undefined);
  assert.equal(nav.props.showLabels, undefined);
});

test('value and showLabels can be set together in any order', () => {
  const doc = parse('Wireframe\n  BottomNavigation showLabels value="home"\n    Typography "Home"');
  assert.deepEqual(doc.diagnostics, []);
  const nav = doc.frames[0].children[0];
  assert.equal(nav.props.showLabels, true);
  assert.equal(nav.props.value, 'home');
});

// --- Error: an unknown prop is rejected ---------------------------------------

test('an unknown keyed prop on BottomNavigation is a hard error', () => {
  assert.throws(
    () => parse('Wireframe\n  BottomNavigation bogus=1\n    Typography "Home"'),
    /bogus/,
  );
});

// --- Family: equal-width Actions (FAMILIES.md FAMILY 6) ------------------------
//
// FAMILIES.md FAMILY 6 canonical wireframe. BottomNavigationAction declares
// `flex:true`, so the bar's width is split equally between the actions. Its
// `icon=` is a keyed (quoted) string -- the icon NAME -- so it must be quoted.

const ACTION_SRC = [
  'Wireframe',
  '  BottomNavigation',
  '    BottomNavigationAction "Home" icon="Home"',
  '    BottomNavigationAction "Search" icon="Search"',
  '    BottomNavigationAction "Profile" icon="Person"',
].join('\n');

test('family: three Actions split the bar width equally (flex)', () => {
  const doc = parse(ACTION_SRC);
  assert.deepEqual(doc.diagnostics, []);
  const box = bar(doc);
  const kids = box.children;
  assert.equal(kids.length, 3);
  // Equal-flex children split the row width equally (within rounding).
  assert.ok(Math.abs(kids[0].w - kids[1].w) <= 1, `actions should be equal width, got ${kids[0].w} vs ${kids[1].w}`);
  assert.ok(Math.abs(kids[1].w - kids[2].w) <= 1, `actions should be equal width, got ${kids[1].w} vs ${kids[2].w}`);
  // ...and tile across the bar without overlap (row layout, gap 0).
  assert.ok(kids[0].x < kids[1].x && kids[1].x < kids[2].x);
});

test('family: BottomNavigation renders each Action label + a glyph', () => {
  const { svg } = render(ACTION_SRC);
  assert.match(svg, /Home/);
  assert.match(svg, /Search/);
  assert.match(svg, /Profile/);
  // The bar still draws its own surface chrome around the actions.
  assert.match(svg, /<path/);
});
