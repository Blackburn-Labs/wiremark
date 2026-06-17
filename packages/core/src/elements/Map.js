// @ts-check
import { surface, rline, rellipse, rrect, backgroundHatch, connectorArrow, drawIcon, COLORS } from '../draw.js';

/**
 * Map -- a hand-drawn, embeddable map GRAPHIC (SPEC: Content). Like
 * `Chart`/`Placeholder` it exposes NO real data -- no coordinates, no place
 * names, no geocoding -- it is a generic low-fidelity map placeholder with a few
 * illustrative knobs: an abstraction/zoom `level`, deterministic POI `pins`, a
 * center `icon` marker (e.g. `DirectionsCar` for a GPS view), a deterministic
 * GPS-style `path`, optional `compass`/zoom chrome, and squiggle `labels`.
 *
 * Strategy (self-rendering sizing leaf, the `Calendar`/`Rating` precedent): the
 * single default-exported object is BOTH schema and layout/render strategy. It
 * computes its own geometry and draws through `draw.js` primitives only -- no
 * children, no roughjs, no clock. Every "random-looking" placement is a pure
 * predicate of an integer index (a coprime-stride hash, exactly like Calendar's
 * `hasEvent = (day) => (day*7+3)%5 < 2`), so two renders of the same source are
 * byte-identical.
 *
 * One render path: the road/feature layer is parameterized by `level` (a single
 * `roadLines` function reads the level and draws denser or sparser geography);
 * the pins/icon/route/compass/labels layers are level-independent overlays.
 *  - street -- a tight `rline` grid of blocks/streets (the busier look).
 *  - area   -- sparser roads plus one hatch-filled park/water blob (a neighborhood).
 *
 * Under every level sits a faint topographic CONTOUR texture (on by default,
 * `contours=false` to drop it) -- gently undulating light lines that read as
 * elevation contours, so even a bare `Map` is recognizably a map rather than an
 * abstract set of strokes.
 *
 * Sizing (`sizing: true`, `block: false`, like `Calendar`/`Img`/`Box`): the
 * element accepts the whole box-sizing vocabulary (`w`/`h`/`%`/`*`/flex, ss.4)
 * and `render` ALWAYS lays the map out from the final `box.w`/`box.h`, so the
 * same element is a 240px sidebar locator or a full-bleed `w=100%` main-content
 * map (line counts clamp to readable floors). `intrinsic(node, avail)` is
 * width-aware (the mechanism Typography/Calendar use): given a width -- pinned,
 * or the width the parent offers -- it derives a proportional height holding the
 * ~7:5 content aspect, so `w=100%` in a narrow column looks right with no height
 * math. Pinning `h=` (or positional `w h`) overrides; pinning neither yields the
 * natural size.
 *
 * Keyless wiring (obeys the no-collision rule in smoke.test.js): exactly one
 * literal slot -- and it targets the ICON-typed `icon` prop, so a bare icon name
 * resolves (`Map DirectionsCar`) via resolve.js's icon-name step (the `Icon`/
 * `Fab` precedent); exactly one enum (`level`); sizing as its own category.
 * Because the single literal slot is the icon there is NO free-text map title --
 * intentional, so users can't encode a specific place (the `Chart`/`Placeholder`
 * restraint). `pins` is KEYED only: a bare number is a sizing token here (the
 * resolver tries `parseSize` before the keyless-number step on a `sizing`
 * element), exactly as on `Box`/`Calendar value`. `path`/`compass`/`labels` are
 * keyless boolean flags. Defaults are applied in the strategy, never injected by
 * the resolver -- the convention `Calendar.js`/`Rating.js` rely on.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** The two levels, in declaration order; an unknown/absent value -> `street`. */
const LEVELS = ['street', 'area'];

/** Natural footprint (px): a landscape ~7:5 tile (kept as the `intrinsic` aspect). */
const NATURAL = { w: 360, h: 260 };

/** Visual clamp on the pin count, so a huge `pins=` can never blow up the render. */
const MAX_PINS = 24;

