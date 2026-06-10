// @ts-check
import { surface, rline, COLORS } from '../draw.js';

/**
 * BottomNavigation -- the fixed bottom bar of a mobile layout; holds a row of
 * BottomNavigationAction items. (SPEC: MUI Navigation)
 *
 * Strategy (surface container): a full-width horizontal bar. It lays its Actions
 * out in a flush `row` (`pad:0`, `gap:0`) so they abut edge-to-edge, and each
 * Action declares `flex:true`, so the row's width is split EQUALLY between them
 * (layout.js arrangeLinear distributes leftover main-axis space by flex weight).
 * As a container it stretches to its parent's cross axis by default, so dropped
 * straight under a frame it fills the frame width -- the classic bottom bar.
 *
 * Chrome: a paper `surface` across the full box plus a hand-drawn divider rule
 * along the TOP edge, the conventional separator between the bar and the content
 * above it.
 *
 * `value` (keyed string) is the selected Action's value and `showLabels` (keyed
 * boolean) toggles whether Actions show their labels. BOTH are best-effort /
 * parse-only at wireframe fidelity: a child Action cannot read a parent prop in
 * this engine (the layout/render strategy sees only its own node), so neither can
 * restyle the Actions. They are declared so they parse and round-trip onto
 * `node.props`; Actions always draw their own label. (FAMILIES.md FAMILY 6.)
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'BottomNavigation',
  tier: 'v1.0',
  category: 'navigation',
  container: true,
  props: {
    value: { type: 'string' },
    showLabels: { type: 'boolean', default: false },
  },
  notes:
    'Bottom bar; holds BottomNavigationAction items that split its width equally. '
    + 'value/showLabels are parse-only: a parent prop cannot reach children in this engine (engine fact 1).',

  layoutSpec: () => ({ axis: 'row', pad: 0, gap: 0 }),
  render: (_node, box) =>
    surface(box, { fill: COLORS.paper, fillStyle: 'solid' })
    + rline(box.x, box.y, box.x + box.w, box.y, { stroke: COLORS.muted, strokeWidth: 1 }),
};
