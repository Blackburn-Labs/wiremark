// @ts-check
import { WiremarkError } from './errors.js';

/**
 * Stage (1) -- LEX.  source text -> one record per significant line.
 *
 * Responsibilities (SPEC ss.3.1-3.3):
 *  - Split into lines; strip `//` end-of-line comments; drop blank lines.
 *  - Measure leading indentation (spaces only; a tab is a hard `WiremarkError`).
 *  - Split the rest into a component name plus a flat list of tokens, honoring
 *    the quoting rule: a "double-quoted" run is a single text-literal token;
 *    every bare run is an enum / boolean flag / number / sizing / key=value.
 *
 * No tree building and no semantics here -- this stage is purely lexical.
 *
 * @typedef {Object} Token
 * @property {'literal'|'bare'|'keyed'} kind
 * @property {string} [key]      // for kind 'keyed'
 * @property {boolean} [quoted]  // for kind 'keyed': was the value double-quoted?
 * @property {string} value      // raw text (literal / quoted value: unquoted contents)
 *
 * @typedef {Object} LineToken
 * @property {number} line     // 1-based source line
 * @property {number} indent   // count of leading spaces
 * @property {string} name     // component name (PascalCase)
 * @property {Token[]} tokens
 */

/**
 * Strip a `//` end-of-line comment, ignoring `//` that falls inside a
 * double-quoted run. `#` is the anchor sigil, never a comment (SPEC ss.3.3).
 * @param {string} line
 * @returns {string}
 */
function stripComment(line) {
  let inStr = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inStr && c === '\\') { i++; continue; } // skip the escaped char
    if (c === '"') { inStr = !inStr; continue; }
    if (!inStr && c === '/' && line[i + 1] === '/') return line.slice(0, i);
  }
  return line;
}

/**
 * Quote-aware split of a line's content into raw chunks. Whitespace separates
 * chunks except inside a "double-quoted" run, so `label="a b"` stays one chunk.
 * @param {string} content
 * @param {number} lineNo
 * @returns {string[]}
 */
function splitChunks(content, lineNo) {
  const chunks = [];
  let buf = '';
  let inStr = false;
  let started = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inStr && c === '\\') { // keep the escape + next char verbatim
      buf += c;
      if (i + 1 < content.length) { buf += content[i + 1]; i++; }
      started = true;
      continue;
    }
    if (c === '"') { inStr = !inStr; buf += c; started = true; continue; }
    if (!inStr && (c === ' ' || c === '\t')) {
      if (started) { chunks.push(buf); buf = ''; started = false; }
      continue;
    }
    buf += c;
    started = true;
  }
  if (inStr) throw new WiremarkError('unterminated string literal', { line: lineNo });
  if (started) chunks.push(buf);
  return chunks;
}

/**
 * Drop the surrounding double quotes from a literal chunk and unescape `\"`/`\\`.
 * @param {string} s
 * @returns {string}
 */
function unquote(s) {
  return s.slice(1, -1).replace(/\\(["\\])/g, '$1');
}

/**
 * Classify a non-leading chunk into a Token (SPEC ss.3.2).
 * @param {string} chunk
 * @param {number} lineNo
 * @returns {Token}
 */
function classify(chunk, lineNo) {
  if (chunk[0] === '"') {
    if (chunk.length < 2 || chunk[chunk.length - 1] !== '"')
      throw new WiremarkError('unterminated string literal', { line: lineNo });
    return { kind: 'literal', value: unquote(chunk) };
  }
  const eq = chunk.indexOf('=');
  if (eq > 0) {
    const key = chunk.slice(0, eq);
    const rawVal = chunk.slice(eq + 1);
    if (rawVal[0] === '"') return { kind: 'keyed', key, value: unquote(rawVal), quoted: true };
    return { kind: 'keyed', key, value: rawVal, quoted: false };
  }
  return { kind: 'bare', value: chunk };
}

/**
 * @param {string} source
 * @returns {LineToken[]}
 */
export function lex(source) {
  /** @type {LineToken[]} */
  const out = [];
  const rawLines = source.split(/\r?\n/);
  for (let n = 0; n < rawLines.length; n++) {
    const lineNo = n + 1;
    const noComment = stripComment(rawLines[n]);
    if (noComment.trim() === '') continue; // blank or comment-only line

    const indentRun = /** @type {RegExpMatchArray} */ (noComment.match(/^[ \t]*/))[0];
    if (indentRun.includes('\t'))
      throw new WiremarkError('tabs are not allowed in indentation; use spaces (SPEC ss.3.1)', { line: lineNo });
    const indent = indentRun.length;

    const content = noComment.slice(indent).replace(/\s+$/, '');
    const chunks = splitChunks(content, lineNo);
    const head = chunks[0];
    if (head[0] === '"')
      throw new WiremarkError('a quoted string cannot stand alone as a line -- no bare text nodes (SPEC ss.3.2.3)', { line: lineNo });
    if (head.includes('='))
      throw new WiremarkError(`a line must start with a component name, found "${head}"`, { line: lineNo });

    out.push({
      line: lineNo,
      indent,
      name: head,
      tokens: chunks.slice(1).map((c) => classify(c, lineNo)),
    });
  }
  return out;
}
