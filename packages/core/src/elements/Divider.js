// @ts-check
import { rline, outlineOpts, COLORS } from '../draw.js';

/**
 * Divider -- a thin rule that separates content (SPEC ss.5.2; used by the ss.8.2
 * example).
 *
 * Strategy (LEAF, block): a rule on the container's cross axis. `block` stretches
 * it to that cross axis, so its long dimension comes from the parent; intrinsically
 * it contributes only the short dimension -- a little breathing room (H) around the
 * line, which is stroked at the box's midpoint in `render`.
 *
 *  - `orientation=horizontal` (default): in a column, the cross axis is width, so
 *    block fills the width => a full-width horizontal rule (contributes height H).
 *  - `orientation=vertical`: placed in a row, the cross axis is height, so block
 *    fills the height => a full-height vertical rule (contributes width H). This is
 *    the idiomatic MUI placement (a vertical divider sits between row children).
 *
 * `variant` (solid/dashed/dotted) selects the stroke dash via the shared
 * `outlineOpts` helper (CONVENTION s.8) -- same dash arrays the box outlines use.
 *
 * Two keyless enums with disjoint value domains (CONVENTION s.2.1), so
 * `Divider vertical dashed` parses regardless of token order.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Breathing room across the rule (px); the line sits at the box's center. */
const H = 9;

/** @param {import('./common.js').ResolvedNode} node @returns {boolean} */
const isVertical = (node) => node.props.orientation === 'vertical';

export default {
  name: 'Divider',
  tier: 'v1.0',
  category: 'layout',
  props: {
    orientation: { type: 'enum', values: ['horizontal', 'vertical'], default: 'horizontal' },
    variant: { type: 'enum', values: ['solid', 'dashed', 'dotted'], default: 'solid' },
  },
  keyless: [
    { kind: 'enum', to: 'orientation' },
    { kind: 'enum', to: 'variant' },
  ],
  notes: 'Separator rule; orientation + dash variant, both keyless.',

  block: true,
  // Thin on its own axis, zero on the cross axis -- block supplies the long
  // dimension from the parent's cross extent.
  intrinsic: (node) => (isVertical(node) ? { w: H, h: 0 } : { w: 0, h: H }),
  render: (node, box) => {
    // Reuse the box-outline dash arrays; recolor to the subtle divider stroke.
    const opts = { ...outlineOpts(node.props.variant ?? 'solid'), stroke: COLORS.muted, strokeWidth: 1 };
    return isVertical(node)
      ? rline(box.x + box.w / 2, box.y, box.x + box.w / 2, box.y + box.h, opts)
      : rline(box.x, box.y + box.h / 2, box.x + box.w, box.y + box.h / 2, opts);
  },
};
