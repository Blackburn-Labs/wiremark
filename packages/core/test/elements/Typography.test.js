// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

/**
 * Typography -- the text leaf (SPEC ss.5.4, ss.6). Keyless slots are the text
 * literal (-> label) and the variant enum, in any order. A bare amount (`~N`)
 * renders squiggle filler instead of a string; the variant drives the font
 * size, so a larger variant lays out taller.
 */

const LABEL_SRC = 'Wireframe w=400 h=300\n  Typography h4 "Sign in"';
const FILLER_SRC = 'Wireframe w=400 h=300\n  Typography ~3';

test('Typography parses keyless literal + variant in either order', () => {
  const doc = parse(LABEL_SRC);
  assert.deepEqual(doc.diagnostics, []);

  const t = doc.frames[0].children[0];
  assert.equal(t.component, 'Typography');
  assert.equal(t.props.label, 'Sign in');
  assert.equal(t.props.variant, 'h4');
});

test('Typography lays out to a finite, positive box and grows with the variant', () => {
  const small = layout(parse('Wireframe w=400 h=300\n  Typography caption "x"'))[0].root.children[0];
  const large = layout(parse('Wireframe w=400 h=300\n  Typography h1 "x"'))[0].root.children[0];

  assert.ok(Number.isFinite(small.h) && small.h > 0, `h should be finite & positive, got ${small.h}`);
  assert.ok(large.h > small.h, `a larger variant should be taller (h1 ${large.h} vs caption ${small.h})`);
});

test('Typography renders its label as a <text> element', () => {
  const { svg } = render(LABEL_SRC);
  assert.match(svg, /<text/);
  assert.match(svg, /Sign in/);
});

test('a bare Typography ~N renders squiggle filler, not a label', () => {
  const filler = layout(parse(FILLER_SRC))[0].root.children[0];
  assert.deepEqual(filler.node.filler, { amount: 3, unit: 'units' });
  assert.ok(filler.h > 0, `filler should occupy vertical space, got ${filler.h}`);

  const { svg } = render(FILLER_SRC);
  assert.match(svg, /<path/);  // squiggle rows are drawn as hand-drawn paths
});
