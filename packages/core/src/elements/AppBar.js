// @ts-check
import { surface, backgroundHatch, BACKGROUNDS } from '../draw.js';
import { SPACING } from '../metrics.js';

/** Inner padding per `variant`; dense packs the bar tighter (SPEC ss.5.3). */
const VARIANT_PAD = { regular: SPACING, dense: SPACING / 2 };

/** @param {import('../resolve.js').ResolvedNode} node @returns {'regular'|'dense'} */
function variantOf(node) {
  return node.props.variant === 'dense' ? 'dense' : 'regular';
}

/**
 * AppBar -- top app bar; usually wraps a Toolbar. (SPEC ss.5.3)
 *
 * Reference strategy (surface container): a full-width filled horizontal bar.
 * It arranges children in a row inside one `variant`-sized unit of padding and
 * draws a light hand-drawn hatch behind them (never a solid flood-fill, which
 * would read as a finished UI rather than a wireframe). No `block` opt-out -- like a real app bar it
 * stretches to the container's cross axis (full frame width), and its height
 * follows the content (typically a Toolbar's intrinsic height) plus padding.
 *
 * `variant` (keyless): `regular` (default) or `dense`. dense halves the padding,
 * so the bar sits visibly tighter/shorter than regular -- mirroring Toolbar.
 *
 * `background` (keyed `hatch`/`crosshatch`/`none`) picks the tint pattern -- `none`
 * is an opaque, untextured bar (solid base, no hashes); `denseBackground` packs the
 * lines closer -- see `backgroundHatch` in draw.js.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'AppBar',
  tier: 'v0.1',
  category: 'surfaces',
  container: true,
  props: {
    variant: { type: 'enum', values: ['regular', 'dense'], default: 'regular' },
    background: { type: 'enum', values: BACKGROUNDS, default: 'hatch' },
    denseBackground: { type: 'boolean', default: false },
  },
  keyless: [{ kind: 'enum', to: 'variant' }],
  notes: 'Top app bar; usually wraps a Toolbar.',

  layoutSpec: (node) => ({ axis: 'row', pad: VARIANT_PAD[variantOf(node)], gap: SPACING }),
  // Two layers so each keeps its own character: an opaque (base:true) low-roughness
  // hatch fill that barely overflows the box -- the bar is its own surface, so
  // content behind it must not bleed through -- then the normal-roughness border
  // that stays as wobbly as every other surface.
  render: (node, box) =>
    backgroundHatch(box, node.props.background, node.props.denseBackground === true, { base: true })
    + surface(box, { fill: 'none' }),
};
