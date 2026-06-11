// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];

test('Progress parses cleanly with no props set (resolver injects no defaults)', () => {
  const doc = parse('Wireframe\n  Progress');
  assert.deepEqual(doc.diagnostics, []);
  const p = doc.frames[0].children[0];
  assert.equal(p.component, 'Progress');
  // The resolver does not inject PropDef defaults; unset props are absent.
  assert.equal(p.props.variant, undefined);
  assert.equal(p.props.value, undefined);
  assert.equal(p.props.min, undefined);
  assert.equal(p.props.max, undefined);
});

test('keyless number Progress 60 resolves to value=60', () => {
  const doc = parse('Wireframe\n  Progress 60');
  assert.deepEqual(doc.diagnostics, []);
  assert.equal(doc.frames[0].children[0].props.value, 60);
});

test('keyed value= sets value', () => {
  const p = firstChild('Wireframe\n  Progress value=42');
  assert.equal(p.props.value, 42);
});

test('each value alias (n, v, val) routes to value', () => {
  for (const alias of ['n', 'v', 'val']) {
    const doc = parse(`Wireframe\n  Progress ${alias}=75`);
    assert.deepEqual(doc.diagnostics, [], `${alias}= should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.value, 75, `${alias}= should set value`);
  }
});

test('value accepts fractional and negative numbers', () => {
  assert.equal(firstChild('Wireframe\n  Progress 33.5').props.value, 33.5);
  assert.equal(firstChild('Wireframe\n  Progress -10').props.value, -10);
});

test('keyed min and max set the range', () => {
  const p = firstChild('Wireframe\n  Progress value=5 min=0 max=10');
  assert.equal(p.props.min, 0);
  assert.equal(p.props.max, 10);
  assert.equal(p.props.value, 5);
});

test('variant is a keyless enum accepting linear and circular', () => {
  for (const variant of ['linear', 'circular']) {
    const doc = parse(`Wireframe\n  Progress ${variant}`);
    assert.deepEqual(doc.diagnostics, [], `Progress ${variant} should parse cleanly`);
    assert.equal(doc.frames[0].children[0].props.variant, variant);
  }
});

test('keyless number and keyless variant resolve independent of token order', () => {
  for (const src of [
    'Wireframe\n  Progress circular 60',
    'Wireframe\n  Progress 60 circular',
  ]) {
    const doc = parse(src);
    assert.deepEqual(doc.diagnostics, [], `${src} should parse cleanly`);
    const p = doc.frames[0].children[0];
    assert.equal(p.props.variant, 'circular');
    assert.equal(p.props.value, 60);
  }
});

test('a duplicate bare numeric token is a hard error', () => {
  assert.throws(
    () => parse('Wireframe\n  Progress 60 70'),
    /value.*set more than once|set more than once/,
  );
});

test('value set via both keyless and keyed is a hard error', () => {
  assert.throws(
    () => parse('Wireframe\n  Progress 60 value=70'),
    /set more than once/,
  );
});

test('an out-of-enum variant value is a hard error', () => {
  assert.throws(
    () => parse('Wireframe\n  Progress variant=spinny'),
    /not valid for "variant="/,
  );
});

test('a quoted value is rejected (numbers are bare)', () => {
  assert.throws(
    () => parse('Wireframe\n  Progress value="60"'),
    /expects a number/,
  );
});

// --- layout: the two variants are structurally different ----------------------

test('linear is a full-width thin bar; circular is a fixed square', () => {
  const lin = firstBox('Wireframe\n  Progress linear');
  const circ = firstBox('Wireframe\n  Progress circular');
  // Linear blocks to the parent cross axis -> much wider than tall.
  assert.ok(lin.w > lin.h, `linear should be wide: ${lin.w}x${lin.h}`);
  // Circular keeps a fixed square footprint (does not stretch).
  assert.equal(circ.w, circ.h, `circular should be square: ${circ.w}x${circ.h}`);
  assert.ok(circ.w < lin.w, `circular (${circ.w}) should be narrower than the stretched bar (${lin.w})`);
});

test('the default (no variant) lays out as the linear bar', () => {
  const def = firstBox('Wireframe\n  Progress');
  assert.ok(def.w > def.h, `default should be the wide linear bar: ${def.w}x${def.h}`);
});

test('every variant lays out to a finite, positive box', () => {
  for (const variant of ['linear', 'circular']) {
    const box = firstBox(`Wireframe\n  Progress ${variant} value=50`);
    assert.ok(Number.isFinite(box.w) && box.w > 0, `w finite & positive for ${variant}, got ${box.w}`);
    assert.ok(Number.isFinite(box.h) && box.h > 0, `h finite & positive for ${variant}, got ${box.h}`);
  }
});

// --- render: the filled portion reflects value --------------------------------

/** Total drawn path length across all rendered <path> elements (a fill proxy). */
const pathChars = (svg) => svg.match(/<path/g)?.length ?? 0;

test('linear renders a hand-drawn track and a crosshatched fill when value > 0', () => {
  const { svg } = render('Wireframe\n  Progress linear value=50');
  assert.match(svg, /<path/);
  // The filled run is hand-drawn gray crosshatch (the wireframe tint), never solid.
  assert.match(svg, /stroke="#c4c4c4"/); // COLORS.hatch
  assert.doesNotMatch(svg, /fill="#cfe0ee"/);
});

test('linear at value=0 draws the track but NO crosshatched fill', () => {
  const svg = render('Wireframe\n  Progress linear value=0').svg;
  assert.match(svg, /<path/); // the track still draws
  assert.doesNotMatch(svg, /stroke="#c4c4c4"/);
});

test('a higher linear value paints a wider fill (more path geometry) than a lower one', () => {
  // The crosshatched sub-rect grows with value; rough.js emits more hatch paths
  // for a larger area, so the full-value render has at least as many paths.
  const low = render('Wireframe\n  Progress linear value=10').svg;
  const high = render('Wireframe\n  Progress linear value=90').svg;
  assert.ok(
    pathChars(high) >= pathChars(low),
    `value=90 (${pathChars(high)} paths) should be >= value=10 (${pathChars(low)} paths)`,
  );
});

test('circular renders a ring (rellipse path) and an arc for value > 0', () => {
  const empty = render('Wireframe\n  Progress circular value=0').svg;
  const filled = render('Wireframe\n  Progress circular value=75').svg;
  assert.match(filled, /<path/);
  // The swept arc adds chord strokes, so a filled ring has strictly more paths
  // than an empty one (which is just the ring outline).
  assert.ok(
    pathChars(filled) > pathChars(empty),
    `filled circular (${pathChars(filled)}) should have more paths than empty (${pathChars(empty)})`,
  );
});

test('a fuller circular arc draws more chords than a smaller one', () => {
  const quarter = render('Wireframe\n  Progress circular value=25').svg;
  const full = render('Wireframe\n  Progress circular value=100').svg;
  assert.ok(
    pathChars(full) > pathChars(quarter),
    `value=100 (${pathChars(full)}) should have more arc paths than value=25 (${pathChars(quarter)})`,
  );
});

test('value is clamped to the range: an over-max value draws like a full bar', () => {
  // value above max clamps to a full fill; it must not throw or blow up geometry.
  const over = render('Wireframe\n  Progress linear value=999 max=100').svg;
  const full = render('Wireframe\n  Progress linear value=100 max=100').svg;
  assert.equal(pathChars(over), pathChars(full));
});

test('min==max degrades to an empty fill rather than dividing by zero', () => {
  const svg = render('Wireframe\n  Progress linear value=5 min=5 max=5').svg;
  assert.match(svg, /<path/);
  assert.doesNotMatch(svg, /stroke="#c4c4c4"/); // no fill since the fraction is 0
});

test('custom min/max scales the fill: value at the midpoint fills about half', () => {
  // With min=0 max=10 value=5, the fraction is 0.5 -- the fill is non-empty.
  const svg = render('Wireframe\n  Progress linear value=5 min=0 max=10').svg;
  assert.match(svg, /stroke="#c4c4c4"/);
});

// --- thickness: a keyless enum scaling the bar height / ring stroke -----------

test('thickness is a keyless enum, order-independent with variant and value', () => {
  for (const src of [
    'Wireframe\n  Progress linear 50 large',
    'Wireframe\n  Progress large linear 50',
    'Wireframe\n  Progress 50 large linear',
  ]) {
    const doc = parse(src);
    assert.deepEqual(doc.diagnostics, [], `${src} should parse cleanly`);
    const p = doc.frames[0].children[0];
    assert.equal(p.props.thickness, 'large');
    assert.equal(p.props.variant, 'linear');
    assert.equal(p.props.value, 50);
  }
  assert.equal(firstChild('Wireframe\n  Progress thickness=small').props.thickness, 'small');
});

test('linear bar height grows with thickness; medium is the default height', () => {
  const h = (t) => firstBox(`Wireframe\n  Progress linear ${t}`).h;
  assert.ok(h('small') < h('medium'), `small (${h('small')}) < medium (${h('medium')})`);
  assert.ok(h('medium') < h('large'), `medium (${h('medium')}) < large (${h('large')})`);
  assert.equal(firstBox('Wireframe\n  Progress linear').h, h('medium'), 'omitted thickness should match medium');
});

test('thickness never changes the circular footprint, only its stroke width', () => {
  const def = firstBox('Wireframe\n  Progress circular');
  for (const t of ['small', 'medium', 'large']) {
    const box = firstBox(`Wireframe\n  Progress circular ${t}`);
    assert.equal(box.w, def.w, `${t} should keep the ring width`);
    assert.equal(box.h, def.h, `${t} should keep the ring height`);
  }
  // The stroke weight is what changes: large draws the ring/arc with widths a
  // medium ring never uses.
  const large = render('Wireframe\n  Progress circular value=50 large').svg;
  const medium = render('Wireframe\n  Progress circular value=50').svg;
  assert.match(large, /stroke-width="3.2"/); // the large track ring
  assert.match(large, /stroke-width="4"/); // the large value arc
  assert.doesNotMatch(medium, /stroke-width="3.2"/);
  assert.doesNotMatch(medium, /stroke-width="4"/);
});
