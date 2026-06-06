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
import { toFlowGraph, toMermaid } from './flow.js';

export { REGISTRY, getComponent, isKnownComponent } from './registry.js';
export { WiremarkError, NotImplementedError } from './errors.js';
export { toFlowGraph, toMermaid };

/**
 * Parse wiremark source into a validated Document (AST + diagnostics).
 * @param {string} source
 * @param {object} [options]
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
 * @returns {{ svg: string, diagnostics: import('./errors.js').Diagnostic[] }}
 */
export function render(input, options = {}) {
  const doc = typeof input === 'string' ? parse(input, options) : input;
  const frames = layout(doc, options);
  const graph = toFlowGraph(doc);
  const direction = resolveDirection(doc, options);
  layoutFrames(frames, graph, { direction });
  const svg = renderSVG(frames, { ...options, graph, direction });
  return { svg, diagnostics: doc.diagnostics };
}

/**
 * Flow-chart direction for a multi-frame file: an explicit `options.direction`
 * wins, else the first frame that declares `direction=`, else `TD` (ss.7.4).
 * @param {import('./resolve.js').Document} doc
 * @param {{ direction?: string }} options
 * @returns {'TD'|'LR'}
 */
function resolveDirection(doc, options) {
  if (options.direction === 'TD' || options.direction === 'LR') return options.direction;
  const declared = doc.frames.find((f) => f.props.direction)?.props.direction;
  return declared === 'LR' ? 'LR' : 'TD';
}
