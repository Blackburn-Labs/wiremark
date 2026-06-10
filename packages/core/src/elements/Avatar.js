// @ts-check
import { rrect, rellipse, rcrossbox, rline, centeredLabel } from '../draw.js';
import { textOf } from '../metrics.js';

/**
 * Avatar -- a small user/identity token: initials, an image placeholder, or a
 * bare shape. Keyless text is the `label` (the initials, e.g. "RB"); `src=` is
 * the real image source. (SPEC ss.5.4)
 *
 * Reference strategy (fixed leaf): a `SIZE x SIZE` square footprint that does
 * NOT stretch to the container cross axis (`block: false`) -- an avatar keeps its
 * intrinsic size wherever it sits, like Icon. The `variant` keyless enum picks
 * the chrome shape, and the three values draw GENUINELY different silhouettes:
 *  - circular (default): a hand-drawn circle (`rellipse`).
 *  - rounded:            a rectangle with its corners visibly chamfered.
 *  - square:             a plain sharp-cornered rectangle.
 *
 * Content precedence: a real `src=` always draws the crossed-box image
 * placeholder (a wireframe never shows the actual image, same convention as
 * Img); otherwise the `label` initials are centered inside the shape; a bare
 * Avatar with neither draws just the empty shape.
 *
 * `src` is keyed (metadata that flips the chrome to a placeholder); `variant` is
 * a keyless enum; `label` is the one keyless literal (the initials).
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Avatar extent (px); MUI's default avatar is 40x40. */
const SIZE = 40;

/** Font size (px) for the centered initials -- snug inside the 40px shape. */
const LABEL_FONT = 16;

/** Corner chamfer length (px) used to round the `rounded` variant's corners. */
const CHAMFER = 9;

/**
 * Draw the `variant` shape's outline across the full box.
 * @param {string} variant
 * @param {import('../layout.js').Box} box
 * @returns {string}
 */
function shape(variant, box) {
  const { x, y, w, h } = box;
  if (variant === 'square') return rrect(x, y, w, h);
  if (variant === 'rounded') {
    // Chamfer each corner so `rounded` reads distinctly from `square`.
    const c = Math.min(CHAMFER, w / 2, h / 2);
    return rrect(x, y, w, h)
      + rline(x, y + c, x + c, y, { strokeWidth: 1.2 })
      + rline(x + w - c, y, x + w, y + c, { strokeWidth: 1.2 })
      + rline(x + w, y + h - c, x + w - c, y + h, { strokeWidth: 1.2 })
      + rline(x + c, y + h, x, y + h - c, { strokeWidth: 1.2 });
  }
  // circular (default + fallback): a hand-drawn circle filling the box.
  return rellipse(x + w / 2, y + h / 2, w, h);
}

/**
 * The crossed-box image placeholder's two diagonals across `box` (the same pair
 * `rcrossbox` draws, reused so a circular avatar can keep its round outline).
 * @param {import('../layout.js').Box} box
 * @returns {string}
 */
const cross = (box) =>
  rline(box.x, box.y, box.x + box.w, box.y + box.h, { strokeWidth: 1 })
  + rline(box.x + box.w, box.y, box.x, box.y + box.h, { strokeWidth: 1 });

export default {
  name: 'Avatar',
  tier: 'v1.0',
  category: 'content',
  props: {
    variant: { type: 'enum', values: ['circular', 'rounded', 'square'], default: 'circular' },
    src: { type: 'string' },
    label: { type: 'string' },
  },
  keyless: [
    { kind: 'enum', to: 'variant' },
    { kind: 'literal', to: 'label' },
  ],
  notes: 'Initials avatar; src= flips to an image placeholder.',

  block: false,
  intrinsic: () => ({ w: SIZE, h: SIZE }),
  render: (node, box) => {
    const variant = typeof node.props.variant === 'string' ? node.props.variant : 'circular';
    // A real image source -> the crossed-box placeholder INSTEAD of the plain
    // shape, mirroring Img (a wireframe never renders the actual image). A
    // circular avatar keeps its circle outline with the image cross drawn inside;
    // square/rounded use the rectangular crossbox.
    if (typeof node.props.src === 'string') {
      return variant === 'circular'
        ? shape('circular', box) + cross(box)
        : rcrossbox(box.x, box.y, box.w, box.h);
    }
    // No image: the shape, plus the initials if any were given.
    let out = shape(variant, box);
    if (typeof node.props.label === 'string') {
      out += centeredLabel(box, textOf(node, ''), { fontSize: LABEL_FONT });
    }
    return out;
  },
};
