// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  CardHeader "Jane Doe"';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];

/** Signature of a clean drawIcon vector group (translate + scale) -- the frame's
 * own wrapper is a translate-only `<g>`, so the `scale(` is what marks real
 * icon artwork (ICONS.md ss.3). */
const ICON_G = /<g transform="translate\([^)]*\) scale\(/;

test('CardHeader parses cleanly and resolves its title from the keyless literal', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);
  const header = doc.frames[0].children[0];
  assert.equal(header.component, 'CardHeader');
  assert.equal(header.props.title, 'Jane Doe');
});

test('title accepts the keyed spelling and both aliases (label / text)', () => {
  for (const key of ['title', 'label', 'text']) {
    const doc = parse(`Wireframe\n  CardHeader ${key}="Settings"`);
    assert.deepEqual(doc.diagnostics, [], `${key}= should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.title, 'Settings');
  }
});

test('the title renders into the SVG', () => {
  const { svg } = render(SRC);
  assert.match(svg, /Jane Doe/);
  assert.match(svg, /<path/); // the glyph(s) / chrome are hand-drawn
});

test('a bare token lands on the keyless title, never on the keyed-only icon', () => {
  // icon is keyless:false, so a lone bare literal must resolve to the title slot.
  const header = firstChild('Wireframe\n  CardHeader "Person"');
  assert.equal(header.props.title, 'Person');
  assert.equal(header.props.icon, undefined);
});

test('subheader is a keyed prop with a subtext alias', () => {
  for (const key of ['subheader', 'subtext']) {
    const doc = parse(`Wireframe\n  CardHeader "Jane" ${key}="Admin"`);
    assert.deepEqual(doc.diagnostics, [], `${key}= should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.subheader, 'Admin');
  }
});

test('the subheader text renders into the SVG', () => {
  const { svg } = render('Wireframe\n  CardHeader "Jane" subheader="Administrator"');
  assert.match(svg, /Jane/);
  assert.match(svg, /Administrator/);
});

test('a header WITH a subheader lays out taller than one without', () => {
  const plain = firstBox('Wireframe\n  CardHeader "Jane"');
  const withSub = firstBox('Wireframe\n  CardHeader "Jane" subheader="Admin"');
  assert.ok(
    withSub.h > plain.h,
    `subheader header height (${withSub.h}) should exceed plain (${plain.h})`,
  );
});

test('icon is keyed and adds a leading icon slot', () => {
  const doc = parse('Wireframe\n  CardHeader "Jane" icon="Person"');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.icon, 'Person');

  // A header with a leading icon emits more artwork than one without it.
  const withIcon = render('Wireframe\n  CardHeader "Jane" icon="Person"').svg;
  const without = render('Wireframe\n  CardHeader "Jane" closeIcon="none"').svg;
  const paths = (svg) => (svg.match(/<path/g) ?? []).length;
  assert.ok(
    paths(withIcon) > paths(without),
    `icon header path count (${paths(withIcon)}) should exceed the icon-free header (${paths(without)})`,
  );
});

test('icon-typed props accept bare names: icon=Check === icon="Check" (ICONS.md ss.3)', () => {
  const bare = parse('Wireframe\n  CardHeader "Jane" icon=Check');
  assert.deepEqual(bare.diagnostics, []);
  assert.equal(bare.frames[0].children[0].props.icon, 'Check');
  const quoted = parse('Wireframe\n  CardHeader "Jane" icon="Check"');
  assert.equal(quoted.frames[0].children[0].props.icon, 'Check');
});

test('a known built-in icon name renders its real artwork as clean vectors', () => {
  const { svg, diagnostics } = render('Wireframe\n  CardHeader "Jane" icon="Check" closeIcon="none"');
  assert.deepEqual(diagnostics, []);
  assert.match(svg, ICON_G); // the clean drawIcon group
  assert.match(svg, /M9 16\.17/); // the built-in Check path data
});

test('an unknown icon name falls back to the placeholder glyph plus an "unknown icon" warning', () => {
  const { svg, diagnostics } = render('Wireframe\n  CardHeader "Jane" icon="NoSuchIconXyz" closeIcon="none"');
  assert.equal(diagnostics.length, 1);
  assert.match(diagnostics[0].message, /unknown icon "NoSuchIconXyz"/);
  // No clean vector group -- the slot degrades to the rough bordered-box glyph,
  // which still adds chrome over an icon-free header.
  assert.doesNotMatch(svg, ICON_G);
  const without = render('Wireframe\n  CardHeader "Jane" closeIcon="none"').svg;
  const paths = (s) => (s.match(/<path/g) ?? []).length;
  assert.ok(
    paths(svg) > paths(without),
    `placeholder header path count (${paths(svg)}) should exceed the icon-free header (${paths(without)})`,
  );
});

