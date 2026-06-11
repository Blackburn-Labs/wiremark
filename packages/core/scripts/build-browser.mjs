// @ts-check
// Bundles core into a self-contained browser IIFE (dist/wiremark.browser.js,
// global `wiremark`) for script-tag/webview embedders: the JetBrains plugin's
// JCEF preview, VS Code webviews, the docs site (tasks/IDE.md). Runs on every
// publish via core's `prepack` hook.
//
// BUILD_OPTIONS is exported so test/browser-bundle.test.js verifies the exact
// configuration that ships: `platform: 'browser'` makes the build itself fail
// if a `node:` import ever sneaks onto the render path (only src/cli.js may
// use Node APIs).
import { readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const { version } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

/** @type {import('esbuild').BuildOptions} */
export const BUILD_OPTIONS = {
  entryPoints: [fileURLToPath(new URL('../src/index.js', import.meta.url))],
  bundle: true,
  format: 'iife',
  globalName: 'wiremark',
  platform: 'browser',
  minify: true,
  banner: { js: `/*! @wiremark/core v${version} | MIT | https://wiremark.dev */` },
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outfile = fileURLToPath(new URL('../dist/wiremark.browser.js', import.meta.url));
  // start from an empty dist/ so stale artifacts can never ride along into a
  // tarball (dist/ is gitignored, so leftovers are invisible to git status)
  rmSync(new URL('../dist/', import.meta.url), { recursive: true, force: true });
  await build({ ...BUILD_OPTIONS, outfile });
  console.log(`built ${outfile}`);
}
