// Renders every packages/core/test/fixtures/*.wiremark to a sibling *.svg.
//
// A visual-inspection helper: after changing the engine, regenerate the fixture
// SVGs and eyeball them. The output *.svg files are gitignored (see .gitignore:
// `packages/core/test/fixtures/*.svg`), so this never dirties the tree.
//
//   npm run render:fixtures
//
// Soft diagnostics print to stderr but still produce output (SPEC ss.5.1.1); a
// hard parse error fails just that fixture and the run exits non-zero. Pure Node
// (ESM), no dependencies. Safe to run from any working directory: all paths are
// resolved relative to this file.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { render } from '../packages/core/src/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const FIXTURES = resolve(ROOT, 'packages/core/test/fixtures');

/** @param {{ loc?: { line?: number } }} d */
const where = (d) => (d.loc?.line ? ` (line ${d.loc.line})` : '');

function main() {
  const files = readdirSync(FIXTURES).filter((f) => f.endsWith('.wiremark')).sort();
  if (!files.length) {
    console.error(`No .wiremark fixtures found in ${FIXTURES}`);
    process.exit(1);
  }

  let failures = 0;
  let warnings = 0;

  for (const file of files) {
    const outName = `${basename(file, extname(file))}.svg`;
    try {
      const { svg, diagnostics } = render(readFileSync(join(FIXTURES, file), 'utf8'));
      writeFileSync(join(FIXTURES, outName), svg, 'utf8');
      for (const d of diagnostics) {
        warnings++;
        console.error(`  ${d.severity}: ${d.message}${where(d)}`);
      }
      const note = diagnostics.length ? ` (${diagnostics.length} diagnostic${diagnostics.length > 1 ? 's' : ''})` : '';
      console.log(`${file} -> ${outName}${note}`);
    } catch (err) {
      failures++;
      console.error(`${file}: error: ${/** @type {Error} */ (err).message}`);
    }
  }

  const ok = files.length - failures;
  const warnNote = warnings ? `, ${warnings} diagnostic${warnings > 1 ? 's' : ''}` : '';
  console.log(`\nRendered ${ok}/${files.length} fixtures to ${FIXTURES}${warnNote}`);
  if (failures) process.exit(1);
}

main();