/** GPS route waypoints (box-relative fractions): origin -> bends -> destination. */
const ROUTE = [
  { fx: 0.12, fy: 0.82 },
  { fx: 0.32, fy: 0.58 },
  { fx: 0.50, fy: 0.66 },
  { fx: 0.72, fy: 0.34 },
  { fx: 0.88, fy: 0.16 },
];

/** Squiggle-label positions (box-relative fractions) drawn when `labels` is set. */
const LABELS = [
  { fx: 0.16, fy: 0.30 }, { fx: 0.54, fy: 0.22 }, { fx: 0.30, fy: 0.62 },
  { fx: 0.64, fy: 0.74 }, { fx: 0.78, fy: 0.46 },
];

/** Clamp `n` to [lo, hi]. */
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** The resolved level (defaults to `street`; the resolver injects no default). */
const levelOf = (node) =>
  typeof node.props.level === 'string' && LEVELS.includes(node.props.level) ? node.props.level : 'street';

/** Pin count to draw: `pins` rounded, clamped to [0, MAX_PINS]; 0 when absent/bad. */
const pinsOf = (node) => {
  const n = Math.round(Number(node.props.pins));
  return Number.isFinite(n) && n > 0 ? Math.min(MAX_PINS, n) : 0;
};

/**
 * The inset content rect -- the drawable map area inside the panel border, so
 * roads/pins/chrome never crowd the frame. A fraction of the box, clamped.
 * @param {{x:number,y:number,w:number,h:number}} box @returns {{x:number,y:number,w:number,h:number}}
 */
function contentRect(box) {
  const pad = clamp(Math.min(box.w, box.h) * 0.06, 6, 16);
  return { x: box.x + pad, y: box.y + pad, w: Math.max(1, box.w - 2 * pad), h: Math.max(1, box.h - 2 * pad) };
}

// --- deterministic geometry (pure index predicates; exported for testing) ------

/**
 * Stable position of the `i`-th POI pin inside `rect` -- a coprime-stride hash
 * (the `pins` analog of Calendar's `hasEvent`), scattered into the inner 10-90%
 * so a pin never touches the border or a chrome corner. Pure: same `(i, rect)`
 * yields the same point, never the clock or `Math.random`.
 * @param {number} i @param {{x:number,y:number,w:number,h:number}} rect
 * @returns {{ x: number, y: number }}
 */
export function pinAt(i, rect) {
  const fx = ((i * 37 + 11) % 100) / 100;
  const fy = ((i * 53 + 29) % 100) / 100;
  return { x: rect.x + (0.1 + fx * 0.8) * rect.w, y: rect.y + (0.1 + fy * 0.8) * rect.h };
}

/**
 * The fixed GPS route as absolute points (origin, a few deterministic bends,
 * destination) scaled into `rect` -- fed straight to `connectorArrow`. Pure.
 * @param {{x:number,y:number,w:number,h:number}} rect @returns {{x:number,y:number}[]}
 */
export function routePoints(rect) {
  return ROUTE.map(({ fx, fy }) => ({ x: rect.x + fx * rect.w, y: rect.y + fy * rect.h }));
}

/**
 * A fixed synthetic elevation field over the unit square: a handful of Gaussian
 * "hills" (and one negative basin) plus a few gentle ridge waves, so the terrain
 * has peaks, a saddle, and a valley. Pure + deterministic (only `Math.exp`/
 * `Math.sin`), so the contours derived from it are byte-stable.
 * @param {number} nx @param {number} ny  in [0, 1] @returns {number}
 */
function elevationField(nx, ny) {
  let v = 0;
  for (const p of FIELD_PEAKS) {
    const dx = (nx - p.x) / p.sx;
    const dy = (ny - p.y) / p.sy;
    v += p.amp * Math.exp(-(dx * dx + dy * dy));
  }
  v += 0.18 * Math.sin(nx * 9 + ny * 4);
  v += 0.12 * Math.sin(ny * 11 - nx * 3);
  v += 0.06 * Math.sin((nx + ny) * 18);
  return v;
}

