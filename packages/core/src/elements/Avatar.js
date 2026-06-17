// @ts-check
import { rrect, rroundrect, rellipse, rline, centeredLabel, backgroundHatch, BACKGROUNDS } from '../draw.js';
import { textOf } from '../metrics.js';

/**
 * Avatar -- a small user/identity token: initials, an image placeholder, or a
 * bare shape. Keyless text is the `label` (the initials, e.g. "RB"); `src=` is
 * the real image source. (SPEC ss.5.4)
 *
 * Reference strategy (fixed leaf): a `d x d` square footprint (the per-`size`
 * diameter) that does NOT stretch to the container cross axis (`block: false`)
 * -- an avatar keeps its intrinsic size wherever it sits, like Icon. The
 * `variant` keyless enum picks the chrome shape, and the three values draw
 * GENUINELY different silhouettes:
 *  - circular (default): a hand-drawn circle (`rellipse`).
 *  - rounded:            a rounded rectangle (`rroundrect`).
 *  - square:             a plain sharp-cornered rectangle.
 *
 * `size` (`small`/`medium`/`large`, keyless enum, disjoint from `variant` and
 * `background` per CONVENTION s.2.1) scales the square diameter, the initials
 * font, and the `rounded` corner radius together (read from SIZES by both
 * `intrinsic` and `render` so they can't drift).
 *
 * `background`/`denseBackground` (like Chip) tint the avatar: when `background`
 * is set the shape fills with a hand-drawn hatch over an OPAQUE paper base
 * (`base: true`, CONVENTION s.8 -- Avatar is an (A) surface, so content behind
 * it never bleeds through the hash gaps). The base + hatch are shape-matched to
 * the variant via `backgroundHatch`'s `shape` (circular -> ellipse, rounded ->
 * the corner radius, square -> plain rect) so a tinted circular avatar is an
 * opaque disc, not a hatched square peeking past the circle outline (Ruling 4).
 *
 * Content precedence: a real `src=` always draws the crossed-box image
 * placeholder (a wireframe never shows the actual image, same convention as
 * Img); otherwise the `label` initials are centered inside the shape; a bare
 * Avatar with neither draws just the empty shape.
 *
 * `src` is keyed (metadata that flips the chrome to a placeholder); `variant`,
 * `size` and `background` are keyless enums; `label` is the one keyless literal.
 *
 * @type {import('./common.js').ComponentDef}
 */

/**
 * Per-size avatar metrics (px). `medium` is MUI's default 40x40 avatar; the
 * initials font and the `rounded` corner radius scale with the diameter so a
 * large avatar reads as proportionally rounded, not barely.
 */
const SIZES = {
  small: { diameter: 32, font: 13, radius: 7 },
  medium: { diameter: 40, font: 16, radius: 9 },
  large: { diameter: 56, font: 22, radius: 12 },
};

/** @param {import('./common.js').ResolvedNode} node @returns {{diameter:number,font:number,radius:number}} */
const sizeOf = (node) => SIZES[node.props.size] ?? SIZES.medium;

/**
 * Draw the `variant` shape's outline across the full box.
 * @param {string} variant
 * @param {import('../layout.js').Box} box
 * @param {number} radius  the `rounded` corner radius for this size
 * @returns {string}
 */
function shape(variant, box, radius) {
  const { x, y, w, h } = box;
  if (variant === 'square') return rrect(x, y, w, h);
  if (variant === 'rounded') return rroundrect(x, y, w, h, radius);
  // circular (default + fallback): a hand-drawn circle filling the box.
  return rellipse(x + w / 2, y + h / 2, w, h);
}

/**
 * The `backgroundHatch` shape that matches `variant`'s silhouette, so the opaque
 * base + hatch trace the same outline as the chrome (Ruling 4). circular ->
 * `'ellipse'`, rounded -> the numeric corner radius, square -> undefined (rect).
 * @param {string} variant
 * @param {number} radius
 * @returns {'ellipse'|number|undefined}
 */
function hatchShapeFor(variant, radius) {
  if (variant === 'square') return undefined;
  if (variant === 'rounded') return radius;
  return 'ellipse';
}

/**
 * The crossed-box image placeholder's two diagonals across `box` (the same pair
 * `rcrossbox` draws, reused so every variant keeps its own outline around them).
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
    size: { type: 'enum', values: ['small', 'medium', 'large'], default: 'medium' },
    src: { type: 'string' },
    label: { type: 'string' },
    background: { type: 'enum', values: BACKGROUNDS, default: 'hatch' },
    denseBackground: { type: 'boolean', default: false },
  },
  keyless: [
    { kind: 'enum', to: 'variant' },
    { kind: 'enum', to: 'size' },
    { kind: 'enum', to: 'background' },
    { kind: 'literal', to: 'label' },
  ],
  notes: 'Initials avatar; src= flips to an image placeholder; size + variant + background keyless.',

  block: false,
  intrinsic: (node) => {
    const { diameter } = sizeOf(node);
    return { w: diameter, h: diameter };
  },
  render: (node, box) => {
    const variant = typeof node.props.variant === 'string' ? node.props.variant : 'circular';
    const { font, radius } = sizeOf(node);

    // A `background` tint fills the shape with a hatch over an opaque paper base
    // (base:true), shape-matched to the variant so it never pokes past a curved
    // outline. Only when background is set -- a bare avatar stays transparent.
    let out = '';
    if (typeof node.props.background === 'string') {
      out += backgroundHatch(box, node.props.background, node.props.denseBackground === true,
        { base: true, shape: hatchShapeFor(variant, radius) });
    }
    out += shape(variant, box, radius);

    // A real image source -> the crossed-box placeholder INSTEAD of initials,
    // mirroring Img (a wireframe never renders the actual image).
    if (typeof node.props.src === 'string') return out + cross(box);
    // No image: the initials if any were given.
    if (typeof node.props.label === 'string') {
      out += centeredLabel(box, textOf(node, ''), { fontSize: font });
    }
    return out;
  },
};
