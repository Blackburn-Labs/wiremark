// @ts-check
import { REGISTRY } from './registry.js';
import { COLORS, escape, rarrowPath, centeredLabel } from './draw.js';
import { measureText, ARROW_HEAD, CONNECTOR_SPREAD } from './metrics.js';

/**
 * Stage (5) -- RENDER.  laid-out boxes -> hand-drawn SVG string.
 *
 * A thin facade: walk each frame's box tree and dispatch to the owning element's
 * `render(node, box)` strategy (the wobbly drawing lives in `elements/<Name>.js`
 * via the shared `draw.js` primitives). The element draws *itself*; the facade
 * then recurses into its children.
 *
 * Document layer: when a file has several frames they are placed at the absolute
 * `{x, y}` assigned by `frame-layout.js` (a Mermaid-style flow chart) and joined
 * by frame-to-frame connector arrows reconstructed from the navigation graph
 * (SPEC ss.7.4); a single-frame file renders exactly as before. Each visible frame
 * is painted over its resolved `background=` chain (deepest-first), the foreground
 * driving size and the background underlaid as-is (SPEC ss.5.1.1). `visible=false`
 * frames are omitted from standalone output but still usable as backgrounds.
 *
 * @typedef {import('./layout.js').LaidOutFrame} LaidOutFrame
 * @typedef {import('./layout.js').Box} Box
 * @typedef {import('./flow.js').FlowGraph} FlowGraph
 * @typedef {{ x: number, y: number }} Point
 * @typedef {{ frame: LaidOutFrame, x: number, y: number, w: number, h: number }} Placed
 * @typedef {{ minX: number, minY: number, maxX: number, maxY: number }} Bounds
 */

const FRAME_GAP = 40;  // legacy vertical gap (fallback when frames carry no {x,y})
const FLOW_PAD = 24;   // padding around a multi-frame flow chart's content box

/** @param {Box} box @param {string[]} out */
function renderBox(box, out) {
  const node = box.node;
  const s = /** @type {*} */ (REGISTRY[node.component]) ?? {};
  /** @type {string[]} */
  const inner = [];
  if (typeof s.render === 'function') inner.push(s.render(node, box));
  for (const child of box.children) renderBox(child, inner);
  // Any node carrying to=#id is a clickable region (SPEC ss.7.2); the facade
  // wraps it here so elements never draw their own link.
  out.push(node.props.to
    ? `<a class="wm-link" href="#${escape(node.props.to)}">${inner.join('')}</a>`
    : inner.join(''));
}

/** @param {LaidOutFrame} frame @param {string[]} out */
function renderFrame(frame, out) {
  renderBox(frame.root, out);
}

/**
 * Render a frame's *content* (its child boxes) without the frame root's own
 * border, so the caller can keep that border out of the overflow clip and paint
 * it on top. @param {LaidOutFrame} frame @param {string[]} out
 */
function renderFrameContent(frame, out) {
  for (const child of frame.root.children) renderBox(child, out);
}

/**
 * The frame root's own border markup, painted last and *outside* the overflow
 * clip -- so overflowing content can't cover it and its hand-drawn edge (which
 * wobbles a hair past the box) isn't itself clipped. @param {LaidOutFrame} frame @returns {string}
 */
function frameBorder(frame) {
  const root = frame.root;
  const s = /** @type {*} */ (REGISTRY[root.node.component]) ?? {};
  return typeof s.render === 'function' ? s.render(root.node, root) : '';
}

/**
 * @param {LaidOutFrame[]} frames
 * @param {{ graph?: FlowGraph, direction?: 'TD'|'LR' }} [options]
 * @returns {string}  SVG markup
 */
