// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  AccordionHeader "Shipping"';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];

// COLORS.muted from draw.js -- the disabled ink.
const MUTED = '#9aa7b2';
// COLORS.ink from draw.js -- the default ink.
const INK = '#22303f';
// The built-in ExpandMore / ExpandLess bodies' opening fragments (ICONS.md
// built-in set): the per-state default chevrons -- ExpandMore (down) when
// collapsed, ExpandLess (up) when expanded -- asserted as stable d fragments.
const EXPAND_MORE_D = 'M16.59 8.59';
const EXPAND_LESS_D = 'm12 8l-6 6';
// iconBody's clean-vector group: translate + SCALE. (The frame chrome also
// emits a translate-only <g>, so the scale is what distinguishes icon artwork.)
const ICON_GROUP = /<g transform="translate\([^"]*scale\(/;

test('AccordionHeader parses cleanly and resolves its keyless title', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const header = doc.frames[0].children[0];
  assert.equal(header.component, 'AccordionHeader');
  assert.equal(header.props.title, 'Shipping');
});

test('title aliases label= and text= map to the canonical title prop', () => {
  for (const key of ['label', 'text']) {
    const doc = parse(`Wireframe\n  AccordionHeader ${key}="Returns"`);
    assert.deepEqual(doc.diagnostics, [], `${key}= should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.title, 'Returns');
  }
});

test('the keyed title= spelling also works', () => {
  const header = firstChild('Wireframe\n  AccordionHeader title="Warranty"');
  assert.equal(header.props.title, 'Warranty');
});

test('booleans default to absent (strategy applies the false default)', () => {
  const header = firstChild(SRC);
  assert.equal(header.props.expanded, undefined);
  assert.equal(header.props.disabled, undefined);
});

test('expanded is a keyless boolean flag', () => {
  const doc = parse('Wireframe\n  AccordionHeader "Shipping" expanded');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.expanded, true);
});

test('disabled is a keyless boolean flag', () => {
  const doc = parse('Wireframe\n  AccordionHeader "Shipping" disabled');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.disabled, true);
});

test('title literal and the boolean flags resolve independent of order', () => {
  for (const src of [
    'Wireframe\n  AccordionHeader "Shipping" expanded disabled',
    'Wireframe\n  AccordionHeader expanded "Shipping" disabled',
    'Wireframe\n  AccordionHeader disabled expanded "Shipping"',
  ]) {
    const doc = parse(src);
    assert.deepEqual(doc.diagnostics, [], `${src} should parse cleanly`);
    const header = doc.frames[0].children[0];
    assert.equal(header.props.title, 'Shipping');
    assert.equal(header.props.expanded, true);
    assert.equal(header.props.disabled, true);
  }
});

test('icon is a keyed icon-typed property; bare and quoted values both work', () => {
  // type:'icon' parses like a string but the value may be bare (ICONS.md ss.3).
  for (const spelling of ['icon="ExpandMore"', 'icon=ExpandMore']) {
    const doc = parse(`Wireframe\n  AccordionHeader "Shipping" ${spelling}`);
    assert.deepEqual(doc.diagnostics, [], `${spelling} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.icon, 'ExpandMore');
  }
});

test('icon is keyed-only: it never absorbs a bare/keyless token', () => {
  // The single keyless LITERAL slot targets `title` (a string prop, not the
  // icon-typed prop), so the bare-token-as-icon-name reading (ICONS.md ss.3)
  // never applies here: icon is reachable ONLY via the keyed `icon=` spelling.
  // Prose literals must be QUOTED, and a bare word that is neither a boolean
  // flag nor a known enum is a hard error, not a silent icon. So
  // `"ChevronRight"` fills the title and leaves icon unset...
  const titled = firstChild('Wireframe\n  AccordionHeader "ChevronRight"');
  assert.equal(titled.props.title, 'ChevronRight');
  assert.equal(titled.props.icon, undefined);

  // ...while the SAME word bare (unquoted) is rejected outright -- it is not
  // quietly routed to icon.
  assert.throws(
    () => parse('Wireframe\n  AccordionHeader ChevronRight'),
    /unexpected token|ChevronRight/i,
  );
});

