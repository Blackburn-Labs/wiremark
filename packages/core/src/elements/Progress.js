// @ts-check
import { rrect, rline, rellipse, COLORS } from '../draw.js';

/**
 * Progress -- a determinate progress indicator whose filled portion reflects
 * `value` along the `min`..`max` range (SPEC ss.5.4 feedback). `value` is a
 * keyless number (aliases n/v/val); `variant` is a keyless enum that picks the
 * SHAPE, and the two values draw structurally different chrome:
 *
 *  - linear (the default form): a thin horizontal BAR. As a `block` leaf the bar
 *    stretches to the container's cross axis (its width comes from the parent,
 *    like Divider/Slider); the filled run is a tinted sub-rectangle from the left
 *    edge whose width is the value fraction of the track.
 *  - circular: a FIXED square footprint (does NOT stretch, like Icon/Avatar) with
 *    a hand-drawn ring (`rellipse`); the value fraction is shown as a filled arc
 *    swept clockwise from 12 o'clock, approximated by short chords so it stays a
 *    pure draw.js render with no rough.js access.
 *
 * The resolver injects no defaults, so the strategy applies them: value=0, min=0,
 * max=100. The spec's `variant` default is `indeterminate`, which has no distinct
 * geometry at wireframe fidelity -- an omitted/indeterminate variant draws the
 * linear bar (value=0 => an empty track, the idiomatic "just started" look).
 * `value` is clamped to [min, max]; min==max (or a non-finite range) degrades to
 * an empty fill rather than dividing by zero.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Linear bar thickness (px); also the box's short-axis extent. */
const BAR_H = 8;
/** Minimum bar length (px) so a Progress with no parent stretch still reads. */
const MIN_LEN = 120;
/** Circular ring diameter (px); MUI's default CircularProgress is 40x40. */
const RING = 40;

/** True only for the explicit circular variant; everything else is the linear bar. */
const isCircular = (node) => node.props.variant === 'circular';

/**
 * Filled fraction of the track [0,1], clamped to the [min,max] range. A non-finite
 * or non-positive span (e.g. min==max) degrades to 0 so the fill is empty rather
 * than NaN.
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

/**
 * The filled arc of a circular ring as a sequence of short chords, swept clockwise
 * from 12 o'clock for `frac` of a full turn. Returns '' for an empty fill.
 * @param {number} cx @param {number} cy @param {number} r @param {number} frac
 * @returns {string}
 */
function arc(cx, cy, r, frac) {
  if (frac <= 0) return '';
  const total = frac * 2 * Math.PI;
  const steps = Math.max(2, Math.ceil(frac * 24)); // ~24 chords for a full circle
  const at = (a) => ({ x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) }); // 0 = 12 o'clock, clockwise
  let out = '';
  let prev = at(0);
  for (let i = 1; i <= steps; i++) {
    const p = at((total * i) / steps);
    out += rline(prev.x, prev.y, p.x, p.y, { stroke: COLORS.ink, strokeWidth: 2.5 });
    prev = p;
  }
  return out;
}

export default {
  name: 'Progress',
  tier: 'v1.0',
  category: 'feedback',
  props: {
    variant: { type: 'enum', values: ['linear', 'circular'], default: 'indeterminate' },
    value: { type: 'number', default: 0, aliases: ['n', 'v', 'val'] },
    min: { type: 'number', default: 0 },
    max: { type: 'number', default: 100 },
  },
  keyless: [
    { kind: 'number', to: 'value' },
    { kind: 'enum', to: 'variant' },
  ],
  notes: 'Determinate indicator; keyless value (n/v/val) + variant; min/max bound the range.',

  // Linear stretches to the parent cross axis (a full-width bar); circular keeps a
  // fixed square footprint like Icon/Avatar.
  block: (node) => !isCircular(node),
  intrinsic: (node) => (isCircular(node) ? { w: RING, h: RING } : { w: MIN_LEN, h: BAR_H }),
  render: (node, box) => {
    const frac = fractionOf(node);

    if (isCircular(node)) {
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      const r = Math.min(box.w, box.h) / 2;
      // The full ring (muted) reads as the track; the filled arc (ink) is the value.
      return rellipse(cx, cy, box.w, box.h, { stroke: COLORS.muted, strokeWidth: 2 })
        + arc(cx, cy, r, frac);
    }

    // Linear: the track outline across the full box, then a solid tint from the
    // left whose width is the value fraction (omitted entirely when empty).
    let out = rrect(box.x, box.y, box.w, box.h, { stroke: COLORS.muted, strokeWidth: 1.2 });
    if (frac > 0) {
      out += rrect(box.x, box.y, box.w * frac, box.h,
        { stroke: 'none', fill: COLORS.accent, fillStyle: 'solid' });
    }
    return out;
  },
};
