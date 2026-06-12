// @ts-check
import { surface, rline, elevationShadow, backgroundHatch, BACKGROUNDS, COLORS } from '../draw.js';
import { anchorRect } from './common.js';
import { SPACING } from '../metrics.js';

/**
 * Drawer -- a navigation panel. (SPEC: MUI Navigation surface, v1.0.) The
 * dividing line between its variants is IN-FLOW vs OVERLAY:
 *
 *  - `permanent` (default) -- a DOCKED in-flow panel that consumes space like a
 *    Box; content flows beside it. It is placed wherever it is written (no
 *    pinning -- docking it to a frame edge would have to shift content, which a
 *    static in-flow layout does not do).
 *  - `rail` -- the slim collapsed mini-drawer (an icon strip), in flow like
 *    `permanent` but thin.
 *  - `overlay` -- a TRUE OVERLAY (the engine's out-of-flow layer, shared with
 *    Dialog via `overlay`/`overlayPlacement`): it consumes NO flow space, floats
 *    ABOVE the content, and CAN anchor to a side (it isn't pushing content around).
 *
 * The AXIS and the SIDE are two props (value sets disjoint from each other +
 * `variant` + `background`, so all stay keyless -- CONVENTION s.2.1):
 *  - `orientation` (vertical|horizontal, default vertical) -- the AXIS. `vertical` =
 *    a tall narrow side panel (a `col`); `horizontal` = a wide short panel (a `row`
 *    that stretches full width).
 *  - `anchor` (left|right|top|bottom, default the NEAR edge of the axis -- left for
 *    vertical, top for horizontal) -- the single SIDE knob. `anchor` IMPLIES the
 *    axis when given (`Drawer right` reads vertical+right, `Drawer top` reads
 *    horizontal+top); if both are given and conflict (`vertical top`), anchor WINS
 *    and the axis is derived from it (normalize, don't error -- Ruling 4 s.2.1).
 *    ONE prop drives BOTH placements (one system):
 *      - in-flow (permanent/rail) -> which side the panel is docked against, hence
 *        which edge the seam faces (see `divider`);
 *      - overlay -> which edge the panel PINS to, stretching the perpendicular axis
 *        to fill the parent, via the shared `anchorRect`.
 *
 * `divider` (boolean, default true) draws a solid seam on the CONTENT-FACING edge,
 * which is the OPPOSITE of the `anchor` (dock/pin) edge -- a drawer anchored left
 * faces content on its right, so the seam is on the right. Same rule in-flow and
 * overlay. `divider=false` suppresses it.
 *
 * `background`/`denseBackground` tint the panel with an OPAQUE hatch (task-1
 * `base:true`): drawn only when asked (a plain Drawer is paper).
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Panel width (vertical) and min height (horizontal) floors so an empty docked
 *  panel still draws at a sensible size. */
const PANEL_W = 220;
const PANEL_MIN_H = 56;

/** Width/height of the slim `rail` mini-drawer -- a strip wide enough for an icon
 *  column/row, not a full panel. */
const RAIL = 56;

/** @param {import('./common.js').ResolvedNode} node @returns {'permanent'|'overlay'|'rail'} */
const variantOf = (node) => node.props.variant ?? 'permanent';
/** @param {import('./common.js').ResolvedNode} node @returns {boolean} */
const isOverlayVariant = (node) => variantOf(node) === 'overlay';
/** @param {import('./common.js').ResolvedNode} node @returns {boolean} */
const isRail = (node) => variantOf(node) === 'rail';

/** The edges valid for each axis, near edge first (the default side). */
const AXIS_EDGES = { vertical: ['left', 'right'], horizontal: ['top', 'bottom'] };
/** Which axis an edge belongs to. */
const EDGE_AXIS = { left: 'vertical', right: 'vertical', top: 'horizontal', bottom: 'horizontal' };

/**
 * The effective AXIS. `anchor` IMPLIES the axis when given (a `top` anchor reads as
 * horizontal, `right` as vertical) -- so a bare `Drawer right` is vertical+right and
 * `Drawer top` is horizontal+top. When the two are given and conflict
 * (`vertical top`), anchor WINS and the axis is derived from it (Ruling 4: normalize,
 * don't error). Falls back to the explicit `orientation`, else `vertical`.
 * @param {import('./common.js').ResolvedNode} node @returns {'vertical'|'horizontal'}
 */
function axisOf(node) {
  const a = node.props.anchor;
  if (a && EDGE_AXIS[a]) return EDGE_AXIS[a]; // anchor implies (and wins) the axis
  return node.props.orientation === 'horizontal' ? 'horizontal' : 'vertical';
}

/** Is the panel VERTICAL (a tall narrow column) vs horizontal (a wide short row)?
 *  @param {import('./common.js').ResolvedNode} node @returns {boolean} */
const isVertical = (node) => axisOf(node) === 'vertical';

/**
 * The single SIDE knob, resolved onto the effective axis. `anchor` is the edge the
 * drawer is docked against / pinned to; given, it already set the axis (axisOf), so
 * here it is simply honored; absent, it defaults to that axis's NEAR edge (left /
 * top). Drives BOTH the in-flow seam edge and the overlay pin -- one side knob, one
 * placement system. @param {import('./common.js').ResolvedNode} node @returns {'left'|'right'|'top'|'bottom'}
 */
function anchorOf(node) {
  const edges = AXIS_EDGES[axisOf(node)];
  return edges.includes(node.props.anchor) ? node.props.anchor : edges[0];
}

/** The panel's own main-axis extent: the thin RAIL for the rail variant, else the
 *  full PANEL_W (vertical) / PANEL_MIN_H (horizontal) floor. */
