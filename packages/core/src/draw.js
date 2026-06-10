// @ts-check
import rough from 'roughjs';
import { LINE_HEIGHT, ARROW_HEAD, ARROW_SPREAD, CONNECTOR_WIDTH } from './metrics.js';

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
  hatch: '#c4c4c4',   // true gray -- default background hatch strokes
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

/**
 * @param {{ d: string, stroke?: string, strokeWidth?: number, fill?: string }} p
 * @param {number[]} [dash]  stroke-dasharray pattern; rough.js bakes geometry in
 *   `toPaths` and drops its own `strokeLineDash`, so we re-apply it as an SVG attr.
 */
function pathToSvg(p, dash) {
  const fill = p.fill && p.fill !== 'none' ? p.fill : 'none';
  const stroke = p.stroke && p.stroke !== 'none' ? p.stroke : 'none';
  const sw = p.strokeWidth ?? 1;
  const da = dash && dash.length ? ` stroke-dasharray="${dash.join(' ')}"` : '';
  return `<path d="${p.d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${da} `
    + 'stroke-linecap="round" stroke-linejoin="round"/>';
}

/** @param {*} drawable @param {number[]} [dash] @returns {string} */
function emit(drawable, dash) {
  return generator.toPaths(drawable).map((p) => pathToSvg(p, dash)).join('');
}

/**
 * Hand-drawn rectangle.
 * @param {number} x @param {number} y @param {number} w @param {number} h
 * @param {object} [opts]  rough.js options (stroke, strokeWidth, fill, fillStyle, roughness, ...)
 * @returns {string}
 */
export function rrect(x, y, w, h, opts = {}) {
  const { strokeLineDash, ...rough } = opts;
  return emit(generator.rectangle(x, y, Math.max(1, w), Math.max(1, h),
    { seed: seedOf(x, y, w, h), stroke: COLORS.ink, strokeWidth: 1.2, roughness: 1.1, bowing: 1, ...rough }), strokeLineDash);
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
  const { fill = 'none', stroke = COLORS.ink, strokeWidth = 1.2, fillStyle = 'solid', ...rest } = opts;
  const o = fill === 'none'
    ? { stroke, strokeWidth, ...rest }
    : { fill, fillStyle, stroke, strokeWidth, ...rest };
  return rrect(box.x, box.y, box.w, box.h, o);
}

/**
 * Background-tint patterns keyed by the `background` prop value, each mapped to
 * its rough.js `fillStyle`. A tinted surface fills with light gray HAND-DRAWN
 * hashes -- never a solid block, which would read as a finished UI rather than a
 * wireframe. Keeping our enum (`hatch`/`crosshatch`) distinct from rough.js's own
 * token names (`hachure`/`cross-hatch`) keeps the DSL decoupled from the library.
 *  - hatch:      single-direction diagonal hashes (the default look).
 *  - crosshatch: hashes in BOTH directions (\ and /), reads darker/denser.
 * The `denseBackground` flag packs either pattern's lines closer together.
 * @type {Record<string, string>}
 */
const HATCH_PATTERNS = { hatch: 'hachure', crosshatch: 'cross-hatch' };

/** Line spacing (px) for the normal vs `denseBackground` tint. */
const HATCH_GAP = { normal: 6, dense: 3 };

/** Shared hatch tuning: thin strokes on a fixed diagonal, low roughness so the
 *  hashes barely overflow the box (the border is drawn separately, at its own
 *  normal roughness, so it stays as wobbly as every other surface). */
const HATCH_BASE = { fillWeight: 1, hachureAngle: -41, roughness: 0.4 };

/** The `background` enum domain, shared by every tinted element + the spec. */
export const BACKGROUNDS = Object.keys(HATCH_PATTERNS);

