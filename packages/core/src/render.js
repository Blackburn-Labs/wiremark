// @ts-check
import { REGISTRY } from './registry.js';
import { isOverlay } from './layout.js';
import { COLORS, escape, connectorArrow, centeredLabel, scrollbarStrip } from './draw.js';
import { measureText, ARROW_HEAD, CONNECTOR_SPREAD, FRAME_FLOW_GAP } from './metrics.js';

/**
 * Stage (5) -- RENDER.  laid-out boxes -> hand-drawn SVG string.
 *
 * A thin facade: walk each frame's box tree and dispatch to the owning element's
 * `render(node, box)` strategy (the wobbly drawing lives in `elements/<Name>.js`
 * via the shared `draw.js` primitives). The element draws *itself*; the facade
 * then recurses into its children.
 *
 * Overlay layer: an OUT-OF-FLOW node (`overlay` strategy -- Dialog/Drawer/
 * Scrollbar) must paint LAST within its frame, on top of every in-flow sibling
 * (even ones declared after it), so it reads as a modal/overlay. So each frame is
 * painted in two phases: phase 1 walks the box tree SKIPPING overlay subtrees;
 * phase 2 collects every overlay box in the frame (in document order) and paints
 * them after, inside the same frame transform + overflow clip. Placement is
 * parent-relative (layout.js), so an overlay's coordinates are already frame-local
 * -- only the PAINT order is hoisted to frame scope. A frame with no overlays runs
 * phase 1 over the whole tree and phase 2 empty, byte-identical to before.
 * KNOWN LIMITATION: an overlay inside a background-chain frame paints within that
 * background layer, not hoisted to the foreground -- overlays are a foreground
 * feature (a modal in shared `background=` chrome is a degenerate construction).
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

/**
 * @param {Box} box @param {string[]} out
 * @param {boolean} [skipOverlays]  phase 1 of the overlay split: when true, an
 *   OUT-OF-FLOW subtree draws NOTHING here (it is deferred to the frame's phase-2
 *   overlay pass and painted last). Recurses with the same flag so an overlay
 *   buried deep in the flow tree is still deferred. Off (the default) renders the
 *   whole subtree -- used for background-chain frames and the phase-2 overlay
 *   pass itself.
 */