const mainExtent = (node) => (isRail(node) ? RAIL : (isVertical(node) ? PANEL_W : PANEL_MIN_H));

/** A panel/rail draws its seam unless `divider=false`. */
const hasDivider = (node) => node.props.divider !== false;

/** A (normalized) `anchor` edge -> the {h,v} anchor `anchorRect` takes for the
 *  overlay variant: pin the named edge, STRETCH the perpendicular axis to fill the
 *  parent. @type {Record<string, import('./common.js').Anchor>} */
const OVERLAY_ANCHORS = {
  left: { h: 'start', v: 'stretch' },
  right: { h: 'end', v: 'stretch' },
  top: { h: 'stretch', v: 'start' },
  bottom: { h: 'stretch', v: 'end' },
};

/** The CONTENT-FACING edge the seam hugs: the OPPOSITE of the `anchor` (dock/pin)
 *  edge -- a drawer anchored left faces the content on its right, so the seam is on
 *  the right. Same rule for in-flow (anchor = which side it's docked against) and
 *  overlay (anchor = which side it's pinned to). @param {import('./common.js').ResolvedNode} node @returns {'left'|'right'|'top'|'bottom'} */
function seamEdge(node) {
  const a = anchorOf(node);
  return a === 'left' ? 'right' : a === 'right' ? 'left' : a === 'top' ? 'bottom' : 'top';
}

/**
 * A solid seam on the named edge of `box`, heavier than the surface border so the
 * docked edge reads as the drawer's seam against the page.
 * @param {'left'|'right'|'top'|'bottom'} edge @param {import('../layout.js').Box} box @returns {string}
 */
function dividerLine(edge, box) {
  const o = { stroke: COLORS.ink, strokeWidth: 2 };
  if (edge === 'left') return rline(box.x, box.y, box.x, box.y + box.h, o);
  if (edge === 'right') return rline(box.x + box.w, box.y, box.x + box.w, box.y + box.h, o);
  if (edge === 'top') return rline(box.x, box.y, box.x + box.w, box.y, o);
  return rline(box.x, box.y + box.h, box.x + box.w, box.y + box.h, o); // bottom
}

export default {
  name: 'Drawer',
  tier: 'v1.0',
  category: 'navigation',
  container: true,
  props: {
    variant: { type: 'enum', values: ['permanent', 'overlay', 'rail'], default: 'permanent' },
    orientation: { type: 'enum', values: ['vertical', 'horizontal'], default: 'vertical' },
    anchor: { type: 'enum', values: ['left', 'right', 'top', 'bottom'], default: 'left' },
    divider: { type: 'boolean', default: true },
    background: { type: 'enum', values: BACKGROUNDS, default: 'hatch' },
    denseBackground: { type: 'boolean', default: false },
  },
  keyless: [
    { kind: 'enum', to: 'variant' },
    { kind: 'enum', to: 'orientation' },
    { kind: 'enum', to: 'anchor' },
    { kind: 'enum', to: 'background' },
  ],
  notes: 'Nav panel. permanent/rail are in-flow (orientation vertical|horizontal, no pinning); overlay is out-of-flow and anchors to a side (anchor left|right|top|bottom, pinned at 100% perpendicular). divider = content-facing seam; background/denseBackground opaque-tint.',

  // The panel lays its OWN children along its main axis: a vertical panel is a
  // column, a horizontal panel a row. (Overlay only changes how the PARENT treats
  // the node + paint order, not how it arranges its insides.)
  layoutSpec: (node) => ({ axis: isVertical(node) ? 'col' : 'row', pad: SPACING, gap: SPACING / 2 }),

  // OUT OF FLOW only for the overlay variant.
  overlay: (node) => isOverlayVariant(node),

  // An overlay pins to its `anchor` edge and stretches the perpendicular axis to
  // fill the parent, via the shared anchorRect. Its main-axis extent is its measured
  // size (floored by minSize); the perpendicular axis is stretched.
  overlayPlacement: (node, parent, measured) =>
    anchorRect(parent, measured, OVERLAY_ANCHORS[anchorOf(node)] ?? OVERLAY_ANCHORS.left),

  // In-flow sizing (permanent/rail): a horizontal panel stretches the cross axis
  // (full width); a vertical panel keeps its own width. (No effect on overlay,
  // which overlayPlacement sizes.)
  block: (node) => !isVertical(node),

  // Floor the main-axis extent so an empty drawer still draws docked: the thin RAIL
  // for rail, else PANEL_W (vertical width) / PANEL_MIN_H (horizontal height).
  minSize: (node) => (isVertical(node) ? { w: mainExtent(node), h: PANEL_MIN_H } : { w: PANEL_W, h: mainExtent(node) }),

  render: (node, box) => {
    // Opaque panel surface: paper, plus an opaque hatch tint when asked (task-1
    // base:true so a background-frame chain never bleeds through the gaps).
    const tinted = node.props.background !== undefined || node.props.denseBackground === true;
    const tint = tinted
      ? backgroundHatch(box, node.props.background, node.props.denseBackground === true, { base: true })
      : surface(box, { fill: COLORS.paper });
    // A tinted panel's hatch base is borderless -> draw the outline on top so the
    // panel always reads as a bordered surface.
    const border = tinted ? surface(box, { fill: 'none', stroke: COLORS.ink }) : '';
    // An overlay floats over content -> elevation shadow; in-flow panels sit flush.
    const shadow = isOverlayVariant(node) ? elevationShadow(box, 2) : '';
    const seam = hasDivider(node) ? dividerLine(seamEdge(node), box) : '';
    return shadow + tint + border + seam;
  },
};
