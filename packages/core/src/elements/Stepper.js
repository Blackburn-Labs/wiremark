// @ts-check
import { SPACING } from '../metrics.js';
import { rline, COLORS } from '../draw.js';

/**
 * Stepper -- a sequence of Steps with connector rules between them. (SPEC ss.5;
 * MUI Stepper). Container whose children are Steps (FAMILIES Family 3).
 *
 * Strategy (container with chrome): `orientation` (keyless enum
 * horizontal|vertical) is the one parent prop the engine can honour directly --
 * it drives the layout axis (`vertical` -> a `col` of stacked steps, else a
 * `row`), exactly as Tabs does. `pad: 0` so the strip hugs its edges; the gap is
 * a touch generous (`SPACING * 2`) to leave room for the connector rules.
 *
 * Chrome: the classic MUI connector -- a faint rule spanning the gap BETWEEN
 * each pair of consecutive Steps, along the main axis (horizontal: a short line
 * from one step's right edge to the next step's left edge, vertically centered;
 * vertical: a line down the gap, horizontally centered). The connectors are
 * derived from the laid-out child boxes, so they track wherever the Steps land
 * and the two orientations render visibly differently. With fewer than two
 * children there are no gaps, so nothing is drawn.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Stepper',
  tier: 'v1.0',
  category: 'navigation',
  container: true,
  props: {
    orientation: { type: 'enum', values: ['horizontal', 'vertical'], default: 'horizontal' },
  },
  keyless: [{ kind: 'enum', to: 'orientation' }],
  notes: 'orientation drives the axis (vertical -> col, else row), like Tabs. Connector rules are drawn between consecutive Step boxes. Per FAMILIES Family 3, Step auto-numbering is impossible (a child cannot read its index from the parent), so connectors carry no numbers.',

  // Defaults aren't injected (CONVENTION s.6) -- read orientation defensively and
  // treat anything but the explicit `vertical` token as the horizontal default.
  layoutSpec: (node) => ({
    axis: node.props.orientation === 'vertical' ? 'col' : 'row',
    pad: 0,
    gap: SPACING * 2,
  }),

  render: (node, box) => {
    const kids = box.children;
    if (!kids || kids.length < 2) return ''; // no gaps to bridge
    const vertical = node.props.orientation === 'vertical';
    let out = '';
    for (let i = 0; i < kids.length - 1; i++) {
      const a = kids[i];
      const b = kids[i + 1];
      if (vertical) {
        // A rule down the gap between this step and the next, centered on the
        // shared left edge (steps are block:false leaves, so they sit at box.x).
        const cx = a.x + a.w / 2;
        out += rline(cx, a.y + a.h, cx, b.y, { stroke: COLORS.muted, strokeWidth: 1 });
      } else {
        // A rule across the gap, centered on the steps' shared vertical midline.
        const cy = a.y + a.h / 2;
        out += rline(a.x + a.w, cy, b.x, cy, { stroke: COLORS.muted, strokeWidth: 1 });
      }
    }
    return out;
  },
};
