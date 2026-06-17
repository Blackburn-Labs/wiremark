// @ts-check
import { surface, elevationShadow, COLORS } from '../draw.js';
import { anchorRect } from './common.js';
import { SPACING } from '../metrics.js';

/**
 * Dialog -- a modal surface that floats above the page. (SPEC: MUI Feedback
 * surface, v1.0.)
 *
 * A TRUE OVERLAY (the engine's out-of-flow layer -- see common.js's `overlay`
 * contract). A Dialog consumes NO space in its parent's flow: its siblings lay
 * out as if it weren't there, and the frame paints the Dialog LAST, on top of all
 * in-flow content (even siblings declared after it), so it reads as a real modal.
 * The opaque paper sheet plus a faint backdrop scrim mean the content underneath
 * never shows through.
 *
 * Two keyless enums, with DISJOINT value sets so both stay keyless (CONVENTION
 * s.2.1):
 *
 * `position` (where the sheet sits within its PARENT box -- the whole frame at the
 * frame root, or an enclosing Box when nested):
 *  - `center` (default), `top`, `bottom`, `left`, `right`,
 *    `topLeft`, `topRight`, `bottomLeft`, `bottomRight`.
 *  The default is applied by the strategy (the resolver injects no defaults, s.6).
 *  The sheet is CAPPED to its parent box (a modal never spills past its container,
 *  matching how MUI caps a Dialog to the viewport): content or a breakpoint floor
 *  wider than the parent is clamped to the parent extent, then anchored.
 *
 * `size` (MUI `maxWidth` -- the sheet's WIDTH):
 *  - `content` (default) -- sizes to children, floored to a small sheet width so an
 *    empty content-dialog still reads as one.
 *  - `xs | sm | md | lg | lx` -- breakpoint floors, each strictly wider; the floor
 *    only grows the box, content past it still expands the sheet.
 *  - `fullScreen` -- fills the parent box on BOTH axes (overlayPlacement stretches
 *    the measured sheet to the parent content rect); the breakpoint floor is
 *    dropped. fullScreen ignores `position` (it fills the whole parent).
 *
 * The per-`size` width floor is a `minSize` FUNCTION of the node (mirroring how
 * `block`/`overlay` may be predicates); the placement is an `overlayPlacement`
 * hook that maps `position` to a 9-way anchor within the parent content rect.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** MUI `maxWidth` breakpoint -> dialog minimum width (px). `content` floors to a
 *  small sheet width so an empty content-dialog still reads as a dialog; each
 *  breakpoint floors progressively wider. `fullScreen` has no key here -- its floor
 *  is dropped (0) because overlayPlacement stretches it to fill the parent. */
const BREAKPOINT_W = { content: 280, xs: 360, sm: 480, md: 640, lg: 800, lx: 960 };

/** A minimum height so an empty dialog still draws as a visible sheet. */
const MIN_H = 80;

/** Elevation depth of the floating sheet -- far higher than a Card's (1) so it
 *  reads as "the thing on top" even alongside the scrim. */
const ELEVATION = 8;

/** Backdrop scrim opacity over the parent content box -- faint, just enough to
 *  read as a modal dimming the page (deterministic, no blur). */
const SCRIM_OPACITY = 0.12;

/** `position` enum value -> the {h, v} anchor `anchorRect` (common.js) takes.
 *  The nine values are every (h, v) pair over {start, center, end} -- the four
 *  corners, the four edge-centers, and center. (fullScreen is handled separately,
 *  as {stretch, stretch}.) @type {Record<string, import('./common.js').Anchor>} */
const ANCHORS = {
  center: { h: 'center', v: 'center' },
  top: { h: 'center', v: 'start' },
  bottom: { h: 'center', v: 'end' },
  left: { h: 'start', v: 'center' },
  right: { h: 'end', v: 'center' },
  topLeft: { h: 'start', v: 'start' },
  topRight: { h: 'end', v: 'start' },
  bottomLeft: { h: 'start', v: 'end' },
  bottomRight: { h: 'end', v: 'end' },
};

