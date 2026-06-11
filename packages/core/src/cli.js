// @ts-check
/**
 * wiremark CLI core: render .wiremark files to SVGs.
 *
 *   wiremark <input.wiremark...> [-o out.svg | -d out-dir] [--icons icon-dir]
 *
 * Every positional is an input. Each renders to <basename>.svg next to itself,
 * or into -d/--out-dir (created if missing), or to -o/--out (single input
 * only). All inputs are processed even when some fail; per-file failures are
 * prefixed with the input path and the exit code is 1 if any input failed.
 * Soft diagnostics print to stderr but still produce output (SPEC ss.5.1.1).
 *
 * Icon files are a HOST concern (ICONS.md ss.4c) -- core never reads the
 * filesystem -- so this is where they are resolved: an `Icons`-block
 * `src=./logo.svg` entry loads relative to ITS input file via the `loadIcon`
 * hook, and `--icons <dir>` injects every `<name>.svg` in <dir> as icon
 * `name` for all inputs. Both extract sanitized inner-SVG artwork (scripts,
 * styles, foreignObject, and event handlers stripped at this boundary).
 *
 * This is the `@wiremark/core/cli` export. The `@wiremark/cli` package ships the
 * actual executable; its bin is a thin wrapper that calls `run(process.argv.slice(2))`.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve as resolvePath, dirname, basename, join, extname } from 'node:path';
import { render } from './index.js';

const USAGE = `Usage: wiremark <input.wiremark...> [-o out.svg | -d out-dir] [--icons icon-dir] [--theme light|dark]

Render .wiremark files to hand-drawn SVGs, one SVG per input.

  -o, --out <file>     output path (exactly one input)
  -d, --out-dir <dir>  write each <input>.svg into <dir>, created if missing
  --icons <dir>        register every <name>.svg in <dir> as a custom icon "name"
  --theme <name>       color palette: light (default) or dark
  -h, --help           show this help
`;

/**
 * @typedef {object} Args
 * @property {string[]} inputs   positional input paths, as given
 * @property {string|null} output  -o/--out value
 * @property {string|null} outDir  -d/--out-dir value
 * @property {string|null} iconDir --icons value
 * @property {string|null} theme   --theme value, handed to render() verbatim
 * @property {boolean} help
 * @property {string|null} error   first argv-level problem, printable as-is
 */

/** @param {string[]} argv @returns {Args} */
function parseArgs(argv) {
  /** @type {Args} */
  const out = { inputs: [], output: null, outDir: null, iconDir: null, theme: null, help: false, error: null };
  let positionalOnly = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (positionalOnly || a === '-' || !a.startsWith('-')) out.inputs.push(a);
    else if (a === '--') positionalOnly = true;
    else if (a === '-o' || a === '--out' || a === '-d' || a === '--out-dir' || a === '--icons' || a === '--theme') {
      const value = argv[++i];
      if (value === undefined) out.error ??= `error: ${a} requires a value`;
      else if (a === '-o' || a === '--out') out.output = value;
      else if (a === '--icons') out.iconDir = value;
      else if (a === '--theme') out.theme = value;
      else out.outDir = value;
    } else if (a === '-h' || a === '--help') out.help = true;
    else out.error ??= `error: unknown option ${a}`;
  }
  return out;
}

/**
 * Extract a renderable icon from SVG file text: the inner markup of the
 * `<svg>` element plus its square grid size (from `viewBox`, else
 * width/height, else the Material 24 default). Sanitization happens HERE, at
 * the host boundary (ICONS.md ss.4c): scripts, styles, foreignObject, and
 * `on*` event-handler attributes are stripped before anything reaches core.
 * Returns null when the text holds no usable `<svg>` artwork.
 * @param {string} text
 * @returns {{ body: string, viewBox: number } | null}
 */
