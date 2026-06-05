// @ts-check
import { surface, COLORS } from '../draw.js';
import { SPACING } from '../metrics.js';

/**
 * AppBar -- top app bar; usually wraps a Toolbar. (SPEC ss.5.3)
 *
 * Reference strategy (surface container): a full-width filled horizontal bar.
 * It arranges children in a row inside one unit of padding and draws an accent
 * fill behind them. No `block` opt-out -- like a real app bar it stretches to
 * the container's cross axis (full frame width), and its height follows the
 * content (typically a Toolbar's intrinsic height).
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'AppBar',
  tier: 'v0.1',
  category: 'surfaces',
  container: true,
  props: {},
  notes: 'Top app bar; usually wraps a Toolbar.',

  layoutSpec: () => ({ axis: 'row', pad: SPACING, gap: SPACING }),
  render: (node, box) => surface(box, { fill: COLORS.accent }),
};
