// @ts-check
import rough from 'roughjs';
import { LINE_HEIGHT, ARROW_HEAD, ARROW_SPREAD, CONNECTOR_WIDTH, truncateText, textRunWidth } from './metrics.js';

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

/**
 * Sketch palettes, one per `theme` render option (tasks/THEME.md). LIGHT IS
 * FROZEN: its values are byte-stable public output -- the existing element
 * tests and the browser-bundle equality test are the light regression suite.
 * Dark may be tuned between releases.
 */
export const PALETTES = {
  light: Object.freeze({
    ink: '#22303f',     // strokes & text
    paper: '#ffffff',   // background
    muted: '#9aa7b2',   // secondary strokes / placeholders
    fill: '#eef2f5',    // subtle surface fill
    accent: '#cfe0ee',  // primary-ish fill
    hatch: '#c4c4c4',   // true gray -- default background hatch strokes
    error: '#c2473d',   // error-state ink (TextField)
  }),
  dark: Object.freeze({
    ink: '#d4dde6',
    paper: '#1e2127',
    muted: '#6b7782',
    fill: '#2a313a',
    accent: '#2f4a5e',
    hatch: '#3a3f47',
    error: '#e0685a',
  }),
};

/** The ACTIVE sketch palette. Mutable on purpose: `setTheme` swaps values in
 *  place so every call-time `COLORS.*` read across draw.js and the elements
 *  follows the theme with zero plumbing. Starts as -- and is always restored
 *  to -- light. */
export const COLORS = { ...PALETTES.light };

/**
 * Swap the active palette in place. Internal machinery: `render()` scopes it
 * per call (swap before renderSVG, restore in `finally`); exported for the
 * render facade and tests, NOT re-exported from index.js. Anything that is
 * not the literal string name of an own PALETTES key means light -- matching
 * render()'s "unknown theme -> light, never throw" contract (the hasOwn +
 * string guard keeps inherited keys like 'constructor' and coercing values
 * like ['dark'] out).
 * @param {*} [theme]
 */
export function setTheme(theme) {
  Object.assign(COLORS,
    typeof theme === 'string' && Object.hasOwn(PALETTES, theme) ? PALETTES[theme] : PALETTES.light);
}

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
 * Hand-drawn rounded rectangle: corner radius `r` (clamped to the half-extents),
 * drawn as ONE closed path so the outline wobbles continuously through the
 * corner arcs -- overlaying separate corner strokes on a sharp `rrect` reads as
 * both corners at once. Same option handling as `rrect`.
 * @param {number} x @param {number} y @param {number} w @param {number} h
 * @param {number} r  corner radius (px)
 * @param {object} [opts]  rough.js options (stroke, strokeWidth, fill, fillStyle, ...)
 * @returns {string}
 */
export function rroundrect(x, y, w, h, r, opts = {}) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  const d = `M${x + k} ${y} L${x + w - k} ${y} A${k} ${k} 0 0 1 ${x + w} ${y + k} `
    + `L${x + w} ${y + h - k} A${k} ${k} 0 0 1 ${x + w - k} ${y + h} `
    + `L${x + k} ${y + h} A${k} ${k} 0 0 1 ${x} ${y + h - k} `
    + `L${x} ${y + k} A${k} ${k} 0 0 1 ${x + k} ${y} Z`;
  const { strokeLineDash, ...rough } = opts;
  return emit(generator.path(d,
    { seed: seedOf(x, y, w, h, k), stroke: COLORS.ink, strokeWidth: 1.2, roughness: 1.1, bowing: 1, ...rough }), strokeLineDash);
}

/**
 * Hand-drawn pill (stadium): a rounded rect at full radius, so the short ends
 * are complete semicircles (e.g. Control's switch track). Works in either
 * orientation; degenerates to a circle when w === h.
 * @param {number} x @param {number} y @param {number} w @param {number} h
 * @param {object} [opts]  rough.js options (stroke, strokeWidth, fill, fillStyle, ...)
 * @returns {string}
 */
export function rpill(x, y, w, h, opts = {}) {
  return rroundrect(x, y, w, h, Math.min(w, h) / 2, opts);
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
 * Draw `box` in one of `backgroundHatch`'s four chrome shapes (rect, `'pill'`,
 * `'ellipse'`, or a numeric corner radius) with the given rough.js `opts`. Shared
 * by the opaque base pass and the hatch pass so the two always trace the SAME
 * outline -- the base can never extend past the hashes (or vice versa) for a
 * curved shape.
 * @param {{x:number,y:number,w:number,h:number}} box
 * @param {'pill'|'ellipse'|number|undefined} shape
 * @param {object} opts
 * @returns {string}
 */
