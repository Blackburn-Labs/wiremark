// @ts-check
import { SPACING } from '../metrics.js';

/**
 * Toolbar -- horizontal bar contents, typically inside an AppBar. (SPEC ss.5.3)
 *
 * Strategy (invisible container): an AppBar draws the bar, so the Toolbar itself
 * paints nothing -- it only lays its children out in a row (like Stack/Box). It
 * omits `render` entirely; gap is one MUI spacing unit between items.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Toolbar',
  tier: 'v0.1',
  category: 'surfaces',
  container: true,
  props: {},

  layoutSpec: () => ({ axis: 'row', pad: 0, gap: SPACING }),
};