/** Gaussian hills/basin defining the elevation field (box-relative). */
const FIELD_PEAKS = [
  { x: 0.30, y: 0.35, amp: 1.0, sx: 0.18, sy: 0.22 },
  { x: 0.68, y: 0.55, amp: 0.85, sx: 0.25, sy: 0.15 },
  { x: 0.50, y: 0.78, amp: -0.6, sx: 0.30, sy: 0.20 }, // a basin (negative)
  { x: 0.82, y: 0.22, amp: 0.5, sx: 0.12, sy: 0.12 },
  { x: 0.15, y: 0.80, amp: 0.45, sx: 0.16, sy: 0.18 },
];

/** Linear-interpolate the crossing point of iso-level `t` between two samples. */
function isoCross(ax, ay, bx, by, va, vb, t) {
  const f = (t - va) / (vb - va);
  return { x: ax + (bx - ax) * f, y: ay + (by - ay) * f };
}

/**
 * The faint topographic CONTOUR layer: real iso-elevation lines of
 * `elevationField`, extracted by MARCHING SQUARES over a grid sized to `rect`
 * and emitted as `rline` segments (so adjacent cell crossings chain into
 * organic, nested closed loops -- the genuine topo-map look, not horizontal
 * bands). Every 3rd level is flagged `index: true` so the renderer can draw it a
 * touch heavier, like a survey map's index contours. Pure + deterministic and
 * level-independent -- drawn faintly BEHIND the roads, it is what gives even a
 * bare Map a recognizable "map" feel.
 * @param {{x:number,y:number,w:number,h:number}} rect
 * @returns {{x1:number,y1:number,x2:number,y2:number,index:boolean}[]}
 */
export function contourLines(rect) {
  const cols = clamp(Math.round(rect.w / 18), 9, 20);
  const rows = clamp(Math.round(rect.h / 18), 7, 16);
  const levels = 8;
  // Sample the field onto the grid, tracking its range.
  /** @type {number[][]} */
  const grid = [];
  let min = Infinity;
  let max = -Infinity;
  for (let j = 0; j <= rows; j++) {
    /** @type {number[]} */
    const row = [];
    for (let i = 0; i <= cols; i++) {
      const v = elevationField(i / cols, j / rows);
      row.push(v);
      if (v < min) min = v;
      if (v > max) max = v;
    }
    grid.push(row);
  }
  const cellW = rect.w / cols;
  const cellH = rect.h / rows;
  /** @type {{x1:number,y1:number,x2:number,y2:number,index:boolean}[]} */
  const out = [];
  // Interior levels only (the extremes degenerate to a point), so the bands read.
  for (let l = 1; l < levels; l++) {
    const t = min + (max - min) * (l / levels);
    const index = l % 3 === 0;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const v0 = grid[j][i];        // top-left
        const v1 = grid[j][i + 1];    // top-right
        const v2 = grid[j + 1][i + 1]; // bottom-right
        const v3 = grid[j + 1][i];    // bottom-left
        let code = 0;
        if (v0 > t) code |= 8;
        if (v1 > t) code |= 4;
        if (v2 > t) code |= 2;
        if (v3 > t) code |= 1;
        if (code === 0 || code === 15) continue;
        const x = rect.x + i * cellW;
        const y = rect.y + j * cellH;
        const top = () => isoCross(x, y, x + cellW, y, v0, v1, t);
        const right = () => isoCross(x + cellW, y, x + cellW, y + cellH, v1, v2, t);
        const bottom = () => isoCross(x, y + cellH, x + cellW, y + cellH, v3, v2, t);
        const left = () => isoCross(x, y, x, y + cellH, v0, v3, t);
        const seg = (a, b) => out.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, index });
        switch (code) {
          case 1: seg(left(), bottom()); break;
          case 2: seg(bottom(), right()); break;
          case 3: seg(left(), right()); break;
          case 4: seg(top(), right()); break;
          case 5: seg(left(), top()); seg(bottom(), right()); break;
          case 6: seg(top(), bottom()); break;
          case 7: seg(left(), top()); break;
          case 8: seg(left(), top()); break;
          case 9: seg(top(), bottom()); break;
          case 10: seg(top(), right()); seg(left(), bottom()); break;
          case 11: seg(top(), right()); break;
          case 12: seg(left(), right()); break;
          case 13: seg(bottom(), right()); break;
          case 14: seg(left(), bottom()); break;
          default: break;
        }
      }
    }
  }
  return out;
}

