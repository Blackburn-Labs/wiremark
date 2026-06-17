// @ts-check
import { rrect, rline, rellipse, centeredLabel, COLORS } from '../draw.js';

/**
 * Chart -- a low-fidelity chart graphic (SPEC: Content). A drop-in `Chart` renders
 * a clean bar chart; a keyless variant name switches the chart family and a few
 * flags tailor axes/legend/labels -- all in the wiremark house style. Seven
 * variants share one set of plot/squiggle/axis helpers:
 *  - bar (default): horizontal bars growing rightward from a left baseline.
 *  - column: the same rotated -- vertical bars growing up from a bottom baseline.
 *  - line: a polyline through `series` deterministic points, a dot at each.
 *  - area: the `line` path with the region below the curve filled (strip-sampled).
 *  - histogram: touching vertical bars tracing a single symmetric distribution hump.
 *  - pie: an outer disc divided into `series` equal slices by radial spokes.
 *  - donut: `pie` with a concentric paper knockout, spokes drawn across the ring.
 *
 * The load-bearing product decision: a Chart carries NO DATA. Letting authors
 * supply series values would turn a wireframe element into a charting library, so
 * bar heights, slice counts and point positions are a pure function of an integer
 * INDEX (the `Calendar.hasEvent` precedent) and every axis label / legend entry is
 * a short SQUIGGLE -- a wavy line, never real glyphs -- so the chart conveys "a
 * chart goes here" without implying any specific values. The single exception is
 * `title`, the one place real user text is drawn. (A later version may grow this
 * into advanced/data-bearing charting -- not in this version.)
 *
 * Strategy (self-rendering sizing leaf, the `Calendar`/`Rating`/`Skeleton`
 * precedent): the single default-exported object is BOTH schema and layout/render
 * strategy. It draws through `draw.js` primitives only -- no children, no roughjs,
 * no clock. Every bar, dot and spoke comes from arithmetic on its index, so
 * rendering the same source twice is byte-identical.
 *
 * Sizing (`sizing: true`, `block: false`, like `Box`/`Img`/`Calendar`): the element
 * accepts the whole box-sizing vocabulary (`w`/`h`/`%`/`*`/flex, ss.4) and `render`
 * ALWAYS lays the plot out from the final `box.w`/`box.h`, so the same element is a
 * 220px sidebar pie or a full-bleed `w=100%` main-content bar chart. `intrinsic`
 * is width-aware (the mechanism Typography/Calendar use): given a width -- pinned,
 * or the width the parent offers -- it derives a proportional height that holds the
 * variant's aspect (cartesian landscape, pie/donut square), so `w=100%` in a narrow
 * column looks right with no height math. Pinning the height (a second positional
 * `w h` token) overrides; pinning neither yields the variant's natural size.
 *
 * Keyless wiring (obeys the no-collision rule in smoke.test.js): one literal
 * (`title`, quoted strings only) and one enum (`variant`); sizing is its own
 * category, so `series` is KEYED only (a bare number is a sizing token here, exactly
 * as on `Box`/`Skeleton`/`Calendar.value`). `legend`/`axes`/`labels` are keyless
 * boolean flags (any order, no collision). Defaults are applied in the strategy,
 * never injected by the resolver -- the same convention `Calendar`/`Rating` rely on.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** The seven variants, in declaration order; an unknown/absent value -> `bar`. */
const VARIANTS = ['bar', 'column', 'line', 'area', 'histogram', 'pie', 'donut'];

/** The two radial variants, which ignore cartesian chrome (axes/labels). */
const RADIAL = new Set(['pie', 'donut']);

/** Natural footprint (px): cartesian is landscape, pie/donut square. */
const NATURAL_CARTESIAN = { w: 320, h: 220 };
const NATURAL_RADIAL = { w: 260, h: 260 };

/** Per-variant default series count, and the readable clamp a keyed `series` obeys. */
const DEFAULT_SERIES = 5;
const DEFAULT_SERIES_RADIAL = 4;
const MIN_SERIES = 2;
const MAX_SERIES = 12;

