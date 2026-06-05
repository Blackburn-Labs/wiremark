// @ts-check
import { rrect, rellipse, COLORS } from '../draw.js';

/**
 * Switch -- an on/off toggle; `checked` is a boolean flag. (SPEC ss.5.4)
 *
 * Strategy (input leaf): a fixed-size pill track with a round knob. The track
 * fills with `accent` when checked; the knob sits LEFT when off and RIGHT when
 * on. `block: false` so the pill keeps its intrinsic size instead of stretching
 * to the container's cross axis.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Track footprint (px) -- a small, fixed pill regardless of context. */
const W = 36;
const H = 20;

export default {
  name: 'Switch',
  tier: 'v0.1',
  category: 'inputs',
  props: {
    checked: { type: 'boolean' },
  },

  block: false,
  intrinsic: () => ({ w: W, h: H }),
  render: (node, box) => {
    const checked = node.props.checked === true;
    const track = rrect(box.x, box.y, box.w, box.h, {
      fill: checked ? COLORS.accent : 'none',
      fillStyle: 'solid',
    });
    const d = box.h - 4;            // knob diameter, 2px inset top & bottom
    const r = d / 2;
    const cy = box.y + box.h / 2;
    const cx = checked ? box.x + box.w - 2 - r : box.x + 2 + r;
    return track + rellipse(cx, cy, d, d);
  },
};
