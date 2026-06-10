// @ts-check
import { surface, backgroundHatch, rrect, rline, COLORS } from '../draw.js';

/**
 * ToggleButton -- a single icon button in a ToggleButtonGroup segmented control
 * (SPEC: Inputs). The toggle is on/off (`selected`); its face is an icon glyph.
 *
 * Strategy (leaf): the spec slice marks this `children:false`, so it defines an
 * `intrinsic` and draws its own square chrome + centered icon glyph. `block:false`
 * -- a toggle button keeps its intrinsic footprint rather than stretching its
 * group's cross axis (the group abuts buttons via `pad:0 gap:0`).
 *
 * Three keyless slots of DIFFERENT kinds, so none collide (CONVENTION s.2):
 *  - `icon` is the single keyless LITERAL (a quoted icon NAME). Per FAMILIES.md's
 *    icon ruling there is no `'icon'` PropType -- the name is a `string` and renders
 *    the same placeholder glyph as Icon (a bordered box + a diagonal stroke).
 *  - `selected` is the keyless BOOLEAN -> tints/fills the button face so the pressed
 *    state reads at a glance; this is what discriminates a selected button at render.
 *  - `size` is the keyless ENUM (small|medium|large) -> the button's square footprint
 *    and glyph extent. Unlike the GROUP's `size` (which the engine can't push into
 *    children), THIS size is the button's own prop, so its density is real.
 *
 * NOT `text: true`: the icon name is read directly as a string prop and never routed
 * through `textOf`/filler, so a filler token would be a dead input -- the element
 * declines it (the resolver then rejects `~5`/`___` here, which is correct).
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Per-size square footprint + inner glyph extent (px); medium is the default. */
const SIZES = {
  small: { box: 30, glyph: 16 },
  medium: { box: 38, glyph: 20 },
  large: { box: 48, glyph: 26 },
};

/** @param {import('./common.js').ResolvedNode} node */
const sizeOf = (node) => SIZES[node.props.size] ?? SIZES.medium;

export default {
  name: 'ToggleButton',
  tier: 'v1.0',
  category: 'inputs',
  props: {
    icon: { type: 'string' },
    selected: { type: 'boolean', default: false },
    size: { type: 'enum', values: ['small', 'medium', 'large'], default: 'medium' },
  },
  // literal (icon) + boolean (selected) + enum (size) are three distinct keyless
  // KINDS, so a bare/quoted token routes unambiguously (CONVENTION s.2):
  // `ToggleButton "FormatBold" selected large` parses in any order. selected is
  // keyless by being a boolean prop name (no slot); the enum needs its own slot.
  keyless: [
    { kind: 'literal', to: 'icon' },
    { kind: 'enum', to: 'size' },
  ],
  notes: 'icon is the single keyless literal (an icon NAME drawn as the Icon placeholder glyph; no \'icon\' PropType per FAMILIES.md). selected tints the face; size sets the square footprint. Not text-bearing -- no filler.',

  block: false,
  intrinsic: (node) => {
    const { box } = sizeOf(node);
    return { w: box, h: box };
  },
  render: (node, box) => {
    const { glyph } = sizeOf(node);
    // A selected button reads as "pressed": a hand-drawn hatch tint under its border
    // (borderless, so the surface border keeps its own normal roughness), exactly
    // the segmented-control selected look. Unselected: a plain bordered square.
    const tint = node.props.selected === true ? backgroundHatch(box) : '';

    // The placeholder icon glyph -- a bordered box with a diagonal stroke, the same
    // mark Icon draws -- centered in the button at the size-specific glyph extent.
    const gx = box.x + (box.w - glyph) / 2;
    const gy = box.y + (box.h - glyph) / 2;
    const mark = rrect(gx, gy, glyph, glyph, { stroke: COLORS.muted })
      + rline(gx, gy + glyph, gx + glyph, gy, { stroke: COLORS.muted, strokeWidth: 1 });

    return tint + surface(box) + mark;
  },
};