test('closeIcon defaults to "Close" and draws a real trailing Close X; closeIcon="none" omits it', () => {
  const withClose = render('Wireframe\n  CardHeader "Jane"').svg;
  const noClose = render('Wireframe\n  CardHeader "Jane" closeIcon="none"').svg;
  // The default is real built-in artwork, not the placeholder glyph...
  assert.match(withClose, ICON_G);
  // ...and "none" suppresses the slot entirely.
  assert.doesNotMatch(noClose, ICON_G);
  const paths = (svg) => (svg.match(/<path/g) ?? []).length;
  assert.ok(
    paths(withClose) > paths(noClose),
    `default (closeIcon=Close) path count (${paths(withClose)}) should exceed closeIcon="none" (${paths(noClose)})`,
  );
});

test('closeIcon accepts a custom icon name', () => {
  const doc = parse('Wireframe\n  CardHeader "Jane" closeIcon="MoreVert"');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.closeIcon, 'MoreVert');
});

test('an unset closeIcon resolves to the "Close" default and draws the same trailing icon', () => {
  // The resolver never injects PropDef defaults into props, but it DOES resolve
  // an icon-typed prop's default name and annotate its artwork onto
  // node.icons.closeIcon (ICONS.md ss.3); the element still applies "Close" in
  // its show/hide gate. A plain header and an explicit closeIcon="Close" must
  // therefore emit identical trailing artwork (same path count).
  const plain = render('Wireframe\n  CardHeader "Jane"').svg;
  const explicit = render('Wireframe\n  CardHeader "Jane" closeIcon="Close"').svg;
  const paths = (svg) => (svg.match(/<path/g) ?? []).length;
  assert.equal(
    paths(plain),
    paths(explicit),
    `default closeIcon (${paths(plain)}) should match explicit closeIcon="Close" (${paths(explicit)})`,
  );
  assert.ok(paths(plain) > 0, 'the default header should draw at least the close icon');
});

test('the unset closeIcon default is annotated with real artwork at resolve time', () => {
  const header = firstChild(SRC);
  assert.equal(header.props.closeIcon, undefined, 'props must stay untouched by the default');
  assert.ok(header.icons?.closeIcon?.body, 'node.icons.closeIcon should carry the resolved Close artwork');
});

test('a CardHeader is block: it stretches to its container cross axis', () => {
  // Inside a fixed-width Box the header fills the available width rather than
  // sizing to its label.
  const box = firstBox('Wireframe\n  Box 300px 80px\n    CardHeader "Jane"');
  const header = box.children[0];
  assert.ok(header.w > 200, `header should stretch toward the 300px box, got ${header.w}`);
});

test('a Card containing a CardHeader keeps it as a top-level Card part (no implicit-CardContent flatten)', () => {
  // The Card flatten rule must treat CardHeader as an explicit Card sub-part.
  const card = firstChild('Wireframe\n  Card\n    CardHeader "Settings"');
  assert.equal(card.component, 'Card');
  assert.deepEqual(card.children.map((c) => c.component), ['CardHeader']);
});

test('CardHeader composes with CardContent inside a Card', () => {
  const src = [
    'Wireframe',
    '  Card',
    '    CardHeader "Account" subheader="Manage your profile"',
    '    CardContent',
    '      Typography "Body"',
  ].join('\n');
  const doc = parse(src);
  assert.deepEqual(doc.diagnostics, []);
  const card = doc.frames[0].children[0];
  assert.deepEqual(card.children.map((c) => c.component), ['CardHeader', 'CardContent']);

  const { svg } = render(src);
  assert.match(svg, /Account/);
  assert.match(svg, /Manage your profile/);
  assert.match(svg, /Body/);
});

test('two text literals is a duplicate-title error', () => {
  assert.throws(
    () => parse('Wireframe\n  CardHeader "Jane" "Doe"'),
    /more than one text literal/i,
  );
});

test('setting the title via both the literal and title= is a duplicate error', () => {
  assert.throws(
    () => parse('Wireframe\n  CardHeader "Jane" title="Doe"'),
    /set more than once|title/i,
  );
});

test('CardHeader does not redeclare the universal to= prop, but accepts it', () => {
  // to= is injected by the registry; a header carrying it becomes a clickable region.
  const { svg } = render('Wireframe\n  CardHeader "Jane" to=#next');
  assert.match(svg, /<a class="wm-link" href="#next">/);
});

test('CardHeader lays out to a finite, positive box', () => {
  const box = firstBox(SRC);
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});