/** Readable lower bound (px) for any scaled font, so a tiny chart stays legible. */
const MIN_FONT = 8;

/** Densely-sampled vertical strips used to fake the `area` fill (no polygon primitive). */
const AREA_STRIPS = 40;
/** Donut hole radius as a fraction of the outer radius. */
const DONUT_RATIO = 0.55;
/** Interior gridline count drawn inside the plot when `axes` is on. */
const GRIDLINES = 3;

/** Clamp `n` to [lo, hi]. */
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** The resolved variant (defaults to `bar`; the resolver injects no default). */
const variantOf = (node) =>
  typeof node.props.variant === 'string' && VARIANTS.includes(node.props.variant)
    ? node.props.variant
    : 'bar';

/**
 * The clamped series count: `series` rounded and clamped to [2, 12], falling back
 * to the per-variant default (5; pie/donut 4) when absent or non-finite.
 * @param {import('./common.js').ResolvedNode} node @returns {number}
 */
function seriesOf(node) {
  const dflt = RADIAL.has(variantOf(node)) ? DEFAULT_SERIES_RADIAL : DEFAULT_SERIES;
  const raw = Math.round(Number(node.props.series));
  return Number.isFinite(raw) ? clamp(raw, MIN_SERIES, MAX_SERIES) : dflt;
}

/**
 * A deterministic bar length as a fraction of the plot, varied but a pure predicate
 * of the index `i` (exactly the `Calendar.hasEvent` pattern). Clamped to [0.15, 1].
 * @param {number} i @param {number} _n @returns {number}
 */
function barFrac(i, _n) {
  return clamp(0.35 + ((i * 37 + 11) % 53) / 80, 0.15, 1);
}

/**
 * The histogram silhouette: a symmetric bump centered on `(n-1)/2`, so bars rise to
 * a middle peak and fall off -- a deterministic distribution, not random heights.
 * @param {number} i @param {number} n @returns {number}
 */
function humpFrac(i, n) {
  const center = (n - 1) / 2;
  const span = center === 0 ? 1 : center;
  const t = (i - center) / span; // 0 at the center, +/-1 at the ends
  return clamp(1 - 0.8 * t * t, 0.14, 1);
}

/**
 * A deterministic per-index height fraction (a small index-driven walk) for the
 * `line`/`area` points: a pure predicate of `i`, clamped to [0.1, 0.95].
 * @param {number} i @param {number} _n @returns {number}
 */
function lineFrac(i, _n) {
  return clamp(0.35 + ((i * 41 + 13) % 47) / 70, 0.1, 0.95);
}

/**
 * `n` evenly-spaced `{x, y}` points across the plot, each `y` a deterministic
 * fraction (`lineFrac`) of the plot height up from the baseline. Drives the `line`
 * polyline + dots and the `area` fill (whose strips interpolate between them).
 * @param {{x:number,y:number,w:number,h:number}} plot @param {number} n
 * @returns {{ x: number, y: number }[]}
 */
function linePts(plot, n) {
  /** @type {{ x: number, y: number }[]} */
  const pts = [];
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? plot.x + plot.w / 2 : plot.x + (plot.w * i) / (n - 1);
    pts.push({ x, y: plot.y + plot.h * (1 - lineFrac(i, n)) });
  }
  return pts;
}

/**
 * `n` evenly-spaced spoke angles (`2*pi*k/n`) dividing a disc/ring into `n` equal
 * slices. Equal slices are intentional: unequal slices would imply data the element
 * deliberately doesn't carry.
 * @param {number} n @returns {number[]}
 */
const sliceAngles = (n) => Array.from({ length: n }, (_, k) => (2 * Math.PI * k) / n);

