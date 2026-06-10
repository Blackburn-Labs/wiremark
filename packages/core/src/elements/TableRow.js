// @ts-check
import { backgroundHatch, rline, COLORS } from '../draw.js';

/**
 * TableRow -- one row of a Table, laying its TableCells out in a row. (SPEC: the
 * Table family, FAMILIES.md FAMILY 1.)
 *
 * Strategy (row container -- OVERRIDES its spec slice's `children:false`): a row
 * with no cells is meaningless and TableCell is itself a child-bearing element, so
 * per the binding family ruling TableRow defines a `layoutSpec` (axis `row`) and is
 * a container. Cells split the row width equally because each TableCell declares
 * `flex:true`; the row uses `pad:0 gap:0` so cells abut and -- for rows with equal
 * cell counts -- visually align into columns (the documented limit on column
 * alignment lives on Table). Being a container it stretches to the table width by
 * default (`block`), so a row spans the whole table.
 *
 * Own chrome: a faint bottom divider rule across the full box (like ListItem) so
 * rows read as separated. `selected` (a keyless boolean) tints the row with a light
 * hand-drawn hatch across its box, which discriminates a selected row from a plain
 * one at render -- the row highlight MUI shows for a selected row.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'TableRow',
  tier: 'v1.0',
  category: 'content',
  container: true,
  props: {
    // `selected` is keyless by being a declared boolean (CONVENTION s.3): a bare
    // `selected` token sets it true; no keyless slot kind is needed for booleans.
    selected: { type: 'boolean', default: false },
  },
  notes: 'Container override: spec slice says children:false, but a row must hold '
    + 'TableCells, so it defines a row layoutSpec (FAMILIES.md FAMILY 1). pad:0 gap:0 '
    + 'so equal-flex cells abut and align into columns for equal-count rows.',

  layoutSpec: () => ({ axis: 'row', pad: 0, gap: 0 }),

  render: (node, box) => {
    let out = '';
    // A selected row tints behind its cells with a light hatch -- the borderless
    // background helper, so the row's own divider stays a crisp separate stroke.
    if (node.props.selected === true) out += backgroundHatch(box, 'hatch', false);
    // Faint bottom divider across the full row width (like ListItem), so adjacent
    // rows read as separated even though the row draws no side/top borders.
    out += rline(box.x, box.y + box.h, box.x + box.w, box.y + box.h,
      { stroke: COLORS.muted, strokeWidth: 1 });
    return out;
  },
};
