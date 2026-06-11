// @ts-check
import { drawIcon } from '../draw.js';

/**
 * Icon -- a glyph by name. Keyless text is the icon `name=`, bare or quoted
 * (`Icon Search` === `Icon "Search"`). The name vocabulary is the built-in
 * Material set plus custom icons (`Icons` block / injected packs) per
 * tasks/ICONS.md: a resolved name draws clean vector artwork; an unknown or
 * absent name draws the shared placeholder glyph. (SPEC ss.5.4)
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
    name: { type: 'icon' },
    fontSize: {
      type: 'enum',
      values: ['small', 'medium', 'large', 'inherit'],
      default: 'medium',
      aliases: ['size'],
    },
  },
  keyless: [{ kind: 'literal', to: 'name' }],
  notes: 'Icon vocabulary: built-in Material set + custom icons (tasks/ICONS.md).',

  block: false,
  intrinsic: (node) => {
    const s = sizeOf(node);
    return { w: s, h: s };
  },
  render: (node, box) => {
    // The resolver annotated node.icons.name (or didn't); drawIcon does the
    // rest -- clean vectors for a known name, the muted placeholder glyph
    // (bordered square + diagonal) otherwise -- centered at full extent.
    const s = Math.min(box.w, box.h);
    return drawIcon(node, 'name', box.x + (box.w - s) / 2, box.y + (box.h - s) / 2, s);
  },
};
