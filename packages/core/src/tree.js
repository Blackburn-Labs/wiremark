// @ts-check
import { WiremarkError } from './errors.js';

/**
 * Stage (2) -- TREE.  flat LineTokens -> nesting by indentation.
 *
 * Indentation is the only structural mechanism (SPEC ss.3.1): a line indented
 * further than the previous line is its child; equal indent is a sibling; a
 * dedent pops to the matching ancestor. Inconsistent nesting (a dedent that
 * lands between levels, or siblings drawn at different indents) is a hard
 * `WiremarkError`.
 *
 * Each top-level node is a frame root (`Wireframe`). In v0.1 default mode a
 * block holds one frame; multiple roots are allowed here and handled downstream
 * (SPEC ss.2).
 *
 * @typedef {import('./lexer.js').LineToken} LineToken
 * @typedef {import('./lexer.js').Token} Token
 *
 * @typedef {Object} RawNode
 * @property {string} name
 * @property {Token[]} tokens
 * @property {RawNode[]} children
 * @property {number} line
 */

/**
 * @param {LineToken[]} lines
 * @returns {RawNode[]}  top-level frame roots
 */
export function buildTree(lines) {
  /** @type {RawNode[]} */
  const roots = [];
  /** @type {{ indent: number, node: RawNode, childIndent: number|null }[]} */
  const stack = [];

  for (const ln of lines) {
    /** @type {RawNode} */
    const node = { name: ln.name, tokens: ln.tokens, children: [], line: ln.line };

    // Pop every ancestor that is at the same or deeper indent than this line.
    while (stack.length && stack[stack.length - 1].indent >= ln.indent) stack.pop();

    if (stack.length === 0) {
      if (ln.indent !== 0)
        throw new WiremarkError('unexpected indentation at the top level', { line: ln.line });
      roots.push(node);
    } else {
      const parent = stack[stack.length - 1];
      // All children of one parent must share an indent (SPEC ss.3.1).
      if (parent.childIndent === null) parent.childIndent = ln.indent;
      else if (parent.childIndent !== ln.indent)
        throw new WiremarkError('inconsistent indentation', { line: ln.line });
      parent.node.children.push(node);
    }

    stack.push({ indent: ln.indent, node, childIndent: null });
  }

  return roots;
}
