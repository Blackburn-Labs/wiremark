// @ts-check
import { SPACING } from '../metrics.js';

/**
 * Stack -- flex container. `Stack row` / `Stack col` (default `col`); `gap=`
 * sets spacing (in MUI spacing units). Bare-number children are flex weights and
 * `Spacer` flexes -- both handled by the engine's main-axis distribution (ss.4.2).
 *
 * Reference strategy (dynamic container): the axis and gap come from props; it
 * draws nothing itself (an invisible layout primitive, like MUI's Stack).
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Stack',
  tier: 'v0.1',
  category: 'layout',
  container: true,
  sizing: true,
  props: {
    direction: { type: 'enum', values: ['row', 'col'], default: 'col' },
    gap: { type: 'number' },
  },
  keyless: [{ kind: 'enum', to: 'direction' }],

  layoutSpec: (node) => ({
    axis: node.props.direction === 'row' ? 'row' : 'col',
    gap: (typeof node.props.gap === 'number' ? node.props.gap : 0) * SPACING,
    pad: 0,
  }),
};
