// @ts-check
import { rrect, rline, COLORS } from '../draw.js';

/** Side length of the square toggle (px). */
const SIZE = 18;

/**
 * Checkbox -- a toggle box; `checked` is a boolean flag. (SPEC ss.5.4)
 *
 * Strategy (leaf): a fixed SIZE x SIZE square that keeps its own size inside a
 * row (not `block`, so it doesn't stretch to the cross axis like Typography).
 * When `checked`, two strokes draw a tick inside the box.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Checkbox',
  tier: 'v0.1',
  category: 'inputs',
  props: {
    checked: { type: 'boolean' },
  },

  block: false,
  intrinsic: () => ({ w: SIZE, h: SIZE }),
  render: (node, box) => {
    let out = rrect(box.x, box.y, box.w, box.h);
    if (node.props.checked) {
      // A check mark: down-stroke into the box, then up-stroke to the corner.
      const x1 = box.x + box.w * 0.22;
      const y1 = box.y + box.h * 0.52;
      const x2 = box.x + box.w * 0.42;
      const y2 = box.y + box.h * 0.74;
      const x3 = box.x + box.w * 0.80;
      const y3 = box.y + box.h * 0.28;
      const opts = { stroke: COLORS.ink, strokeWidth: 1.6 };
      out += rline(x1, y1, x2, y2, opts) + rline(x2, y2, x3, y3, opts);
    }
    return out;
  },
};
