// @ts-check
import { SPACING } from '../metrics.js';

/**
 * Grid -- explicit grid; `cols=` sets the column count and children flow into
 * cells. `gap=` folds row/column spacing. (SPEC ss.5.2)
 *
 * Reference strategy (grid container): declares the `grid` axis with its column
 * count and gap; the engine allocates equal columns and flows children into
 * cells row by row. Draws nothing itself.
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
    cols: { type: 'number' },
    gap: { type: 'number' },
  },
  notes: 'Children flow into cells.',

  layoutSpec: (node) => ({
    axis: 'grid',
    cols: typeof node.props.cols === 'number' ? node.props.cols : 1,
    gap: (typeof node.props.gap === 'number' ? node.props.gap : 1) * SPACING,
    pad: 0,
  }),
};
