// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

// A wrapped child (AppBar -> Toolbar -> Typography) proves children flow through
// the AppBar's row layoutSpec all the way down to a real text leaf.
const SRC = 'Wireframe landscape\n  AppBar\n    Toolbar\n      Typography h6 "Acme"';
// Same content under an explicit variant, for variant/metric assertions.
const withVariant = (v) => `Wireframe landscape\n  AppBar ${v}\n    Toolbar\n      Typography h6 "Acme"`;

/** The laid-out AppBar box for a given source. */
const barBox = (src) => layout(parse(src))[0].root.children[0];

test('AppBar parses with clean diagnostics', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);
});

test('variant resolves keyless for both values, with clean diagnostics', () => {
  for (const v of ['regular', 'dense']) {
    const doc = parse(withVariant(v));
    assert.deepEqual(doc.diagnostics, [], `${v} should parse clean`);
    const appBar = doc.frames[0].children[0];
    assert.equal(appBar.props.variant, v, `keyless ${v} -> props.variant`);
  }
});

test('variant is omitted from props when not given (default applied in strategy)', () => {
  // The resolver does not inject defaults; an unset enum is undefined and the
  // strategy treats it as 'regular'.
  const appBar = parse(SRC).frames[0].children[0];
  assert.equal(appBar.props.variant, undefined);
});

test('AppBar lays out to a finite box spanning ~the full frame content width', () => {
  const box = barBox(SRC);
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
  // landscape frame is 1280 wide; minus the frame's 16px padding each side -> 1248.
  assert.ok(box.w >= 1240, `AppBar should span near the full content width (~1248), got ${box.w}`);
});

test('both variants lay out finite & positive', () => {
  for (const v of ['regular', 'dense']) {
    const box = barBox(withVariant(v));
    assert.ok(Number.isFinite(box.w) && box.w > 0, `${v} w finite & positive, got ${box.w}`);
    assert.ok(Number.isFinite(box.h) && box.h > 0, `${v} h finite & positive, got ${box.h}`);
  }
});

test('dense is visibly tighter than regular (shorter bar)', () => {
  const regular = barBox(withVariant('regular'));
  const dense = barBox(withVariant('dense'));
  assert.equal(regular.w, dense.w, 'both variants still span the full width');
  assert.ok(dense.h < regular.h,
    `dense bar should be shorter than regular: dense=${dense.h} regular=${regular.h}`);
});

test('default (omitted) matches the regular variant', () => {
  assert.equal(barBox(SRC).h, barBox(withVariant('regular')).h);
});

test('AppBar renders the bar surface and its nested label', () => {
  const { svg } = render(SRC);
  assert.match(svg, /<path/);   // the bar's hand-drawn surface
  assert.match(svg, /Acme/);    // the child reached the SVG through the layoutSpec
});

test('the bar tint is a gray hand-drawn hatch, not a solid fill', () => {
  const { svg } = render(SRC);
  // The tint is hachure lines stroked in the hatch gray, never a solid fill block.
  assert.match(svg, /stroke="#c4c4c4"/);
  assert.doesNotMatch(svg, /fill="#c4c4c4"/);
});

const barSrc = (props) => `Wireframe landscape\n  AppBar ${props}\n    Toolbar\n      Typography h6 "Acme"`;

test('denseBackground packs the hatch closer; background=crosshatch runs both diagonals', () => {
  const hatch = (svg) => (svg.match(/<path d="([^"]+)" fill="none" stroke="#c4c4c4"/) || [, ''])[1];
  const segs = (svg) => (hatch(svg).match(/M/g) || []).length;
  const dirs = (svg) => {
    let pos = 0, neg = 0;
    for (const s of hatch(svg).split('M').filter(Boolean)) {
      const n = s.match(/-?\d+\.?\d*/g);
      if (n && n.length >= 4) ((+n[2] - +n[0]) * (+n[3] - +n[1]) > 0 ? pos++ : neg++);
    }
    return { pos, neg };
  };
  const hatchStd = render(SRC).svg;                              // background=hatch (default)
  const hatchDense = render(barSrc('denseBackground')).svg;      // hatch + denser lines
  const cross = render(barSrc('background=crosshatch')).svg;     // both diagonals
  assert.ok(segs(hatchDense) > segs(hatchStd), `denseBackground should add hash lines: ${segs(hatchDense)} vs ${segs(hatchStd)}`);
  // default hatch runs one diagonal; crosshatch runs both.
  const sd = dirs(hatchStd), ch = dirs(cross);
  assert.ok(sd.pos === 0 || sd.neg === 0, `hatch should be one-directional, got +${sd.pos}/-${sd.neg}`);
  assert.ok(ch.pos > 0 && ch.neg > 0, `crosshatch should run both ways, got +${ch.pos}/-${ch.neg}`);
});

test('denseBackground resolves both as a bare flag and keyed', () => {
  for (const form of ['denseBackground', 'denseBackground=true']) {
    const doc = parse(barSrc(form));
    assert.deepEqual(doc.diagnostics, [], `'${form}' should resolve cleanly`);
    assert.equal(doc.frames[0].children[0].props.denseBackground, true);
  }
});
