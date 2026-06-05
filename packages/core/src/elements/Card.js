// @ts-check
import { surface, COLORS } from '../draw.js';

/**
 * Card -- surface container. Flattening rule (ss.5.3): with no `Card*` children
 * present, all children are treated as living in an implicit single
 * `CardContent`; authors may instead use explicit Card sub-parts. (SPEC ss.5.3)
 *
 * Reference strategy (surface): the Card itself is just the paper -- a bordered,
 * filled box drawn across its full region. It adds no padding or gap of its own
 * (those belong to the Card* sub-parts it stacks in a column), so by layout time
 * its children are always Card* parts (the resolver wraps a bare Card's content
 * in an implicit CardContent). `minSize` keeps an empty Card from collapsing, so
 * a bare `Card` in a screen background still draws as a visible card.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Card',
  tier: 'v0.1',
  category: 'surfaces',
  container: true,
  sizing: true,
  props: {},
  notes: 'Flattening rule (ss.5.3): with no Card* children, children live in an implicit CardContent.',

  layoutSpec: () => ({ axis: 'col', pad: 0, gap: 0 }),
  minSize: { w: 160, h: 100 },
  render: (node, box) => surface(box, { fill: COLORS.paper }),
};
