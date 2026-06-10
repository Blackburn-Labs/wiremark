// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  Alert "Saved"';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];
/** Render only the first child's SVG markup is hard to isolate, so match the whole doc. */
const svgOf = (src) => render(src).svg;

test('Alert parses cleanly and resolves its keyless label', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);
  const alert = doc.frames[0].children[0];
  assert.equal(alert.component, 'Alert');
  assert.equal(alert.props.label, 'Saved');
});

test('label resolves keyless, keyed (label=), and via filler', () => {
  assert.equal(firstChild('Wireframe\n  Alert "Done"').props.label, 'Done');
  assert.equal(firstChild('Wireframe\n  Alert label="Keyed"').props.label, 'Keyed');
  // text:true => a bare ~N filler token feeds the drawn message (no explicit label).
  const filled = firstChild('Wireframe\n  Alert ~3');
  assert.equal(filled.props.label, undefined, 'filler is not a label');
  assert.ok(filled.filler, 'a ~N token resolves to filler');
  // The rendered banner carries placeholder text (lorem) rather than the fallback.
  assert.match(svgOf('Wireframe\n  Alert ~3'), /Lorem/);
});

test('the message reaches render (label drawn as text)', () => {
  assert.match(svgOf(SRC), />Saved</);
});

test('severity is a keyless enum accepting each value', () => {
  for (const s of ['error', 'warning', 'info', 'success']) {
    const doc = parse(`Wireframe\n  Alert ${s}`);
    assert.deepEqual(doc.diagnostics, [], `Alert ${s} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.severity, s);
  }
});

test('severity also accepts a keyed spelling', () => {
  assert.equal(firstChild('Wireframe\n  Alert severity=warning').props.severity, 'warning');
});

test('each severity renders a DISTINCT leading glyph', () => {
  // Monochrome: severity is shown by a glyph, not color. Map each to its glyph.
  const glyphs = { error: '!', warning: '?', info: 'i', success: '✓' };
  for (const [sev, glyph] of Object.entries(glyphs)) {
    const svg = svgOf(`Wireframe\n  Alert ${sev} "Msg"`);
    assert.ok(svg.includes(`>${glyph}<`), `${sev} should draw glyph ${glyph}`);
  }
  // And the four are genuinely different chrome: error (!) != success (✓).
  const err = svgOf('Wireframe\n  Alert error "Msg"');
  const ok = svgOf('Wireframe\n  Alert success "Msg"');
  assert.notEqual(err, ok, 'error and success must render differently');
});

test('severity defaults to success (the ✓ glyph) when omitted', () => {
  // The resolver injects no default, so the strategy applies it at draw time.
  assert.equal(firstChild(SRC).props.severity, undefined);
  assert.match(svgOf(SRC), />✓</);
});

test('variant is a keyless enum accepting each value', () => {
  for (const v of ['standard', 'filled', 'outlined']) {
    const doc = parse(`Wireframe\n  Alert ${v}`);
    assert.deepEqual(doc.diagnostics, [], `Alert ${v} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.variant, v);
  }
});

test('variant also accepts a keyed spelling', () => {
  assert.equal(firstChild('Wireframe\n  Alert variant=outlined').props.variant, 'outlined');
});

test('the three variants render distinguishably', () => {
  // outlined: border only, no hatch tint. standard/filled: hatch tint present
  // (gray #c4c4c4), and filled draws a heavier left accent bar than standard.
  const outlined = svgOf('Wireframe\n  Alert outlined "Msg"');
  const standard = svgOf('Wireframe\n  Alert standard "Msg"');
  const filled = svgOf('Wireframe\n  Alert filled "Msg"');

  assert.doesNotMatch(outlined, /stroke="#c4c4c4"/, 'outlined has no hatch tint');
  assert.match(standard, /stroke="#c4c4c4"/, 'standard has a hatch tint');
  assert.match(filled, /stroke="#c4c4c4"/, 'filled has a hatch tint');

  // filled's accent bar is heavier (stroke-width 3) than standard's (1.5).
  assert.match(filled, /stroke-width="3"/, 'filled draws a heavy accent bar');
  assert.doesNotMatch(standard, /stroke-width="3"/, 'standard draws a thin accent bar');
  assert.notEqual(standard, filled, 'standard and filled must render differently');
});

test('severity defaults applied: a bare Alert still draws a glyph and tint', () => {
  // No severity, no variant => success glyph + standard tint.
  const svg = svgOf('Wireframe\n  Alert "Hi"');
  assert.match(svg, />✓</);
  assert.match(svg, /stroke="#c4c4c4"/);
});

test('the keyless slots resolve independent of token order', () => {
  const expected = { severity: 'error', variant: 'filled', label: 'Oops' };
  for (const src of [
    'Wireframe\n  Alert error filled "Oops"',
    'Wireframe\n  Alert filled "Oops" error',
    'Wireframe\n  Alert "Oops" error filled',
    'Wireframe\n  Alert filled error "Oops"',
  ]) {
    const doc = parse(src);
    assert.deepEqual(doc.diagnostics, [], `${src} should parse cleanly`);
    const a = doc.frames[0].children[0];
    assert.deepEqual(
      { severity: a.props.severity, variant: a.props.variant, label: a.props.label },
      expected,
      `${src} should resolve identically`,
    );
  }
});

test('Alert lays out to a finite, positive box that stretches (block)', () => {
  for (const variant of ['standard', 'filled', 'outlined']) {
    for (const severity of ['error', 'warning', 'info', 'success']) {
      const box = firstBox(`Wireframe\n  Alert "Msg" ${variant} ${severity}`);
      assert.ok(Number.isFinite(box.w) && box.w > 0, `w finite & positive for ${variant}/${severity}`);
      assert.ok(Number.isFinite(box.h) && box.h > 0, `h finite & positive for ${variant}/${severity}`);
    }
  }
});

test('the filler prop selects a filler style', () => {
  const doc = parse('Wireframe\n  Alert filler=lorem ~2');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.filler, 'lorem');
});

test('an unknown enum token is a hard error', () => {
  assert.throws(() => parse('Wireframe\n  Alert chartreuse'), /chartreuse|enum|Alert/i);
});

test('two severity tokens are a duplicate-keyless error', () => {
  assert.throws(() => parse('Wireframe\n  Alert error warning'));
});

test('two variant tokens are a duplicate-keyless error', () => {
  assert.throws(() => parse('Wireframe\n  Alert filled outlined'));
});

test('Alert renders a hand-drawn path and its message', () => {
  const svg = svgOf(SRC);
  assert.match(svg, /<path/);
  assert.match(svg, /Saved/);
});
