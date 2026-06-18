// @ts-check
import { FILLER_STYLES, tint } from './common.js';
import { surface, centeredLabel } from '../draw.js';
import { textIntrinsic, textOf } from '../metrics.js';

/**
 * Chip -- compact label token. Keyless text is the label; filler default "Chip".
 * (SPEC ss.5.4)
 *
 * Strategy (inline leaf): not `block`, so the pill sizes to its label rather than
 * stretching the container's cross axis; intrinsic is the label plus a snug pill
 * padding. `to=` and children are the facade's job.
 *
 * Two keyless enums with disjoint value domains (CONVENTION s.2.1), so
 * `Chip "New" outlined small` parses regardless of token order:
 *  - `variant` filled (default) -> a hand-drawn hatch tint; outlined -> border only.
 *  - `size` medium (default) / small -> small tightens the padding + label font.
 *
 * `background` (`hatch`/`crosshatch`/`none`) picks the filled tint's pattern --
 * `none` is opaque but untextured (solid base, no hashes) -- and `denseBackground`
 * packs its lines closer.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Per-size pill padding + label font (px); medium is the default. */
const SIZES = {
  medium: { padX: 12, padY: 5, fontSize: 13 },
  small: { padX: 9, padY: 3, fontSize: 11 },
};

/** @param {import('./common.js').ResolvedNode} node */
const sizeOf = (node) => SIZES[node.props.size] ?? SIZES.medium;

export default {
  name: 'Chip',
  tier: 'v0.1',
  category: 'content',
  text: true,
  props: {
    label: { type: 'string' },
    variant: { type: 'enum', values: ['filled', 'outlined'], default: 'filled' },
    size: { type: 'enum', values: ['small', 'medium'], default: 'medium' },
    filler: { type: 'enum', values: FILLER_STYLES },
  },
  keyless: [
    { kind: 'literal', to: 'label' },
    { kind: 'enum', to: 'variant' },
    { kind: 'enum', to: 'size' },
  ],
  notes: 'Filler default "Chip"; variant + size both keyless.',

  block: false,
  intrinsic: (node) => {
    // Measure at the size we actually DRAW at (not fontSizeOf's Typography
    // fallback), so the pill tracks the drawn label rather than a 16px ghost.
    const { padX, padY, fontSize } = sizeOf(node);
    return textIntrinsic(node, { padX, padY, fallback: 'Chip', fontSize });
  },
  // filled -> opaque (base:true) hand-drawn hatch tint painted behind the border by
  // the facade (the chip's own fill, so nothing shows through it); outlined -> border
  // only. The hatch is borderless so the pill border keeps its own normal roughness.
  background: (node) =>
    node.props.variant === 'outlined' ? null : tint(node, { pattern: node.props.background ?? 'hatch', base: true }),

  render: (node, box) => {
    const { fontSize } = sizeOf(node);
    return surface(box, {}) + centeredLabel(box, textOf(node, 'Chip'), { fontSize });
  },
};
