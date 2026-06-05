// @ts-check
import rough from 'roughjs';
import { LINE_HEIGHT } from './metrics.js';

/**
 * Hand-drawn SVG primitives shared by every element's `render` (SPEC ss.1 goal
 * 5). rough.js runs headless here -- its generator yields `<path>` data via
 * `toPaths`, no DOM -- and a geometry-derived `seed` keeps output deterministic
 * across runs while still varying per shape. Elements draw through these helpers
 * so the sketch aesthetic stays consistent and no element reaches for rough.js
 * directly.
 */

const generator = rough.generator();

/**
 * Deterministic-but-varied seed from a shape's geometry: stable across runs (so
 * output is reproducible) yet different per shape (so equal-sized boxes don't
 * get byte-identical wobble). FNV-1a over the rounded coordinates.
 * @param {...number} nums @returns {number}
 */
function seedOf(...nums) {
  let h = 2166136261;
  for (const n of nums) {
    h ^= Math.round(n * 1000) | 0;
    h = Math.imul(h, 16777619);
  }
  return (Math.abs(h) % 2147483647) || 1;
}

/** Sketch palette. */
export const COLORS = {
  ink: '#22303f',     // strokes & text
  paper: '#ffffff',   // background
  muted: '#9aa7b2',   // secondary strokes / placeholders
  fill: '#eef2f5',    // subtle surface fill
  accent: '#cfe0ee',  // primary-ish fill
};

/** Handwriting-ish font stack for the sketch look (no font embedding). */
export const SKETCH_FONT =
  "'Comic Sans MS', 'Comic Sans', 'Marker Felt', 'Segoe Print', 'Bradley Hand', 'Chalkboard SE', cursive";

/** @param {*} s @returns {string} */
export function escape(s) {
  return String(s).replace(/[&<>"]/g, (c) => /** @type {Record<string,string>} */ (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }
  )[c]);
}

/** @param {{ d: string, stroke?: string, strokeWidth?: number, fill?: string }} p */
function pathToSvg(p) {
  const fill = p.fill && p.fill !== 'none' ? p.fill : 'none';
  const stroke = p.stroke && p.stroke !== 'none' ? p.stroke : 'none';
  const sw = p.strokeWidth ?? 1;
  return `<path d="${p.d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" `
    + 'stroke-linecap="round" stroke-linejoin="round"/>';
}

/** @param {*} drawable @returns {string} */
function emit(drawable) {
  return generator.toPaths(drawable).map(pathToSvg).join('');
}

/**
 * Hand-drawn rectangle.
 * @param {number} x @param {number} y @param {number} w @param {number} h
 * @param {object} [opts]  rough.js options (stroke, strokeWidth, fill, fillStyle, roughness, ...)
 * @returns {string}
 */
export function rrect(x, y, w, h, opts = {}) {
  return emit(generator.rectangle(x, y, Math.max(1, w), Math.max(1, h),
    { seed: seedOf(x, y, w, h), stroke: COLORS.ink, strokeWidth: 1.2, roughness: 1.1, bowing: 1, ...opts }));
}

/**
 * Canonical "surface": a bordered box for chrome elements (Card, AppBar, Paper,
 * TextField, ...). Use this instead of hand-rolling rrect so surfaces stay
 * consistent. Draw it across the element's FULL box; set `pad` in layoutSpec so
 * children inset.
 * @param {{x:number,y:number,w:number,h:number}} box
 * @param {{ fill?: string, stroke?: string, strokeWidth?: number, fillStyle?: string }} [opts]
 * @returns {string}
 */
export function surface(box, opts = {}) {
  const { fill = 'none', stroke = COLORS.ink, strokeWidth = 1.2, fillStyle = 'solid' } = opts;
  const o = fill === 'none' ? { stroke, strokeWidth } : { fill, fillStyle, stroke, strokeWidth };
  return rrect(box.x, box.y, box.w, box.h, o);
}

/**
 * Hand-drawn line.
 * @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2
 * @param {object} [opts]
 * @returns {string}
 */
export function rline(x1, y1, x2, y2, opts = {}) {
  return emit(generator.line(x1, y1, x2, y2,
    { seed: seedOf(x1, y1, x2, y2), stroke: COLORS.ink, strokeWidth: 1.2, roughness: 1.1, bowing: 1, ...opts }));
}

/**
 * Hand-drawn ellipse centered at (cx, cy).
 * @param {number} cx @param {number} cy @param {number} w @param {number} h
 * @param {object} [opts]
 * @returns {string}
 */
export function rellipse(cx, cy, w, h, opts = {}) {
  return emit(generator.ellipse(cx, cy, w, h,
    { seed: seedOf(cx, cy, w, h), stroke: COLORS.ink, strokeWidth: 1.2, roughness: 1.1, ...opts }));
}

/**
 * A "crossed box" -- the classic wireframe image placeholder.
 * @param {number} x @param {number} y @param {number} w @param {number} h
 * @param {object} [opts]
 * @returns {string}
 */
export function rcrossbox(x, y, w, h, opts = {}) {
  return rrect(x, y, w, h, opts)
    + rline(x, y, x + w, y + h, { strokeWidth: 1, ...opts })
    + rline(x + w, y, x, y + h, { strokeWidth: 1, ...opts });
}

/**
 * A `<text>` element in the sketch font.
 * @param {number} x @param {number} y  baseline-ish anchor
 * @param {string} str
 * @param {{ fontSize?: number, weight?: string|number, anchor?: 'start'|'middle'|'end', fill?: string }} [opts]
 * @returns {string}
 */
export function text(x, y, str, opts = {}) {
  const { fontSize = 16, weight = 400, anchor = 'start', fill = COLORS.ink } = opts;
  return `<text x="${x}" y="${y}" font-family="${SKETCH_FONT}" font-size="${fontSize}" `
    + `font-weight="${weight}" text-anchor="${anchor}" fill="${fill}">${escape(str)}</text>`;
}

/**
 * A label centered within `box` (the common case for Button / Chip / ListItem /
 * inputs). Saves every leaf from re-deriving the optical baseline.
 * @param {{x:number,y:number,w:number,h:number}} box
 * @param {string} str
 * @param {{ fontSize?: number, weight?: string|number, fill?: string }} [opts]
 * @returns {string}
 */
export function centeredLabel(box, str, opts = {}) {
  const { fontSize = 16, weight = 400, fill = COLORS.ink } = opts;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2 + fontSize * 0.35; // optical vertical centering
  return text(cx, cy, str, { fontSize, weight, anchor: 'middle', fill });
}

/**
 * Draw `lines` rows of squiggle filler within a width (a sketch stand-in for
 * body text -- SPEC ss.6). Baselines step by the line height of `fontSize`.
 * @param {number} x @param {number} y  top of the first line
 * @param {number} w @param {number} lines @param {number} fontSize
 * @returns {string}
 */
export function fillerRows(x, y, w, lines, fontSize) {
  const step = fontSize * LINE_HEIGHT;
  let out = '';
  for (let i = 0; i < lines; i++) {
    const ly = y + step * (i + 0.6);
    const lw = i === lines - 1 ? w * 0.6 : w; // ragged last line
    out += rline(x, ly, x + lw, ly, { stroke: COLORS.muted, strokeWidth: 1, roughness: 1.4 });
  }
  return out;
}
