// @ts-check
import { surface, backgroundHatch, drawIcon, BACKGROUNDS } from '../draw.js';

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
 *  - `selected` is the keyless BOOLEAN -> drives the background pattern DEFAULT so
 *    the pressed state reads at a glance: an unselected face defaults to `hatch`,
 *    a selected one to the denser-reading `crosshatch`. An explicit `background=`/
 *    `denseBackground=` overrides that default regardless of `selected`.
 *  - `size` is the keyless ENUM (small|medium|large) -> the button's square footprint
 *    and icon extent. Unlike the GROUP's `size` (which the engine can't push into
 *    children), THIS size is the button's own prop, so its density is real.
 *  - `background` (keyless ENUM hatch|crosshatch|none) + `denseBackground` are the
 *    shared tint props (like Button/Chip/...): the face is always its own OPAQUE
 *    surface (an (A) `base:true` caller), so a `background=` frame chain can't bleed
 *    through. `selected` only picks the DEFAULT pattern; these props pin it.
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
    // No static default: the effective pattern is selected-dependent (hatch when
    // off, crosshatch when on), computed in render -- an explicit value pins it.
    background: { type: 'enum', values: BACKGROUNDS },
    denseBackground: { type: 'boolean', default: false },
  },
  // literal (icon) + booleans (selected/denseBackground) + enums (size/background)
  // are distinct keyless KINDS with DISJOINT enum domains, so a bare/quoted token
  // routes unambiguously (CONVENTION s.2): `ToggleButton FormatBold selected large`
  // parses in any order -- the bare icon name is tried last, so the boolean/enum
  // words always win. The booleans are keyless by being boolean prop names (no
  // slot); each enum needs its own slot.
  keyless: [
    { kind: 'literal', to: 'icon' },
    { kind: 'enum', to: 'size' },
    { kind: 'enum', to: 'background' },
  ],
  notes: 'icon is the single keyless literal: an icon NAME, type \'icon\' (tasks/ICONS.md) -- bare or quoted; known names render real artwork, unknown ones the placeholder glyph + a warning. size sets the square footprint. background/denseBackground tint the opaque (base:true) face; background defaults to hatch, or crosshatch when selected, and an explicit value overrides that regardless of selected. Not text-bearing -- no filler.',

  block: false,
  intrinsic: (node) => {
    const { box } = sizeOf(node);
    return { w: box, h: box };
  },
  render: (node, box) => {
    const { glyph } = sizeOf(node);
    // The face is always its own OPAQUE surface (base:true), so a background= frame
    // chain can't bleed through the hatch gaps -- like every other tinted element.
    // The pattern DEFAULTS by state (selected reads "pressed" via the denser
    // crosshatch; unselected uses hatch), but an explicit background=/denseBackground=
    // overrides that default regardless of selected. Borderless tint -> surface()
    // draws the crisp outline at its own roughness on top.
    const selected = node.props.selected === true;
    const pattern = node.props.background ?? (selected ? 'crosshatch' : 'hatch');
    const tint = backgroundHatch(box, pattern, node.props.denseBackground === true, { base: true });

    // The icon slot, centered in the button at the size-specific extent: resolved
    // artwork as clean vectors, or the shared placeholder glyph when the name is
    // unknown or no icon was given (drawIcon decides -- the element never
    // branches on node.icons itself).
    const gx = box.x + (box.w - glyph) / 2;
    const gy = box.y + (box.h - glyph) / 2;

    return tint + surface(box) + drawIcon(node, 'icon', gx, gy, glyph);
  },
};