/** y at `x` along the `linePts` polyline (linear interpolation; clamps at the ends). */
function interpY(pts, x) {
  if (x <= pts[0].x) return pts[0].y;
  const last = pts[pts.length - 1];
  if (x >= last.x) return last.y;
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i].x) {
      const t = (x - pts[i - 1].x) / (pts[i].x - pts[i - 1].x);
      return pts[i - 1].y + t * (pts[i].y - pts[i - 1].y);
    }
  }
  return last.y;
}

/**
 * The natural footprint (px) -- and so the `intrinsic` aspect ratio -- for a node:
 * landscape for cartesian variants, square for pie/donut.
 * @param {import('./common.js').ResolvedNode} node @returns {{ w: number, h: number }}
 */
const naturalSize = (node) => (RADIAL.has(variantOf(node)) ? { ...NATURAL_RADIAL } : { ...NATURAL_CARTESIAN });

// --- drawing helpers (draw.js primitives only) ----------------------------------

/**
 * A short deterministic wavy line of `segs` `rline` zig-zags around baseline `y`,
 * spanning width `w` from `x` -- the squiggle stand-in for an axis/legend label
 * (`COLORS.muted`), analogous to `Calendar.drawChevron`. NEVER real glyphs.
 * @param {number} x @param {number} y @param {number} w
 * @param {{ segs?: number, amp?: number }} [opts]
 * @returns {string}
 */
function squiggle(x, y, w, opts = {}) {
  const { segs = 3, amp = 1.6 } = opts;
  const o = { stroke: COLORS.muted, strokeWidth: 1.2 };
  const step = w / segs;
  let out = '';
  for (let i = 0; i < segs; i++) {
    const y1 = y + (i % 2 === 0 ? -amp : amp);
    const y2 = y + (i % 2 === 0 ? amp : -amp);
    out += rline(x + i * step, y1, x + (i + 1) * step, y2, o);
  }
  return out;
}

/** The title band: the one real glyph the element draws, in bold ink. */
function drawTitle(box, title) {
  const fs = clamp(box.h * 0.62, MIN_FONT + 2, 22);
  return centeredLabel(box, title, { fontSize: fs, weight: 700, maxW: box.w * 0.92 });
}

/**
 * L-shaped cartesian axes (left value axis + bottom baseline, ink) plus a few light
 * interior gridlines (muted, thin). Gridlines run ACROSS the value axis: vertical
 * for `bar` (value runs along x), horizontal otherwise (value runs up y).
 * @param {{x:number,y:number,w:number,h:number}} plot @param {boolean} horizontal
 */
function drawAxes(plot, horizontal) {
  const axis = { stroke: COLORS.ink, strokeWidth: 1.2 };
  const grid = { stroke: COLORS.muted, strokeWidth: 0.6 };
  let out = rline(plot.x, plot.y, plot.x, plot.y + plot.h, axis)
    + rline(plot.x, plot.y + plot.h, plot.x + plot.w, plot.y + plot.h, axis);
  for (let g = 1; g <= GRIDLINES; g++) {
    if (horizontal) {
      const gx = plot.x + (plot.w * g) / (GRIDLINES + 1);
      out += rline(gx, plot.y, gx, plot.y + plot.h, grid);
    } else {
      const gy = plot.y + (plot.h * g) / (GRIDLINES + 1);
      out += rline(plot.x, gy, plot.x + plot.w, gy, grid);
    }
  }
  return out;
}

/**
 * Solid-accent bar fill, the shared look for bar/column/histogram. A FUNCTION (not
 * a module const) so it reads the ACTIVE palette at render time: `setTheme` mutates
 * `COLORS` in place, so a frozen object would leak light colors into a dark render.
 */
const barFill = () => ({ fill: COLORS.accent, fillStyle: 'solid', stroke: COLORS.ink, strokeWidth: 1.2 });

