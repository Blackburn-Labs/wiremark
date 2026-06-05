// @ts-check
import { FILLER_STYLES } from './common.js';
import { text, rline, COLORS } from '../draw.js';
import { textOf, fontSizeOf } from '../metrics.js';

/** Fixed height of a single list row (px). */
const ROW_H = 40;

/**
 * ListItem -- a single list row. Keyless text is the label; `to=#id` makes the
 * row navigate. Filler default one line. (SPEC ss.5.4)
 *
 * Reference strategy (full-width row leaf): `block` so every row fills the
 * list's cross axis; fixed-height intrinsic; draws a left-padded, vertically
 * centered label above a faint bottom divider. The `to=` link wrapper is added
 * by the render facade, not here.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'ListItem',
  tier: 'v0.1',
  category: 'content',
  text: true,
  props: {
    filler: { type: 'enum', values: FILLER_STYLES },
  },
  keyless: [{ kind: 'literal', to: 'label' }],
  notes: 'Filler default one line.',

  block: true,
  intrinsic: () => ({ w: 120, h: ROW_H }),
  render: (node, box) => {
    const fs = fontSizeOf(node);
    const label = textOf(node, 'List item');
    return text(box.x + 8, box.y + box.h / 2 + fs * 0.35, label, { fontSize: fs })
      + rline(box.x, box.y + box.h, box.x + box.w, box.y + box.h,
        { stroke: COLORS.muted, strokeWidth: 1 });
  },
};
