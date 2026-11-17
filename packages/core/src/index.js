// @ts-check
/**
 * wiremark core -- public API.
 *
 * Input contract: a wiremark *source string* (the text inside a ```wireframe
 * block), never a markdown document. Finding the fence is the host adapter's
 * job; core knows nothing about markdown. Output: SVG, plus the parsed
 * Document and the inferred navigation graph.
 *
 *   source --lex--> tokens --tree--> raw tree --resolve--> Document
 *          --layout--> boxes --render--> SVG
 *                          \--flow--> navigation graph
 */
import { lex } from './lexer.js';
import { buildTree } from './tree.js';
import { resolve } from './resolve.js';
import { layout } from './layout.js';
import { layoutFrames } from './frame-layout.js';
import { renderSVG } from './render.js';
import { setTheme } from './draw.js';
import { setFontMetrics } from './metrics.js';
import { resolveFont } from './font.js';
import { toFlowGraph, toMermaid } from './flow.js';

export { REGISTRY, getComponent, isKnownComponent } from './registry.js';
export { WiremarkError, NotImplementedError } from './errors.js';
export { toFlowGraph, toMermaid };

/**
 * Parse wiremark source into a validated Document (AST + diagnostics).
 *
 * Icons resolve at THIS stage (ICONS.md ss.3): pass `icons`/`loadIcon` here
 * (or to `render` with a source string, which forwards them). Rendering an
 * already-parsed Document uses the icons it was parsed with.
 * @param {string} source
 * @param {object} [options]
 * @param {*} [options.icons]   injected icons: a flat name->body map, Iconify
 *   JSON pack(s) (e.g. `@iconify-json/lucide`, addressable bare or as
 *   `lucide:search`), or an array mixing both (ICONS.md ss.4b)
 * @param {(src: string) => *} [options.loadIcon]  host loader for `Icons`-block
 *   `src=` entries -- returns body text, `{ body, viewBox }`, or null; core
 *   itself never reads files (ICONS.md ss.4c)
 * @returns {import('./resolve.js').Document}
 */
export function parse(source, options = {}) {
  return resolve(buildTree(lex(source)), options);
}

/**
 * Render wiremark source (or an already-parsed Document) to SVG.
 *
 * A file with several frames renders as a Mermaid-style flow chart: `layoutFrames`
 * positions the frames over the navigation graph (`flow.js`) and `renderSVG` draws
 * them with frame-to-frame connectors. A single-frame file is unaffected.
 * @param {string|import('./resolve.js').Document} input
 * @param {object} [options]
 * @param {'TD'|'LR'} [options.direction]   flow direction override (default: TD)
 * @param {'light'|'dark'} [options.theme]  color palette (default 'light'; any
 *   unknown value falls back to light, never throws)
 * @param {boolean} [options.embedFont]    default true: embed the font in the
 *   SVG so text looks the same everywhere -- the built-in sketch font (Comic
 *   Neue, as the private family 'wiremark-sketch', ~24 KB per weight used), or
 *   a custom family's `fontFace` data. `false` omits all font data -- for hosts
 *   that load the font themselves or accept the fallback stack (an installed
 *   Comic Neue, then Comic Sans MS). Pages can also override the family for
 *   inline SVG with the `--wiremark-font-family` CSS custom property.
 * @param {string} [options.fontFamily]     host default custom font family
 *   (tasks/FONT.md). A document `Font "X"` line wins over ALL font options.
 *   Choosing a custom family turns off the built-in embed; the stack becomes
 *   `'X', 'Comic Neue', 'Comic Sans MS', ...`. 'Comic Neue' means the built-in.
 *   Invalid values warn and are ignored (never throws).
 * @param {number} [options.fontWidth]      horizontal scale of text measurement
 *   vs the built-in font (1 = same, 0.9 = 10% narrower; default: a measured
 *   preset for known faces such as Patrick Hand, else 1). 0.3..3.
 * @param {number} [options.fontLeading]    line height as a multiple of font
 *   size (default 1.4). 0.8..4.
 * @param {*} [options.fontFace]            the custom family's font file(s) to
 *   embed: `{ data, family?, weight? }` or an array of them, where `data` is
 *   base64 text or bytes (Uint8Array/ArrayBuffer) of a WOFF2, WOFF, TTF, or OTF
 *   file. Core never reads files -- the host supplies the bytes.
 * @param {*} [options.icons]               injected icons (see `parse`)
 * @param {(src: string) => *} [options.loadIcon]  host icon-file loader (see `parse`)
 * @param {boolean} [options.interactive]   when true, wrap each element and frame in
 *   a <g> carrying data-wm-line / data-wm-id / data-wm-component (and data-wm-to in
 *   place of the live <a> link), so an editor host can map a click back to the
 *   wiremark source. Default false leaves output byte-for-byte unchanged. Core emits
 *   no script and runs nothing -- the host attaches its own click listener. A
 *   render-stage concern: a Document can be parsed once and toggled per render.
 * @returns {{ svg: string, diagnostics: import('./errors.js').Diagnostic[] }}
 */
export function render(input, options = {}) {
  // Snapshot the options first: everything below runs inside the font-metrics
  // (and later palette) swap windows, and a caller's accessor getter must not
  // run -- and re-entrantly render, resetting the shared state -- inside them.
  const opts = { ...options };
  const doc = typeof input === 'string' ? parse(input, opts) : input;
  /** @type {import('./errors.js').Diagnostic[]} */
  const fontDiagnostics = [];
  const font = resolveFont(doc.font, opts, fontDiagnostics);
  const diagnostics = fontDiagnostics.length ? [...doc.diagnostics, ...fontDiagnostics] : doc.diagnostics;
  // Text metrics follow the font from layout onward (sizing happens in
  // layout, not just at draw time); restore them no matter what, like the
  // theme, so a font can never leak into the next render (tasks/FONT.md).
  setFontMetrics(font);
  try {
    const frames = layout(doc, opts);
    const graph = toFlowGraph(doc);
    const direction = resolveDirection(doc, opts);
    layoutFrames(frames, graph, { direction });
    // Only the SVG stage reads colors: swap the palette around it and always
    // restore, so a theme can never leak into the next render (tasks/THEME.md).
    const renderOptions = { ...opts, graph, direction, font };
    setTheme(opts.theme);
    try {
      const svg = renderSVG(frames, renderOptions);
      return { svg, diagnostics };
    } finally {
      setTheme('light');
    }
  } finally {
    setFontMetrics();
  }
}

/**
 * Flow-chart direction for a multi-frame file: an explicit `options.direction`
 * wins, else the document's `Flow` directive, else `TD` (ss.7.4).
 * @param {import('./resolve.js').Document} doc
 * @param {{ direction?: string }} options
 * @returns {'TD'|'LR'}
 */
function resolveDirection(doc, options) {
  if (options.direction === 'TD' || options.direction === 'LR') return options.direction;
  return doc.flow === 'LR' ? 'LR' : 'TD';
}