/** `n` bars, horizontal (from the left baseline) or vertical (from the bottom). */
function drawBars(plot, n, horizontal) {
  const fill = barFill();
  let out = '';
  if (horizontal) {
    const slot = plot.h / n;
    const barH = slot * 0.62;
    for (let i = 0; i < n; i++) {
      const len = plot.w * barFrac(i, n);
      out += rrect(plot.x, plot.y + i * slot + (slot - barH) / 2, len, barH, fill);
    }
  } else {
    const slot = plot.w / n;
    const barW = slot * 0.62;
    for (let i = 0; i < n; i++) {
      const len = plot.h * barFrac(i, n);
      out += rrect(plot.x + i * slot + (slot - barW) / 2, plot.y + plot.h - len, barW, len, fill);
    }
  }
  return out;
}

/** `n` TOUCHING vertical bars whose heights trace the `humpFrac` distribution. */
function drawHistogram(plot, n) {
  const fill = barFill();
  let out = '';
  const slot = plot.w / n;
  for (let i = 0; i < n; i++) {
    const len = plot.h * humpFrac(i, n);
    out += rrect(plot.x + i * slot, plot.y + plot.h - len, slot, len, fill);
  }
  return out;
}

/**
 * The trend polyline through `linePts` with a dot at each point. Drawn as plain
 * `rline` segments (NOT `connectorArrow`): a data series has no direction, and the
 * arrowhead would read as "this line points somewhere."
 */
function drawLine(plot, n) {
  const pts = linePts(plot, n);
  const seg = { stroke: COLORS.ink, strokeWidth: 1.6 };
  let out = '';
  for (let i = 1; i < n; i++) out += rline(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, seg);
  const dot = clamp(Math.min(plot.w, plot.h) * 0.03, 2.5, 6);
  for (const p of pts) {
    out += rellipse(p.x, p.y, dot * 2, dot * 2, { fill: COLORS.ink, fillStyle: 'solid', stroke: COLORS.ink });
  }
  return out;
}

/**
 * The `line` path over a light accent under-curve fill: touching vertical `rrect`
 * strips sampled down to the baseline (so they read as one filled region, not bars),
 * with the polyline + dots stroked on top. Strip-sampled because `draw.js` has no
 * filled-polygon primitive -- a deliberate low-fi approximation.
 */
function drawArea(plot, n) {
  const pts = linePts(plot, n);
  const baseY = plot.y + plot.h;
  const stripW = plot.w / AREA_STRIPS;
  let out = '';
  for (let s = 0; s < AREA_STRIPS; s++) {
    const x = plot.x + stripW * s;
    const y = interpY(pts, x + stripW / 2);
    out += rrect(x, y, stripW, baseY - y, { fill: COLORS.accent, fillStyle: 'solid', stroke: 'none', roughness: 0.5 });
  }
  return out + drawLine(plot, n);
}

/**
 * Pie/donut: an outer `rellipse` disc divided into `n` equal slices by radial `rline`
 * spokes. There are NO filled wedges (`draw.js` has no arc primitive). For `donut`,
 * spokes are drawn only across the RING (inner rim -> outer rim) and a concentric
 * paper-filled inner disc knocks out the hole so the ring reads as hollow. The first
 * spoke points up (a clock-face orientation).
 * @param {{x:number,y:number,w:number,h:number}} area @param {number} n @param {boolean} donut
 */
function drawPie(area, n, donut) {
  const d = Math.min(area.w, area.h) * 0.86;
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  const ro = d / 2;
  const ri = donut ? ro * DONUT_RATIO : 0;
  let out = rellipse(cx, cy, d, d, { stroke: COLORS.ink, strokeWidth: 1.4 });
  for (const a of sliceAngles(n)) {
    const ax = Math.cos(a - Math.PI / 2);
    const ay = Math.sin(a - Math.PI / 2);
    out += rline(cx + ri * ax, cy + ri * ay, cx + ro * ax, cy + ro * ay, { stroke: COLORS.ink, strokeWidth: 1.2 });
  }
  if (donut) {
    out += rellipse(cx, cy, ri * 2, ri * 2, { fill: COLORS.paper, fillStyle: 'solid', stroke: COLORS.ink, strokeWidth: 1.2 });
  }
  return out;
}

