// @ts-check
import { SPACING } from '../metrics.js';

/**
 * Grid -- explicit grid; `columns=` (alias `cols=`) sets the column count and
 * children flow into equal cells row by row. `spacing=` (alias `gap=`) folds
 * row/column spacing, multiplied by SPACING. (SPEC ss.5.2)
 *
 * Reference strategy (grid container): declares the `grid` axis with its column
 * count and gap; the engine allocates equal columns and flows children into
 * cells row by row. Draws nothing itself.
 *
 * Sizing: `sizing: true` covers width/height (aliases w/h). The spec's width
 * default of 100% (fill) is the engine's natural behavior for a container -- as
 * a block container it stretches to its parent's cross axis and takes the inner
 * width threaded down the main axis -- so it needs no encoding here (CONVENTION
 * s.4). height defaults to content (the rows' measured height).
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Grid',
  tier: 'v0.1',
  category: 'layout',
  container: true,
  sizing: true,
  props: {
    columns: { type: 'number', default: 12, aliases: ['cols'] },
    spacing: { type: 'number', default: 0, aliases: ['gap'] },
  },
  notes: 'Children flow into cells.',

  layoutSpec: (node) => ({
    axis: 'grid',
    // Floor to a positive integer: the grid engine indexes cells by `r*cols + c`,
    // so a fractional column count (`columns=2.5`) would miss the cell array and
    // crash. floor(2.5)->2; Math.max(1, ...) keeps 0/negative safe as one column.
    cols: Math.max(1, Math.floor(typeof node.props.columns === 'number' ? node.props.columns : 12)),
    gap: (typeof node.props.spacing === 'number' ? node.props.spacing : 0) * SPACING,
    pad: 0,
  }),
};
