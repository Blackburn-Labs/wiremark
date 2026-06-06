// @ts-check
import { rrect, rline, COLORS } from '../draw.js';

/**
 * Icon -- a generic glyph. Keyless text is the icon `name=`. The icon name
 * vocabulary is still open (ss.10.3), so every name renders the same
 * placeholder glyph (a bordered box with a diagonal mark). (SPEC ss.5.4)
 *
 * Reference strategy (fixed leaf): a `SIZE x SIZE` square that does NOT stretch
 * to the container cross axis (`block: false`) -- an icon keeps its intrinsic
 * footprint wherever it sits. `fontSize` scales that square (MUI's small/medium/
 * large); `inherit` has no ambient size to read at wireframe fidelity, so it
 * falls back to medium.
 *
 * `fontSize` is keyed (alias `size`); `name` is the one keyless slot.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Glyph extent (px) per fontSize; `inherit` reads as medium. */
const SIZES = { small: 18, medium: 24, large: 36, inherit: 24 };

/** Resolve the glyph extent, defaulting fontSize to medium. */
const sizeOf = (node) => SIZES[node.props.fontSize] ?? SIZES.medium;

export default {
  name: 'Icon',
  tier: 'v0.1',
  category: 'content',
  props: {
    name: { type: 'string' },
    fontSize: {
      type: 'enum',
      values: ['small', 'medium', 'large', 'inherit'],
      default: 'medium',
      aliases: ['size'],
    },
  },
  keyless: [{ kind: 'literal', to: 'name' }],
  notes: 'Icon name vocabulary is still open (ss.10.3).',

  block: false,
  intrinsic: (node) => {
    const s = sizeOf(node);
    return { w: s, h: s };
  },
  render: (_node, box) => {
    // A bordered frame plus a single diagonal stroke reads as a generic glyph
    // placeholder without implying any particular icon. It scales with the box.
    return rrect(box.x, box.y, box.w, box.h, { stroke: COLORS.muted })
      + rline(box.x, box.y + box.h, box.x + box.w, box.y, { stroke: COLORS.muted, strokeWidth: 1 });
  },
};