/**
 * Squiggle axis labels: value ticks along the value axis and one category squiggle
 * per slot along the category axis. Orientation mirrors `drawAxes` -- `bar` has its
 * categories down the LEFT (one per bar) and value ticks along the bottom; every
 * other cartesian variant has categories along the BOTTOM and value ticks up the left.
 * @param {{x:number,y:number,w:number,h:number}} plot
 * @param {number} leftG @param {number} bottomG @param {number} n @param {boolean} horizontal
 */
function drawCartesianLabels(plot, leftG, bottomG, n, horizontal) {
  let out = '';
  const valTicks = 4;
  const catY = plot.y + plot.h + bottomG * 0.55;
  if (horizontal) {
    // categories down the left (one per bar row)...
    const slot = plot.h / n;
    for (let i = 0; i < n; i++) {
      out += squiggle(plot.x - leftG + 2, plot.y + slot * (i + 0.5), leftG - 5, { segs: 2 });
    }
    // ...value ticks along the bottom.
    const vw = Math.min((plot.w / valTicks) * 0.6, 24);
    for (let t = 0; t < valTicks; t++) {
      out += squiggle(plot.x + (plot.w * (t + 0.5)) / valTicks - vw / 2, catY, vw, { segs: 2 });
    }
  } else {
    // categories along the bottom (one per slot)...
    const slot = plot.w / n;
    const lw = Math.min(slot * 0.7, 26);
    for (let i = 0; i < n; i++) {
      out += squiggle(plot.x + slot * (i + 0.5) - lw / 2, catY, lw, { segs: 3 });
    }
    // ...value ticks up the left.
    for (let t = 0; t < valTicks; t++) {
      out += squiggle(plot.x - leftG + 2, plot.y + (plot.h * (t + 0.5)) / valTicks, leftG - 5, { segs: 2 });
    }
  }
  return out;
}

/** A legend band: up to 5 swatch + squiggle entries, alternating accent/ink swatches. */
function drawLegend(box, n) {
  const items = Math.min(n, 5);
  const sw = clamp(box.h * 0.4, 8, 14);
  const gap = clamp(box.w / items, 44, 130);
  const labW = Math.max(16, Math.min(gap - sw - 14, 44));
  const cy = box.y + box.h / 2;
  let out = '';
  let x = box.x + 4;
  for (let i = 0; i < items; i++) {
    const fill = i % 2 === 0 ? COLORS.accent : COLORS.ink;
    out += rrect(x, cy - sw / 2, sw, sw, { fill, fillStyle: 'solid', stroke: COLORS.ink, strokeWidth: 1 });
    out += squiggle(x + sw + 5, cy, labW, { segs: 3 });
    x += gap;
  }
  return out;
}