test('a second text literal is a hard error (one literal per element)', () => {
  assert.throws(
    () => parse('Wireframe\n  AccordionHeader "Shipping" "Returns"'),
    /literal/i,
  );
});

test('setting title twice (literal + keyed) is a duplicate error', () => {
  assert.throws(
    () => parse('Wireframe\n  AccordionHeader "Shipping" title="Returns"'),
    /set more than once|title/i,
  );
});

test('an unknown property is a hard error', () => {
  assert.throws(
    () => parse('Wireframe\n  AccordionHeader "Shipping" color=red'),
    /unknown property|color/i,
  );
});

test('AccordionHeader lays out to a finite, positive, full-width bar', () => {
  const frame = layout(parse(SRC))[0];
  const box = frame.root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
  // block:true -> the bar stretches to (nearly) the frame's content width, far
  // wider than its 160px intrinsic.
  assert.ok(box.w > 300, `block header should stretch full width, got ${box.w}`);
});

test('the header renders its title text and a hand-drawn path', () => {
  const { svg } = render(SRC);
  assert.match(svg, /Shipping/);
  assert.match(svg, /<path/);
});

test('an empty header draws a placeholder title rather than nothing', () => {
  const { svg } = render('Wireframe\n  AccordionHeader');
  assert.match(svg, /Section/);
});

test('a disabled header draws in the muted ink; a normal one does not', () => {
  const disabled = render('Wireframe\n  AccordionHeader "Shipping" disabled').svg;
  const normal = render('Wireframe\n  AccordionHeader "Shipping"').svg;
  assert.match(disabled, new RegExp(`stroke="${MUTED}"`), 'disabled bar should use muted strokes');
  // The ICON specifically (not the title <text>, which is also muted): drawIcon
  // emits the resolved chevron as a <g ... fill=ink> group.
  assert.match(disabled, new RegExp(`<g transform="translate\\([^"]*scale\\([^"]*" fill="${MUTED}"`),
    'disabled icon group should be muted too');
  assert.doesNotMatch(normal, new RegExp(`stroke="${MUTED}"`), 'normal bar should use ink strokes only');
});

test('a normal header strokes its border in the default ink', () => {
  const normal = render('Wireframe\n  AccordionHeader "Shipping"').svg;
  assert.match(normal, new RegExp(`stroke="${INK}"`));
});

test('expanded and collapsed both ink the chevron normally; only the glyph differs', () => {
  // The open/closed state reads from the chevron DIRECTION, not a colour: both
  // states draw the icon in the normal ink (no accent, no disabled tint), and
  // the glyph swaps ExpandLess (up, open) <-> ExpandMore (down, closed).
  const expanded = render('Wireframe\n  AccordionHeader "Shipping" expanded').svg;
  const collapsed = render('Wireframe\n  AccordionHeader "Shipping"').svg;
  assert.notEqual(expanded, collapsed, 'expanded should render differently from collapsed');
  // Both icon groups carry the normal ink fill -- expanded is NOT faded/tinted.
  const inkIcon = new RegExp(`<g transform="translate\\([^"]*scale\\([^"]*" fill="${INK}"`);
  assert.match(expanded, inkIcon, 'expanded chevron should be normal ink');
  assert.match(collapsed, inkIcon, 'collapsed chevron should be normal ink');
  // The DIRECTION carries the state: ExpandLess when open, ExpandMore when closed.
  assert.ok(expanded.includes(EXPAND_LESS_D), 'expanded draws the ExpandLess (up) chevron');
  assert.ok(collapsed.includes(EXPAND_MORE_D), 'collapsed draws the ExpandMore (down) chevron');
  assert.ok(!collapsed.includes(EXPAND_LESS_D), 'collapsed does not draw the ExpandLess glyph');
});

