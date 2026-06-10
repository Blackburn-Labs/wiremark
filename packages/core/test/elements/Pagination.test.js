// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  Pagination count=5 page=2';

/** First (and usually only) child node of the frame for `src`. */
const firstChild = (src) => parse(src).frames[0].children[0];
/** Laid-out box of the frame's first child for `src`. */
const firstBox = (src) => layout(parse(src))[0].root.children[0];

test('Pagination parses with clean diagnostics and resolves count/page', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);

  const pg = doc.frames[0].children[0];
  assert.equal(pg.component, 'Pagination');
  assert.equal(pg.props.count, 5);
  assert.equal(pg.props.page, 2);
});

test('count and page default to undefined when omitted (strategy applies defaults)', () => {
  // The resolver does not inject PropDef defaults; an unset prop is absent.
  const pg = firstChild('Wireframe\n  Pagination');
  assert.equal(pg.props.count, undefined);
  assert.equal(pg.props.page, undefined);
});

test('count= is keyed and coerces to a number', () => {
  const pg = firstChild('Wireframe\n  Pagination count=4');
  assert.equal(pg.props.count, 4);
  assert.equal(typeof pg.props.count, 'number');
});

test('page= is keyed and coerces to a number', () => {
  const pg = firstChild('Wireframe\n  Pagination page=3');
  assert.equal(pg.props.page, 3);
  assert.equal(typeof pg.props.page, 'number');
});

test('count/page are NOT keyless: a bare number is rejected', () => {
  // keyless: false in the spec -> a bare token never resolves to count/page.
  assert.throws(() => parse('Wireframe\n  Pagination 5'), /unexpected token/);
});

test('a quoted value for a numeric prop is an error', () => {
  assert.throws(() => parse('Wireframe\n  Pagination count="5"'), /expects a number/);
});

test('a non-numeric value for count is an error', () => {
  assert.throws(() => parse('Wireframe\n  Pagination count=lots'), /expects a number/);
});

test('setting count twice is an ambiguity error', () => {
  assert.throws(() => parse('Wireframe\n  Pagination count=2 count=3'), /more than once/);
});

test('an unknown property is rejected', () => {
  assert.throws(() => parse('Wireframe\n  Pagination size=big'), /unknown property/);
});

test('Pagination lays out to a finite, positive box', () => {
  const box = firstBox('Wireframe\n  Pagination count=3');
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});

test('intrinsic width grows with count (more pages -> wider control)', () => {
  const one = firstBox('Wireframe\n  Pagination count=1');
  const three = firstBox('Wireframe\n  Pagination count=3');
  const seven = firstBox('Wireframe\n  Pagination count=7');
  assert.ok(one.w < three.w, `count=1 (${one.w}) should be narrower than count=3 (${three.w})`);
  assert.ok(three.w < seven.w, `count=3 (${three.w}) should be narrower than count=7 (${seven.w})`);
  // Height is constant -- it is a single row of square cells.
  assert.equal(one.h, seven.h, 'height does not depend on count');
});

test('a missing/absent count still lays out (default of one page)', () => {
  const box = firstBox('Wireframe\n  Pagination');
  assert.ok(Number.isFinite(box.w) && box.w > 0);
});

test('count renders one numbered cell per page (plus two chevrons)', () => {
  const svg = render('Wireframe\n  Pagination count=4').svg;
  const labels = [...svg.matchAll(/>(\d+)</g)].map((m) => m[1]);
  assert.deepEqual(labels, ['1', '2', '3', '4'], 'cells are numbered 1..count');
  // Each cell + each chevron-bearing cell is a hand-drawn path.
  assert.match(svg, /<path/);
});

test('the current page cell is tinted; off-page is not', () => {
  // page within range -> a hand-drawn accent tint under the current cell.
  assert.match(render('Wireframe\n  Pagination count=3 page=2').svg, /#cfe0ee/);
  // page out of range -> nothing is highlighted, but it still renders cleanly.
  assert.doesNotMatch(render('Wireframe\n  Pagination count=3 page=99').svg, /#cfe0ee/);
});

test('changing page moves the tint without changing geometry', () => {
  // Same count -> same box; only which cell is tinted differs.
  const a = firstBox('Wireframe\n  Pagination count=5 page=1');
  const b = firstBox('Wireframe\n  Pagination count=5 page=4');
  assert.equal(a.w, b.w);
  assert.equal(a.h, b.h);
  assert.notEqual(
    render('Wireframe\n  Pagination count=5 page=1').svg,
    render('Wireframe\n  Pagination count=5 page=4').svg,
    'the tinted cell shifts, so the SVG differs',
  );
});

test('a fractional count floors to whole cells', () => {
  // count=3.9 draws 3 cells, same as count=3 (floor, min 1).
  const frac = render('Wireframe\n  Pagination count=3.9').svg;
  const labels = [...frac.matchAll(/>(\d+)</g)].map((m) => m[1]);
  assert.deepEqual(labels, ['1', '2', '3']);
});
