// @ts-check
import { FLEX_DIRECTIONS } from './common.js';
import { SPACING } from '../metrics.js';
import { surfaceWith, rline, COLORS } from '../draw.js';

/**
 * Stack -- flex container. `Stack row` / `Stack column` (default `column`), plus
 * the reversed variants `row-reverse` / `column-reverse`; `spacing=` (alias
 * `gap=`) sets the inter-child gap in MUI spacing units. Bare-number children are
 * flex weights and `Spacer` flexes -- both handled by the engine's main-axis
 * distribution (ss.4.2).
 *
 * Reference strategy (dynamic container): the axis, gap and child order come from
 * props. Like MUI's Stack it is invisible by default, but per spec it gains
 * optional chrome -- an `outline` border (none/solid/dashed/dotted, keyless) and a
 * numeric `elevation` shadow (mirrors Box) -- plus `divider`, a keyless flag that
 * draws a rule in each gap between children.
 *
 * `direction` maps column->axis 'col' and row->axis 'row'; the `-reverse` variants
 * keep that axis and additionally emit `reverse:true` in the layoutSpec, which the
 * layout facade honors (arrangeLinear mirrors the children's placement order along
 * the main axis -- flex weights and gaps are computed order-independently, so only
 * the visual order flips). So `row-reverse` lays children right-to-left and
 * `column-reverse` bottom-to-top.
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
    // width/height (+ w/h aliases) are realized by `sizing: true` (CONVENTION ss.4).
    direction: {
      type: 'enum',
      values: FLEX_DIRECTIONS,
      default: 'column',
    },
    spacing: { type: 'number', default: 0, aliases: ['gap'] },
    divider: { type: 'boolean', default: false },
    elevation: { type: 'number', default: 0 },
    outline: { type: 'enum', values: ['none', 'solid', 'dashed', 'dotted'], default: 'none' },
  },
  // direction + outline are disjoint enum domains (CONVENTION ss.2.1); `divider`
  // is an implicit keyless boolean (a bare `divider` token -> true, ss.3).
  keyless: [
    { kind: 'enum', to: 'direction' },
    { kind: 'enum', to: 'outline' },
  ],
  notes: 'Flex container; spacing*SPACING gap, optional divider/outline/elevation. Invisible unless those are set.',

  layoutSpec: (node) => {
    const dir = node.props.direction ?? 'column';
    return {
      axis: dir === 'row' || dir === 'row-reverse' ? 'row' : 'col',
      reverse: dir === 'row-reverse' || dir === 'column-reverse',
      gap: (typeof node.props.spacing === 'number' ? node.props.spacing : 0) * SPACING,
      pad: 0,
    };
  },

  render: (node, box) => {
    const outline = node.props.outline ?? 'none';
    const elevation = Number(node.props.elevation ?? 0);
    const wantsDivider = node.props.divider === true && box.children && box.children.length > 1;
    // Defaults => invisible: omit every draw so a bare Stack stays free.
    if (outline === 'none' && !(elevation > 0) && !wantsDivider) return '';

    let out = '';
    if (outline !== 'none' || elevation > 0) out += surfaceWith(box, { outline, elevation });
    if (wantsDivider) {
      const dir = node.props.direction ?? 'column';
      const horiz = dir === 'row' || dir === 'row-reverse';
      const kids = box.children;
      // A rule centered in each gap between adjacent children: vertical between
      // row items, horizontal between column items. Uses the muted stroke so it
      // reads as a separator, not a border.
      for (let i = 0; i < kids.length - 1; i++) {
        const a = kids[i];
        const b = kids[i + 1];
        if (horiz) {
          const x = (a.x + a.w + b.x) / 2;
          const y1 = Math.min(a.y, b.y);
          const y2 = Math.max(a.y + a.h, b.y + b.h);
          out += rline(x, y1, x, y2, { stroke: COLORS.muted, strokeWidth: 1 });
        } else {
          const y = (a.y + a.h + b.y) / 2;
          const x1 = Math.min(a.x, b.x);
          const x2 = Math.max(a.x + a.w, b.x + b.w);
          out += rline(x1, y, x2, y, { stroke: COLORS.muted, strokeWidth: 1 });
        }
      }
    }
    return out;
  },
};
