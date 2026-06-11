// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';
import { REGISTRY } from '../../src/registry.js';

/** First child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];

test('the quoted literal is keyless -> label', () => {
  const doc = parse('Wireframe\n  BottomNavigationAction "Home"');
  assert.deepEqual(doc.diagnostics, []);
  const action = doc.frames[0].children[0];
  assert.equal(action.component, 'BottomNavigationAction');
  assert.equal(action.props.label, 'Home');
});

test('icon= is a keyed icon prop (the icon NAME, quoted or bare)', () => {
  // icon is type:'icon' (ICONS.md ss.3): parses like a string but, unlike one,
  // accepts BARE values too -- icon=Home and icon="Home" are the same name.
  const doc = parse('Wireframe\n  BottomNavigationAction "Home" icon="Home"');
  assert.deepEqual(doc.diagnostics, []);
  const action = doc.frames[0].children[0];
  assert.equal(action.props.label, 'Home');
  assert.equal(action.props.icon, 'Home');
});

test('a BARE keyed icon value parses (icon-typed props need no quotes)', () => {
  // Previously a hard error under type:'string'; type:'icon' supersedes that
  // (ICONS.md ss.3 sign-off #3).
  const doc = parse('Wireframe\n  BottomNavigationAction "Home" icon=Home');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.icon, 'Home');
});

test('icon is keyed, NOT keyless: a second quoted literal is an error', () => {
  // Only one keyless literal slot (label). A second quoted literal has nowhere to
  // land -> the resolver rejects it, proving the icon NAME is keyed (icon="..."),
  // not a second keyless literal.
  assert.throws(
    () => parse('Wireframe\n  BottomNavigationAction "Home" "Search"'),
    'a second quoted literal must not silently become the icon',
  );
});

test('label and icon default to undefined when omitted', () => {
  const action = firstChild('Wireframe\n  BottomNavigationAction');
  assert.equal(action.props.label, undefined);
  assert.equal(action.props.icon, undefined);
});

test('a filler token is rejected (no text:true -- label is not filler)', () => {
  // The element does not set `text: true`, so a `~N` filler token has no home and
  // the resolver rejects it rather than silently swallowing it (dead-input guard).
  assert.throws(
    () => parse('Wireframe\n  BottomNavigationAction ~5'),
    'a filler token must not parse on a non-text element',
  );
});

test('the def declares exactly a leaf strategy (intrinsic, not layoutSpec) and flex:true', () => {
  const def = REGISTRY.BottomNavigationAction;
  assert.equal(typeof def.intrinsic, 'function', 'leaf must define intrinsic');
  assert.equal(def.layoutSpec, undefined, 'a leaf must NOT define layoutSpec');
  assert.equal(def.flex, true, 'an action must flex so bar siblings split width equally');
  assert.equal(def.block, false, 'an action keeps its intrinsic cross size');
});

test('the universal to= prop resolves (injected by registry.js, not redeclared)', () => {
  // `to` is injected universally; the element must NOT declare it. Parsing a to=
  // link cleanly proves there is no collision. The `#` anchor is stripped on the
  // `id`/`ref` coercion, so `to=#next` lands as `next`.
  const doc = parse('Wireframe\n  BottomNavigationAction "Home" to=#next');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.to, 'next');
});

test('lays out to a finite, positive box', () => {
  const box = firstBox('Wireframe\n  BottomNavigationAction "Home" icon="Home"');
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});

test('a long label widens the action box but height is fixed (icon+label stack)', () => {
  const short = firstBox('Wireframe\n  BottomNavigationAction "Hi"');
  const long = firstBox('Wireframe\n  BottomNavigationAction "Notifications"');
  assert.ok(long.w > short.w, `long label width (${long.w}) should exceed short (${short.w})`);
  assert.equal(long.h, short.h, 'the stack height is fixed regardless of label length');
});

test('a known built-in icon renders as clean vectors (not the placeholder)', () => {
  // 'Check' resolves against the built-in set onto node.icons at resolve time;
  // drawIcon emits a clean <g translate/scale> wrapping the real artwork.
  const { svg, diagnostics } = render('Wireframe\n  BottomNavigationAction "Done" icon=Check');
  assert.deepEqual(diagnostics, []);
  assert.match(svg, /M9 16\.17/, 'the Check artwork body should be present');
});

test('an UNKNOWN icon name renders the placeholder and warns (soft Diagnostic)', () => {
  const { svg, diagnostics } = render('Wireframe\n  BottomNavigationAction "Hm" icon="NoSuchIconXyz"');
  // Placeholder fallback: the muted bordered box + diagonal stroke, as before.
  assert.match(svg, /stroke="#9aa7b2"/, 'unknown names keep the classic placeholder glyph');
  assert.ok(
    diagnostics.some((d) => /unknown icon/.test(d.message)),
    `diagnostics should warn about the unknown icon, got ${JSON.stringify(diagnostics)}`,
  );
});

test('no icon at all still renders the placeholder glyph (no diagnostic)', () => {
  const { svg, diagnostics } = render('Wireframe\n  BottomNavigationAction "Home"');
  assert.deepEqual(diagnostics, []);
  assert.match(svg, /stroke="#9aa7b2"/, 'an unset icon slot keeps the muted placeholder');
});

test('renders its label text', () => {
  const { svg } = render('Wireframe\n  BottomNavigationAction "Profile"');
  assert.match(svg, /Profile/);
});

test('an action with no label still draws its icon (no label text)', () => {
  const { svg } = render('Wireframe\n  BottomNavigationAction icon="Home"');
  // The Home artwork itself, not just any <g translate> (the frame wrapper
  // emits one of those in every SVG, so it proves nothing).
  assert.match(svg, /M10 20v-6h4v6h5v-8h3L12 3L2 12h3v8z/, 'the resolved Home icon should still draw without a label');
});

test('to= wraps the action in an anchor (universal prop, facade-drawn)', () => {
  const { svg } = render('Wireframe\n  BottomNavigationAction "Home" to=#home');
  assert.match(svg, /<a /, 'a to=-bearing node is wrapped in an anchor by the render facade');
});
