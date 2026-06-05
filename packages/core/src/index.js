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
 * @param {string|import('./resolve.js').Document} input
 * @param {object} [options]
 * @returns {{ svg: string, diagnostics: import('./errors.js').Diagnostic[] }}
 */
export function render(input, options = {}) {
  const doc = typeof input === 'string' ? parse(input, options) : input;
  const svg = renderSVG(layout(doc, options), options);
  return { svg, diagnostics: doc.diagnostics };
}
