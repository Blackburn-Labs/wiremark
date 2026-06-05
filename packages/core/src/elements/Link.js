// @ts-check
import { FILLER_STYLES } from './common.js';
import { text, rline, COLORS } from '../draw.js';
import { textIntrinsic, textOf, fontSizeOf } from '../metrics.js';

/**
 * Link -- inline navigation text. Keyless text is the label; `to=#id` points at
 * a frame. Filler default "link". (SPEC ss.5.4)
 *
 * Reference strategy (inline text leaf): not `block`, so it sizes to its label
 * rather than stretching the container's cross axis; intrinsic is the bare label
 * with no padding. Draws the label on its baseline plus an underline just below
 * to read as a hyperlink. The clickable `to=#id` anchor is the facade's job, so
 * this element only draws the visible underlined text.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Link',
  tier: 'v0.1',
  category: 'navigation',
  text: true,
  props: {
    filler: { type: 'enum', values: FILLER_STYLES },
  },
  keyless: [{ kind: 'literal', to: 'label' }],
  notes: 'Filler default "link".',

  block: false,
  intrinsic: (node) => textIntrinsic(node, { fallback: 'link' }),
  render: (node, box) => {
    const fs = fontSizeOf(node);
    const label = textOf(node, 'link');
    return text(box.x, box.y + fs, label, { fontSize: fs, fill: COLORS.ink })
      + rline(box.x, box.y + fs + 2, box.x + box.w, box.y + fs + 2, { stroke: COLORS.ink, strokeWidth: 1 });
  },
};
