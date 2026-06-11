// @ts-check
import { rrect, rline, rellipse, backgroundHatch, COLORS } from '../draw.js';

/**
 * Progress -- a determinate progress indicator whose filled portion reflects
 * `value` along the `min`..`max` range (SPEC ss.5.4 feedback). `value` is a
 * keyless number (aliases n/v/val); `variant` is a keyless enum that picks the
 * SHAPE, and the two values draw structurally different chrome:
 *
 *  - linear (the default form): a thin horizontal BAR. As a `block` leaf the bar
 *    stretches to the container's cross axis (its width comes from the parent,
 *    like Divider/Slider); the filled run is a crosshatched sub-rectangle from
 *    the left edge whose width is the value fraction of the track (hand-drawn
 *    hashes, never a solid block -- the wireframe tint convention).
 *  - circular: a FIXED square footprint (does NOT stretch, like Icon/Avatar) with
 *    a hand-drawn ring (`rellipse`); the value fraction is shown as a filled arc
 *    swept clockwise from 12 o'clock, approximated by short chords so it stays a
 *    pure draw.js render with no rough.js access.
 *
 * `thickness` is a second keyless enum (disjoint from `variant`, so
 * `Progress linear 50 large` parses in any order) scaling the variant's weight:
 * the bar's height for linear, the ring + arc stroke width for circular (the
 * 40px circular footprint never changes).
 *
 * The resolver injects no defaults, so the strategy applies them: value=0, min=0,
 * max=100, thickness=medium. The spec's `variant` default is `indeterminate`,
 * which has no distinct geometry at wireframe fidelity -- an omitted/
 * indeterminate variant draws the linear bar (value=0 => an empty track, the
 * idiomatic "just started" look). `value` is clamped to [min, max]; min==max
 * (or a non-finite range) degrades to an empty fill rather than dividing by zero.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Linear bar height (px) per `thickness`; also the box's short-axis extent. */
const BAR_H = { small: 5, medium: 8, large: 12 };
/** Minimum bar length (px) so a Progress with no parent stretch still reads. */
const MIN_LEN = 120;
/** Circular ring diameter (px); MUI's default CircularProgress is 40x40. */
const RING = 40;
/** Circular stroke widths (px) per `thickness`: the muted track ring and the
 *  ink value arc (the arc stays a touch heavier so it reads as the fill). */
const RING_STROKE = {
  small: { track: 1.2, arc: 1.5 },
  medium: { track: 2, arc: 2.5 },
  large: { track: 3.2, arc: 4 },
};

/** The `thickness` prop with the strategy-applied default. */
const thicknessOf = (node) => {
  const t = node.props.thickness;
  return t === 'small' || t === 'large' ? t : 'medium';
};

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
 * @param {number} width  stroke width (px) of the chords
 * @returns {string}
 */
function arc(cx, cy, r, frac, width) {
  if (frac <= 0) return '';
  const total = frac * 2 * Math.PI;
  const steps = Math.max(2, Math.ceil(frac * 24)); // ~24 chords for a full circle
  const at = (a) => ({ x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) }); // 0 = 12 o'clock, clockwise
  let out = '';
  let prev = at(0);
  for (let i = 1; i <= steps; i++) {
    const p = at((total * i) / steps);
    out += rline(prev.x, prev.y, p.x, p.y, { stroke: COLORS.ink, strokeWidth: width });
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
    thickness: { type: 'enum', values: ['small', 'medium', 'large'], default: 'medium' },
  },
  keyless: [
    { kind: 'number', to: 'value' },
    { kind: 'enum', to: 'variant' },
    { kind: 'enum', to: 'thickness' },
  ],
  notes: 'Determinate indicator; keyless value (n/v/val) + variant + thickness; min/max bound the range.',

  // Linear stretches to the parent cross axis (a full-width bar); circular keeps a
  // fixed square footprint like Icon/Avatar.
  block: (node) => !isCircular(node),
  intrinsic: (node) =>
    (isCircular(node) ? { w: RING, h: RING } : { w: MIN_LEN, h: BAR_H[thicknessOf(node)] }),
  render: (node, box) => {
    const frac = fractionOf(node);

    if (isCircular(node)) {
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      const r = Math.min(box.w, box.h) / 2;
      const stroke = RING_STROKE[thicknessOf(node)];
      // The full ring (muted) reads as the track; the filled arc (ink) is the value.
      return rellipse(cx, cy, box.w, box.h, { stroke: COLORS.muted, strokeWidth: stroke.track })
        + arc(cx, cy, r, frac, stroke.arc);
    }

    // Linear: a crosshatched run from the left whose width is the value fraction
    // (omitted entirely when empty), under the track outline across the full box
    // (tint first, border after, so the outline keeps its own roughness).
    let out = frac > 0
      ? backgroundHatch({ x: box.x, y: box.y, w: box.w * frac, h: box.h }, 'crosshatch')
      : '';
    return out + rrect(box.x, box.y, box.w, box.h, { stroke: COLORS.muted, strokeWidth: 1.2 });
  },
};
