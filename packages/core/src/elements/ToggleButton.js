// @ts-check
import { surface, backgroundHatch, drawIcon } from '../draw.js';

/**
 * ToggleButton -- a single icon button in a ToggleButtonGroup segmented control
 * (SPEC: Inputs). The toggle is on/off (`selected`); its face is an icon.
 *
 * Strategy (leaf): the spec slice marks this `children:false`, so it defines an
 * `intrinsic` and draws its own square chrome + centered icon. `block:false`
 * -- a toggle button keeps its intrinsic footprint rather than stretching its
 * group's cross axis (the group abuts buttons via `pad:0 gap:0`).
 *
 * Three keyless slots of DIFFERENT kinds, so none collide (CONVENTION s.2):
 *  - `icon` is the single keyless LITERAL: an icon NAME, `type:'icon'`
 *    (tasks/ICONS.md ss.3, superseding the FAMILIES.md "icon->string,
 *    placeholder-only" ruling). The resolver looks the name up at resolve time
 *    (inline -> injected -> built-in) and annotates `node.icons.icon`; a known
 *    name renders as clean vector artwork, an unknown one falls back to the
 *    shared placeholder glyph plus a resolve-time Diagnostic -- the element
 *    never diagnoses icons itself. Bare and quoted spellings both work
 *    (`ToggleButton FormatBold` === `ToggleButton "FormatBold"`); the bare
 *    reading is tried LAST, after enum/boolean, so `selected` and the size
 *    words keep their meanings -- quote to force a colliding icon name.
 *  - `selected` is the keyless BOOLEAN -> tints/fills the button face so the pressed
 *    state reads at a glance; this is what discriminates a selected button at render.
 *  - `size` is the keyless ENUM (small|medium|large) -> the button's square footprint
 *    and icon extent. Unlike the GROUP's `size` (which the engine can't push into
 *    children), THIS size is the button's own prop, so its density is real.
 *
 * NOT `text: true`: the icon name is read directly as a prop and never routed
 * through `textOf`/filler, so a filler token would be a dead input -- the element
 * declines it (the resolver then rejects `~5`/`___` here, which is correct).
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Per-size square footprint + inner icon extent (px); medium is the default. */
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
    icon: { type: 'icon' },
    selected: { type: 'boolean', default: false },
    size: { type: 'enum', values: ['small', 'medium', 'large'], default: 'medium' },
  },
  // literal (icon) + boolean (selected) + enum (size) are three distinct keyless
  // KINDS, so a bare/quoted token routes unambiguously (CONVENTION s.2):
  // `ToggleButton FormatBold selected large` parses in any order -- the bare icon
  // name is tried last, so the boolean/enum words always win. selected is
  // keyless by being a boolean prop name (no slot); the enum needs its own slot.
  keyless: [
    { kind: 'literal', to: 'icon' },
    { kind: 'enum', to: 'size' },
  ],
  notes: 'icon is the single keyless literal: an icon NAME, type \'icon\' (tasks/ICONS.md) -- bare or quoted; known names render real artwork, unknown ones the placeholder glyph + a warning. selected tints the face; size sets the square footprint. Not text-bearing -- no filler.',

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

    // The icon slot, centered in the button at the size-specific extent: resolved
    // artwork as clean vectors, or the shared placeholder glyph when the name is
    // unknown or no icon was given (drawIcon decides -- the element never
    // branches on node.icons itself).
    const gx = box.x + (box.w - glyph) / 2;
    const gy = box.y + (box.h - glyph) / 2;

    return tint + surface(box) + drawIcon(node, 'icon', gx, gy, glyph);
  },
};
