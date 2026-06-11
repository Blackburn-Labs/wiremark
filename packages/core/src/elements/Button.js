// @ts-check
import { surface, centeredLabel, drawIcon, backgroundHatch, BACKGROUNDS, COLORS } from '../draw.js';
import { textIntrinsic, textOf } from '../metrics.js';

/**
 * Button -- keyless text (-> label) plus TWO keyless enums, `variant` and `size`
 * (disjoint domains, CONVENTION s.2.1), so `Button "Save" contained large` parses
 * in any order. The filled look comes from `variant=contained` (there is no
 * `primary` flag); `to=#id` / `href=#id` make it navigate (universal `to`, s.7).
 * (SPEC ss.5.4)
 *
 * Reference strategy (inline leaf): `block:false` by default, so it sizes to its
 * label + padding rather than stretching the container cross axis. `fullWidth`
 * flips that on per-node -- `block` is a predicate the layout calls with the node
 * (layout.js crossExtent), so a `fullWidth` button stretches like a block element
 * while every other button stays inline.
 *
 * Render by variant: `contained` -> hand-drawn hatch tint + bold label;
 * `outlined` -> a bordered surface; `text` -> no chrome, just the label. The
 * `background` prop (`hatch`/`crosshatch`) picks the contained tint's pattern and
 * `denseBackground` packs its lines closer. `size` scales padding
 * (read from SIZES by both intrinsic and render, so the padding can't drift) plus
 * the label font; `intrinsic` passes that font to `textIntrinsic` so the measured
 * box matches the drawn text once the shared helper honors it. `disabled` mutes
 * the whole button (chrome, icons, label). `startIcon`/`endIcon` are icon-typed
 * (ICONS.md ss.3): the resolver annotates the artwork onto `node.icons` and
 * `drawIcon` renders the slot before/after the label -- clean vectors for a
 * known name, the same bare bordered square (no diagonal) for an unknown one --
 * reserving its width (ICON + ICON_GAP) in `intrinsic` so the chrome never
 * clips. `to=` and children are the facade's job.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Per-size padding + font (px). `medium` font is the MUI button scale. */
const SIZES = {
  small: { padX: 12, padY: 6, fontSize: 13 },
  medium: { padX: 16, padY: 9, fontSize: 14 },
  large: { padX: 22, padY: 12, fontSize: 16 },
};

/** Icon slot extent + its gap to the label (px) -- shared by intrinsic + render. */
const ICON = 10;
const ICON_GAP = 6;

/** @param {import('./common.js').ResolvedNode} node @returns {{padX:number,padY:number,fontSize:number}} */
const sizeOf = (node) => SIZES[node.props.size] ?? SIZES.medium;

export default {
  name: 'Button',
  tier: 'v0.1',
  category: 'content',
  props: {
    label: { type: 'string' },
    variant: { type: 'enum', values: ['text', 'outlined', 'contained'], default: 'text' },
    size: { type: 'enum', values: ['small', 'medium', 'large'], default: 'medium' },
    disabled: { type: 'boolean', default: false },
    startIcon: { type: 'icon' },
    endIcon: { type: 'icon' },
    fullWidth: { type: 'boolean', default: false },
    background: { type: 'enum', values: BACKGROUNDS, default: 'hatch' },
    denseBackground: { type: 'boolean', default: false },
    // href/to are the universal nav prop (CONVENTION s.7) -- not redeclared here.
  },
  keyless: [
    { kind: 'literal', to: 'label' },
    { kind: 'enum', to: 'variant' },
    { kind: 'enum', to: 'size' },
  ],
  notes: 'Filled look = variant=contained. Filler default label "Button".',

  // fullWidth stretches to the container cross axis like a block leaf; otherwise
  // inline. `block` may be a predicate the layout calls per-node (layout.js
  // crossExtent), so the stretch is decided from the node's fullWidth prop.
  block: (node) => node.props.fullWidth === true,
  intrinsic: (node) => {
    const { padX, padY, fontSize } = sizeOf(node);
    const base = textIntrinsic(node, { padX, padY, fallback: 'Button', fontSize });
    const icons = (node.props.startIcon ? ICON + ICON_GAP : 0) + (node.props.endIcon ? ICON + ICON_GAP : 0);
    return { w: base.w + icons, h: base.h };
  },
  render: (node, box) => {
    const { fontSize } = sizeOf(node);
    const variant = node.props.variant ?? 'text';
    // One color for chrome, icons, and label: muted when disabled, ink otherwise.
    const ink = node.props.disabled === true ? COLORS.muted : COLORS.ink;

    // Chrome: contained hatches a tint, outlined borders, text draws nothing.
    // The hatch is borderless so the box border keeps its own normal roughness.
    let out = '';
    if (variant === 'contained') out = backgroundHatch(box, node.props.background, node.props.denseBackground === true) + surface(box, { fill: 'none', stroke: ink });
    else if (variant === 'outlined') out = surface(box, { stroke: ink });

    // Icons sit just inside the box on each side, vertically centered. The label
    // stays centered in the box (the small glyphs read as adornments, MUI-style).
    const cy = box.y + (box.h - ICON) / 2;
    if (node.props.startIcon) out += drawIcon(node, 'startIcon', box.x + ICON_GAP, cy, ICON, { ink, diagonal: false });
    if (node.props.endIcon) out += drawIcon(node, 'endIcon', box.x + box.w - ICON_GAP - ICON, cy, ICON, { ink, diagonal: false });

    return out + centeredLabel(box, textOf(node, 'Button'),
      { fontSize, weight: variant === 'contained' ? 700 : 600, fill: ink });
  },
};
