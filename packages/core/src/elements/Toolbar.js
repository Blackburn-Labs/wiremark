// @ts-check
import { SPACING } from '../metrics.js';

/**
 * Toolbar -- horizontal bar contents, typically inside an AppBar. (SPEC ss.5.3)
 *
 * Strategy (invisible container): an AppBar draws the bar, so the Toolbar itself
 * paints nothing -- it only lays its children out in a row (like Stack/Box). It
 * omits `render` entirely.
 *
 * `variant` (regular|dense, keyless) tightens the row: a `dense` toolbar uses
 * half a spacing unit between items instead of a full one. This mirrors AppBar's
 * regular/dense metric so the two compose -- an `AppBar dense` wrapping a
 * `Toolbar dense` reads as one consistently denser bar.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Toolbar',
  tier: 'v0.1',
  category: 'surfaces',
  container: true,
  props: {
    variant: { type: 'enum', values: ['regular', 'dense'], default: 'regular' },
  },
  keyless: [{ kind: 'enum', to: 'variant' }],

  // Defaults aren't injected (CONVENTION s.6) -- read variant defensively and
  // treat anything but the explicit `dense` token as the `regular` default.
  layoutSpec: (node) => ({
    axis: 'row',
    pad: 0,
    gap: node.props.variant === 'dense' ? SPACING / 2 : SPACING,
  }),
};
