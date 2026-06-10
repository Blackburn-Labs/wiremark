// @ts-check
import { surface, rline, COLORS } from '../draw.js';
import { SPACING } from '../metrics.js';

/**
 * Menubar -- horizontal application menu bar; holds MenuItems (File/Edit/View).
 * (SPEC ss.5 Navigation; FAMILIES.md family 7)
 *
 * Strategy (surface container): lays its MenuItems out in a row and draws a thin
 * "paper" bar as its own chrome -- a light fill across the full box plus a bottom
 * rule, the classic app menu strip. It is an AppBar-lite: unlike AppBar it does
 * not hatch (a menu bar reads as plain chrome, not a tinted region), and unlike a
 * Toolbar it is not invisible -- the bottom rule separates it from the content
 * below. Items inset by `gap` only (`pad: 0`) so the strip sits flush to its
 * container's edges, the conventional menu-bar look.
 *
 * No props: the spec slice declares none, and the horizontal-bar reading is
 * fixed. Per-item state (selected/disabled) lives on MenuItem; the parent can't
 * restyle children (engine fact 1), so the bar only owns its own chrome.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Menubar',
  tier: 'v1.0',
  category: 'navigation',
  container: true,
  props: {},
  notes: 'Horizontal menu bar (File/Edit/View). Holds MenuItems in a row; draws a paper bar + bottom rule. No props per spec.',

  layoutSpec: () => ({ axis: 'row', pad: 0, gap: SPACING }),
  // Two layers: a faint surface fill across the full bar, then a heavier bottom
  // rule that divides the strip from the content beneath it. The fill uses the
  // subtle surface gray so the bar reads as chrome without competing with item
  // labels.
  render: (_node, box) =>
    surface(box, { fill: COLORS.fill, fillStyle: 'solid', stroke: 'none' })
    + rline(box.x, box.y + box.h, box.x + box.w, box.y + box.h, { stroke: COLORS.ink, strokeWidth: 1.2 }),
};
