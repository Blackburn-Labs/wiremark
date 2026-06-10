// @ts-check
import { rline, COLORS } from '../draw.js';

/**
 * TableHead -- the header row-group of a Table. (FAMILY 1 -- Table)
 *
 * Reference strategy (invisible grouping container): TableHead is purely a
 * structural wrapper. Per the Table family ruling it stacks its TableRows in a
 * tight `col` (`pad:0 gap:0`) so the header rows abut the body with no inset --
 * the surrounding Table draws the outer border, and each TableRow draws its own
 * bottom divider. TableHead adds ONE bit of chrome the others don't: a heavier
 * full-width rule along its bottom edge, the classic line that sets a table's
 * header off from its body. It is drawn only when the head actually has rows, so
 * an empty TableHead stays invisible.
 *
 * Why no props: the spec slice declares none, and the engine gives a child no way
 * to read its Table parent's props (size/etc.), so there is nothing here to vary.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'TableHead',
  tier: 'v1.0',
  category: 'content',
  container: true,
  props: {},
  notes:
    'Invisible header row-group; stacks TableRows in a tight col (pad:0 gap:0). '
    + 'Draws a heavier full-width rule at its bottom edge to divide head from body. '
    + 'Has no props -- a child cannot read Table\'s size/etc. (engine: no parent context).',

  layoutSpec: () => ({ axis: 'col', pad: 0, gap: 0 }),

  render: (_node, box) => {
    // Only divide head from body when there is a header to divide.
    if (!box.children || box.children.length === 0) return '';
    const y = box.y + box.h;
    return rline(box.x, y, box.x + box.w, y, { stroke: COLORS.ink, strokeWidth: 1.6 });
  },
};
