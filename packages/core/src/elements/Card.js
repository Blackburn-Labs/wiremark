// @ts-check
import { surfaceWith, COLORS } from '../draw.js';

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
 * One look, governed by `elevation` alone (default 1): `elevation=0` is a
 * bordered paper with no shadow (the old `variant=outlined`), while any
 * `elevation>=1` lifts the paper with a drop shadow (the old default
 * `variant=elevation`). The redundant `variant` enum was removed -- its
 * `outlined` value just forced elevation to 0 and `elevation` was a no-op, so the
 * number subsumes both. Drawing goes through the shared `surfaceWith` helper so
 * the chrome matches Box/Stack/AppBar (CONVENTION ss.8): `outline:'solid'` always
 * draws the border, and `elevationShadow` emits nothing for `elevation<=0`, so a
 * 0-elevation Card is border-only with no further branching here.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Card',
  tier: 'v0.1',
  category: 'surfaces',
  container: true,
  sizing: true,
  props: {
    elevation: { type: 'number', default: 1 },
  },
  notes: 'Flattening rule (ss.5.3): with no Card* children, children live in an implicit CardContent.',

  layoutSpec: () => ({ axis: 'col', pad: 0, gap: 0 }),
  minSize: { w: 160, h: 100 },
  render: (node, box) => {
    // elevation 0 => bordered paper, no shadow; elevation >= 1 => paper + shadow.
    const elevation = Number(node.props.elevation ?? 1);
    return surfaceWith(box, { outline: 'solid', fill: COLORS.paper, elevation });
  },
};
