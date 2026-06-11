// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { measureText, textRunWidth, truncateText, ELLIPSIS } from '../src/metrics.js';
import { text, centeredLabel } from '../src/draw.js';
import { parse, render } from '../src/index.js';
import { layout } from '../src/layout.js';

/**
 * truncateText (metrics.js) + the `maxW` plumbing through draw.js: any text
 * that would render wider than its available run is trimmed to a
 * '…'-terminated prefix. Two-stage fit test: `measureText` (the flat-average
 * layout sizer) first, so a box sized for its text never alters output, then
 * the per-glyph `textRunWidth` so prose isn't cut short of the box edge by the
 * flat average's ~25% over-estimate.
 */

const STR = 'A reasonably long label';
const SENTENCE = 'The upload of new FDS codes will overwrite all existing codes for this Financial Data Source.';
const FS = 16;

test('truncateText is the identity when the text fits per measureText', () => {
  const { w } = measureText(STR, FS);
  assert.equal(truncateText(STR, FS, w), STR);
  assert.equal(truncateText(STR, FS, w + 1000), STR);
});

test('truncateText is the identity when maxW is omitted', () => {
  assert.equal(truncateText(STR, FS, undefined), STR);
});

test('truncateText keeps text whole when it really fits, even if the flat average says otherwise', () => {
  // measureText over-estimates prose; a maxW between the per-glyph width and
  // the flat-average width must NOT truncate (the flat average alone would).
  const coarse = measureText(STR, FS).w;
  const fine = textRunWidth(STR, FS);
  assert.ok(fine < coarse, `per-glyph (${fine}) should undercut the flat average (${coarse}) for prose`);
  const between = Math.ceil((fine + coarse) / 2);
  assert.equal(truncateText(STR, FS, between), STR);
});

test('truncateText cuts per-glyph, close to the box edge', () => {
  const maxW = 384; // the #import-warning regression: flat-average cut left ~80px of slack
  const out = truncateText(SENTENCE, FS, maxW);
  assert.ok(out.endsWith(ELLIPSIS), `expected '…' tail, got ${JSON.stringify(out.slice(-5))}`);
  assert.ok(SENTENCE.startsWith(out.slice(0, -1)), 'kept text must be a prefix of the original');
  const run = textRunWidth(out, FS);
  assert.ok(run <= maxW, `trimmed run ${run} must fit ${maxW}`);
  assert.ok(run > maxW * 0.9, `trimmed run ${run} should reach near the edge of ${maxW}, not stop short`);
});

test('truncateText output always renders within maxW (sweep)', () => {
  for (const fs of [12, 13, 14, 16, 24, 48]) {
    for (const maxW of [5, 17, 40, 80.5, 150, 300]) {
      for (const weight of [400, 700]) {
        const out = truncateText(SENTENCE, fs, maxW, weight);
        const run = textRunWidth(out, fs, weight);
        assert.ok(run <= maxW, `fs=${fs} maxW=${maxW} w=${weight}: ${JSON.stringify(out)} runs ${run}`);
      }
    }
  }
});

test('bold text trims earlier than normal text in the same run', () => {
  const maxW = 200;
  const normal = truncateText(SENTENCE, FS, maxW, 400);
  const bold = truncateText(SENTENCE, FS, maxW, 700);
  assert.ok(bold.length < normal.length,
    `bold (${bold.length} chars) should keep fewer glyphs than normal (${normal.length})`);
});

test('truncateText degenerates: a lone ellipsis when only it fits, nothing when not even that', () => {
  assert.equal(truncateText(STR, FS, 12), ELLIPSIS); // '…' needs ~11.1px at 16px
  assert.equal(truncateText(STR, FS, 10), '');
  assert.equal(truncateText(STR, FS, 0), '');
  assert.equal(truncateText(STR, FS, -10), '');
});

test('draw.text trims to maxW and is untouched without it', () => {
  assert.match(text(0, 10, STR, { fontSize: FS, maxW: 60 }), new RegExp(ELLIPSIS));
  assert.match(text(0, 10, STR, { fontSize: FS }), new RegExp(`>${STR}<`));
});

test('centeredLabel trims to the box width by default', () => {
  const narrow = centeredLabel({ x: 0, y: 0, w: 60, h: 20 }, STR, { fontSize: FS });
  const wide = centeredLabel({ x: 0, y: 0, w: 600, h: 20 }, STR, { fontSize: FS });
  assert.match(narrow, new RegExp(ELLIPSIS));
  assert.match(wide, new RegExp(`>${STR}<`));
});

// --- row clamping (layout.js): boxes never spill past their parent row -------

/** @param {any} box @param {string} name @returns {any} first descendant box of that component */
function findBox(box, name) {
  if (box.node?.component === name) return box;
  for (const c of box.children ?? []) {
    const hit = findBox(c, name);
    if (hit) return hit;
  }
  return undefined;
}

test('an overcrowded row squeezes trailing children instead of spilling past the parent', () => {
  const src = 'Wireframe w=300 h=200\n  Stack row\n    Button "First Long Button Label"\n    Button "Second Long Button Label"';
  const root = layout(parse(src))[0].root;
  const row = findBox(root, 'Stack');
  for (const child of row.children) {
    assert.ok(child.x + child.w <= row.x + row.w + 0.01,
      `child right edge ${child.x + child.w} must stay within the row's ${row.x + row.w}`);
  }
  assert.match(render(src).svg, new RegExp(ELLIPSIS), 'the squeezed label should trim to …');
});

test('regression: icon + long heading in a row inside a narrow dialog trims instead of spilling', () => {
  const src = [
    'Wireframe w=460 h=260', '  Dialog', '    CardContent', '      Stack column gap=1',
    '        Stack row gap=1',
    '          Icon Warning',
    '          Typography h6 "You have requested to delete an FDS code"',
  ].join('\n');
  const root = layout(parse(src))[0].root;
  const typ = findBox(root, 'Typography');
  assert.ok(typ, 'Typography box should exist');
  // The Typography box must not extend past the frame's inner edge.
  assert.ok(typ.x + typ.w <= 460 - 16 + 0.01, `Typography right ${typ.x + typ.w} must stay inside the dialog`);
  const svg = render(src).svg;
  assert.match(svg, new RegExp(ELLIPSIS));
  assert.doesNotMatch(svg, /You have requested to delete an FDS code</);
});