/**
 * The per-level set of road line segments, derived purely from `level` and the
 * content `rect`. Each segment is `{x1,y1,x2,y2}` plus optional style metadata:
 * `w` (stroke width) and `muted` (use the minor-street color). Density switches on
 * `level` (street = a dense grid, area = a sparser neighborhood); the pins/icon/
 * route/compass/labels overlays are level-independent and added in `render`. Pure
 * + exported so a test can assert the count/shape changes with `level`.
 * @param {string} level @param {{x:number,y:number,w:number,h:number}} rect
 * @returns {{x1:number,y1:number,x2:number,y2:number,w?:number,muted?:boolean}[]}
 */
export function roadLines(level, rect) {
  const { x, y, w, h } = rect;
  /** @type {{x1:number,y1:number,x2:number,y2:number,w?:number,muted?:boolean}[]} */
  const out = [];
  if (level === 'area') {
    // Sparser through-roads (the park/water blob is drawn separately in render).
    for (const fx of [0.32, 0.68]) out.push({ x1: x + fx * w, y1: y, x2: x + fx * w, y2: y + h, w: 1, muted: true });
    for (const fy of [0.40, 0.74]) out.push({ x1: x, y1: y + fy * h, x2: x + w, y2: y + fy * h, w: 1, muted: true });
    out.push({ x1: x, y1: y + 0.20 * h, x2: x + w, y2: y + 0.92 * h, w: 1.6 }); // a diagonal avenue (ink)
  } else {
    // street: a tight grid of blocks, plus two ink "main" streets crossing it.
    const cols = clamp(Math.round(w / 50), 3, 9);
    const rows = clamp(Math.round(h / 50), 3, 9);
    for (let c = 1; c < cols; c++) { const lx = x + (c / cols) * w; out.push({ x1: lx, y1: y, x2: lx, y2: y + h, w: 0.9, muted: true }); }
    for (let r = 1; r < rows; r++) { const ly = y + (r / rows) * h; out.push({ x1: x, y1: ly, x2: x + w, y2: ly, w: 0.9, muted: true }); }
    out.push({ x1: x + (Math.round(cols / 2) / cols) * w, y1: y, x2: x + (Math.round(cols / 2) / cols) * w, y2: y + h, w: 1.8 });
    out.push({ x1: x, y1: y + (Math.round(rows / 2) / rows) * h, x2: x + w, y2: y + (Math.round(rows / 2) / rows) * h, w: 1.8 });
  }
  return out;
}

// --- drawing helpers (draw.js primitives only) ---------------------------------

/** The area level's park/water blob box (a fraction of `rect`, upper-right). */
const areaBlob = (rect) => ({ x: rect.x + rect.w * 0.52, y: rect.y + rect.h * 0.10, w: rect.w * 0.40, h: rect.h * 0.40 });

/**
 * One POI pin: a filled-accent teardrop head (the spec's `accent` fill + `ink`
 * stroke) over a short ink stem ending at the ground point `(cx, baseY)`. The
 * head is the ONLY solid-accent fill the element draws, so a test counts pins by
 * counting accent fill paths.
 * @param {number} cx @param {number} baseY @param {number} s
 */
function drawPin(cx, baseY, s) {
  return rellipse(cx, baseY - s * 1.4, s * 1.3, s * 1.3, { fill: COLORS.accent, fillStyle: 'solid', stroke: COLORS.ink, strokeWidth: 1.2 })
    + rline(cx, baseY - s * 0.9, cx, baseY, { stroke: COLORS.ink, strokeWidth: 1.4 });
}

/**
 * A compass rose at `(cx, cy)` of radius `r`: a paper-filled ink ring with a
 * north pointer drawn as a glyph-free up-arrow (three `rline` strokes).
 * @param {number} cx @param {number} cy @param {number} r
 */
function drawCompass(cx, cy, r) {
  const o = { stroke: COLORS.ink, strokeWidth: 1.6 };
  return rellipse(cx, cy, 2 * r, 2 * r, { fill: COLORS.paper, fillStyle: 'solid', stroke: COLORS.ink, strokeWidth: 1.4 })
    + rline(cx, cy + r * 0.5, cx, cy - r * 0.7, o)
    + rline(cx, cy - r * 0.7, cx - r * 0.35, cy - r * 0.1, o)
    + rline(cx, cy - r * 0.7, cx + r * 0.35, cy - r * 0.1, o);
}

