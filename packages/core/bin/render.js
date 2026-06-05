#!/usr/bin/env node
// @ts-check
/**
 * wiremark -- tiny CLI around core: read a .wiremark file, write an SVG.
 *
 *   wiremark <in.wiremark> [out.svg]      (also: -o out.svg; npx wiremark ...)
 *
 * With no `-o`, the SVG is written next to the input (same basename). Hard parse
 * errors print to stderr and exit non-zero; soft diagnostics print but still
 * produce output (SPEC ss.5.1.1).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve as resolvePath, dirname, basename, join, extname } from 'node:path';
import { render } from '../src/index.js';

/** @param {string[]} argv */
function parseArgs(argv) {
  const out = { input: /** @type {string|null} */ (null), output: /** @type {string|null} */ (null), help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-o' || a === '--out') out.output = argv[++i] ?? null;
    else if (a === '-h' || a === '--help') out.help = true;
    else if (!out.input) out.input = a;
    else if (!out.output) out.output = a;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.input) {
  process.stdout.write('Usage: wiremark <in.wiremark> [out.svg]  (or -o out.svg)\n');
  process.exit(args.help ? 0 : 1);
}

const inputPath = resolvePath(args.input);
let source;
try {
  source = readFileSync(inputPath, 'utf8');
} catch (err) {
  process.stderr.write(`error: cannot read ${inputPath}: ${/** @type {Error} */ (err).message}\n`);
  process.exit(1);
}

let result;
try {
  result = render(source);
} catch (err) {
  process.stderr.write(`error: ${/** @type {Error} */ (err).message}\n`);
  process.exit(1);
}

const outputPath = args.output
  ? resolvePath(args.output)
  : join(dirname(inputPath), `${basename(inputPath, extname(inputPath))}.svg`);
writeFileSync(outputPath, result.svg, 'utf8');

for (const d of result.diagnostics) {
  const where = d.loc?.line ? ` (line ${d.loc.line})` : '';
  process.stderr.write(`${d.severity}: ${d.message}${where}\n`);
}
process.stdout.write(`${outputPath}\n`);
