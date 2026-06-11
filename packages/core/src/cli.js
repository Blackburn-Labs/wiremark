// @ts-check
/**
 * wiremark CLI core: render .wiremark files to SVGs.
 *
 *   wiremark <input.wiremark...> [-o out.svg | -d out-dir]
 *
 * Every positional is an input. Each renders to <basename>.svg next to itself,
 * or into -d/--out-dir (created if missing), or to -o/--out (single input
 * only). All inputs are processed even when some fail; per-file failures are
 * prefixed with the input path and the exit code is 1 if any input failed.
 * Soft diagnostics print to stderr but still produce output (SPEC ss.5.1.1).
 *
 * This is the `@wiremark/core/cli` export. The `@wiremark/cli` package ships the
 * actual executable; its bin is a thin wrapper that calls `run(process.argv.slice(2))`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve as resolvePath, dirname, basename, join, extname } from 'node:path';
import { render } from './index.js';

const USAGE = `Usage: wiremark <input.wiremark...> [-o out.svg | -d out-dir]

Render .wiremark files to hand-drawn SVGs, one SVG per input.

  -o, --out <file>     output path (exactly one input)
  -d, --out-dir <dir>  write each <input>.svg into <dir>, created if missing
  -h, --help           show this help
`;

/**
 * @typedef {object} Args
 * @property {string[]} inputs   positional input paths, as given
 * @property {string|null} output  -o/--out value
 * @property {string|null} outDir  -d/--out-dir value
 * @property {boolean} help
 * @property {string|null} error   first argv-level problem, printable as-is
 */

/** @param {string[]} argv @returns {Args} */
function parseArgs(argv) {
  /** @type {Args} */
  const out = { inputs: [], output: null, outDir: null, help: false, error: null };
  let positionalOnly = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (positionalOnly || a === '-' || !a.startsWith('-')) out.inputs.push(a);
    else if (a === '--') positionalOnly = true;
    else if (a === '-o' || a === '--out' || a === '-d' || a === '--out-dir') {
      const value = argv[++i];
      if (value === undefined) out.error ??= `error: ${a} requires a value`;
      else if (a === '-o' || a === '--out') out.output = value;
      else out.outDir = value;
    } else if (a === '-h' || a === '--help') out.help = true;
    else out.error ??= `error: unknown option ${a}`;
  }
  return out;
}

/**
 * Output path for one resolved input: -o wins, else
 * <out-dir | input's dir>/<input basename>.svg.
 * @param {string} inputPath  resolved input path
 * @param {Args} args
 * @returns {string} resolved output path
 */
function outputPathFor(inputPath, args) {
  if (args.output) return resolvePath(args.output);
  const name = `${basename(inputPath, extname(inputPath))}.svg`;
  return join(args.outDir ? resolvePath(args.outDir) : dirname(inputPath), name);
}

/**
 * Render one input file to one SVG. Prints this file's errors and diagnostics
 * (stderr) and, on success, its output path (stdout). Returns false instead of
 * throwing so the caller can keep processing the remaining inputs.
 * @param {string} inputPath   resolved input path
 * @param {string} outputPath  resolved output path
 * @returns {boolean} true if the SVG was written
 */
function renderOne(inputPath, outputPath) {
  let source;
  try {
    source = readFileSync(inputPath, 'utf8');
  } catch (err) {
    const hint = /[*?]/.test(inputPath) ? ' (wiremark does not expand globs; the shell must)' : '';
    process.stderr.write(`error: cannot read ${inputPath}: ${/** @type {Error} */ (err).message}${hint}\n`);
    return false;
  }

  let result;
  try {
    result = render(source);
  } catch (err) {
    // WiremarkError messages already carry " (line N)".
    process.stderr.write(`${inputPath}: error: ${/** @type {Error} */ (err).message}\n`);
    return false;
  }

  try {
    writeFileSync(outputPath, result.svg, 'utf8');
  } catch (err) {
    process.stderr.write(`${inputPath}: error: cannot write ${outputPath}: ${/** @type {Error} */ (err).message}\n`);
    return false;
  }

  for (const d of result.diagnostics) {
    const where = d.loc?.line ? ` (line ${d.loc.line})` : '';
    process.stderr.write(`${inputPath}: ${d.severity}: ${d.message}${where}\n`);
  }
  process.stdout.write(`${outputPath}\n`);
  return true;
}

/**
 * Run the wiremark CLI: parse argv (already stripped of node + script path),
 * render every input, and write the SVGs. Sets `process.exitCode` instead of
 * calling `process.exit`: all work is synchronous, so the process exits
 * naturally right after run() returns and piped stdio is guaranteed to flush.
 * Exit code 1 if any input failed, else 0.
 *
 * @param {string[]} argv
 */
export function run(argv) {
  /** @param {string} msg */
  const fail = (msg) => {
    process.stderr.write(`${msg}\n`);
    process.exitCode = 1;
  };

  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(USAGE);
    return;
  }
  if (args.error) {
    fail(args.error);
    process.stderr.write(USAGE);
    return;
  }
  if (!args.inputs.length) {
    process.stdout.write(USAGE);
    process.exitCode = 1;
    return;
  }
  if (args.output && args.outDir) return fail('error: -o/--out and -d/--out-dir are mutually exclusive');
  if (args.output && args.inputs.length > 1) {
    return fail(`error: -o/--out takes exactly one input (got ${args.inputs.length}); use -d/--out-dir for multiple inputs`);
  }

  const inputs = [...new Set(args.inputs.map((p) => resolvePath(p)))];
  const outputs = inputs.map((p) => outputPathFor(p, args));

  // Fail on colliding outputs before reading, rendering, or creating anything.
  const seen = new Map();
  for (let i = 0; i < outputs.length; i++) {
    const prev = seen.get(outputs[i]);
    if (prev !== undefined) {
      return fail(`error: output collision: ${inputs[prev]} and ${inputs[i]} both write to ${outputs[i]}`);
    }
    seen.set(outputs[i], i);
  }

  if (args.outDir) {
    try {
      mkdirSync(resolvePath(args.outDir), { recursive: true });
    } catch (err) {
      return fail(`error: cannot create directory ${resolvePath(args.outDir)}: ${/** @type {Error} */ (err).message}`);
    }
  }

  let failed = false;
  for (let i = 0; i < inputs.length; i++) {
    if (!renderOne(inputs[i], outputs[i])) failed = true;
  }
  if (failed) process.exitCode = 1;
}
