// @ts-check
/**
 * Font selection (tasks/FONT.md, issue #2). The default is the built-in sketch
 * face -- Comic Neue embedded as the private family 'wiremark-sketch' (draw.js).
 * A document `Font "X"` directive, or the host's `fontFamily` render option,
 * swaps in a custom family X instead: no built-in embed, a stack of
 * `'X', 'Comic Neue', 'Comic Sans MS', ...`, and text metrics scaled by X's
 * `width` / `leading` (or a measured preset for well-known faces). A host may
 * also hand core X's font bytes (`fontFace`) to embed -- core never reads files.
 *
 * Precedence: document `Font` > render options > built-in. Deliberately the
 * opposite of `Flow`: font metrics change the layout, so the author's choice
 * wins and host options are defaults only.
 *
 * Imports only leaf modules (metrics, draw, errors), so resolve.js and
 * index.js can both depend on it.
 */

import { DEFAULT_LEADING } from './metrics.js';
import { SKETCH_FAMILY, SKETCH_FONT, SKETCH_CLASS } from './draw.js';
import { diagnostic } from './errors.js';

/**
 * @typedef {Object} FontSpec          // what a `Font` directive or the options ask for
 * @property {string} family
 * @property {number} [width]
 * @property {number} [leading]
 *
 * @typedef {Object} HostFace          // a host-supplied face, normalized for embedding
 * @property {string} base64
 * @property {'woff2'|'woff'|'truetype'|'opentype'} format
 * @property {number} [weight]
 *
 * @typedef {Object} EffectiveFont     // what this render actually uses
 * @property {boolean} builtin         // true: the embedded 'wiremark-sketch' face
 * @property {string} family           // the family as written ('wiremark-sketch' when builtin)
 * @property {string} stack            // CSS font-family stack
 * @property {string} className        // scoping class for the <style> rule
 * @property {number} width            // horizontal scale vs the built-in measurements
 * @property {number} leading          // line height as a multiple of font size
 * @property {HostFace[]} faces        // host faces to embed (custom family only)
 */

/** Family names: letters, digits, spaces, `-`, `_`, `.`; starts alphanumeric. */
const FAMILY_RE = /^[A-Za-z0-9][A-Za-z0-9 _.-]{0,63}$/;

/** Accepted ranges; outside them a value is an error (document) or ignored (options). */
export const FONT_WIDTH_RANGE = /** @type {const} */ ([0.3, 3]);
export const FONT_LEADING_RANGE = /** @type {const} */ ([0.8, 4]);

/** Families that mean "the built-in face" (case-insensitive). */
const BUILTIN_NAMES = new Set(['comic neue', SKETCH_FAMILY]);

/**
 * Measured width presets (scale vs the built-in truncation table), so a known
 * face works without tuning. Each is the 99th-percentile per-label ratio over
 * the fixture corpus (tasks/FONT.md) -- wide enough that long labels still fit.
 * Every preset fits the default 1.4 leading.
 * @type {Record<string, number>}
 */
const WIDTH_PRESETS = {
  'patrick hand': 0.77,
  'architects daughter': 1.07,
  'comic sans ms': 1,
  'comic sans': 1,
};

/** CSS generic families: emitted unquoted so they keep their generic meaning. */
const GENERICS = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
  'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'math', 'emoji', 'fangsong']);

/** The tail every custom stack falls back through (the built-in stack minus its private face). */
const FALLBACK_TAIL = SKETCH_FONT.replace(`'${SKETCH_FAMILY}', `, '');

/** @param {*} family @returns {boolean} */
export function isValidFamily(family) {
  return typeof family === 'string' && FAMILY_RE.test(family);
}

/** @param {*} n @param {readonly [number, number]} range @returns {boolean} */
export function inRange(n, range) {
  return typeof n === 'number' && Number.isFinite(n) && n >= range[0] && n <= range[1];
}

/** The built-in default -- also what every render restores to. @type {EffectiveFont} */
export const DEFAULT_FONT = Object.freeze({
  builtin: true,
  family: SKETCH_FAMILY,
  stack: SKETCH_FONT,
  className: SKETCH_CLASS,
  width: 1,
  leading: DEFAULT_LEADING,
  faces: [],
});

/**
 * The font a render uses, from the document's `Font` directive (wins) or the
 * render options. Invalid OPTIONS degrade to a warning and are ignored (hosts
 * get the "never throws" contract `theme` has); the directive was already
 * validated hard at parse time.
 * @param {FontSpec|undefined} docFont
 * @param {{ fontFamily?: *, fontWidth?: *, fontLeading?: *, fontFace?: * }} options
 * @param {import('./errors.js').Diagnostic[]} diagnostics   // pushed into
 * @returns {EffectiveFont}
 */
