// @ts-check
import { rellipse, rrect, centeredLabel, drawIcon } from '../draw.js';
import { measureText } from '../metrics.js';

/**
 * Fab -- a floating action button: a circular (or extended pill) action chrome
 * with an icon, the high-emphasis primary action of a screen. Keyless text is
 * the `icon` NAME (icon-typed, so a bare `Fab edit` reads the same as
 * `Fab "edit"` -- tasks/ICONS.md ss.3); two keyless enums, `variant` and
 * `size`, have disjoint value domains (CONVENTION s.2.1) so
 * `Fab "edit" extended large` parses in any order. `to=#id` / `href=#id` make
 * it navigate (universal `to`, s.7). (SPEC ss.5.4)
 *
 * Reference strategy (fixed leaf): `block:false`, so a Fab keeps its intrinsic
 * footprint wherever it sits rather than stretching the container cross axis.
 * The two props each change REAL geometry:
 *  - `size` scales the diameter (small < medium < large) -- read from SIZES by
 *    both `intrinsic` and `render` so the drawn circle can't drift from the box.
 *  - `variant=circular` (default) -> a true circle (w === h === diameter), the
 *    icon centered. `extended` -> a pill (w > h): the diameter is the height,
 *    and the box grows horizontally to seat a small icon plus the icon name as
 *    a label, measured at the size's font so the box tracks the text.
 *
 * The icon slot draws through `drawIcon` (resolve-time annotation onto
 * `node.icons`, tasks/ICONS.md ss.3): a known name renders clean vectors, an
 * unknown or unset one the classic placeholder glyph -- same box either way.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Per-size circle diameter + label font (px); medium is the default. */
const SIZES = {
  small: { diameter: 40, fontSize: 13 },
  medium: { diameter: 56, fontSize: 14 },
  large: { diameter: 72, fontSize: 16 },
};

/** Glyph extent as a fraction of the diameter, and its gap to the label (px). */
const GLYPH_RATIO = 0.4;
const GLYPH_GAP = 8;
/** Horizontal padding inside an extended pill, beyond the glyph + label. */
const EXT_PAD = 10;

/** @param {import('./common.js').ResolvedNode} node */
const sizeOf = (node) => SIZES[node.props.size] ?? SIZES.medium;
/** The icon NAME an extended Fab prints as its label; an 'action' fallback when unset. */
const iconOf = (node) => (typeof node.props.icon === 'string' ? node.props.icon : 'action');

export default {
  name: 'Fab',
  tier: 'v1.0',
  category: 'inputs',
  props: {
    icon: { type: 'icon' },
    variant: { type: 'enum', values: ['circular', 'extended'], default: 'circular' },
    size: { type: 'enum', values: ['small', 'medium', 'large'], default: 'medium' },
    // href/to are the universal nav prop (CONVENTION s.7) -- not redeclared here.
  },
  keyless: [
    { kind: 'literal', to: 'icon' },
    { kind: 'enum', to: 'variant' },
    { kind: 'enum', to: 'size' },
  ],
  notes: 'circular = true circle; extended = pill with the icon name as a label.',

  block: false,
  intrinsic: (node) => {
    const { diameter, fontSize } = sizeOf(node);
    if (node.props.variant !== 'extended') return { w: diameter, h: diameter };
    // Extended: a pill whose height is the diameter and whose width seats the
    // glyph + gap + the icon-name label, measured at the size's drawn font so
    // the box tracks the text rather than a ghost.
    const glyph = diameter * GLYPH_RATIO;
    const label = measureText(iconOf(node), fontSize).w;
    return { w: EXT_PAD + glyph + GLYPH_GAP + label + EXT_PAD, h: diameter };
  },
  render: (node, box) => {
    const { fontSize } = sizeOf(node);
    const glyph = box.h * GLYPH_RATIO;

    if (node.props.variant !== 'extended') {
      // Circular: a true circle filling the (square) box, with the icon
      // centered inside it (real vectors or the placeholder, via drawIcon).
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      return rellipse(cx, cy, box.w, box.h) + drawIcon(node, 'icon', cx - glyph / 2, cy - glyph / 2, glyph);
    }

    // Extended: a rounded-rect pill chrome, the icon at the left, the icon name
    // as a label filling the rest. A large corner radius reads as a stadium.
    const gx = box.x + EXT_PAD;
    const gy = box.y + (box.h - glyph) / 2;
    const out = rrect(box.x, box.y, box.w, box.h) + drawIcon(node, 'icon', gx, gy, glyph);
    // Center the label in the space to the RIGHT of the glyph (keeps the glyph
    // and text optically balanced inside the pill).
    const labelX = gx + glyph + GLYPH_GAP;
    const labelBox = { x: labelX, y: box.y, w: box.x + box.w - EXT_PAD - labelX, h: box.h };
    return out + centeredLabel(labelBox, iconOf(node), { fontSize, weight: 600 });
  },
};
