// @ts-check
import { surface, backgroundHatch, rellipse, rroundrect, fillerRows, COLORS } from '../draw.js';
import { LINE_HEIGHT } from '../metrics.js';

/**
 * Skeleton -- a loading placeholder: the gray, content-less stand-in MUI shows
 * while data is in flight (SPEC: Feedback). A leaf with no label of its own; its
 * only job is to occupy space in the chosen shape.
 *
 * Strategy (sizing leaf): width/height are the positional keyless sizing slots
 * (`Skeleton 200px 24px`, aliases `w`/`h`) consumed by the layout engine via
 * `node.size`; `sizing:true` opts in. `intrinsic` is the natural box used when no
 * px token pins a dimension. The single keyless enum `variant` picks the chrome,
 * and each variant draws assertably different placeholder geometry:
 *  - text:        muted filler lines (no box) -- the stand-in for a line of copy.
 *  - rectangular: a hatch-tinted bordered rect (the default block placeholder).
 *  - rounded:     a CROSS-hatch-tinted rounded rect (a real corner radius via
 *                 `rroundrect`); the denser fill keeps it distinct from
 *                 rectangular at a glance even when the radius is subtle.
 *  - circular:    a hatch-tinted ellipse -- the tint hachures the ellipse itself,
 *                 not its bounding box; `intrinsic` is square so a bare circular
 *                 skeleton is a circle (an explicit non-square px is the author's).
 *
 * `block:false` -- like a real Skeleton it sizes to itself rather than stretching
 * its container's cross axis, so a row of skeletons keeps each one's own width.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Natural placeholder box (px) when no sizing token pins a dimension. */
const BASE = { w: 120, h: 16 };
/** Natural diameter (px) for a bare `circular` skeleton. */
const CIRCLE = 40;
/** Corner radius (px) of the `rounded` variant's box. */
const RADIUS = 6;

/** @param {import('./common.js').ResolvedNode} node */
const variantOf = (node) =>
  typeof node.props.variant === 'string' ? node.props.variant : 'rectangular';

export default {
  name: 'Skeleton',
  tier: 'v1.0',
  category: 'feedback',
  props: {
    variant: {
      type: 'enum',
      values: ['text', 'circular', 'rectangular', 'rounded'],
      default: 'rectangular',
    },
  },
  keyless: [{ kind: 'enum', to: 'variant' }],
  notes: 'Loading placeholder; variant keyless, width/height positional (Skeleton 200px 24px).',

  sizing: true,
  block: false,
  intrinsic: (node) => {
    if (variantOf(node) === 'circular') return { w: CIRCLE, h: CIRCLE };
    return { ...BASE };
  },
  render: (node, box) => {
    const variant = variantOf(node);

    if (variant === 'text') {
      // A run of muted filler lines sized to the box height -- no border/tint, so
      // it reads as ghosted copy rather than a block. At least one line always.
      const lines = Math.max(1, Math.round(box.h / (BASE.h * LINE_HEIGHT)));
      return fillerRows(box.x, box.y, box.w, lines, BASE.h);
    }

    if (variant === 'circular') {
      // The tint hachures the ellipse itself (never the square bounding box),
      // under the muted circle border.
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      return backgroundHatch(box, 'hatch', false, { shape: 'ellipse' })
        + rellipse(cx, cy, box.w, box.h, { stroke: COLORS.muted });
    }

    if (variant === 'rounded') {
      // A real corner radius: cross-hatch clipped to the rounded box, under a
      // matching rounded border.
      return backgroundHatch(box, 'crosshatch', false, { shape: RADIUS })
        + rroundrect(box.x, box.y, box.w, box.h, RADIUS, { stroke: COLORS.muted });
    }

    // rectangular (default): hatch tint under a muted bordered rect.
    return backgroundHatch(box) + surface(box, { stroke: COLORS.muted });
  },
};
