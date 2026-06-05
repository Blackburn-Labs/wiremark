// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, render } from '../../src/index.js';
import { layout } from '../../src/layout.js';

const SRC = 'Wireframe\n  TextField "Email" type=email';

test('TextField parses with no diagnostics and resolves label + type', () => {
  const doc = parse(SRC);
  assert.deepEqual(doc.diagnostics, []);
  const tf = doc.frames[0].children[0];
  assert.equal(tf.component, 'TextField');
  assert.equal(tf.props.label, 'Email');
  assert.equal(tf.props.type, 'email');
});

test('TextField lays out to a finite, positive box', () => {
  const doc = parse(SRC);
  const box = layout(doc)[0].root.children[0];
  assert.ok(Number.isFinite(box.w) && box.w > 0, `w should be finite > 0, got ${box.w}`);
  assert.ok(Number.isFinite(box.h) && box.h > 0, `h should be finite > 0, got ${box.h}`);
});

test('TextField renders its label and an input border', () => {
  const { svg } = render(SRC);
  assert.ok(svg.includes('Email'), 'label text should appear');
  assert.ok(svg.includes('<path'), 'input border should be drawn as a path');
});

test('TextField masks a password value but shows a plain value', () => {
  const masked = render('Wireframe\n  TextField "Password" type=password value="hunter2"');
  assert.ok(masked.svg.includes('*******'), 'password should render as bullet/star run');
  assert.ok(!masked.svg.includes('hunter2'), 'password plaintext must not leak into the SVG');

  const plain = render('Wireframe\n  TextField "Name" value="Robert"');
  assert.ok(plain.svg.includes('Robert'), 'a non-password value renders inside the field');
});