/**
 * The wireframe background tint: light gray hand-drawn hashes filling `box`,
 * BORDERLESS. Draw your own border afterwards (e.g. `surface(box, { fill:
 * 'none' })`) so the tight hatch roughness doesn't stiffen the outline.
 * `pattern` is the element's `background` prop (`hatch`/`crosshatch`; unknown ->
 * `hatch`); `dense` is its `denseBackground` flag (packs the lines closer). Pass
 * `opts.fill` to recolor the hashes (e.g. muted when disabled).
 * @param {{x:number,y:number,w:number,h:number}} box
 * @param {string} [pattern]  'hatch' | 'crosshatch'
 * @param {boolean} [dense]
 * @param {{ fill?: string }} [opts]
 * @returns {string}
 */
export function backgroundHatch(box, pattern = 'hatch', dense = false, opts = {}) {
  const fillStyle = HATCH_PATTERNS[pattern] ?? HATCH_PATTERNS.hatch;
  const hachureGap = dense ? HATCH_GAP.dense : HATCH_GAP.normal;
  return surface(box, { fill: opts.fill ?? COLORS.hatch, stroke: 'none', fillStyle, hachureGap, ...HATCH_BASE });
}

/**
 * Hand-drawn line.
 * @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2
 * @param {object} [opts]
 * @returns {string}
 */
export function rline(x1, y1, x2, y2, opts = {}) {
  const { strokeLineDash, ...rough } = opts;
  return emit(generator.line(x1, y1, x2, y2,
    { seed: seedOf(x1, y1, x2, y2), stroke: COLORS.ink, strokeWidth: 1.2, roughness: 1.1, bowing: 1, ...rough }), strokeLineDash);
}

/**
 * A CLEAN (non-sketch) flow connector: a straight, thicker polyline through
 * `points` plus a FILLED arrowhead at the last point. Deliberately NOT hand-drawn
 * -- frame-to-frame navigation arrows read as a separate diagram layer, distinct
 * from the wobbly wireframe content (SPEC ss.7.4). No rough.js, so it is crisp and
 * inherently deterministic. The arrowhead orients along the LAST segment, so an
 * orthogonal elbow meets a frame edge square-on.
 * @param {{x:number,y:number}[]} points  >= 2 points
 * @param {object} [opts]  { stroke?, strokeWidth?, head?, spread? }
 * @returns {string}
 */