export function resolveFont(docFont, options, diagnostics) {
  /** @type {FontSpec|undefined} */
  let spec = docFont;
  if (!spec) {
    const { fontFamily, fontWidth, fontLeading } = options;
    let family = SKETCH_FAMILY;
    if (fontFamily !== undefined) {
      if (isValidFamily(fontFamily)) family = fontFamily;
      else diagnostics.push(diagnostic('warning', `fontFamily ${JSON.stringify(fontFamily)} is not a valid family name (letters, digits, spaces, - _ .) -- using the built-in font`));
    }
    spec = { family };
    if (fontWidth !== undefined) {
      if (inRange(fontWidth, FONT_WIDTH_RANGE)) spec.width = fontWidth;
      else diagnostics.push(diagnostic('warning', `fontWidth must be a number from ${FONT_WIDTH_RANGE[0]} to ${FONT_WIDTH_RANGE[1]} -- ignored`));
    }
    if (fontLeading !== undefined) {
      if (inRange(fontLeading, FONT_LEADING_RANGE)) spec.leading = fontLeading;
      else diagnostics.push(diagnostic('warning', `fontLeading must be a number from ${FONT_LEADING_RANGE[0]} to ${FONT_LEADING_RANGE[1]} -- ignored`));
    }
  }

  const key = spec.family.toLowerCase();
  const builtin = BUILTIN_NAMES.has(key);
  const width = spec.width ?? (builtin ? 1 : WIDTH_PRESETS[key] ?? 1);
  const leading = spec.leading ?? DEFAULT_LEADING;
  if (builtin) {
    if (options.fontFace !== undefined) {
      diagnostics.push(diagnostic('warning', 'fontFace ignored -- it supplies a custom font, but the built-in font is in use'));
    }
    return { ...DEFAULT_FONT, width, leading };
  }

  const head = GENERICS.has(key) ? key : `'${spec.family}'`;
  const tail = FALLBACK_TAIL.split(', ').filter((f) => f.replace(/'/g, '').toLowerCase() !== key);
  const stack = [head, ...tail].join(', ');
  return {
    builtin: false,
    family: spec.family,
    stack,
    className: `wm-font-${hash(stack)}`,
    width,
    leading,
    faces: hostFaces(options.fontFace, spec.family, diagnostics),
  };
}

/**
 * Normalize the host's `fontFace` option -- one entry or an array of
 * `{ data, family?, weight?, format? }`, where `data` is base64 text or bytes
 * (Uint8Array / ArrayBuffer). An entry naming a different family is skipped;
 * an unrecognizable one warns and is skipped. Format comes from the file's own
 * signature (an explicit `format` must agree), so arbitrary data can't be
 * smuggled into the @font-face.
 * @param {*} option @param {string} family
 * @param {import('./errors.js').Diagnostic[]} diagnostics
 * @returns {HostFace[]}
 */
function hostFaces(option, family, diagnostics) {
  if (option === undefined || option === null) return [];
  const entries = Array.isArray(option) ? option : [option];
  /** @type {HostFace[]} */
  const out = [];
  for (const e of entries) {
    if (!e || typeof e !== 'object') {
      diagnostics.push(diagnostic('warning', 'fontFace entries must be objects ({ data, family?, weight? }) -- skipped'));
      continue;
    }
    if (e.family !== undefined && String(e.family).toLowerCase() !== family.toLowerCase()) continue;
    const base64 = toBase64(e.data);
    const format = base64 ? sniffFormat(base64) : null;
    if (!base64 || !format || (e.format !== undefined && e.format !== format)) {
      diagnostics.push(diagnostic('warning', `fontFace for "${family}" is not a recognizable WOFF2/WOFF/TrueType/OpenType font -- skipped`));
      continue;
    }
    const weight = Number.isInteger(e.weight) && e.weight >= 1 && e.weight <= 1000 ? e.weight : undefined;
    out.push(weight === undefined ? { base64, format } : { base64, format, weight });
  }
  return out;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Base64 text (validated, whitespace stripped) or bytes -> canonical base64.
 * Pure JS: the browser bundle runs where neither Buffer nor btoa is promised.
 * @param {*} data @returns {string|null}
 */
function toBase64(data) {
  if (typeof data === 'string') {
    const s = data.replace(/\s+/g, '');
    return s.length > 0 && s.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(s) ? s : null;
  }
  /** @type {Uint8Array|null} */
  const bytes = data instanceof Uint8Array ? data
    : data instanceof ArrayBuffer ? new Uint8Array(data)
      : null;
  if (!bytes || bytes.length === 0) return null;
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63]
      + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=')
      + (i + 2 < bytes.length ? B64[n & 63] : '=');
  }
  return out;
}

/**
 * Font format from the first 4 bytes of base64 data (the sfnt/WOFF signature).
 * @param {string} base64 @returns {HostFace['format']|null}
 */
function sniffFormat(base64) {
  const head = base64.slice(0, 8);
  /** @type {number[]} */
  const bytes = [];
  for (let i = 0; i < head.length; i += 4) {
    const n = (B64.indexOf(head[i]) << 18) | (B64.indexOf(head[i + 1]) << 12)
      | (Math.max(0, B64.indexOf(head[i + 2])) << 6) | Math.max(0, B64.indexOf(head[i + 3]));
    bytes.push((n >> 16) & 255, (n >> 8) & 255, n & 255);
  }
  const sig = String.fromCharCode(...bytes.slice(0, 4));
  if (sig === 'wOF2') return 'woff2';
  if (sig === 'wOFF') return 'woff';
  if (sig === 'OTTO') return 'opentype';
  if (sig === 'true' || (bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0)) return 'truetype';
  return null;
}

/** FNV-1a, 8 hex chars -- a deterministic scoping-class suffix. @param {string} s */
function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
