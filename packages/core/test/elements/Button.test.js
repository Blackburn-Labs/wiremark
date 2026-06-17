// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  Button "Buy" contained';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** First laid-out child box of the frame for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];

/**
 * Lay out a single Button inside a row Stack and return its box. In a row the
 * MAIN axis is width, so the button's intrinsic width shows through (at the
 * frame's top level a lone child is stretched to the content width, which would
 * mask intrinsic-width differences).
 * @param {string} tokens  the Button's tokens after `Button`
 */
const rowButtonBox = (tokens) =>
  layout(parse(`Wireframe\n  Stack row\n    Button ${tokens}`))[0].root.children[0].children[0];

test('Button parses with clean diagnostics and resolves label + variant', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const btn = doc.frames[0].children[0];
  assert.equal(btn.component, 'Button');
  assert.equal(btn.props.label, 'Buy');
  assert.equal(btn.props.variant, 'contained');
});

test('variant is a keyless enum accepting each value', () => {
  for (const v of ['text', 'outlined', 'contained']) {
    const doc = parse(`Wireframe\n  Button "Go" ${v}`);
    assert.deepEqual(doc.diagnostics, [], `Button ${v} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.variant, v);
  }
});

test('size is a second keyless enum accepting each value', () => {
  for (const s of ['small', 'medium', 'large']) {
    const doc = parse(`Wireframe\n  Button "Go" ${s}`);
    assert.deepEqual(doc.diagnostics, [], `Button ${s} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.size, s);
  }
});

test('variant and size (two keyless enums) resolve independent of token order', () => {
  // Disjoint value domains (CONVENTION s.2.1) => either ordering is unambiguous.
  const expected = { variant: 'contained', size: 'large' };
  for (const src of [
    'Wireframe\n  Button "Save" contained large',
    'Wireframe\n  Button "Save" large contained',
    'Wireframe\n  Button large "Save" contained',
  ]) {
    const b = firstChild(src);
    assert.deepEqual({ variant: b.props.variant, size: b.props.size }, expected, src);
    assert.equal(b.props.label, 'Save', src);
  }
});