function renderBox(box, out, skipOverlays = false) {
  const node = box.node;
  if (skipOverlays && isOverlay(node)) return; // deferred to the frame overlay pass
  const s = /** @type {*} */ (REGISTRY[node.component]) ?? {};
  /** @type {string[]} */
  const inner = [];
  if (typeof s.render === 'function') inner.push(s.render(node, box));
  // Children. A scroll container (box.clip set alongside box.scrollbars) CLIPS them
  // to its content rect so overflow is hidden -- the element's own chrome above and
  // the scrollbar strip below stay OUTSIDE the clip. Mirrors the frame overflow clip.
  /** @type {string[]} */
  const kids = [];
  for (const child of box.children) renderBox(child, kids, skipOverlays);
  if (box.clip && kids.length) {
    const c = box.clip;
    const id = `wm-sb-clip-${Math.round(c.x)}-${Math.round(c.y)}-${Math.round(c.w)}-${Math.round(c.h)}`;
    inner.push(`<clipPath id="${id}"><rect x="${c.x}" y="${c.y}" width="${Math.max(0, c.w)}" height="${Math.max(0, c.h)}"/></clipPath>`
      + `<g clip-path="url(#${id})">${kids.join('')}</g>`);
  } else {
    for (const k of kids) inner.push(k);
  }
  // Universal `scrollbar` affordance: layout reserved a gutter on the scrolled edge
  // and stashed the strip rect(s) on the box; draw them last (over the element's own
  // chrome, but clear of content, which the gutter already excludes).
  if (box.scrollbars) for (const sb of box.scrollbars) inner.push(scrollbarStrip(sb, sb.orientation, sb.value, sb.handle));
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
 * it on top. OUT-OF-FLOW (overlay) subtrees are skipped here -- the caller paints
 * them last via `renderOverlays`. @param {LaidOutFrame} frame @param {string[]} out
 */
function renderFrameContent(frame, out) {
  for (const child of frame.root.children) renderBox(child, out, true);
}

/**
 * Collect every OUT-OF-FLOW box in a frame's tree, in document order (pre-order
 * DFS over `box.children`, which layout.js builds in source order with overlays
 * appended after their flow siblings). An overlay's whole subtree is painted by
 * the phase-2 pass, so once one is collected its descendants are NOT walked again
 * here. @param {Box} box @param {Box[]} acc @returns {Box[]}
 */
function collectOverlays(box, acc) {
  for (const child of box.children) {
    if (isOverlay(child.node)) acc.push(child);
    else collectOverlays(child, acc);
  }
  return acc;
}

/**
 * Phase 2 of the overlay split: paint every overlay box in the frame, in document
 * order, AFTER all in-flow content -- so a Dialog/Drawer/Scrollbar sits above even
 * siblings declared later (the frame-last requirement). Each overlay's full
 * subtree is drawn (no skip). @param {LaidOutFrame} frame @param {string[]} out
 */
function renderOverlays(frame, out) {
  for (const box of collectOverlays(frame.root, [])) renderBox(box, out);
}

/**
 * The frame root's own border markup, painted last and *outside* the overflow
 * clip -- so overflowing content can't cover it and its hand-drawn edge (which
 * wobbles a hair past the box) isn't itself clipped. An anchored frame's root
 * box is the *region* it composed into (tasks/FOREGROUND.md), so the border is
 * drawn at a synthetic CANVAS box instead; for a non-anchored frame that box
 * equals frame.root's, keeping existing output byte-identical (rough seeds
 * derive from geometry alone). @param {LaidOutFrame} frame @returns {string}
 */
function frameBorder(frame) {
  const root = frame.root;
  const s = /** @type {*} */ (REGISTRY[root.node.component]) ?? {};
  if (typeof s.render !== 'function') return '';
  /** @type {Box} */
  const canvas = { x: 0, y: 0, w: frame.w, h: frame.h, node: root.node, children: [] };
  return s.render(root.node, canvas);
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
    renderFrameContent(p.frame, content);   // phase 1: in-flow content (overlays skipped)
    renderOverlays(p.frame, content);       // phase 2: overlays last, over everything above
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
 *     ends, so they read as two close parallel lines that still touch the edges. The
 *     same offset also nudges each one's elbow bend, so even the across-runs don't
 *     coincide.
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

  // Within each pair, give every edge a signed ANCHOR offset around its slot, applied
  // the SAME way at both ends -- so a bidirectional pair reads as two close parallel
  // lines. A lone edge gets 0 (stays centred on its slot).
  const offset = edges.map(() => 0);
  /** @type {Map<string, number[]>} */
  const byPair = new Map();
  edges.forEach((edge, i) => {
    const list = byPair.get(edge.pair);
    if (list) list.push(i);
    else byPair.set(edge.pair, [i]);
  });
  for (const idxs of byPair.values()) {
    [...idxs].sort((a, b) => (edgeKey(edges[a].e) < edgeKey(edges[b].e) ? -1 : 1))
      .forEach((i, t) => { offset[i] = (t - (idxs.length - 1) / 2) * CONNECTOR_SPREAD; });
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

  // Anchor every edge, then lane the elbow BENDS by each connector's average
  // cross-position: the leftmost path bends nearest the top of the gap, the rightmost
  // nearest the bottom, so two opposite-direction elbows nest rather than tangle into
  // an X -- regardless of where the asymmetric slots placed the anchors.
  const anchors = edges.map((edge, i) => ({
    tail: anchorOn(edge.s, edge.sFace, fracOf(`${edge.s.frame.id}|${edge.sFace}`, edge.pair), offset[i]),
    head: anchorOn(edge.d, edge.dFace, fracOf(`${edge.d.frame.id}|${edge.dFace}`, edge.pair), offset[i]),
  }));
  const avgCross = (/** @type {number} */ i) => (crossCoord(anchors[i].tail, dir) + crossCoord(anchors[i].head, dir)) / 2;
  const bend = edges.map(() => 0);
  for (const idxs of byPair.values()) {
    const sorted = [...idxs].sort((a, b) => avgCross(a) - avgCross(b) || a - b);
    sorted.forEach((i, t) => { bend[i] = (t - (sorted.length - 1) / 2) * CONNECTOR_SPREAD; });
    // A bidirectional pair's correct bend order depends on the diagonal; both
    // orderings are cheap to test, so flip if the chosen one tangles into an X.
    if (sorted.length === 2) {
      const [i, j] = sorted;
      const el = (/** @type {number} */ k, /** @type {number} */ b) => elbow(anchors[k].tail, anchors[k].head, dir, b);
      if (pathsCross(el(i, bend[i]), el(j, bend[j]))) { const t = bend[i]; bend[i] = bend[j]; bend[j] = t; }
    }
  }

  return edges.map((edge, i) => {
    const { tail, head } = anchors[i];
    const geom = { from: edge.e.from, to: edge.e.to, tail, head, points: elbow(tail, head, dir, bend[i]) };
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
 * Draw a clean (non-sketch) arrow for every drawable connector (see
 * `connectorGeometry`), with the edge's optional label at the midpoint. Returns the
 * markup and the bounds it occupies.
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
    markup += connectorArrow(points);
    for (const p of points) grow(p.x, p.y);
    const tip = points[points.length - 1];
    grow(tip.x - ARROW_HEAD, tip.y - ARROW_HEAD);
    grow(tip.x + ARROW_HEAD, tip.y + ARROW_HEAD);
    if (label) {
      const lab = connectorLabel(labelCenter(points, dir), label);
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
 * The across-run sits in the inter-rank GAP immediately past the source (not the
 * midpoint of the whole span), so a skip-rank edge doesn't sweep its horizontal run
 * through an intervening frame; for adjacent ranks that band IS the only gap, so the
 * run lands at the gap centre as before. `bend` nudges the run along the flow axis,
 * clamped within that gap, so parallel connectors don't share an across-run.
 * @param {Point} tail @param {Point} head @param {'TD'|'LR'} dir @param {number} [bend]
 * @returns {Point[]}
 */
function elbow(tail, head, dir, bend = 0) {
  const EPS = 0.5;
  if (dir === 'LR') {
    if (Math.abs(tail.y - head.y) < EPS) return [tail, head];
    const dx = Math.sign(head.x - tail.x) || 1;
    const gapEnd = tail.x + dx * Math.min(FRAME_FLOW_GAP, Math.abs(head.x - tail.x));
    const mx = between(tail.x + dx * (FRAME_FLOW_GAP / 2) + bend, tail.x, gapEnd);
    return [tail, { x: mx, y: tail.y }, { x: mx, y: head.y }, head];
  }
  if (Math.abs(tail.x - head.x) < EPS) return [tail, head];
  const dy = Math.sign(head.y - tail.y) || 1;
  const gapEnd = tail.y + dy * Math.min(FRAME_FLOW_GAP, Math.abs(head.y - tail.y));
  const my = between(tail.y + dy * (FRAME_FLOW_GAP / 2) + bend, tail.y, gapEnd);
  return [tail, { x: tail.x, y: my }, { x: head.x, y: my }, head];
}

/** Clamp `v` strictly between `a` and `b` (with a small pad), keeping an elbow bend in the gap. @param {number} v @param {number} a @param {number} b @returns {number} */
function between(v, a, b) {
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const pad = Math.min(6, (hi - lo) / 3);
  return Math.max(lo + pad, Math.min(hi - pad, v));
}

/** Do two connector polylines properly intersect (used to pick a non-crossing bend order)? @param {Point[]} a @param {Point[]} b @returns {boolean} */
function pathsCross(a, b) {
  for (let i = 0; i < a.length - 1; i++)
    for (let j = 0; j < b.length - 1; j++)
      if (segCross(a[i], a[i + 1], b[j], b[j + 1])) return true;
  return false;
}

/** Proper segment intersection (endpoints touching don't count). @param {Point} p1 @param {Point} p2 @param {Point} p3 @param {Point} p4 @returns {boolean} */
function segCross(p1, p2, p3, p4) {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-9) return false;
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
}

/**
 * Where to anchor a connector's caption. TD: the horizontal across-run (points[1]-[2])
 * sits in the wide inter-rank gap -- ideal. LR: that run is the vertical stub inside the
 * narrow column gap, so anchor on a horizontal run (points[0]-[1]) instead, keeping the
 * caption reading along the flow rather than overflowing both frames. A straight
 * connector uses its single segment.
 * @param {Point[]} points @param {'TD'|'LR'} dir @returns {Point}
 */
function labelCenter(points, dir) {
  if (points.length < 4) return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
  const [a, b] = dir === 'LR' ? [points[0], points[1]] : [points[1], points[2]];
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
