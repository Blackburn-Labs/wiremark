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

test('icon is a keyed string property', () => {
  const header = firstChild('Wireframe\n  AccordionHeader "Shipping" icon="ExpandMore"');
  assert.equal(header.props.icon, 'ExpandMore');
});

test('icon is keyed-only: it never absorbs a bare/keyless token', () => {
  // icon has keyless:false, so it is reachable ONLY via the keyed `icon="..."`
  // spelling -- a bare token can never land on it. The single keyless literal
  // slot is the title, and (per the engine) prose literals must be QUOTED: a bare
  // word that is neither a boolean flag nor a known enum is a hard error, not a
  // silent icon. So `"ChevronRight"` fills the title and leaves icon unset...
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
  assert.doesNotMatch(normal, new RegExp(`stroke="${MUTED}"`), 'normal bar should use ink strokes only');
});

test('a normal header strokes its border in the default ink', () => {
  const normal = render('Wireframe\n  AccordionHeader "Shipping"').svg;
  assert.match(normal, new RegExp(`stroke="${INK}"`));
});

test('expanded vs collapsed produce visibly different SVG (chevron direction)', () => {
  // The glyph diagonal flips with expanded, so the two renders differ even
  // though the wireframe-fidelity glyph is the same placeholder box.
  const expanded = render('Wireframe\n  AccordionHeader "Shipping" expanded').svg;
  const collapsed = render('Wireframe\n  AccordionHeader "Shipping"').svg;
  assert.notEqual(expanded, collapsed, 'expanded should render differently from collapsed');
});

test('render is deterministic across runs', () => {
  assert.equal(render(SRC).svg, render(SRC).svg);
});