export function renderSVG(frames, options = {}) {
  const standalone = frames.filter((f) => f.visible);
  const positioned = standalone.length > 0
    && standalone.every((f) => typeof f.x === 'number' && typeof f.y === 'number');

  // Absolute placement from frame-layout; fall back to the legacy vertical stack
  // when positions are absent (e.g. renderSVG called without the frame-layout pass).
  /** @type {Placed[]} */
  const placed = [];
  let stackY = 0;
  for (const f of standalone) {
    if (positioned) {
      placed.push({ frame: f, x: /** @type {number} */ (f.x), y: /** @type {number} */ (f.y), w: f.w, h: f.h });
    } else {
      placed.push({ frame: f, x: 0, y: stackY, w: f.w, h: f.h });
      stackY += f.h + FRAME_GAP;
    }
  }

  const blocks = placed.map((p, i) => {
    /** @type {string[]} */
    const content = [`<rect x="0" y="0" width="${p.w}" height="${p.h}" fill="${COLORS.paper}"/>`];
    for (const bg of p.frame.backgroundChain) renderFrame(bg, content); // beneath, deepest-first
    renderFrameContent(p.frame, content);
    // Content can overflow a fixed-size frame (the canvas is sized by preset/w,h,
    // not by its children -- ss.5.1). Clip it to the frame box so it never bleeds
    // past the edge: a single-frame file's outer viewport already did this, but a
    // multi-frame flow chart's viewBox spans every frame, so without the clip an
    // overflow would spill across the document. The border is then painted on top,
    // outside the clip, so overflowing content can't cover it (ss.5.1.1).
    const clip = `wm-clip-${i}`;
    return (
      `<g transform="translate(${p.x} ${p.y})">`
      + `<clipPath id="${clip}"><rect x="0" y="0" width="${p.w}" height="${p.h}"/></clipPath>`
      + `<g clip-path="url(#${clip})">${content.join('')}</g>`
      + frameBorder(p.frame)
      + `</g>`
    );
  });

  // Frame-to-frame connectors -- only meaningful once frames are positioned in 2D.
  const conn = positioned && options.graph
    ? renderConnectors(placed, options.graph, options.direction === 'LR' ? 'LR' : 'TD')
    : { markup: '', bounds: /** @type {Bounds|null} */ (null) };

  // A multi-frame flow chart gets a padded, content-fitting viewBox (it may start
  // at a negative origin). One frame with no connectors keeps the legacy `0 0 w h`
  // box, so existing single-frame output stays byte-for-byte identical.
  const view = positioned && (placed.length > 1 || conn.markup)
    ? boundsOf(placed, conn.bounds)
    : { x: 0, y: 0, w: maxEdge(placed, 'x'), h: maxEdge(placed, 'y') };

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${view.w}" height="${view.h}" `
    + `viewBox="${view.x} ${view.y} ${view.w} ${view.h}">`
    + `<rect x="${view.x}" y="${view.y}" width="${view.w}" height="${view.h}" fill="${COLORS.paper}"/>`
    + blocks.join('')
    + (conn.markup ? `<g class="wm-connectors">${conn.markup}</g>` : '')
    + '</svg>'
  );
}

/** Far edge of the placed frames on one axis (legacy bounds). @param {Placed[]} placed @param {'x'|'y'} axis @returns {number} */
function maxEdge(placed, axis) {
  let m = 0;
  for (const p of placed) m = Math.max(m, axis === 'x' ? p.x + p.w : p.y + p.h);
  return m;
}

/**
 * Padded bounding box over all frames plus any connector overflow (arrowheads and
 * labels can spill past frame edges).
 * @param {Placed[]} placed @param {Bounds|null} conn @returns {{x:number,y:number,w:number,h:number}}
 */
function boundsOf(placed, conn) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of placed) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + p.w); maxY = Math.max(maxY, p.y + p.h);
  }
  if (conn) {
    minX = Math.min(minX, conn.minX); minY = Math.min(minY, conn.minY);
    maxX = Math.max(maxX, conn.maxX); maxY = Math.max(maxY, conn.maxY);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX - FLOW_PAD, y: minY - FLOW_PAD, w: (maxX - minX) + 2 * FLOW_PAD, h: (maxY - minY) + 2 * FLOW_PAD };
}

/**
 * Geometry for every drawable connector. Anchor points are distributed ALONG each
 * frame face (always staying on the edge) rather than stacking at the face center,
 * so connectors sharing a side do not pile up:
 *   - Each distinct frame *pair* on a face gets its own slot, ordered by the side it
 *     heads toward -- so a fan-out spreads out and aims at its targets.
 *   - The edges *within* one pair (a bidirectional a->b / b->a, or repeats) stay
 *     clustered: offset by `CONNECTOR_SPREAD` around their slot, the SAME way at both
 *     ends, so they read as two close parallel lines that still touch the edges.
 * A face with a single connector keeps the center. Each connector is then routed as
 * an orthogonal elbow. Pure + deterministic; exported for testing.
 * @param {Placed[]} placed
 * @param {FlowGraph} graph
 * @param {'TD'|'LR'} dir
 * @returns {{ from: string, to: string, tail: Point, head: Point, points: Point[], label?: string }[]}
 */