test('background is a third keyless enum accepting each value', () => {
  for (const bg of ['hatch', 'crosshatch', 'none']) {
    const doc = parse(`Wireframe\n  Button "Go" contained ${bg}`);
    assert.deepEqual(doc.diagnostics, [], `Button ${bg} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.background, bg);
  }
  // Its domain is disjoint from variant and size, so the slots stay order-independent.
  const b = firstChild('Wireframe\n  Button crosshatch "Save" large contained');
  assert.deepEqual(
    { variant: b.props.variant, size: b.props.size, background: b.props.background },
    { variant: 'contained', size: 'large', background: 'crosshatch' }
  );
});

test('variant and size default to undefined when omitted (strategy applies defaults)', () => {
  // The resolver does not inject PropDef defaults; an unset prop is absent and the
  // strategy treats it as variant=text / size=medium.
  const b = firstChild('Wireframe\n  Button "Plain"');
  assert.equal(b.props.variant, undefined);
  assert.equal(b.props.size, undefined);
});

test('`primary` is no longer a valid token and is rejected', () => {
  // The filled look now comes from variant=contained; primary was removed.
  assert.throws(() => parse('Wireframe\n  Button "Buy" primary'), /unexpected token `primary`/);
});

test('disabled resolves as a keyless flag and as the keyed form', () => {
  assert.equal(firstChild('Wireframe\n  Button "X" disabled').props.disabled, true);
  assert.equal(firstChild('Wireframe\n  Button "X" disabled=true').props.disabled, true);
  assert.equal(firstChild('Wireframe\n  Button "X" disabled=false').props.disabled, false);
  // Default: absent when not given.
  assert.equal(firstChild('Wireframe\n  Button "X"').props.disabled, undefined);
});

test('fullWidth resolves as a keyless flag and as the keyed form', () => {
  assert.equal(firstChild('Wireframe\n  Button "X" fullWidth').props.fullWidth, true);
  assert.equal(firstChild('Wireframe\n  Button "X" fullWidth=true').props.fullWidth, true);
  assert.equal(firstChild('Wireframe\n  Button "X"').props.fullWidth, undefined);
});

test('startIcon and endIcon are keyed icon props, bare or quoted', () => {
  // type:'icon' parses like a string but also takes BARE values (ICONS.md ss.3):
  // startIcon=Mail === startIcon="Mail". Known names resolve without diagnostics.
  const src = 'Wireframe\n  Button "Send" startIcon=Mail endIcon="ArrowForward"';
  const doc = parse(src);
  assert.deepEqual(doc.diagnostics, []);
  const b = doc.frames[0].children[0];
  assert.equal(b.props.startIcon, 'Mail');
  assert.equal(b.props.endIcon, 'ArrowForward');
});

test('a known built-in icon renders as clean vectors in the slot', () => {
  // The resolver annotates node.icons and drawIcon emits a translate+scale <g>
  // wrapping the real artwork ('Check' is the M9 16.17... Material check mark).
  const { svg, diagnostics } = render('Wireframe\n  Button "Go" startIcon=Check');
  assert.deepEqual(diagnostics, []);
  assert.match(svg, /<g transform="translate\([^)]+\) scale\([^)]+\)" fill="/);
  assert.match(svg, /M9 16.17/);
});

test('an unknown icon name renders the placeholder square and warns', () => {
  const src = 'Wireframe\n  Button "Go" startIcon=NoSuchIconXyz';
  const doc = parse(src);
  // Annotated null (unresolved) + a soft "unknown icon" diagnostic at resolve time.
  assert.equal(doc.frames[0].children[0].icons.startIcon, null);
  assert.ok(
    doc.diagnostics.some((d) => /unknown icon "NoSuchIconXyz"/.test(d.message)),
    `diagnostics should warn about the unknown icon, got ${JSON.stringify(doc.diagnostics)}`,
  );
  // The fallback is the classic bordered square -- no clean-vector <g> appears.
  const { svg } = render(src);
  assert.doesNotMatch(svg, /scale\([^)]+\)" fill="/);
  assert.match(svg, /<path/);
});

test('disabled mutes a resolved icon along with the label', () => {
  // drawIcon inherits the button ink, so the clean artwork fills muted too.
  const { svg } = render('Wireframe\n  Button "Go" disabled startIcon=Check');
  assert.match(svg, /<g transform="translate\([^)]+\) scale\([^)]+\)" fill="#9aa7b2"/);
});

test('an icon with no label draws an icon-only button: glyph, NO label text', () => {
  // The label is optional -- an icon with no label/filler is how an icon button
  // is drawn (SPEC ss.5.4). The icon renders, but no <text> (and so no "Button"
  // fallback) appears: the whole button is just the glyph.
  const { svg, diagnostics } = render('Wireframe\n  Button startIcon=Check');
  assert.deepEqual(diagnostics, []);
  assert.match(svg, /M9 16.17/, 'the resolved Check artwork should render');
  assert.doesNotMatch(svg, /<text/, 'an icon-only button draws no label text at all');
  assert.doesNotMatch(svg, /Button/, 'the "Button" placeholder must not appear when an icon is given');
});

test('an icon-only button with an UNKNOWN icon still draws no label text', () => {
  // The placeholder square is a <path>, not a <text>; the suppression is driven
  // by "has an icon slot", not by whether the icon resolved.
  const { svg } = render('Wireframe\n  Button startIcon=NoSuchIconXyz');
  assert.doesNotMatch(svg, /<text/, 'still no label text for an unresolved icon-only button');
  assert.doesNotMatch(svg, /Button/);
  assert.match(svg, /<path/, 'the placeholder square still draws');
});

test('an icon-only button is roughly square and far narrower than a labeled one', () => {
  // Compact, square-ish padding (padY on every side, no wide label padX): a lone
  // medium icon is ICON(10) + 2*padY(9) = 28 on each side.
  const only = rowButtonBox('startIcon=Check');
  assert.ok(Math.abs(only.w - only.h) < 1, `icon-only should be ~square, got ${only.w}x${only.h}`);
  const labeled = rowButtonBox('"Check" startIcon=Check');
  assert.ok(only.w < labeled.w, `icon-only (${only.w}) should be narrower than labeled (${labeled.w})`);
  // It must NOT reserve room for the "Button" fallback string.
  const fallback = rowButtonBox('');
  assert.ok(only.w < fallback.w, `icon-only (${only.w}) must not reserve the "Button" label width (${fallback.w})`);
});

test('a start+end icon-only button seats both glyphs and still draws no label', () => {
  const both = rowButtonBox('startIcon=Check endIcon=Check');
  const one = rowButtonBox('startIcon=Check');
  assert.ok(both.w > one.w, `two icons (${both.w}) should be wider than one (${one.w})`);
  const { svg } = render('Wireframe\n  Button startIcon=Check endIcon=ArrowForward');
  assert.doesNotMatch(svg, /<text/, 'two icons, no label, still no text');
  // Both resolved glyphs render (Check + ArrowForward).
  const groups = svg.match(/<g transform="translate\([^)]+\) scale\([^)]+\)" fill="/g) || [];
  assert.ok(groups.length >= 2, `both icon glyphs should render, found ${groups.length}`);
});

test('startIcon/endIcon WITH a label keep the label AND draw both icons', () => {
  // Regression guard for the labeled path: adding icons must not suppress the
  // label when one is present.
  const { svg } = render('Wireframe\n  Button "Send" startIcon=Check endIcon=ArrowForward');
  assert.match(svg, /Send/, 'the label still renders alongside icons');
  const groups = svg.match(/<g transform="translate\([^)]+\) scale\([^)]+\)" fill="/g) || [];
  assert.ok(groups.length >= 2, `both icons should still render beside the label, found ${groups.length}`);
});

test('filler is rejected on Button, so an icon Button is always icon-only', () => {
  // Button is not a text component, so the icon-only test ("no label AND no
  // filler") collapses to "no label": filler can never put text on a Button.
  // (hasOwnText still consults node.filler to stay aligned with textOf's
  // contract, but the parser forbids filler here, so it can't fire.)
  assert.throws(
    () => parse('Wireframe\n  Button ~1 startIcon=Check'),
    /filler .* is only valid on text components/,
  );
});

test('to=#id and href=#id both populate the universal node.props.to', () => {
  // href is the spec alias for the universal nav prop (CONVENTION s.7); both
  // forms resolve to node.props.to so flow.js keeps working unchanged.
  assert.equal(firstChild('Wireframe\n  Button "Next" to=#home').props.to, 'home');
  assert.equal(firstChild('Wireframe\n  Button "Next" href=#home').props.to, 'home');
});

test('Button lays out to a finite, positive box', () => {
  const box = firstBox(SRC);
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});

test('larger sizes produce a bigger box than smaller sizes', () => {
  // Height differs at the frame's top level (cross-axis width is stretched there,
  // but height is intrinsic); width differs on the row main axis.
  const small = firstBox('Wireframe\n  Button "Go" small');
  const large = firstBox('Wireframe\n  Button "Go" large');
  assert.ok(large.h > small.h, `large (${large.h}) should be taller than small (${small.h})`);
  assert.ok(rowButtonBox('"Go" large').w > rowButtonBox('"Go" small').w, 'large should be wider than small');
});

test('icons widen the intrinsic box', () => {
  // Deliberately UNKNOWN names: an unresolved slot still draws (as the
  // placeholder) and reserves exactly the same ICON + ICON_GAP width.
  const plain = rowButtonBox('"Go"');
  const iconed = rowButtonBox('"Go" startIcon="x" endIcon="y"');
  assert.ok(iconed.w > plain.w, `iconed (${iconed.w}) should be wider than plain (${plain.w})`);
});

test('fullWidth stretches the button to the column width; a plain one stays intrinsic', () => {
  // In a column the cross axis is width: a plain (inline) button keeps its label
  // width, while a fullWidth button fills the stack width like a block leaf. Two
  // buttons in one stack so the comparison is against the same content width.
  const stack = layout(parse(
    'Wireframe landscape\n  Stack column\n    Button "Go"\n    Button "Go" fullWidth',
  ))[0].root.children[0];
  const [plain, full] = stack.children;
  assert.ok(full.w > plain.w, `fullWidth (${full.w}) should be wider than plain (${plain.w})`);
  assert.ok(Math.abs(full.w - stack.w) < 1, `fullWidth (${full.w}) should fill the stack width (${stack.w})`);
});

test('a label-less Button falls back to the "Button" placeholder', () => {
  const src = 'Wireframe\n  Button';
  const doc = parse(src);
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.label, undefined);
  assert.match(render(src).svg, /Button/);
});

test('Button renders its label and a hand-drawn path', () => {
  const { svg } = render(SRC);
  assert.match(svg, /Buy/);
  assert.match(svg, /<path/);
});

test('contained renders a hand-drawn hatch tint; text renders no surface chrome', () => {
  const contained = render('Wireframe\n  Button "A" contained').svg;
  const text = render('Wireframe\n  Button "A" text').svg;
  // The hatch tint (gray hashes, drawn as a stroked path) only appears for contained.
  assert.match(contained, /stroke="#c4c4c4"/);
  assert.doesNotMatch(text, /stroke="#c4c4c4"/);
});

test('contained lays an opaque paper base under the hatch; outlined/text do not', () => {
  // CONVENTION s.8 (Task 1): a contained button's hatch IS its own filled
  // surface, so it paints a borderless COLORS.paper (#ffffff) base path under
  // the hashes via backgroundHatch's `base:true` -- content behind a
  // background-frame chain must not bleed through the hatch gaps. outlined/text
  // draw no hatch, so no base path. (The frame's own paper is a <rect>, not a
  // <path>, so counting #ffffff-filled <path>s isolates the button's base.)
  const basePaths = (svg) => (svg.match(/<path[^>]*fill="#ffffff"[^>]*>/g) || []).length;
  const contained = render('Wireframe\n  Button "A" contained').svg;
  const outlined = render('Wireframe\n  Button "A" outlined').svg;
  const text = render('Wireframe\n  Button "A" text').svg;
  assert.equal(basePaths(contained), 1, 'contained should paint exactly one opaque paper base path');
  assert.equal(basePaths(outlined), 0, 'outlined draws no hatch and so no paper base');
  assert.equal(basePaths(text), 0, 'text draws no hatch and so no paper base');
});

test('contained background=none is opaque but untextured (paper base, no hashes)', () => {
  // `none` keeps the knock-out base (so a background-frame chain can't bleed
  // through) but draws no hatch -- a solid, plain contained surface.
  const basePaths = (svg) => (svg.match(/<path[^>]*fill="#ffffff"[^>]*>/g) || []).length;
  const none = render('Wireframe\n  Button "A" contained none').svg;
  assert.equal(basePaths(none), 1, 'background=none still paints exactly one opaque paper base');
  assert.doesNotMatch(none, /stroke="#c4c4c4"/, 'background=none draws no hatch marks');
});

test('the contained tint varies by background pattern + denseBackground', () => {
  const hatchSegs = (svg) => ((svg.match(/<path d="([^"]+)" fill="none" stroke="#c4c4c4"/) || [, ''])[1].match(/M/g) || []).length;
  const standard = render('Wireframe\n  Button "A" contained').svg;
  const dense = render('Wireframe\n  Button "A" contained denseBackground').svg;
  const cross = render('Wireframe\n  Button "A" contained background=crosshatch').svg;
  // denseBackground packs the same-direction hashes closer -> more segments.
  assert.ok(hatchSegs(dense) > hatchSegs(standard), `denseBackground should add hash lines: ${hatchSegs(dense)} vs ${hatchSegs(standard)}`);
  // crosshatch runs hashes in BOTH diagonal directions.
  const dirs = (svg) => {
    const d = (svg.match(/<path d="([^"]+)" fill="none" stroke="#c4c4c4"/) || [, ''])[1];
    let pos = 0, neg = 0;
    for (const s of d.split('M').filter(Boolean)) {
      const n = s.match(/-?\d+\.?\d*/g);
      if (n && n.length >= 4) ((+n[2] - +n[0]) * (+n[3] - +n[1]) > 0 ? pos++ : neg++);
    }
    return { pos, neg };
  };
  const ch = dirs(cross);
  assert.ok(ch.pos > 0 && ch.neg > 0, `crosshatch should run both ways, got +${ch.pos}/-${ch.neg}`);
});

test('disabled mutes the label color', () => {
  const svg = render('Wireframe\n  Button "A" disabled').svg;
  assert.match(svg, /fill="#9aa7b2"/); // COLORS.muted on the label
});

test('a label wider than the button box is trimmed with a trailing ellipsis', () => {
  // fullWidth in a narrow frame squeezes the box below the label's intrinsic
  // width (centeredLabel trims to box.w by default).
  const long = 'A very long button label indeed';
  const svg = render(`Wireframe w=160 h=200\n  Button "${long}" fullWidth`).svg;
  assert.match(svg, /…</, 'overflowing label should end in …');
  assert.doesNotMatch(svg, new RegExp(long), 'the full string should not be emitted');
});
