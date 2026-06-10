// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];

/**
 * The thumb's anchor coordinates in the rendered SVG. The thumb ellipse is the
 * only path filled with the subtle surface fill (#eef2f5), so it is uniquely
 * identifiable regardless of how many track/frame paths surround it. rough.js
 * wobble means the path's start point isn't exactly the geometric center, but it
 * tracks the center monotonically -- enough to assert the thumb MOVES with `value`.
 * @param {string} src @returns {{ x: number, y: number }}
 */
const thumbAnchor = (src) => {
  const svg = render(src).svg;
  const m = /<path d="M(-?[0-9.]+) (-?[0-9.]+)[^"]*" fill="#eef2f5"/.exec(svg);
  assert.ok(m, 'expected a thumb path filled with #eef2f5');
  return { x: Number(m[1]), y: Number(m[2]) };
};
const thumbX = (src) => thumbAnchor(src).x;
const thumbY = (src) => thumbAnchor(src).y;

test('Slider parses cleanly as an inputs leaf with no diagnostics', () => {
  const doc = parse('Wireframe\n  Slider');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].component, 'Slider');
});

test('the resolver injects no defaults; props are absent until set', () => {
  // Defaults (value=0, min=0, max=100, orientation=horizontal) live in the
  // strategy, not the resolved node -- mirrors Chip's behavior.
  const s = firstChild('Wireframe\n  Slider');
  assert.equal(s.props.value, undefined);
  assert.equal(s.props.min, undefined);
  assert.equal(s.props.max, undefined);
  assert.equal(s.props.orientation, undefined);
});

test('a bare number is the keyless `value` slot', () => {
  const s = firstChild('Wireframe\n  Slider 30');
  assert.equal(s.props.value, 30);
  assert.equal(typeof s.props.value, 'number');
});

test('keyless `value` accepts negative and fractional numbers', () => {
  assert.equal(firstChild('Wireframe\n  Slider -5').props.value, -5);
  assert.equal(firstChild('Wireframe\n  Slider 12.5').props.value, 12.5);
});

test('value can be set with the keyed spelling', () => {
  const s = firstChild('Wireframe\n  Slider value=42');
  assert.equal(s.props.value, 42);
});

test('value accepts each alias (n / v / val)', () => {
  for (const alias of ['n', 'v', 'val']) {
    const doc = parse(`Wireframe\n  Slider ${alias}=7`);
    assert.deepEqual(doc.diagnostics, [], `Slider ${alias}=7 should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.value, 7, `${alias}= should map to value`);
  }
});

test('min and max are keyed numeric props', () => {
  const s = firstChild('Wireframe\n  Slider min=10 max=20');
  assert.equal(s.props.min, 10);
  assert.equal(s.props.max, 20);
});

test('orientation is a keyless enum accepting each value', () => {
  for (const o of ['horizontal', 'vertical']) {
    const doc = parse(`Wireframe\n  Slider ${o}`);
    assert.deepEqual(doc.diagnostics, [], `Slider ${o} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.orientation, o);
  }
});

test('orientation can also be set with the keyed spelling', () => {
  assert.equal(firstChild('Wireframe\n  Slider orientation=vertical').props.orientation, 'vertical');
});

test('the number slot and the enum slot resolve independent of token order', () => {
  for (const src of [
    'Wireframe\n  Slider 30 vertical',
    'Wireframe\n  Slider vertical 30',
  ]) {
    const doc = parse(src);
    assert.deepEqual(doc.diagnostics, [], `${src} should parse cleanly`);
    const s = doc.frames[0].children[0];
    assert.equal(s.props.value, 30);
    assert.equal(s.props.orientation, 'vertical');
  }
});

test('two bare numbers is an error (value set more than once)', () => {
  assert.throws(() => parse('Wireframe\n  Slider 30 40'), /value.*more than once/);
});

test('a bare number plus keyed value= is an error', () => {
  assert.throws(() => parse('Wireframe\n  Slider 30 value=40'), /more than once/);
});

