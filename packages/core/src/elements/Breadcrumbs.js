// @ts-check
import { SPACING, DEFAULT_VARIANT, VARIANT_FONT, measureText } from '../metrics.js';
import { text, COLORS } from '../draw.js';

/**
 * Breadcrumbs -- a horizontal navigation trail (SPEC ss.5.4). Holds its children
 * (typically `Link`/`Typography`) in a row and draws a `separator` glyph between
 * each adjacent pair, e.g. `Home / Library / Data`.
 *
 * Reference strategy (container that draws between its children): the child boxes
 * are placed by the layout facade; this element only paints the chrome BETWEEN
 * them. `layoutSpec` reserves a `gap` sized to the actual separator glyph (plus a
 * spacing unit of breathing room on each side), and `render` reads the placed
 * `box.children` and centers the separator in each gap -- the same honest pattern
 * Stack uses for its `divider` rule. With 0 or 1 child there are no gaps, so the
 * separator never appears spuriously.
 *
 * The separator is a keyless string literal defaulting to `/`. Per-link nav is the
 * children's own `to=#id`; Breadcrumbs itself carries no link chrome (the universal
 * `to` the registry injects still works if an author wraps the whole trail).
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Font size the separator glyph is drawn at -- the inherited body size, matching plain Link/Typography children. */
const SEP_FONT = VARIANT_FONT[DEFAULT_VARIANT];

/** The separator string a node draws, defaulting to `/`. @param {import('../resolve.js').ResolvedNode} node @returns {string} */
function separatorOf(node) {
  const s = node.props.separator;
  return typeof s === 'string' && s.length > 0 ? s : '/';
}

export default {
  name: 'Breadcrumbs',
  tier: 'v1.0',
  category: 'navigation',
  container: true,
  props: {
    separator: { type: 'string', default: '/' },
  },
  keyless: [{ kind: 'literal', to: 'separator' }],
  notes: 'Row trail; keyless string separator (default "/") drawn centered in each inter-child gap.',

  // Reserve a gap wide enough for the separator glyph plus a spacing unit of
  // breathing room on each side, so render can center the glyph honestly in it.
  layoutSpec: (node) => ({
    axis: 'row',
    pad: 0,
    gap: measureText(separatorOf(node), SEP_FONT).w + 2 * SPACING,
  }),

  render: (node, box) => {
    const kids = box.children;
    if (!kids || kids.length < 2) return ''; // no gaps to fill
    const sep = separatorOf(node);
    let out = '';
    // Center the separator in each gap between adjacent children, on the trail's
    // vertical midline, muted so it reads as a divider rather than content.
    for (let i = 0; i < kids.length - 1; i++) {
      const a = kids[i];
      const b = kids[i + 1];
      const cx = (a.x + a.w + b.x) / 2;
      const cy = box.y + box.h / 2 + SEP_FONT * 0.35; // optical baseline, like centeredLabel
      out += text(cx, cy, sep, { fontSize: SEP_FONT, anchor: 'middle', fill: COLORS.muted });
    }
    return out;
  },
};
