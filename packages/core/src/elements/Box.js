// @ts-check
import { surfaceWith } from '../draw.js';

/**
 * Box -- generic sized container. Sizing tokens `w h` are order-significant
 * (ss.4) and resolved by the engine; fills naturally when none are given. (SPEC ss.5.2)
 *
 * Reference strategy (sized container): stacks children in a column and is
 * invisible by default -- a region whose only job is to carry a size and group
 * content (like MUI's Box). Its `w h` tokens are interpreted by the parent's
 * distribution, so there is no per-element sizing code here.
 *
 * Per spec it gains optional chrome: an `outline` border (none/solid/dashed/
 * dotted, keyless) and a numeric `elevation` shadow. With neither it still draws
 * nothing, so the bare-Box case stays a zero-overhead invisible region.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Box',
  tier: 'v0.1',
  category: 'layout',
  container: true,
  sizing: true,
  props: {
    // width/height (+ w/h aliases) are realized by `sizing: true` (CONVENTION ss.4).
    elevation: { type: 'number', default: 0 },
    outline: { type: 'enum', values: ['none', 'solid', 'dashed', 'dotted'], default: 'none' },
  },
  keyless: [
    { kind: 'enum', to: 'outline' },
  ],
  notes: 'Generic sized container; sizing is order-significant (ss.4). Invisible unless outline/elevation set.',

  layoutSpec: () => ({ axis: 'col', gap: 0, pad: 0 }),

  render: (node, box) => {
    const outline = node.props.outline ?? 'none';
    const elevation = Number(node.props.elevation ?? 0);
    // Defaults => invisible: omit the draw entirely so a bare Box stays free.
    if (outline === 'none' && !(elevation > 0)) return '';
    return surfaceWith(box, { outline, elevation });
  },
};