function hatchShape(box, shape, opts) {
  if (shape === 'pill') return rpill(box.x, box.y, box.w, box.h, opts);
  if (shape === 'ellipse') return rellipse(box.x + box.w / 2, box.y + box.h / 2, box.w, box.h, opts);
  if (typeof shape === 'number') return rroundrect(box.x, box.y, box.w, box.h, shape, opts);
  return surface(box, opts);
}

/**
 * A solid, BORDERLESS `COLORS.paper` fill in `box`, in the same `shape` the hatch
 * uses -- the opaque base that makes a tinted surface knock out whatever is
 * behind it. Always paper (themed), never the hatch's `fill`, so a disabled tint
 * (muted hashes) is still paper-opaque. Drawn through the shared `hatchShape` so
 * the base and the hashes can't diverge.
 * @param {{x:number,y:number,w:number,h:number}} box
 * @param {'pill'|'ellipse'|number|undefined} [shape]
 * @returns {string}
 */
function paperBase(box, shape) {
  return hatchShape(box, shape, { fill: COLORS.paper, fillStyle: 'solid', stroke: 'none', roughness: 0.6 });
}

/**
 * The wireframe background tint: light gray hand-drawn hashes filling `box`,
 * BORDERLESS. Draw your own border afterwards (e.g. `surface(box, { fill:
 * 'none' })`) so the tight hatch roughness doesn't stiffen the outline.
 *
 * `pattern` is the element's `background` prop (`hatch`/`crosshatch`; unknown ->
 * `hatch`); `dense` is its `denseBackground` flag (packs the lines closer).
 * `opts.fill` recolors the HASHES (e.g. muted when disabled). `opts.shape`
 * hatches non-rect chrome -- `'pill'` (stadium), `'ellipse'`, or a number (a
 * rounded rect with that corner radius) -- so the hashes never poke past a
 * curved outline.
 *
 * `opts.base` is OPT-IN opacity (CONVENTION s.8). Pass `base: true` when the
 * hatch IS the element's own opaque SURFACE (an (A) caller: AppBar, contained
 * Button, filled Chip/TextField, the switch's "on" track, a filled/standard
 * Alert): a solid `COLORS.paper` fill in the same `shape` is laid down FIRST so
 * nothing behind shows through the hash gaps. Leave it false (the default) when
 * the hatch is a TRANSLUCENT highlight/marker/placeholder over content that must
 * stay visible (a (B) caller: a selected row, a partial progress run, the dark
 * Snackbar, a Skeleton) -- those stay byte-identical and see-through between the
 * hashes. The base is ALWAYS paper, independent of `opts.fill`. For a partial
 * tint pass the SUB-box you want opaque, not the full box.
 * @param {{x:number,y:number,w:number,h:number}} box
 * @param {string} [pattern]  'hatch' | 'crosshatch'
 * @param {boolean} [dense]
 * @param {{ base?: boolean, fill?: string, shape?: 'pill'|'ellipse'|number }} [opts]
 * @returns {string}
 */