/** @param {import('./common.js').ResolvedNode} node @returns {string} */
const sizeOf = (node) => node.props.size ?? 'content';

/** @param {import('./common.js').ResolvedNode} node @returns {boolean} */
const isFullScreen = (node) => sizeOf(node) === 'fullScreen';

/** @param {import('./common.js').ResolvedNode} node @returns {string} */
const positionOf = (node) => node.props.position ?? 'center';

export default {
  name: 'Dialog',
  tier: 'v1.0',
  category: 'feedback',
  container: true,
  props: {
    position: {
      type: 'enum',
      values: ['center', 'top', 'bottom', 'left', 'right', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight'],
      default: 'center',
    },
    size: {
      type: 'enum',
      values: ['fullScreen', 'content', 'xs', 'sm', 'md', 'lg', 'lx'],
      default: 'content',
    },
  },
  keyless: [
    { kind: 'enum', to: 'position' },
    { kind: 'enum', to: 'size' },
  ],
  notes: 'True overlay (out of flow, paints frame-last over an opaque paper sheet + scrim). position is a 9-way anchor within the parent (center default); size sets the width via a per-breakpoint floor, fullScreen fills the parent.',

  // OUT OF FLOW: the parent excludes the Dialog from its size + flex, and the frame
  // paints it last. Placement (below) positions it parent-relative.
  overlay: true,

  // A dialog body: stack children in a padded column.
  layoutSpec: () => ({ axis: 'col', pad: SPACING * 2, gap: SPACING }),

  // Per-`size` minimum size (a function of the node): a breakpoint floors the width
  // so the dialog reads at that size even when its content is narrower;
  // `content` floors to a small sheet; `fullScreen` drops the width floor (0) since
  // overlayPlacement stretches it to the parent. Every size carries the height floor.
  minSize: (node) => ({ w: BREAKPOINT_W[sizeOf(node)] ?? 0, h: MIN_H }),

  // Place the measured sheet within the parent content rect via the shared
  // anchorRect helper. fullScreen STRETCHES both axes (fills the parent, ignoring
  // position) -- in a degenerate (collapsed) parent it therefore fills ~0, the
  // honest consequence of "fill a parent with no area" (CONVENTION Ruling 2.8).
  // Every other size is CAPPED to the parent extent (a modal never spills past its
  // container -- MUI caps a Dialog to the viewport; the breakpoint floor is a
  // minimum, the parent extent a maximum, so a floor wider than a small parent
  // loses to the parent), then seated at its 9-way `position` anchor. The cap is
  // ONLY applied on an axis whose parent extent is POSITIVE: a collapsed parent
  // (an overlay-only Box, ~0 extent) must NOT shrink a content/breakpoint sheet to
  // nothing -- it keeps its measured size, merely MISpositioned at the degenerate
  // origin (Ruling 2.7 guard: ugly but visible, never invisible). The returned rect
  // is final (the engine does not re-measure), so the fill/cap is exact.
  overlayPlacement: (node, parent, measured) => {
    if (isFullScreen(node)) return anchorRect(parent, measured, { h: 'stretch', v: 'stretch' });
    const cap = (m, p) => (p > 0 ? Math.min(m, p) : m); // never clamp to a collapsed (~0) parent
    const size = { w: cap(measured.w, parent.w), h: cap(measured.h, parent.h) };
    return anchorRect(parent, size, ANCHORS[positionOf(node)] ?? ANCHORS.center);
  },

  // A faint scrim over the whole parent (the modal backdrop, drawn from the parent
  // rect annotated at layout time), then the deep elevation shadow, then the opaque
  // bordered paper sheet -- so nothing underneath shows through.
  render: (node, box) => {
    const parent = node.overlayParent;
    const scrim = parent
      ? `<g opacity="${SCRIM_OPACITY}">${surface(parent, { fill: COLORS.muted, stroke: 'none' })}</g>`
      : '';
    return scrim + elevationShadow(box, ELEVATION) + surface(box, { fill: COLORS.paper });
  },
};