export function connectorArrow(points, opts = {}) {
  if (!points || points.length < 2) return ''; // degrade gracefully, never crash the render
  const { stroke = COLORS.ink, strokeWidth = CONNECTOR_WIDTH, head = ARROW_HEAD, spread = ARROW_SPREAD } = opts;
  const r = Math.round; // crisp integer coordinates -- no sub-pixel bloat in the SVG
  const shaft = points.map((p, i) => `${i ? 'L' : 'M'}${r(p.x)} ${r(p.y)}`).join(' ');
  const a = points[points.length - 2];
  const b = points[points.length - 1];
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const lx = b.x - head * Math.cos(ang - spread);
  const ly = b.y - head * Math.sin(ang - spread);
  const rx = b.x - head * Math.cos(ang + spread);
  const ry = b.y - head * Math.sin(ang + spread);
  return (
    `<path d="${shaft}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="M${r(b.x)} ${r(b.y)} L${r(lx)} ${r(ly)} L${r(rx)} ${r(ry)} Z" fill="${stroke}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`
  );
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
 * A generic placeholder glyph: a muted bordered square of side `s` at (x, y),
 * with an optional diagonal mark -- the wireframe stand-in for ANY icon, shared
 * by every icon-bearing element (Icon, Button, Fab, ToggleButton, Option,
 * BottomNavigationAction, AccordionHeader, Rating, ...) so the icon look stays
 * consistent and no element re-rolls the mark. Pass `diagonal: false` for a bare
 * square (Button's inline affordance) and `stroke` to tint it (e.g. muted ink
 * when disabled).
 * @param {number} x @param {number} y @param {number} s
 * @param {{ stroke?: string, diagonal?: boolean }} [opts]
 * @returns {string}
 */
export function iconGlyph(x, y, s, opts = {}) {
  const { stroke = COLORS.muted, diagonal = true } = opts;
  return rrect(x, y, s, s, { stroke, strokeWidth: 1 })
    + (diagonal ? rline(x, y + s, x + s, y, { stroke, strokeWidth: 1 }) : '');
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

// --- shared variant helpers (outline / elevation / surface) -------------------
// These let Box / Stack / Card / AppBar express the spec's `outline`, `elevation`
// and `variant` props without each re-deriving stroke styling (CONVENTION s.8).

/** Dash pattern per outline style; `solid`/`none` have none. @type {Record<string, number[]>} */
const OUTLINE_DASH = { dashed: [6, 4], dotted: [1, 4] };

/**
 * Outline style -> stroke options to feed straight into `rrect`/`surfaceWith`.
 * `'none'` yields `{ stroke: 'none' }` (no border drawn); `solid` a plain stroke;
 * `dashed`/`dotted` add a `strokeLineDash` the primitives turn into a real
 * `stroke-dasharray` (CONVENTION s.8).
 * @param {string} [style]  'none' | 'solid' | 'dashed' | 'dotted'
 * @param {{ stroke?: string, strokeWidth?: number }} [opts]
 * @returns {{ stroke: string, strokeWidth?: number, strokeLineDash?: number[] }}
 */
export function outlineOpts(style = 'solid', opts = {}) {
  if (style === 'none') return { stroke: 'none' };
  const { stroke = COLORS.ink, strokeWidth = 1.2 } = opts;
  const dash = OUTLINE_DASH[style];
  return dash ? { stroke, strokeWidth, strokeLineDash: dash } : { stroke, strokeWidth };
}

/**
 * A subtle drop shadow conveying elevation `n` (MUI-ish; n<=0 draws nothing).
 * Returns SVG to paint BEHIND a surface, so call it first and concatenate the
 * surface after. The offset/opacity grow gently with n and saturate, so a big
 * elevation never produces a runaway shadow (CONVENTION s.8).
 * @param {{x:number,y:number,w:number,h:number}} box
 * @param {number} [n]
 * @returns {string}
 */
export function elevationShadow(box, n = 0) {
  n = Number(n);                             // tolerate a spec string default ("1")
  if (!(n > 0)) return '';
  const off = Math.min(2 + n, 6);            // px offset, saturating
  const opacity = Math.min(0.06 + n * 0.03, 0.22);
  return rrect(box.x + off, box.y + off, box.w, box.h,
    { stroke: 'none', fill: COLORS.ink, fillStyle: 'solid', roughness: 0.6, fillWeight: 0.5 })
    .replace(/<path /g, `<path opacity="${opacity}" `);
}

/**
 * Bundled surface: optional elevation shadow, then a filled/bordered box whose
 * border style comes from `outline`. The one-call path for Card / Box / Stack /
 * AppBar (CONVENTION s.8). With `outline:'none'` and no elevation/fill it emits
 * nothing, so an invisible layout primitive can call it unconditionally.
 * @param {{x:number,y:number,w:number,h:number}} box
 * @param {{ fill?: string, outline?: string, elevation?: number, stroke?: string, strokeWidth?: number, fillStyle?: string }} [opts]
 * @returns {string}
 */
export function surfaceWith(box, opts = {}) {
  const { fill = 'none', outline = 'solid', elevation = 0, stroke, strokeWidth, fillStyle = 'solid' } = opts;
  const line = outlineOpts(outline, { stroke, strokeWidth });
  const hasBorder = line.stroke !== 'none';
  const hasFill = fill !== 'none';
  let out = elevationShadow(box, elevation);
  if (!hasBorder && !hasFill) return out; // fully invisible: nothing to draw
  const rectOpts = hasFill
    ? { ...line, fill, fillStyle }
    : line;
  out += rrect(box.x, box.y, box.w, box.h, rectOpts);
  return out;
}