/**
 * A zoom control: a paper-filled box split into a `+` cell over a `-` cell.
 * @param {number} x @param {number} y @param {number} w @param {number} h
 */
function drawZoom(x, y, w, h) {
  const cx = x + w / 2;
  const q = w * 0.22;
  const o = { stroke: COLORS.ink, strokeWidth: 1.4 };
  return rrect(x, y, w, h, { fill: COLORS.paper, fillStyle: 'solid', stroke: COLORS.ink, strokeWidth: 1.2 })
    + rline(x, y + h / 2, x + w, y + h / 2, { stroke: COLORS.ink, strokeWidth: 1 })
    + rline(cx - q, y + h * 0.25, cx + q, y + h * 0.25, o)
    + rline(cx, y + h * 0.25 - q, cx, y + h * 0.25 + q, o)
    + rline(cx - q, y + h * 0.75, cx + q, y + h * 0.75, o);
}

/**
 * A short wavy line standing in for a street/place name -- NO real glyphs (the
 * Calendar `drawChevron` precedent: an internal helper, a few `rline` segments).
 * @param {number} x @param {number} y @param {number} len
 */
function drawSquiggle(x, y, len) {
  const segs = 4;
  let out = '';
  let prev = { x, y };
  for (let i = 1; i <= segs; i++) {
    const nx = x + (len / segs) * i;
    const ny = y + (i % 2 === 0 ? 0 : -2.4);
    out += rline(prev.x, prev.y, nx, ny, { stroke: COLORS.muted, strokeWidth: 1, roughness: 1.4 });
    prev = { x: nx, y: ny };
  }
  return out;
}

