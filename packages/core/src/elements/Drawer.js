// @ts-check
import { surface, rline, elevationShadow, COLORS } from '../draw.js';
import { SPACING } from '../metrics.js';

/**
 * Drawer -- a navigation panel docked to one edge of the frame. (SPEC: MUI
 * Navigation surface, v1.0.)
 *
 * Honest-wireframe note: this engine has no overlay / absolute-positioning layer,
 * so a Drawer is rendered the only way it can be drawn truthfully in a static
 * flexbox-lite layout -- as a DOCKED side panel (a bordered surface with a heavier
 * divider line on the edge it slides from). Each prop drives real, assertable
 * geometry/chrome rather than a cosmetic flag:
 *
 *  - `anchor` (keyless enum, default `left`) sets which edge the panel docks to and
 *    therefore its whole shape. `left`/`right` are VERTICAL panels (a `col` that
 *    keeps its own panel width instead of stretching) with the divider on the inner
 *    edge -- the right edge for `left`, the left edge for `right`. `top`/`bottom`
 *    are HORIZONTAL panels (a `row` that DOES stretch to the full frame width, like
 *    a real top/bottom sheet) with the divider on the inner edge -- the bottom edge
 *    for `top`, the top edge for `bottom`. So `block` is a predicate: stretch the
 *    cross axis only for the full-width top/bottom anchors.
 *
 *  - `variant` (keyless enum, default `temporary`) sets how the panel sits over the
 *    content. `temporary` floats above the page, so it carries an elevation shadow;
 *    `persistent`/`permanent` are flush with the layout, so they draw just the
 *    divider with no shadow.
 *
 *  - `open` (keyless boolean) -- a wireframe shows the drawer OPEN by default
 *    (`openOf` treats unset as open). `open=false` is the collapsed state: the
 *    panel draws as a slim closed rail at its anchored edge (a hatch-free band) with
 *    no divider, the way a shut drawer reads in a mock-up.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Panel width (left/right) and minimum height (top/bottom) floors so an empty,
 *  open drawer still draws at a sensible docked size. */
const PANEL_W = 220;
const PANEL_MIN_H = 56;

/** Thickness (px) of the slim closed rail drawn at the anchored edge. */
const RAIL = 8;

/** @param {import('./common.js').ResolvedNode} node @returns {'left'|'right'|'top'|'bottom'} */
const anchorOf = (node) => node.props.anchor ?? 'left';

/** Side-docked (left/right) drawers are vertical columns; top/bottom are rows. */
const isVertical = (node) => anchorOf(node) === 'left' || anchorOf(node) === 'right';

/** A wireframe draws the drawer open unless explicitly `open=false`. */
const openOf = (node) => node.props.open !== false;

/** `temporary` floats over the page (drop shadow); docked variants sit flush. */
const isFloating = (node) => (node.props.variant ?? 'temporary') === 'temporary';

/**
 * The inner divider line for an OPEN panel, drawn on the edge the drawer slides
 * from: right edge for `left`, left edge for `right`, bottom edge for `top`, top
 * edge for `bottom`. Slightly heavier than the surface border so the docked edge
 * reads as the drawer's seam against the page.
 * @param {'left'|'right'|'top'|'bottom'} anchor
 * @param {import('../layout.js').Box} box
 * @returns {string}
 */
function dividerLine(anchor, box) {
  const o = { stroke: COLORS.ink, strokeWidth: 2 };
  if (anchor === 'left') return rline(box.x + box.w, box.y, box.x + box.w, box.y + box.h, o);
  if (anchor === 'right') return rline(box.x, box.y, box.x, box.y + box.h, o);
  if (anchor === 'top') return rline(box.x, box.y + box.h, box.x + box.w, box.y + box.h, o);
  return rline(box.x, box.y, box.x + box.w, box.y, o); // bottom
}

/**
 * The slim closed rail for `open=false`, a muted band hugging the anchored edge.
 * @param {'left'|'right'|'top'|'bottom'} anchor
 * @param {import('../layout.js').Box} box
 * @returns {string}
 */
function closedRail(anchor, box) {
  const fill = { fill: COLORS.fill, stroke: COLORS.muted };
  if (anchor === 'left') return surface({ x: box.x, y: box.y, w: RAIL, h: box.h }, fill);
  if (anchor === 'right') return surface({ x: box.x + box.w - RAIL, y: box.y, w: RAIL, h: box.h }, fill);
  if (anchor === 'top') return surface({ x: box.x, y: box.y, w: box.w, h: RAIL }, fill);
  return surface({ x: box.x, y: box.y + box.h - RAIL, w: box.w, h: RAIL }, fill); // bottom
}

export default {
  name: 'Drawer',
  tier: 'v1.0',
  category: 'navigation',
  container: true,
  props: {
    anchor: { type: 'enum', values: ['left', 'right', 'top', 'bottom'], default: 'left' },
    variant: { type: 'enum', values: ['permanent', 'persistent', 'temporary'], default: 'temporary' },
    open: { type: 'boolean', default: false },
  },
  keyless: [
    { kind: 'enum', to: 'anchor' },
    { kind: 'enum', to: 'variant' },
  ],
  notes: 'Docked side panel; anchor sets the edge + axis, variant the elevation, open the panel-vs-rail.',

  // left/right -> a vertical list of nav items; top/bottom -> a horizontal row.
  layoutSpec: (node) => ({ axis: isVertical(node) ? 'col' : 'row', pad: SPACING, gap: SPACING / 2 }),

  // Full-width top/bottom sheets stretch the cross axis; left/right side panels
  // keep their own panel width instead of stretching to the frame edge.
  block: (node) => !isVertical(node),

  // Floor the panel so an empty/open drawer still draws docked: a real panel width
  // for left/right (top/bottom get full width from `block`), and a minimum height
  // for the short top/bottom sheet (left/right grow taller with content).
  minSize: { w: PANEL_W, h: PANEL_MIN_H },

  render: (node, box) => {
    const anchor = anchorOf(node);
    // Closed: just the slim rail at the anchored edge -- no paper, no divider.
    if (!openOf(node)) return closedRail(anchor, box);
    // Open: floating (temporary) panels lift off the page with a drop shadow;
    // docked (persistent/permanent) ones sit flush. Then the paper + edge divider.
    const shadow = isFloating(node) ? elevationShadow(box, 2) : '';
    return shadow + surface(box, { fill: COLORS.paper }) + dividerLine(anchor, box);
  },
};
