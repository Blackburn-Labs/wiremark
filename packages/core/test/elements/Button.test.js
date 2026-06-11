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
  for (const bg of ['hatch', 'crosshatch']) {
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