function iconFromSvg(text) {
  const open = /<svg\b[^>]*>/i.exec(text);
  const close = text.lastIndexOf('</svg>');
  if (!open || close <= open.index) return null;

  let viewBox = 24;
  const vb = /viewBox\s*=\s*"([^"]+)"/i.exec(open[0]);
  const dim = (/** @type {string} */ name) =>
    Number(new RegExp(`${name}\\s*=\\s*"(\\d+(?:\\.\\d+)?)(?:px)?"`, 'i').exec(open[0])?.[1]);
  if (vb) {
    const parts = vb[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite) && Math.max(parts[2], parts[3]) > 0) {
      viewBox = Math.max(parts[2], parts[3]);
    }
  } else if (dim('height') > 0 || dim('width') > 0) {
    viewBox = dim('height') > 0 ? dim('height') : dim('width');
  }

  // Strip in order: comments; script/style/foreignObject elements (an UNCLOSED
  // tag swallows to end-of-body rather than surviving); on* event handlers in
  // every attribute-value form SVG accepts (quoted, unquoted, backtick); and
  // any href/xlink:href that is not a same-document `#` reference -- which
  // kills javascript:/data: URIs and external <use>/<image> fetches in one
  // rule (icon artwork has no legitimate use for either).
  const body = text.slice(open.index + open[0].length, close)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|foreignObject)\b[\s\S]*?(?:<\/\1\s*>|$)/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|`[^`]*`|[^\s>]+)/gi, '')
    .replace(/\s(?:xlink:)?href\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
      (attr, value) => (/^["']?#/.test(value) ? attr : ''))
    .trim();
  return body ? { body, viewBox } : null;
}

/**
 * Build the injected-icon map from `--icons <dir>`: every `<name>.svg` becomes
 * icon `name`, shared by all inputs. Unusable files warn and are skipped (the
 * reference degrades to the placeholder downstream); an unreadable DIRECTORY
 * is an argv-level error the caller turns into exit 1.
 * @param {string} dir  resolved directory path
 * @returns {Record<string, { body: string, viewBox: number }>}
 */
function loadIconDir(dir) {
  /** @type {Record<string, { body: string, viewBox: number }>} */
  const icons = {};
  for (const file of readdirSync(dir).filter((f) => extname(f).toLowerCase() === '.svg').sort()) {
    const path = join(dir, file);
    let icon = null;
    try {
      icon = iconFromSvg(readFileSync(path, 'utf8'));
    } catch (err) {
      process.stderr.write(`warning: cannot read icon ${path}: ${/** @type {Error} */ (err).message}\n`);
      continue;
    }
    if (!icon) {
      process.stderr.write(`warning: ${path} has no usable <svg> artwork; skipped\n`);
      continue;
    }
    icons[basename(file, extname(file))] = icon;
  }
  return icons;
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
 * @param {Record<string, *>} [icons]  injected icons shared by all inputs (--icons)
 * @param {string} [theme]  --theme value, passed through verbatim (core falls back to light)
 * @returns {boolean} true if the SVG was written
 */
function renderOne(inputPath, outputPath, icons, theme) {
  let source;
  try {
    source = readFileSync(inputPath, 'utf8');
  } catch (err) {
    const hint = /[*?]/.test(inputPath) ? ' (wiremark does not expand globs; the shell must)' : '';
    process.stderr.write(`error: cannot read ${inputPath}: ${/** @type {Error} */ (err).message}${hint}\n`);
    return false;
  }

  // `Icons` src= entries load relative to THIS input file. A failure throws
  // here and core degrades it to a placeholder + soft diagnostic (ss.5.1.1).
  /** @param {string} src */
  const loadIcon = (src) => {
    const path = resolvePath(dirname(inputPath), src);
    const icon = iconFromSvg(readFileSync(path, 'utf8'));
    if (!icon) throw new Error(`${path} has no usable <svg> artwork`);
    return icon;
  };

  let result;
  try {
    result = render(source, { icons, loadIcon, theme });
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

  /** @type {Record<string, *>|undefined} */
  let icons;
  if (args.iconDir) {
    try {
      icons = loadIconDir(resolvePath(args.iconDir));
    } catch (err) {
      return fail(`error: cannot read icons directory ${resolvePath(args.iconDir)}: ${/** @type {Error} */ (err).message}`);
    }
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
    if (!renderOne(inputs[i], outputs[i], icons, args.theme ?? undefined)) failed = true;
  }
  if (failed) process.exitCode = 1;
}