test('the default icon renders REAL ExpandMore vectors (no placeholder)', () => {
  // The resolver annotates the per-state default's artwork even when icon= is
  // unset (ICONS.md ss.3), so a plain (collapsed) header draws clean ExpandMore
  // vectors out of the box.
  const { svg, diagnostics } = render(SRC);
  assert.deepEqual(diagnostics, []);
  assert.match(svg, ICON_GROUP, 'should contain a clean icon group');
  assert.ok(svg.includes(EXPAND_MORE_D), 'should contain the built-in ExpandMore body');
});

test('an opt-in background tint adds an opaque paper base (Ruling 1 (A)-site)', () => {
  // A filled AccordionHeader is its own opaque surface, so the tint passes
  // base:true -- exactly one extra solid paper base under the hashes vs a plain
  // header (the frame's own paper paths are constant across both).
  const baseCount = (svg) => (svg.match(/fill="#ffffff"/g) || []).length;
  const plain = render('Wireframe\n  AccordionHeader "Shipping"').svg;
  const tinted = render('Wireframe\n  AccordionHeader "Shipping" background=hatch').svg;
  assert.notEqual(plain, tinted, 'the background tint should change the render');
  assert.equal(baseCount(tinted), baseCount(plain) + 1,
    'a tinted header paints exactly one extra opaque paper base');
});

test('expandedIcon and collapsedIcon override the per-state default chevrons', () => {
  const CHECK_D = 'M9 16.17';
  const exp = render('Wireframe\n  AccordionHeader "Shipping" expanded expandedIcon=Check').svg;
  assert.ok(exp.includes(CHECK_D), 'expanded state uses the overridden Check glyph');
  assert.ok(!exp.includes(EXPAND_LESS_D), 'the ExpandLess default is replaced when expanded');
  const col = render('Wireframe\n  AccordionHeader "Shipping" collapsedIcon=Check').svg;
  assert.ok(col.includes(CHECK_D), 'collapsed state uses the overridden Check glyph');
  assert.ok(!col.includes(EXPAND_MORE_D), 'the ExpandMore default is replaced when collapsed');
});

test('a known built-in icon name swaps in its artwork', () => {
  const { svg, diagnostics } = render('Wireframe\n  AccordionHeader "Shipping" icon=Check');
  assert.deepEqual(diagnostics, []);
  assert.match(svg, ICON_GROUP);
  assert.ok(svg.includes('M9 16.17'), 'should contain the built-in Check body');
  assert.ok(!svg.includes(EXPAND_MORE_D), 'the explicit icon replaces the ExpandMore default');
});

test('an unknown icon name falls back to the placeholder glyph + a warning', () => {
  const doc = parse('Wireframe\n  AccordionHeader "Shipping" icon=NoSuchIconXyz');
  assert.equal(doc.diagnostics.length, 1);
  assert.match(doc.diagnostics[0].message, /unknown icon/i);

  const { svg } = render('Wireframe\n  AccordionHeader "Shipping" icon=NoSuchIconXyz');
  assert.doesNotMatch(svg, ICON_GROUP, 'no clean-vector group for an unresolved name');
  // The placeholder keeps the pre-icons look: stroked in the header ink.
  assert.match(svg, new RegExp(`stroke="${INK}"`));
});

test('icon=none explicitly suppresses the artwork (placeholder slot, no warning)', () => {
  const doc = parse('Wireframe\n  AccordionHeader "Shipping" icon=none');
  assert.deepEqual(doc.diagnostics, [], 'none is "no icon", not an unknown name');
  const { svg } = render('Wireframe\n  AccordionHeader "Shipping" icon=none');
  assert.doesNotMatch(svg, ICON_GROUP);
});

test('render is deterministic across runs', () => {
  assert.equal(render(SRC).svg, render(SRC).svg);
});
