// @ts-check
import { rline, rellipse, COLORS } from '../draw.js';

/**
 * Slider -- a value-selection track with a draggable thumb (SPEC ss.5.4 inputs).
 * `value` (keyless number, aliases n/v/val) positions the thumb along a track that
 * runs from `min` to `max`; `orientation` (keyless enum) flips the track between
 * horizontal (default) and vertical.
 *
 * Strategy (LEAF, block): the track sits on the container's cross axis and the
 * thumb's short dimension is the box's thickness. Like Divider, `block` stretches
 * the long dimension to the parent's cross extent, so the slider fills a column's
 * width (horizontal) or a row's height (vertical); intrinsically it only asks for a
 * minimum length so a lone slider still draws.
 *
 *  - `orientation=horizontal` (default): in a column the cross axis is width, so
 *    block fills the width => a full-width track; the thumb slides left->right with
 *    `value` (min at the left).
 *  - `orientation=vertical`: placed in a row, the cross axis is height, so block
 *    fills the height => a full-height track; the thumb slides bottom->top with
 *    `value` (min at the bottom, the MUI convention).
 *
 * The resolver injects no defaults, so the strategy applies them: value=0, min=0,
 * max=100, orientation=horizontal. `value` is clamped to [min, max] and the thumb
 * position derives from the fraction (min==max degrades to the start, no divide).
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Thumb diameter (px); also the box thickness on the track's short axis. */
const THUMB = 16;
/** Minimum track length (px) so a slider with no parent stretch still reads. */
const MIN_LEN = 120;

/** @param {import('./common.js').ResolvedNode} node @returns {boolean} */
const isVertical = (node) => node.props.orientation === 'vertical';

/**
 * Thumb position as a fraction of the track [0,1], clamped. min==max (or a
 * non-finite range) degrades to 0 so the thumb sits at the start rather than NaN.
 * @param {import('./common.js').ResolvedNode} node @returns {number}
 */
const fractionOf = (node) => {
  const value = Number(node.props.value ?? 0);
  const min = Number(node.props.min ?? 0);
  const max = Number(node.props.max ?? 100);
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0) return 0;
  return Math.max(0, Math.min(1, (value - min) / span));
};

export default {
  name: 'Slider',
  tier: 'v1.0',
  category: 'inputs',
  props: {
    value: { type: 'number', default: 0, aliases: ['n', 'v', 'val'] },
    min: { type: 'number', default: 0 },
    max: { type: 'number', default: 100 },
    orientation: { type: 'enum', values: ['horizontal', 'vertical'], default: 'horizontal' },
  },
  keyless: [
    { kind: 'number', to: 'value' },
    { kind: 'enum', to: 'orientation' },
  ],
  notes: 'Track + thumb; keyless value (n/v/val) and orientation; min/max bound the range.',

  block: true,
  // Thumb-thick on the short axis; a minimum length on the long axis (block fills
  // the long axis from the parent's cross extent).
  intrinsic: (node) => (isVertical(node) ? { w: THUMB, h: MIN_LEN } : { w: MIN_LEN, h: THUMB }),
  render: (node, box) => {
    const r = THUMB / 2;
    const frac = fractionOf(node);
    const trackOpts = { stroke: COLORS.muted, strokeWidth: 2 };
    const thumbOpts = { stroke: COLORS.ink, fill: COLORS.fill, fillStyle: 'solid' };

    if (isVertical(node)) {
      // Track runs vertically at the box's horizontal center; thumb travels between
      // the inset ends, value=min at the BOTTOM (so the fraction maps to upward travel).
      const cx = box.x + box.w / 2;
      const top = box.y + r;
      const bottom = box.y + box.h - r;
      const cy = bottom - frac * (bottom - top);
      return rline(cx, box.y, cx, box.y + box.h, trackOpts)
        + rellipse(cx, cy, THUMB, THUMB, thumbOpts);
    }

    // Track runs horizontally at the box's vertical center; thumb travels between the
    // inset ends, value=min at the LEFT.
    const cy = box.y + box.h / 2;
    const left = box.x + r;
    const right = box.x + box.w - r;
    const cx = left + frac * (right - left);
    return rline(box.x, cy, box.x + box.w, cy, trackOpts)
      + rellipse(cx, cy, THUMB, THUMB, thumbOpts);
  },
};
