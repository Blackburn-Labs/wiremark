// @ts-check
import { surface, backgroundHatch, rellipse, fillerRows, COLORS } from '../draw.js';
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
 *  - rounded:     a CROSS-hatch-tinted bordered rect -- denser fill distinguishes
 *                 it from rectangular (rough.js bakes corners into path geometry,
 *                 so a heavier tint, not a literal radius, marks the rounded box).
 *  - circular:    a hatch-tinted ellipse; `intrinsic` is square so a bare circular
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

    const tint = backgroundHatch(box, variant === 'rounded' ? 'crosshatch' : 'hatch');

    if (variant === 'circular') {
      // Tint clipped visually by the ellipse border; an ellipse (not a rect) is
      // the only border drawn, so circular never emits rect-corner geometry.
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      return tint + rellipse(cx, cy, box.w, box.h, { stroke: COLORS.muted });
    }

    // rectangular (default) + rounded: tint under a muted bordered rect.
    return tint + surface(box, { stroke: COLORS.muted });
  },
};
