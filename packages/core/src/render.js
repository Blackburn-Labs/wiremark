// @ts-check
import { REGISTRY } from './registry.js';
import { isOverlay } from './layout.js';
import { COLORS, escape, connectorArrow, centeredLabel, scrollbarStrip, backgroundHatch, BACKGROUNDS } from './draw.js';
import { measureText, ARROW_HEAD, CONNECTOR_LABEL_PAD } from './metrics.js';
import { inferComponents, planFlow, realizeRoutes } from './routing.js';

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
 * Default universal-background descriptor for any element that doesn't define its
 * own `background(node)` strategy (SPEC s.8): an OPT-IN backdrop drawn only when the
 * author sets a `background=` pattern, `denseBackground`, or the `opaque` toggle. The
 * opaque paper base defaults OFF here, so a bare element draws nothing and every
 * element that never had a background stays byte-identical; containers wanting an
 * opaque default (Box/Stack) supply their own `background`. The `BACKGROUNDS` guard
 * skips Wireframe's `background=#id` frame ref (a node id, not a hatch enum value).
 * @param {import('./resolve.js').ResolvedNode} node
 * @returns {{ pattern: string, dense: boolean, base: boolean } | null}
 */
function defaultBackground(node) {
  const p = node.props;
  const hasPattern = BACKGROUNDS.includes(p.background);
  const dense = p.denseBackground === true;
  const opaque = p.opaque === true;
  if (!hasPattern && !dense && !opaque) return null;
  return { pattern: hasPattern ? p.background : (dense ? 'hatch' : 'none'), dense, base: opaque };
}

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
  // Universal background (SPEC s.8): the facade paints any element's hatch/opaque
  // backdrop BEHIND its own chrome and children, from the element's `background(node)`
  // strategy (or the default opt-in for elements that don't define one). Elements
  // never draw their own backdrop -- like the to= link and scrollbar affordances.
  const bg = (typeof s.background === 'function' ? s.background : defaultBackground)(node);
  if (bg) inner.push(backgroundHatch(box, bg.pattern, bg.dense, { base: bg.base, shape: bg.shape, fill: bg.fill }));
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
 * Geometry for every drawable connector -- a thin shell over the shared channel/
 * track planner (`routing.js`). `inferComponents` recovers the rank structure from
 * the placed rects, `planFlow` re-derives the SAME routing plan frame-layout sized
 * the inter-rank channels for, and `realizeRoutes` turns it into absolute
 * polylines. Routes are returned in `graph.edges` declaration order.
 *
 * Each connector leaves its source's main face, crosses the inter-rank channel on
 * an assigned parallel track (skip-rank edges detour onto a lane outside the
 * component), and enters its target's main face -- so connectors never cut through
 * frames, never tangle, and their captions sit on their own track inside the
 * widened channel. Pure + deterministic; exported for testing.
 * @param {Placed[]} placed
 * @param {FlowGraph} graph
 * @param {'TD'|'LR'} dir
 * @returns {{ from: string, to: string, tail: Point, head: Point, points: Point[], label?: string, labelAt?: Point }[]}
 */
export function connectorGeometry(placed, graph, dir) {
  /** @type {*[]} */
  const routes = [];
  for (const comp of inferComponents(placed, graph, dir)) {
    const plan = planFlow(comp.nodes, comp.edges, dir);
    routes.push(...realizeRoutes(plan, comp.nodes, comp.edges, comp.bands, comp.bbox, dir));
  }
  routes.sort((a, b) => a.index - b.index);
  return routes.map(({ index, ...r }) => r);
}

/**
 * Draw a clean (non-sketch) arrow for every drawable connector (see
 * `connectorGeometry`), with the edge's optional label anchored on its across-run.
 * Returns the markup and the bounds it occupies.
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

  for (const { points, label, labelAt } of connectorGeometry(placed, graph, dir)) {
    markup += connectorArrow(points);
    for (const p of points) grow(p.x, p.y);
    const tip = points[points.length - 1];
    grow(tip.x - ARROW_HEAD, tip.y - ARROW_HEAD);
    grow(tip.x + ARROW_HEAD, tip.y + ARROW_HEAD);
    if (label && labelAt) {
      const lab = connectorLabel(labelAt, label);
      markup += lab.markup;
      grow(lab.bounds.minX, lab.bounds.minY);
      grow(lab.bounds.maxX, lab.bounds.maxY);
    }
  }
  return { markup, bounds };
}

/**
 * Edge caption centered at `center` (its track inside the widened channel, so it
 * clears every frame): muted text over a paper knockout so the shaft doesn't strike
 * through the glyphs.
 * @param {Point} center @param {string} label
 * @returns {{ markup: string, bounds: Bounds }}
 */
function connectorLabel(center, label) {
  const fontSize = 12;
  const { w, h } = measureText(label, fontSize);
  const pad = CONNECTOR_LABEL_PAD;
  const box = { x: center.x - w / 2, y: center.y - h / 2, w, h };
  const bg = `<rect x="${box.x - pad}" y="${box.y - pad}" width="${w + 2 * pad}" height="${h + 2 * pad}" fill="${COLORS.paper}"/>`;
  return {
    markup: bg + centeredLabel(box, label, { fontSize, fill: COLORS.muted }),
    bounds: { minX: box.x - pad, minY: box.y - pad, maxX: box.x + w + pad, maxY: box.y + h + pad },
  };
}
