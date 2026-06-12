// @ts-check
import { rroundrect, COLORS } from '../draw.js';

/**
 * Scrollbar -- a slim scrollbar strip, drawn wherever it is placed in the flow.
 * (SPEC: a wireframe affordance, v1.0.)
 *
 * An ordinary IN-FLOW leaf (NOT an overlay): it occupies real layout space like
 * any other element, so the author positions it themselves. As a `block` leaf it
 * stretches its CROSS axis to its container's cross extent -- so place a vertical
 * Scrollbar as the last child of a full-height ROW (its height fills the row and it
 * hugs the right edge at THICKNESS wide), and a horizontal one as the last child of
 * a COLUMN (its width fills the column, hugging the bottom at THICKNESS tall).
 * Sizing that container to the viewport is the author's job -- the element never
 * auto-anchors.
 *
 * LIMITATION (by design, not a bug): the strip stretches along the container's
 * CROSS axis ONLY -- exactly like Divider/Progress, a block leaf cannot grow along
 * the parent's MAIN axis (there is no flex-grow for leaves, and a leaf cannot see
 * its parent's axis). So the supported pairing is `vertical` -> ROW and
 * `horizontal` -> COLUMN. Placed AGAINST the grain (a vertical Scrollbar in a
 * column, or a horizontal one in a row) it stretches its SHORT axis instead and
 * reads as the WRONG silhouette (a vertical-in-column comes out wide-and-short).
 * That is the honest limit of the in-flow leaf model -- it CANNOT be fixed from
 * inside `render` (which only sees its own box, never the parent axis); a real fix
 * would need an engine flex-grow capability. The carve-out test pins this so it
 * reads as intent, not a defect.
 *
 * Strategy (leaf): a faint TRACK with a hand-drawn rounded THUMB.
 *  - `orientation` (keyless enum, default `vertical`) -- `vertical` is a narrow
 *    vertical strip whose thumb travels top..bottom; `horizontal` is a short
 *    horizontal strip whose thumb travels left..right.
 *  - `scrolled` (keyless number, default 0) -- how far the content is scrolled, as a
 *    percent 0..100. 0 seats the thumb at the start (top / left), 100 at the end
 *    (bottom / right). Clamped to [0,100] (out-of-range degrades, never throws).
 *  - `thumb` (keyed number, default 30) -- the thumb's length as a percent of the
 *    track's LONG axis; a proxy for "how much of the content is visible". Clamped to
 *    [0,100] and floored to a minimum pixel length so it always reads as a grabbable
 *    control, even in a long track with a tiny percentage.
 *
 * The thumb position is derived purely from geometry, so the SVG is deterministic.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Strip thickness (px) on the SHORT axis: a slim band, like a desktop scrollbar. */
const THICKNESS = 12;

/** Minimum length (px) on the LONG axis so an unstretched Scrollbar still reads. */
const MIN_LEN = 48;

/** Default thumb length, as a percent of the track's long axis. */
const DEFAULT_THUMB = 30;

/** Smallest thumb the eye still reads as a control, in px (a floor under `thumb%`). */
const MIN_THUMB_LEN = 16;

/** Inset (px) of the thumb inside the track on each side, so it reads as nested. */
const THUMB_INSET = 2;

/** Corner radius (px) for the track and thumb pills. */
const RADIUS = 6;

/** True for the horizontal orientation; everything else is the default vertical strip. */
const isHorizontal = (/** @type {import('./common.js').ResolvedNode} */ node) =>
  node.props.orientation === 'horizontal';

/** Clamp `n` to [lo, hi], falling back to `fallback` when it is not finite. */
const clamp = (/** @type {*} */ n, /** @type {number} */ lo, /** @type {number} */ hi, /** @type {number} */ fallback) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : fallback;
};

/**
 * The thumb's absolute rect within the Scrollbar's `box`. Pure and exported so the
 * geometry (clamping + the scrolled-to-position mapping) can be asserted directly,
 * not by parsing SVG. The thumb spans the SHORT axis (inset on each side) and is
 * `thumb`% of the LONG axis -- floored to MIN_THUMB_LEN so it never collapses,
 * capped to the track length -- seated along the leftover track by `scrolled`%
 * (0 -> start, 100 -> end). Both inputs are clamped to [0,100]; non-finite inputs
 * fall back to their defaults. Works in either orientation: the long axis is the
 * box's height (vertical) or width (horizontal).
 * @param {import('../layout.js').Box} box  the laid-out Scrollbar box
 * @param {import('./common.js').ResolvedNode} node
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
export function thumbGeometry(box, node) {
  const scrolled = clamp(node.props.scrolled, 0, 100, 0);
  const thumbPct = clamp(node.props.thumb, 0, 100, DEFAULT_THUMB);
  const horiz = isHorizontal(node);

  const longLen = horiz ? box.w : box.h;        // travel axis extent
  const shortLen = horiz ? box.h : box.w;        // thickness axis extent
  const len = Math.min(longLen, Math.max(MIN_THUMB_LEN, (thumbPct / 100) * longLen));
  const offset = (scrolled / 100) * Math.max(0, longLen - len); // position along the long axis
  const thick = Math.max(1, shortLen - 2 * THUMB_INSET);

  return horiz
    ? { x: box.x + offset, y: box.y + THUMB_INSET, w: len, h: thick }
    : { x: box.x + THUMB_INSET, y: box.y + offset, w: thick, h: len };
}

export default {
  name: 'Scrollbar',
  tier: 'v1.0',
  category: 'layout',
  props: {
    orientation: { type: 'enum', values: ['vertical', 'horizontal'], default: 'vertical' },
    scrolled: { type: 'number', default: 0 },
    thumb: { type: 'number', default: DEFAULT_THUMB },
  },
  // `orientation` is the keyless enum; `scrolled` is the one keyless number
  // (CONVENTION s.4), like Progress's value -- disjoint, so `Scrollbar horizontal
  // 60` parses in any order. `thumb` stays keyed (`thumb=40`).
  keyless: [
    { kind: 'enum', to: 'orientation' },
    { kind: 'number', to: 'scrolled' },
  ],
  notes: 'In-flow scrollbar strip; keyless orientation (vertical default) + scrolled% (0=start), keyed thumb% size. Place vertical in a ROW, horizontal in a COLUMN: it stretches the container cross axis only (a block leaf cannot grow the main axis), so against-the-grain placement reads as the wrong silhouette.',

  // A block leaf: stretch the LONG axis to the container's cross extent (like a
  // Divider/Progress bar). The short axis stays at THICKNESS via intrinsic.
  block: true,
  intrinsic: (node) =>
    (isHorizontal(node) ? { w: MIN_LEN, h: THICKNESS } : { w: THICKNESS, h: MIN_LEN }),

  render: (node, box) => {
    // Track: a faint pill along the whole strip so it reads as the rail, not a
    // hard border.
    const track = rroundrect(box.x, box.y, box.w, box.h, Math.min(RADIUS, box.w / 2, box.h / 2), {
      stroke: COLORS.muted,
      strokeWidth: 1,
    });
    // Thumb: the grabbable control, inset within the track and filled (muted) so it
    // reads over the rail. Geometry (clamping + scrolled-to-position) is the shared
    // pure helper, so what the test asserts is exactly what is drawn.
    const t = thumbGeometry(box, node);
    const thumb = rroundrect(t.x, t.y, t.w, t.h, Math.min(RADIUS, t.w / 2, t.h / 2), {
      fill: COLORS.muted,
      fillStyle: 'solid',
      stroke: COLORS.ink,
      strokeWidth: 1.2,
    });
    return track + thumb;
  },
};