export default {
  name: 'Map',
  tier: 'v1.0',
  category: 'content',
  props: {
    level: { type: 'enum', values: LEVELS, default: 'street', aliases: ['zoom'] },
    icon: { type: 'icon', aliases: ['marker', 'center'] },
    pins: { type: 'number', aliases: ['poi', 'markers'] },
    path: { type: 'boolean', default: false, aliases: ['route'] },
    compass: { type: 'boolean', default: false, aliases: ['controls'] },
    labels: { type: 'boolean', default: false },
    contours: { type: 'boolean', default: true },
  },
  keyless: [
    { kind: 'literal', to: 'icon' },
    { kind: 'enum', to: 'level' },
  ],
  notes: 'Self-rendering map placeholder (no real geo data, ever). Keyless enum level (street/area, default street) drives road/feature density; keyless icon name (e.g. Map DirectionsCar) draws a center marker -- the single literal slot is the icon, so there is no free-text title. pins= is KEYED only (a bare number is a sizing token); path/compass/labels are keyless boolean flags (route/GPS layer, compass+zoom chrome, squiggle labels). A faint topographic contour texture sits under every level for "map feel" (on by default; contours=false drops it). sizing:true: w/h/%/* scale the whole map; width drives a proportional ~7:5 height (pin h= to override).',

  sizing: true,
  block: false,
  intrinsic: (node, avail) => {
    const ar = NATURAL.w / NATURAL.h; // width / height -- held constant so the map keeps its ~7:5 footprint
    const wTok = node.size?.w;
    const hTok = node.size?.h;
    // A px-pinned width fixes the box exactly; height follows it (the engine pins
    // only `w` in measure(), so the proportional height must be set here). A px h
    // pin without a w pin scales the width from the height instead.
    if (wTok?.unit === 'px') return { w: wTok.value, h: hTok?.unit === 'px' ? hTok.value : wTok.value / ar };
    if (hTok?.unit === 'px') return { w: hTok.value * ar, h: hTok.value };
    // Width-aware: derive height from the width the parent offers. With a relative
    // width token (%/*) fill the offer; without one keep the natural width (clamped
    // to the offer) so a wide parent never inflates the measured height past the
    // footprint actually drawn -- keeping the measure and place passes in agreement.
    if (avail && Number.isFinite(avail.w)) {
      const w = wTok ? /** @type {number} */ (avail.w) : Math.min(NATURAL.w, /** @type {number} */ (avail.w));
      return { w, h: w / ar };
    }
    if (avail && Number.isFinite(avail.h)) {
      const h = hTok ? /** @type {number} */ (avail.h) : Math.min(NATURAL.h, /** @type {number} */ (avail.h));
      return { w: h * ar, h };
    }
    return { ...NATURAL };
  },
  render: (node, box) => {
    const rect = contentRect(box);
    const level = levelOf(node);
    const small = Math.min(rect.w, rect.h);
    let out = surface(box); // the paper map panel (a bordered media tile, like Img's placeholder)

    // Faint topographic contour texture (on by default) -- real iso-elevation
    // lines drawn FIRST, behind the roads, so even a bare map reads as terrain
    // rather than abstract strokes. Index contours (every 3rd level) draw a touch
    // heavier, like a survey map.
    if (node.props.contours !== false) {
      for (const seg of contourLines(rect)) {
        out += rline(seg.x1, seg.y1, seg.x2, seg.y2, {
          stroke: seg.index ? COLORS.muted : COLORS.hatch,
          strokeWidth: seg.index ? 0.9 : 0.6,
          roughness: 0.6,
        });
      }
    }

    // Roads (the per-level line set).
    for (const seg of roadLines(level, rect)) {
      out += rline(seg.x1, seg.y1, seg.x2, seg.y2, {
        stroke: seg.muted ? COLORS.muted : COLORS.ink,
        strokeWidth: seg.w ?? 1.2,
      });
    }

    // Level feature: the area park/water blob.
    if (level === 'area') {
      const blob = areaBlob(rect);
      out += backgroundHatch(blob, 'hatch', false, { shape: 'ellipse', fill: COLORS.accent });
      out += rellipse(blob.x + blob.w / 2, blob.y + blob.h / 2, blob.w, blob.h, { stroke: COLORS.muted, strokeWidth: 1 });
    }

    // POI pins (deterministic scatter).
    const n = pinsOf(node);
    if (n) {
      const s = clamp(small * 0.05, 5, 12);
      for (let i = 0; i < n; i++) {
        const p = pinAt(i, rect);
        out += drawPin(p.x, p.y, s);
      }
    }

    // Center icon marker (drawn only when `icon` is set): a paper ring behind the
    // resolved artwork, or the iconGlyph placeholder for an unknown name.
    if (typeof node.props.icon === 'string') {
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      const s = clamp(small * 0.16, 16, 40);
      out += rellipse(cx, cy, s * 1.7, s * 1.7, { fill: COLORS.paper, fillStyle: 'solid', stroke: COLORS.ink, strokeWidth: 1.6 });
      out += drawIcon(node, 'icon', cx - s / 2, cy - s / 2, s);
    }

    // GPS route (drawn only when `path` is set): an origin ring, then a clean
    // directional connector through the deterministic waypoints (its own filled
    // arrowhead at the destination) -- distinct from the wobbly sketch chrome.
    if (node.props.path === true) {
      const pts = routePoints(rect);
      const r0 = clamp(small * 0.03, 3, 8);
      out += rellipse(pts[0].x, pts[0].y, r0 * 2, r0 * 2, { fill: COLORS.paper, fillStyle: 'solid', stroke: COLORS.ink, strokeWidth: 1.4 });
      out += connectorArrow(pts);
    }

    // Compass + zoom chrome (drawn only when `compass` is set), in the top-right.
    if (node.props.compass === true) {
      const r = clamp(small * 0.07, 8, 18);
      out += drawCompass(rect.x + rect.w - r - 4, rect.y + r + 4, r);
      const zw = clamp(r * 1.1, 12, 22);
      out += drawZoom(rect.x + rect.w - zw - 4, rect.y + 2 * r + 12, zw, zw * 2);
    }

    // Squiggle labels (drawn only when `labels` is set): glyph-free name stand-ins.
    if (node.props.labels === true) {
      const len = clamp(rect.w * 0.16, 16, 60);
      for (const { fx, fy } of LABELS) out += drawSquiggle(rect.x + fx * rect.w, rect.y + fy * rect.h, len);
    }

    return out;
  },
};