export function backgroundHatch(box, pattern = 'hatch', dense = false, opts = {}) {
  const fillStyle = HATCH_PATTERNS[pattern] ?? HATCH_PATTERNS.hatch;
  const hachureGap = dense ? HATCH_GAP.dense : HATCH_GAP.normal;
  // (A) callers opt into an opaque paper base under the hashes; (B) callers omit
  // it and stay see-through over the content/track/row behind them.
  const base = opts.base ? paperBase(box, opts.shape) : '';
  const hatch = hatchShape(box, opts.shape,
    { fill: opts.fill ?? COLORS.hatch, stroke: 'none', fillStyle, hachureGap, ...HATCH_BASE });
  return base + hatch;
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
 * Clean (non-sketch) icon artwork: `body` -- a bare `<path d>` string or raw
 * inner-SVG markup (leading `<`) targeting a square `viewBox` grid -- drawn at
 * (x, y) scaled to extent `s`, inked solid. Deliberately NOT hand-drawn
 * (ICONS.md decision #3): real icons read as clean glyphs inside the rough
 * chrome, the Balsamiq look. No rough.js, so it is inherently deterministic.
 * `currentColor` in raw bodies is replaced by the ink so output is
 * self-contained.
 * @param {string} body
 * @param {number} x @param {number} y @param {number} s
 * @param {{ ink?: string, viewBox?: number }} [opts]
 * @returns {string}
 */
export function iconBody(body, x, y, s, opts = {}) {
  const { ink = COLORS.ink, viewBox = 24 } = opts;
  const inner = body[0] === '<' ? body.replaceAll('currentColor', ink) : `<path d="${body}"/>`;
  const k = Math.round((s / viewBox) * 10000) / 10000; // tidy, deterministic scale
  return `<g transform="translate(${x} ${y}) scale(${k})" fill="${ink}">${inner}</g>`;
}

/**
 * THE icon slot renderer every icon-bearing element draws through: the icon
 * resolved onto `node.icons[key]` at resolve time (ICONS.md ss.3) as clean
 * vectors, or the shared `iconGlyph` placeholder when the name is unknown or
 * the slot value never resolved. `ink` colors both (placeholder defaults to
 * the muted stroke, matching the placeholder-only look); `diagonal` is the
 * placeholder's mark, as in `iconGlyph`.
 * @param {import('./resolve.js').ResolvedNode} node
 * @param {string} key  the icon-typed prop name ('startIcon', 'icon', ...)
 * @param {number} x @param {number} y @param {number} s
 * @param {{ ink?: string, diagonal?: boolean }} [opts]
 * @returns {string}
 */
export function drawIcon(node, key, x, y, s, opts = {}) {
  const resolved = node.icons?.[key];
  if (resolved) return iconBody(resolved.body, x, y, s, { ink: opts.ink ?? COLORS.ink, viewBox: resolved.viewBox });
  return iconGlyph(x, y, s, { stroke: opts.ink ?? COLORS.muted, diagonal: opts.diagonal });
}

/**
 * A `<text>` element in the sketch font. `maxW` is the available run (px) from
 * the anchor in the text's direction; the string is trimmed to a '…'-terminated
 * prefix (metrics.truncateText, the same CHAR_W estimator measurement uses)
 * when it would measure wider. Omit it for unconstrained text (single glyphs,
 * pre-wrapped filler).
 * @param {number} x @param {number} y  baseline-ish anchor
 * @param {string} str
 * @param {{ fontSize?: number, weight?: string|number, anchor?: 'start'|'middle'|'end', fill?: string, maxW?: number }} [opts]
 * @returns {string}
 */
export function text(x, y, str, opts = {}) {
  const { fontSize = 16, weight = 400, anchor = 'start', fill = COLORS.ink, maxW } = opts;
  const s = truncateText(str, fontSize, maxW, weight);
  return `<text x="${x}" y="${y}" font-family="${SKETCH_FONT}" font-size="${fontSize}" `
    + `font-weight="${weight}" text-anchor="${anchor}" fill="${fill}">${escape(s)}</text>`;
}

/**
 * A label centered within `box` (the common case for Button / Chip / ListItem /
 * inputs). Saves every leaf from re-deriving the optical baseline. The label is
 * trimmed to the full box width by default (no inset -- Fab's extended label box
 * is carved to the measured text exactly, so any inset would cut a fitting
 * label); pass `maxW` to constrain tighter.
 * @param {{x:number,y:number,w:number,h:number}} box
 * @param {string} str
 * @param {{ fontSize?: number, weight?: string|number, fill?: string, maxW?: number }} [opts]
 * @returns {string}
 */
export function centeredLabel(box, str, opts = {}) {
  const { fontSize = 16, weight = 400, fill = COLORS.ink, maxW = box.w } = opts;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2 + fontSize * 0.35; // optical vertical centering
  return text(cx, cy, str, { fontSize, weight, anchor: 'middle', fill, maxW });
}

/**
 * A small "floating" label sitting ON a field's TOP border (the MUI outlined
 * look once a value/placeholder is shown). A paper-colored rectangle is knocked
 * out behind the text first, so the field outline doesn't strike through the
 * label. Shared by TextField and Select so the floating look stays identical.
 *
 * `x` is the field's left edge and `topY` its top border y; the label is inset
 * `indent` px from `x` and vertically centered on `topY`. The knockout spans the
 * (truncated) text width plus `gapPad` on each side. Pass `maxW` to bound the
 * label run; it is trimmed with an ellipsis to fit, and the knockout matches the
 * trimmed width.
 * @param {number} x  field left edge
 * @param {number} topY  field top border y (the label centers on this line)
 * @param {string} str
 * @param {{ fontSize?: number, fill?: string, gapPad?: number, indent?: number, maxW?: number }} [opts]
 * @returns {string}
 */
export function floatingLabel(x, topY, str, opts = {}) {
  const { fontSize = 11, fill = COLORS.muted, gapPad = 4, indent = 8, maxW } = opts;
  const shown = truncateText(str, fontSize, maxW);
  if (!shown) return '';
  const textX = x + indent;
  const textW = textRunWidth(shown, fontSize);
  // Opaque paper knockout behind the text so the outline reads as broken by the
  // label. A plain SVG rect (not hand-drawn) keeps the gap crisp and seamless.
  const gapX = textX - gapPad;
  const gapY = topY - fontSize / 2 - 1;
  const gapW = textW + gapPad * 2;
  const gapH = fontSize + 2;
  const knockout = `<rect x="${gapX}" y="${gapY}" width="${gapW}" height="${gapH}" fill="${COLORS.paper}"/>`;
  // Baseline placed so the text is vertically centered on the border line.
  return knockout + text(textX, topY + fontSize * 0.35, shown, { fontSize, fill });
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
