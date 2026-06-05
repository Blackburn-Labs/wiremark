// @ts-check
import { rrect, rline, COLORS } from '../draw.js';

/**
 * Icon -- a generic glyph. Keyless text is the icon `name=`. The icon name
 * vocabulary is still open (ss.10.3), so every name renders the same fixed-size
 * placeholder glyph (a bordered box with a diagonal mark). (SPEC ss.5.4)
 *
 * Reference strategy (fixed leaf): a small `SIZE x SIZE` square that does NOT
 * stretch to the container cross axis (`block: false`) -- an icon keeps its
 * intrinsic footprint wherever it sits.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Fixed glyph extent (px) -- icons render at one size regardless of name. */
const SIZE = 24;

export default {
  name: 'Icon',
  tier: 'v0.1',
  category: 'content',
  props: {
    name: { type: 'string' },
  },
  keyless: [{ kind: 'literal', to: 'name' }],
  notes: 'Icon name vocabulary is still open (ss.10.3).',

  block: false,
  intrinsic: () => ({ w: SIZE, h: SIZE }),
  render: (_node, box) => {
    // A bordered frame plus a single diagonal stroke reads as a generic glyph
    // placeholder without implying any particular icon.
    return rrect(box.x, box.y, box.w, box.h, { stroke: COLORS.muted })
      + rline(box.x, box.y + box.h, box.x + box.w, box.y, { stroke: COLORS.muted, strokeWidth: 1 });
  },
};