test('a bad orientation enum value is an error', () => {
  assert.throws(() => parse('Wireframe\n  Slider diagonal'), /unexpected token|not valid/);
});

test('a quoted literal is rejected (Slider takes no text)', () => {
  assert.throws(() => parse('Wireframe\n  Slider "label"'), /does not take a text literal/);
});

test('Slider lays out to a finite, positive box in both orientations', () => {
  for (const o of ['horizontal', 'vertical']) {
    const box = firstBox(`Wireframe\n  Slider ${o}`);
    assert.ok(Number.isFinite(box.w) && box.w > 0, `w finite/positive for ${o}, got ${box.w}`);
    assert.ok(Number.isFinite(box.h) && box.h > 0, `h finite/positive for ${o}, got ${box.h}`);
  }
});

test('a horizontal Slider blocks to fill the column width', () => {
  // block:true stretches the cross axis. In the default frame's column the cross
  // axis is width, so the slider fills (much wider than its 120px intrinsic min).
  const box = firstBox('Wireframe\n  Slider');
  assert.ok(box.w > 120, `horizontal slider should stretch past its intrinsic min, got ${box.w}`);
});

test('the thumb moves right as value increases (horizontal)', () => {
  const lo = thumbX('Wireframe\n  Slider 0');
  const mid = thumbX('Wireframe\n  Slider 50');
  const hi = thumbX('Wireframe\n  Slider 100');
  assert.ok(lo < mid, `value 0 (${lo}) should sit left of value 50 (${mid})`);
  assert.ok(mid < hi, `value 50 (${mid}) should sit left of value 100 (${hi})`);
});

test('value is clamped to [min, max] (above max pins to the far end)', () => {
  const atMax = thumbX('Wireframe\n  Slider 100');
  const overMax = thumbX('Wireframe\n  Slider 999');
  assert.equal(overMax, atMax, 'value above max should clamp to the same position as max');
});

test('min/max reframe the value scale', () => {
  // With min=0 max=100, value=50 is mid-track; with min=0 max=200, value=50 is
  // only a quarter along, so it sits further left.
  const wide = thumbX('Wireframe\n  Slider 50 min=0 max=200');
  const narrow = thumbX('Wireframe\n  Slider 50 min=0 max=100');
  assert.ok(wide < narrow, `value 50 of 200 (${wide}) should sit left of 50 of 100 (${narrow})`);
});

test('min==max degrades gracefully (no NaN), thumb at the start', () => {
  const box = firstBox('Wireframe\n  Slider 50 min=10 max=10');
  assert.ok(Number.isFinite(box.w), 'box still finite when min==max');
  const x = thumbX('Wireframe\n  Slider 50 min=10 max=10');
  assert.ok(Number.isFinite(x), `thumb x finite when min==max, got ${x}`);
});

test('the thumb moves up as value increases (vertical: min at the bottom)', () => {
  // A vertical slider lives in a row so block fills its height. Higher value =>
  // thumb nearer the TOP => smaller y.
  const loVal = thumbY('Wireframe\n  Stack row\n    Slider 0 vertical');
  const hiVal = thumbY('Wireframe\n  Stack row\n    Slider 100 vertical');
  assert.ok(hiVal < loVal, `value 100 (y=${hiVal}) should sit above value 0 (y=${loVal})`);
});

test('Slider renders the track and the thumb as hand-drawn paths', () => {
  const svg = render('Wireframe\n  Slider 40').svg;
  // track stroked in the muted ink, thumb filled with the subtle surface fill.
  assert.match(svg, /<path/);
  assert.match(svg, /stroke="#9aa7b2"/, 'track should use the muted stroke');
  assert.match(svg, /fill="#eef2f5"/, 'thumb should use the subtle fill');
});

test('a Slider carrying to= is wrapped in a link by the facade', () => {
  const svg = render('Wireframe\n  Slider 30 to=#next').svg;
  assert.match(svg, /<a class="wm-link" href="#next">/);
});
