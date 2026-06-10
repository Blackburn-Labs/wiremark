// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  Tab "Overview"';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];

test('Tab parses with clean diagnostics and resolves its label', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const tab = doc.frames[0].children[0];
  assert.equal(tab.component, 'Tab');
  assert.equal(tab.props.label, 'Overview');
});

test('the quoted literal is keyless -> label', () => {
  const tab = firstChild('Wireframe\n  Tab "Details"');
  assert.equal(tab.props.label, 'Details');
});

test('label also accepts the keyed spelling', () => {
  const tab = firstChild('Wireframe\n  Tab label="Settings"');
  assert.deepEqual(parse('Wireframe\n  Tab label="Settings"').diagnostics, []);
  assert.equal(tab.props.label, 'Settings');
});

test('an unset label is absent (the strategy supplies the filler default)', () => {
  // The resolver does not inject PropDef defaults; an unset prop is absent.
  const tab = firstChild('Wireframe\n  Tab');
  assert.equal(tab.props.label, undefined);
});

test('a duplicate keyless literal is an author error', () => {
  // At most one keyless literal lands on `label`; a second quoted token collides.
  assert.throws(() => parse('Wireframe\n  Tab "One" "Two"'));
});

test('Tab lays out to a finite, positive box', () => {
  const box = firstBox(SRC);
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});

test('a longer label produces a wider tab (label drives intrinsic width)', () => {
  const short = firstBox('Wireframe\n  Tab "Hi"');
  const long = firstBox('Wireframe\n  Tab "A much longer tab label"');
  assert.ok(long.w > short.w, `long label width (${long.w}) should exceed short (${short.w})`);
});

test('block:false -- a tab sizes to its label rather than stretching its row', () => {
  // A wide sibling forces the row wider than a tab needs; a non-block leaf keeps
  // its intrinsic width instead of filling the cross/main axis on its own.
  const intrinsic = firstBox('Wireframe\n  Tab "Overview"').w;
  // Same tab beside a much wider Box: the tab must not balloon to match.
  const row = layout(parse('Wireframe\n  Stack row\n    Tab "Overview"\n    Box 400px 40px'));
  const tabBox = row[0].root.children[0].children[0];
  assert.equal(tabBox.w, intrinsic, 'tab width is its intrinsic label width, not stretched');
});

test('Tab renders its label and a hand-drawn document', () => {
  const { svg } = render(SRC);
  assert.match(svg, /Overview/);
  assert.match(svg, /<svg/);
});

test('an unlabeled Tab renders the filler default "Tab"', () => {
  const { svg } = render('Wireframe\n  Tab');
  assert.match(svg, />Tab</);
});

// --- composed with the sibling `Tabs` container (FAMILIES.md Family 2) ---------
// Tab is intrinsic-width and block:false; the strip's axis comes from Tabs'
// `orientation`. These assert RELATIVE ordering, not absolute pixels, so they
// survive Tabs' own gap/pad tuning.

test('a horizontal Tabs strip lays its Tabs in a row (shared y, increasing x)', () => {
  const tabs = layout(parse(
    'Wireframe\n  Tabs\n    Tab "Overview"\n    Tab "Details"\n    Tab "Settings"',
  ))[0].root.children[0].children;
  assert.equal(tabs.length, 3);
  assert.ok(tabs.every((t) => t.y === tabs[0].y), 'all tabs share a row baseline (same y)');
  assert.ok(tabs[0].x < tabs[1].x && tabs[1].x < tabs[2].x, 'tab x increases left to right');
});

test('Tabs vertical lays its Tabs in a column (shared x, increasing y)', () => {
  const tabs = layout(parse(
    'Wireframe\n  Tabs vertical\n    Tab "One"\n    Tab "Two"',
  ))[0].root.children[0].children;
  assert.equal(tabs.length, 2);
  assert.ok(tabs.every((t) => t.x === tabs[0].x), 'all tabs share a column (same x)');
  assert.ok(tabs[0].y < tabs[1].y, 'tab y increases top to bottom');
});

test('a Tab inside Tabs draws its own label (the strip chrome is the parent\'s)', () => {
  const { svg } = render('Wireframe\n  Tabs\n    Tab "Overview"\n    Tab "Details"');
  assert.match(svg, /Overview/);
  assert.match(svg, /Details/);
});