export function connectorGeometry(placed, graph, dir) {
  const rectById = new Map();
  for (const p of placed) if (p.frame.id != null) rectById.set(p.frame.id, p);

  // Drawable edges, each tagged with the face it leaves/enters and its frame pair.
  /** @type {{ e: *, s: Placed, d: Placed, sFace: string, dFace: string, pair: string, aimS: number, aimD: number }[]} */
  const edges = [];
  for (const e of graph.edges) {
    const s = rectById.get(e.from);
    const d = rectById.get(e.to);
    if (!s || !d || s === d) continue; // dangling target or self-loop -- not drawn (ss.7.4)
    edges.push({
      e, s, d,
      sFace: exitFace(s, d, dir),
      dFace: entryFace(s, d, dir),
      pair: e.from < e.to ? `${e.from} ${e.to}` : `${e.to} ${e.from}`,
      aimS: crossCoord(centerOf(d), dir), // source end orders by where it heads
      aimD: crossCoord(centerOf(s), dir), // target end orders by where it came from
    });
  }

  // Within each pair, give every edge a signed offset around its slot, applied the
  // SAME way at both ends -- so a bidirectional pair reads as two close parallel
  // lines. A lone edge gets 0 (stays on its slot).
  const offset = edges.map(() => 0);
  /** @type {Map<string, number[]>} */
  const byPair = new Map();
  edges.forEach((edge, i) => {
    const list = byPair.get(edge.pair);
    if (list) list.push(i);
    else byPair.set(edge.pair, [i]);
  });
  for (const idxs of byPair.values()) {
    idxs.sort((a, b) => (edgeKey(edges[a].e) < edgeKey(edges[b].e) ? -1 : 1));
    idxs.forEach((i, t) => { offset[i] = (t - (idxs.length - 1) / 2) * CONNECTOR_SPREAD; });
  }

  // On each (frame, face), order the distinct pairs by aim and hand each a slot.
  /** @type {Map<string, Map<string, number>>} */
  const facePairs = new Map();
  const note = (/** @type {string} */ fk, /** @type {string} */ pair, /** @type {number} */ aim) => {
    let m = facePairs.get(fk);
    if (!m) { m = new Map(); facePairs.set(fk, m); }
    if (!m.has(pair)) m.set(pair, aim);
  };
  for (const edge of edges) {
    note(`${edge.s.frame.id}|${edge.sFace}`, edge.pair, edge.aimS);
    note(`${edge.d.frame.id}|${edge.dFace}`, edge.pair, edge.aimD);
  }
  /** @type {Map<string, Map<string, number>>} faceKey -> (pair -> slot fraction) */
  const slot = new Map();
  for (const [fk, pairs] of facePairs) {
    const ordered = [...pairs.entries()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
    const fracs = new Map();
    ordered.forEach(([pair], j) => fracs.set(pair, (j + 1) / (ordered.length + 1)));
    slot.set(fk, fracs);
  }
  const fracOf = (/** @type {string} */ fk, /** @type {string} */ pair) =>
    /** @type {Map<string, number>} */ (slot.get(fk)).get(pair) ?? 0.5;

  return edges.map((edge, i) => {
    const tail = anchorOn(edge.s, edge.sFace, fracOf(`${edge.s.frame.id}|${edge.sFace}`, edge.pair), offset[i]);
    const head = anchorOn(edge.d, edge.dFace, fracOf(`${edge.d.frame.id}|${edge.dFace}`, edge.pair), offset[i]);
    const geom = { from: edge.e.from, to: edge.e.to, tail, head, points: elbow(tail, head, dir) };
    return edge.e.label ? { ...geom, label: edge.e.label } : geom;
  });
}

/** Center of a placed frame. @param {Placed} p @returns {Point} */
function centerOf(p) {
  return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
}

/** Coordinate on the CROSS axis -- the one connectors spread along. @param {Point} pt @param {'TD'|'LR'} dir @returns {number} */
function crossCoord(pt, dir) {
  return dir === 'LR' ? pt.y : pt.x;
}

/** @param {*} e @returns {string} */
function edgeKey(e) {
  return `${e.from} ${e.to}`;
}

/** Face a connector LEAVES the source by. @param {Placed} s @param {Placed} d @param {'TD'|'LR'} dir @returns {string} */
function exitFace(s, d, dir) {
  const sc = centerOf(s), dc = centerOf(d);
  if (dir === 'LR') return dc.x >= sc.x ? 'right' : 'left';
  return dc.y >= sc.y ? 'bottom' : 'top';
}

/** Face a connector ENTERS the target by (the opposite side). @param {Placed} s @param {Placed} d @param {'TD'|'LR'} dir @returns {string} */
function entryFace(s, d, dir) {
  const sc = centerOf(s), dc = centerOf(d);
  if (dir === 'LR') return dc.x >= sc.x ? 'left' : 'right';
  return dc.y >= sc.y ? 'top' : 'bottom';
}

/**
 * Point at slot fraction `frac` plus tangential `off` along a frame face, clamped to
 * stay on the edge (tangent is horizontal for top/bottom, vertical for left/right).
 * @param {Placed} f @param {string} face @param {number} frac @param {number} off @returns {Point}
 */
function anchorOn(f, face, frac, off) {
  const len = face === 'top' || face === 'bottom' ? f.w : f.h;
  const along = Math.max(4, Math.min(len - 4, len * frac + off));
  if (face === 'top') return { x: f.x + along, y: f.y };
  if (face === 'bottom') return { x: f.x + along, y: f.y + f.h };
  if (face === 'left') return { x: f.x, y: f.y + along };
  return { x: f.x + f.w, y: f.y + along }; // right
}

/**
 * Draw a hand-drawn arrow for every drawable connector (see `connectorGeometry`),
 * with the edge's optional label at the midpoint. Returns the markup and the
 * bounds it occupies.
 * @param {Placed[]} placed
 * @param {FlowGraph} graph
 * @param {'TD'|'LR'} dir
 * @returns {{ markup: string, bounds: Bounds|null }}
 */
function renderConnectors(placed, graph, dir) {
  let markup = '';
  /** @type {Bounds|null} */
  let bounds = null;
  const grow = (/** @type {number} */ x, /** @type {number} */ y) => {
    bounds = bounds
      ? { minX: Math.min(bounds.minX, x), minY: Math.min(bounds.minY, y), maxX: Math.max(bounds.maxX, x), maxY: Math.max(bounds.maxY, y) }
      : { minX: x, minY: y, maxX: x, maxY: y };
  };

  for (const { points, label } of connectorGeometry(placed, graph, dir)) {
    markup += rarrowPath(points);
    for (const p of points) grow(p.x, p.y);
    const tip = points[points.length - 1];
    grow(tip.x - ARROW_HEAD, tip.y - ARROW_HEAD);
    grow(tip.x + ARROW_HEAD, tip.y + ARROW_HEAD);
    if (label) {
      const lab = connectorLabel(labelCenter(points), label);
      markup += lab.markup;
      grow(lab.bounds.minX, lab.bounds.minY);
      grow(lab.bounds.maxX, lab.bounds.maxY);
    }
  }
  return { markup, bounds };
}

/**
 * Route a connector as an orthogonal elbow: straight out of the source face, one
 * right-angle bend, then straight into the target face -- so the arrowhead always
 * meets an edge square-on. Axis-aligned endpoints stay a single straight segment.
 * @param {Point} tail @param {Point} head @param {'TD'|'LR'} dir
 * @returns {Point[]}
 */
function elbow(tail, head, dir) {
  const EPS = 0.5;
  if (dir === 'LR') {
    if (Math.abs(tail.y - head.y) < EPS) return [tail, head];
    const mx = (tail.x + head.x) / 2;
    return [tail, { x: mx, y: tail.y }, { x: mx, y: head.y }, head];
  }
  if (Math.abs(tail.x - head.x) < EPS) return [tail, head];
  const my = (tail.y + head.y) / 2;
  return [tail, { x: tail.x, y: my }, { x: head.x, y: my }, head];
}

/**
 * Where to anchor a connector's caption: the midpoint of its horizontal run (the
 * across segment of an elbow), or the segment midpoint for a straight connector --
 * keeping the label clear of the frames it joins.
 * @param {Point[]} points @returns {Point}
 */
function labelCenter(points) {
  const [a, b] = points.length >= 4 ? [points[1], points[2]] : [points[0], points[1]];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Edge caption centered at `center`: muted text over a paper knockout so the shaft
 * doesn't strike through the glyphs.
 * @param {Point} center @param {string} label
 * @returns {{ markup: string, bounds: Bounds }}
 */
function connectorLabel(center, label) {
  const fontSize = 12;
  const { w, h } = measureText(label, fontSize);
  const pad = 3;
  const box = { x: center.x - w / 2, y: center.y - h / 2, w, h };
  const bg = `<rect x="${box.x - pad}" y="${box.y - pad}" width="${w + 2 * pad}" height="${h + 2 * pad}" fill="${COLORS.paper}"/>`;
  return {
    markup: bg + centeredLabel(box, label, { fontSize, fill: COLORS.muted }),
    bounds: { minX: box.x - pad, minY: box.y - pad, maxX: box.x + w + pad, maxY: box.y + h + pad },
  };
}
