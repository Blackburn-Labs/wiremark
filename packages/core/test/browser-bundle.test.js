// @ts-check
// Guards the browser bundle (scripts/build-browser.mjs) that script-tag
// embedders inject — the JetBrains plugin's JCEF preview, webviews, the docs
// site. Bundling with `platform: 'browser'` is itself the browser-safety
// check: esbuild fails the build if any `node:` import reaches the render
// path (only src/cli.js, which is not bundled, may use Node APIs). The vm
// tests then prove the IIFE needs no DOM and no host globals at all.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

import { build } from 'esbuild';

import { BUILD_OPTIONS } from '../scripts/build-browser.mjs';

// 182 KB at the time of writing (the built-in icon module is 80 KB of that,
// with its own budget in scripts/generate-icons.mjs). Catches accidental
// bloat, e.g. a dependency creeping in beside roughjs.
const SIZE_BUDGET = 256 * 1024;

const result = await build({ ...BUILD_OPTIONS, write: false, logLevel: 'silent' });
const code = result.outputFiles[0].text;

/** Run the bundle in a fresh context with no DOM and no host globals. */
function loadBundle() {
  const context = vm.createContext({});
  vm.runInContext(code, context);
  return context.wiremark;
}

test('browser bundle stays within the size budget', () => {
  assert.ok(
    code.length <= SIZE_BUDGET,
    `bundle is ${code.length} bytes, budget is ${SIZE_BUDGET}`,
  );
});

test('bundle exposes the public API as the `wiremark` global', () => {
  const wiremark = loadBundle();
  for (const fn of ['parse', 'render', 'toFlowGraph', 'toMermaid', 'getComponent', 'isKnownComponent']) {
    assert.equal(typeof wiremark[fn], 'function', `wiremark.${fn}`);
  }
  assert.equal(typeof wiremark.REGISTRY, 'object');
  assert.equal(typeof wiremark.WiremarkError, 'function');
});

test('bundle renders a fixture in a DOM-less context', () => {
  const wiremark = loadBundle();
  const source = readFileSync(join(import.meta.dirname, 'fixtures', 'hello-world.wiremark'), 'utf8');
  const { svg, diagnostics } = wiremark.render(source);
  assert.ok(svg.includes('<svg'), 'renders an <svg> root');
  assert.ok(svg.includes('Hello World!'), 'renders the label text');
  // not deepEqual([]): the array comes from the vm realm, so its prototype
  // differs from the host realm's Array.prototype
  assert.equal(diagnostics.length, 0);
});

test('bundle output is identical to running core from source', async () => {
  const wiremark = loadBundle();
  const { render } = await import('../src/index.js');
  // custom-icons and library exercise the icon subsystem -- the largest single
  // chunk of the bundle (the generated builtin module) -- through the IIFE
  for (const name of ['dashboard', 'library', 'custom-icons']) {
    const source = readFileSync(join(import.meta.dirname, 'fixtures', `${name}.wiremark`), 'utf8');
    assert.equal(wiremark.render(source).svg, render(source).svg, name);
  }
});

test('bundle throws WiremarkError for author-must-fix input', () => {
  const wiremark = loadBundle();
  assert.throws(
    () => wiremark.render('Wireframe\n\tButton "tabs are banned"'),
    { name: 'WiremarkError' },
  );
});
