// @ts-check
import { surfaceWith } from '../draw.js';
import { tint } from './common.js';

/**
 * Box -- generic sized container. Sizing tokens `w h` are order-significant
 * (ss.4) and resolved by the engine; fills naturally when none are given. (SPEC ss.5.2)
 *
 * Reference strategy (sized container): stacks children in a column -- a region
 * whose job is to carry a size and group content (like MUI's Box). Its `w h` tokens
 * are interpreted by the parent's distribution, so there is no per-element sizing
 * code here.
 *
 * Background: a Box is OPAQUE by default -- the universal `background` strategy
 * paints a solid paper base behind its children, so a Box layered over a
 * `background=#id` chain occludes it. `opaque=false` makes it a see-through grouping
 * region (the former default); `background=hatch`/`crosshatch` + `denseBackground`
 * tint it. Its own chrome stays optional: an `outline` border (none/solid/dashed/
 * dotted, keyless) and a numeric `elevation` shadow, drawn over the base.
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
  notes: 'Generic sized container; sizing is order-significant (ss.4). Opaque paper base by default (opaque=false for a transparent region); optional outline/elevation chrome over it.',

  layoutSpec: () => ({ axis: 'col', gap: 0, pad: 0 }),

  // Opaque by default: the facade paints a solid paper base behind the children
  // unless `opaque=false` is set with no pattern (then this stays a transparent
  // grouping region); `background=`/`denseBackground` add the hatch over the base.
  background: (node) => {
    const opaque = node.props.opaque ?? true;
    const has = typeof node.props.background === 'string' || node.props.denseBackground === true;
    if (!opaque && !has) return null;
    return tint(node, { pattern: node.props.background ?? 'none', base: true });
  },

  render: (node, box) => {
    const outline = node.props.outline ?? 'none';
    const elevation = Number(node.props.elevation ?? 0);
    // No own border/shadow chrome unless outline/elevation set (the opaque paper
    // base is painted by the universal background facade, not here).
    if (outline === 'none' && !(elevation > 0)) return '';
    return surfaceWith(box, { outline, elevation });
  },
};
