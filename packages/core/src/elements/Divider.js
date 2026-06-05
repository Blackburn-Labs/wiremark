// @ts-check
import { rline, COLORS } from '../draw.js';

/**
 * Divider -- a bare horizontal line; no props. (SPEC ss.5.2; used by the ss.8.2
 * example.)
 *
 * Strategy (LEAF): a full-width horizontal rule. `block` stretches it to the
 * container's cross axis, so its width comes from the parent; intrinsically it
 * contributes only height -- a little vertical breathing room (H) around the
 * line, which is stroked at the box's vertical midpoint in `render`.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Vertical breathing room around the rule (px); the line sits at its center. */
const H = 9;

export default {
  name: 'Divider',
  tier: 'v1.0',
  category: 'layout',
  props: {},
  notes: 'Bare line; no props.',

  block: true,
  intrinsic: () => ({ w: 0, h: H }),
  render: (node, box) => rline(
    box.x, box.y + box.h / 2, box.x + box.w, box.y + box.h / 2,
    { stroke: COLORS.muted, strokeWidth: 1 },
  ),
};