export default {
  name: 'Chart',
  tier: 'v1.0',
  category: 'content',
  props: {
    variant: { type: 'enum', values: VARIANTS, default: 'bar', aliases: ['type', 'kind'] },
    title: { type: 'string', aliases: ['label'] },
    series: { type: 'number', aliases: ['bars', 'slices', 'points', 'n'] },
    legend: { type: 'boolean', default: false },
    axes: { type: 'boolean', default: true, aliases: ['grid'] },
    labels: { type: 'boolean', default: true },
    // width/height (+ w/h aliases) are realized by `sizing: true` (CONVENTION ss.4).
  },
  keyless: [
    { kind: 'literal', to: 'title' },
    { kind: 'enum', to: 'variant' },
  ],
  notes: 'Self-rendering low-fi chart. Keyless enum variant (bar/column/line/area/histogram/pie/donut; aliases type/kind) + keyless literal title (the ONE real text; everything else is squiggle, never glyphs). Carries no data by design -- bar/slice/point geometry is a pure function of the index. series (keyed only; aliases bars/slices/points/n) clamps to [2,12], default 5 (pie/donut 4); a bare number is a sizing token, not series. legend/axes/labels are keyless boolean flags; axes/labels are cartesian-only (ignored by pie/donut). sizing:true: positional w/h tokens (px/%/*) scale the whole plot; width drives a proportional height (pin the height with a second positional token to override).',

  sizing: true,
  block: false,
  intrinsic: (node, avail) => {
    const nat = naturalSize(node);
    const ar = nat.w / nat.h; // width / height -- the variant's aspect, held constant
    const wTok = node.size?.w;
    const hTok = node.size?.h;
    // A px-pinned width fixes the box exactly; height follows it (the engine pins
    // only `w` in measure(), so the proportional height is set here). A px h pin
    // without a w pin scales the width from the height instead.
    if (wTok?.unit === 'px') return { w: wTok.value, h: hTok?.unit === 'px' ? hTok.value : wTok.value / ar };
    if (hTok?.unit === 'px') return { w: hTok.value * ar, h: hTok.value };
    // Width-aware: derive height from the width the parent offers. With a relative
    // width token (%/*) fill the offer; without one keep the natural width (clamped
    // to the offer) so a wide parent never inflates the measured height past the
    // footprint actually drawn -- keeping the measure and place passes in agreement.
    if (avail && Number.isFinite(avail.w)) {
      const w = wTok ? /** @type {number} */ (avail.w) : Math.min(nat.w, /** @type {number} */ (avail.w));
      return { w, h: w / ar };
    }
    if (avail && Number.isFinite(avail.h)) {
      const h = hTok ? /** @type {number} */ (avail.h) : Math.min(nat.h, /** @type {number} */ (avail.h));
      return { w: h * ar, h };
    }
    return { ...nat };
  },
  render: (node, box) => {
    const variant = variantOf(node);
    const n = seriesOf(node);
    const title = typeof node.props.title === 'string' ? node.props.title : '';
    const showLegend = node.props.legend === true;
    const showAxes = node.props.axes !== false;
    const showLabels = node.props.labels !== false;

    // Carve the box: optional title band on top, optional legend band on the bottom,
    // the plot area between.
    const titleH = title ? clamp(box.h * 0.16, 16, 40) : 0;
    const legendH = showLegend ? clamp(box.h * 0.13, 16, 36) : 0;
    let out = title ? drawTitle({ x: box.x, y: box.y, w: box.w, h: titleH }, title) : '';
    const area = { x: box.x, y: box.y + titleH, w: box.w, h: box.h - titleH - legendH };

    if (RADIAL.has(variant)) {
      // pie/donut: axes/labels are ignored (no cartesian chrome); legend still applies.
      out += drawPie(area, n, variant === 'donut');
    } else {
      const horizontal = variant === 'bar';
      const leftG = showLabels ? clamp(area.w * 0.09, 12, 40) : 0;
      const bottomG = showLabels ? clamp(area.h * 0.14, 12, 30) : 0;
      const topPad = clamp(area.h * 0.05, 3, 12);
      const plot = { x: area.x + leftG, y: area.y + topPad, w: area.w - leftG, h: area.h - bottomG - topPad };
      if (showAxes) out += drawAxes(plot, horizontal);
      if (variant === 'bar' || variant === 'column') out += drawBars(plot, n, horizontal);
      else if (variant === 'histogram') out += drawHistogram(plot, n);
      else if (variant === 'line') out += drawLine(plot, n);
      else if (variant === 'area') out += drawArea(plot, n);
      if (showLabels) out += drawCartesianLabels(plot, leftG, bottomG, n, horizontal);
    }

    if (showLegend) out += drawLegend({ x: box.x, y: box.y + box.h - legendH, w: box.w, h: legendH }, n);
    return out;
  },
};

// Pure helpers exported for direct testing (no clock, no node needed beyond seriesOf).
export { seriesOf, variantOf, barFrac, humpFrac, lineFrac, linePts, sliceAngles, naturalSize };
