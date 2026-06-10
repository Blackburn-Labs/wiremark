// @ts-check
import { rellipse, rline, text, COLORS } from '../draw.js';
import { measureText } from '../metrics.js';

/**
 * Step -- one stage in a Stepper (FAMILIES.md FAMILY 3). A state circle followed
 * by its `label`. Keyless slots:
 *  - `label` (literal) -- the stage name; default "Step".
 *  - `active` (boolean) -- emphasize with a heavier circle stroke.
 *  - `completed` (boolean) -- a filled circle with a check mark.
 * These are three DIFFERENT keyless kinds (one literal + two bare-name boolean
 * flags), so `Step "Address" active` / `Step completed "Cart"` parse in any order
 * (CONVENTION s.2/s.3).
 *
 * Strategy (leaf, `block: false` so it sizes to its content rather than
 * stretching the Stepper's cross axis). The engine gives a child only its own
 * node + box (FAMILIES.md engine fact 1), so a Step cannot know its position:
 * the circle shows a generic dot (or a check when completed), never an
 * auto-incremented "1/2/3". State discrimination is REAL at render:
 *  - completed -> filled circle + a two-stroke check (distinct markup).
 *  - active    -> heavier circle stroke + a centred dot.
 *  - plain     -> light circle stroke + a centred dot.
 *
 * NOTE on the `children:true` slice: implemented as a LEAF (recommended in
 * FAMILIES.md) so it can draw a centred circle + label; child support is dropped.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Circle diameter (px), the gap between circle and label, and the label font. */
const CIRCLE = 22;
const GAP = 8;
const LABEL_FONT = 14;

/** @param {import('./common.js').ResolvedNode} node @returns {string} */
const labelOf = (node) => (typeof node.props.label === 'string' ? node.props.label : 'Step');

export default {
  name: 'Step',
  tier: 'v1.0',
  category: 'navigation',
  props: {
    label: { type: 'string' },
    active: { type: 'boolean', default: false },
    completed: { type: 'boolean', default: false },
  },
  keyless: [
    { kind: 'literal', to: 'label' },
  ],
  notes: 'Implemented as a leaf (slice children:true dropped); cannot auto-number (engine fact 1) so the circle is a dot/check, not an index.',

  block: false,
  intrinsic: (node) => {
    const { w } = measureText(labelOf(node), LABEL_FONT);
    return { w: CIRCLE + GAP + w, h: CIRCLE };
  },
  render: (node, box) => {
    const active = node.props.active === true;
    const completed = node.props.completed === true;

    const cx = box.x + CIRCLE / 2;
    const cy = box.y + box.h / 2;

    let out;
    if (completed) {
      // Filled circle + a two-stroke check -- unmistakably "done".
      out = rellipse(cx, cy, CIRCLE, CIRCLE, { fill: COLORS.fill, fillStyle: 'solid' });
      const x1 = cx - CIRCLE * 0.26;
      const y1 = cy + CIRCLE * 0.02;
      const x2 = cx - CIRCLE * 0.06;
      const y2 = cy + CIRCLE * 0.20;
      const x3 = cx + CIRCLE * 0.28;
      const y3 = cy - CIRCLE * 0.22;
      const opts = { strokeWidth: 1.8 };
      out += rline(x1, y1, x2, y2, opts) + rline(x2, y2, x3, y3, opts);
    } else {
      // active -> a heavier ring; plain -> a normal ring. Both get a centre dot.
      out = rellipse(cx, cy, CIRCLE, CIRCLE, active ? { strokeWidth: 2.6 } : {});
      out += rellipse(cx, cy, CIRCLE * 0.28, CIRCLE * 0.28, { fill: COLORS.ink, fillStyle: 'solid' });
    }

    // Label sits to the right of the circle, left-anchored, vertically centred.
    const lx = box.x + CIRCLE + GAP;
    const ly = box.y + box.h / 2 + LABEL_FONT * 0.35; // optical vertical centring
    out += text(lx, ly, labelOf(node), { fontSize: LABEL_FONT, weight: active || completed ? 600 : 400 });
    return out;
  },
};
