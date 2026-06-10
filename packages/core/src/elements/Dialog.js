// @ts-check
import { surface, elevationShadow, COLORS } from '../draw.js';
import { SPACING } from '../metrics.js';

/**
 * Dialog -- a modal surface that floats above the page. (SPEC: MUI Feedback
 * surface, v1.0.)
 *
 * Honest-wireframe note: this engine has no overlay / z-axis / scrim layer, so a
 * Dialog cannot literally float over the rest of the frame. It is rendered the
 * only way it can be drawn truthfully in a static flexbox-lite layout -- as a
 * heavily-ELEVATED paper surface IN FLOW (a bordered, filled box lifted off the
 * page by a deliberately large `elevationShadow`, far deeper than a Card's, so it
 * reads as "the thing on top" even without a real backdrop). It stacks its
 * children in a padded column like a dialog body.
 *
 * The single spec prop is `size` (keyless enum, MUI `maxWidth`), which sets the
 * dialog's WIDTH:
 *  - `content` (default) -- the dialog sizes to its children (MUI `maxWidth=false`),
 *    floored to a small sheet width so an empty content-dialog still reads as one.
 *  - `xs | sm | md | lg | lx` -- breakpoint floors: each pins a strictly larger
 *    minimum width, so a bigger breakpoint is a wider dialog regardless of content.
 *    The floor only grows the box; content past it still expands the dialog.
 *  - `fullScreen` -- fills the frame: `block` stretches the cross (width) axis to
 *    the full frame width, and the breakpoint floor is dropped so nothing fights
 *    the stretch. (The engine has no way to also stretch the main/height axis from
 *    a prop, so a fullScreen dialog is full-width but content-height -- the honest
 *    limit of a static layout; documented rather than faked.)
 *
 * The per-`size` width is expressed as a `minSize` FUNCTION of the node, mirroring
 * how `block` may be a predicate `(node) => bool`; the layout facade resolves a
 * function `minSize` the same way (architect ruling, this migration).
 *
 * @type {import('./common.js').ComponentDef}
 */

/** MUI `maxWidth` breakpoint -> dialog minimum width (px). `content` floors to a
 *  small sheet width so an empty content-dialog still reads as a dialog; each
 *  breakpoint floors progressively wider. `fullScreen` is handled by `block`. */
const BREAKPOINT_W = { content: 280, xs: 360, sm: 480, md: 640, lg: 800, lx: 960 };

/** A minimum height so an empty dialog still draws as a visible sheet. */
const MIN_H = 80;

/** @param {import('./common.js').ResolvedNode} node @returns {string} */
const sizeOf = (node) => node.props.size ?? 'content';

/** A fullScreen dialog fills the frame width (stretches the cross axis). */
const isFullScreen = (node) => sizeOf(node) === 'fullScreen';

export default {
  name: 'Dialog',
  tier: 'v1.0',
  category: 'feedback',
  container: true,
  props: {
    size: {
      type: 'enum',
      values: ['fullScreen', 'content', 'xs', 'sm', 'md', 'lg', 'lx'],
      default: 'content',
    },
  },
  keyless: [{ kind: 'enum', to: 'size' }],
  notes: 'Elevated in-flow surface (no overlay layer); size sets the width via a per-breakpoint min-width floor, fullScreen stretches to full frame width.',

  // A dialog body: stack children in a padded column.
  layoutSpec: () => ({ axis: 'col', pad: SPACING * 2, gap: SPACING }),

  // fullScreen fills the frame width; every other size keeps its own dialog width
  // (content-driven, floored per breakpoint by minSize below).
  block: (node) => isFullScreen(node),

  // Per-`size` minimum size (a function of the node, mirroring how `block` may be a
  // predicate): a breakpoint floors the width so the dialog reads at that size even
  // when its content is narrower; `content`/`fullScreen` carry only the height floor.
  minSize: (node) => ({ w: BREAKPOINT_W[sizeOf(node)] ?? 0, h: MIN_H }),

  // A deep elevation shadow lifts the paper well off the page (much higher than a
  // Card's elevation 1), then the bordered white paper of the dialog itself.
  render: (_node, box) =>
    elevationShadow(box, 8) + surface(box, { fill: COLORS.paper }),
};
