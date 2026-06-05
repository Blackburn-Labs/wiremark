// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const CHECKED = 'Wireframe\n  Checkbox checked';
const UNCHECKED = 'Wireframe\n  Checkbox';

test('Checkbox parses cleanly with and without the checked flag', () => {
  const checked = parse(CHECKED);
  assert.deepEqual(checked.diagnostics, []);
  assert.equal(checked.frames[0].children[0].props.checked, true);

  const unchecked = parse(UNCHECKED);
  assert.deepEqual(unchecked.diagnostics, []);
  // Bare Checkbox leaves `checked` unset (undefined), which is falsy.
  assert.ok(!unchecked.frames[0].children[0].props.checked);
});

test('Checkbox lays out to a finite, positive box', () => {
  const box = layout(parse(UNCHECKED))[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite & positive, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite & positive, got ${box.h}`);
});

test('Checkbox renders a path, and the check mark adds more strokes', () => {
  const unchecked = render(UNCHECKED);
  assert.match(unchecked.svg, /<path/);

  const checked = render(CHECKED);
  assert.match(checked.svg, /<path/);

  const count = (svg) => (svg.match(/<path/g) || []).length;
  assert.ok(
    count(checked.svg) > count(unchecked.svg),
    `checked (${count(checked.svg)}) should have more paths than unchecked (${count(unchecked.svg)})`,
  );
});
