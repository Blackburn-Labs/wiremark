// @ts-check
import { FILLER_STYLES } from './common.js';
import { text, rline, COLORS } from '../draw.js';
import { textIntrinsic, textOf, fontSizeOf } from '../metrics.js';

/**
 * Link -- inline navigation text. Keyless text is the label; the keyless `variant`
 * scales the font off the shared Typography scale; `to=#id`/`href=#id` points at a
 * frame. Filler default "link". (SPEC ss.5.4)
 *
 * Reference strategy (inline text leaf): not `block`, so it sizes to its label
 * rather than stretching the container's cross axis; intrinsic is the bare label
 * with no padding. Draws the label on its baseline plus an underline just below
 * to read as a hyperlink, unless `underline=none`. The clickable `to=#id` anchor
 * is the facade's job, so this element only draws the visible underlined text.
 *
 * `variant` defaults to `inherit`, which isn't a key in the Typography scale, so
 * `fontSizeOf` naturally falls back to the inherited base size -- no extra wiring.
 * `to`/`href` aren't declared here: the universal `to` (with `href` alias) the
 * registry injects already covers nav (CONVENTION ss.7).
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Link',
  tier: 'v0.1',
  category: 'navigation',
  text: true,
  props: {
    label: { type: 'string' },
    underline: { type: 'enum', values: ['none', 'hover', 'always'], default: 'always' },
    variant: {
      type: 'enum',
      values: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6',
               'subtitle1', 'subtitle2', 'body1', 'body2',
               'caption', 'overline', 'button'],
      default: 'inherit',
    },
    filler: { type: 'enum', values: FILLER_STYLES },
  },
  keyless: [{ kind: 'literal', to: 'label' }, { kind: 'enum', to: 'variant' }],
  notes: 'Filler default "link". variant shares the Typography scale; underline=none suppresses the rule.',

  block: false,
  intrinsic: (node) => textIntrinsic(node, { fallback: 'link' }),
  render: (node, box) => {
    const fs = fontSizeOf(node);
    const label = textOf(node, 'link');
    const glyph = text(box.x, box.y + fs, label, { fontSize: fs, fill: COLORS.ink, maxW: box.w });
    if ((node.props.underline ?? 'always') === 'none') return glyph;
    return glyph
      + rline(box.x, box.y + fs + 2, box.x + box.w, box.y + fs + 2, { stroke: COLORS.ink, strokeWidth: 1 });
  },
};
