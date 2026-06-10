// @ts-check
import { backgroundHatch, centeredLabel, COLORS } from '../draw.js';
import { textOf, measureText } from '../metrics.js';

/**
 * MenuItem -- one label in a horizontal Menubar (File / Edit / View). Keyless
 * text is the label; `selected` and `disabled` are keyless booleans.
 * (SPEC ss.5.4, FAMILIES Menubar/MenuItem)
 *
 * Strategy (inline leaf): `block: false`, so the item sizes to its label rather
 * than stretching the Menubar's cross axis -- MenuItem reads as a top-level menu
 * label, NOT a full-width dropdown row (FAMILIES note). Fixed height; intrinsic
 * width is the label plus snug horizontal padding. Draws the label centered:
 *  - `selected` -> a light hand-drawn hatch tint across the box (the highlighted
 *    menu), matching the house state-tint precedent (ToggleButton / TableRow).
 *  - `disabled` -> the label drawn in muted ink (like Control's disabled state).
 * The `to=` link wrapper is the facade's job, not this element's.
 *
 * No `text: true`: the label is read straight off `node.props.label` via
 * `textOf` (a single menu word), so no filler token is consumed -- setting it
 * would open a dead filler input (TEAM-BRIEF `text:true` rule).
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Fixed menu-item height (px). */
const ROW_H = 32;
/** Horizontal padding around the label (px). */
const PAD_X = 12;
/** Label font size (px). */
const LABEL_FS = 14;

export default {
  name: 'MenuItem',
  tier: 'v1.0',
  category: 'navigation',
  props: {
    // No `default` on `label`: the resolver does not inject PropDef defaults, so
    // an unset label is simply absent and `textOf` falls back to "Menu".
    label: { type: 'string' },
    selected: { type: 'boolean', default: false },
    disabled: { type: 'boolean', default: false },
  },
  keyless: [
    { kind: 'literal', to: 'label' },
  ],
  notes: 'Horizontal Menubar item, sized to its label (not a full-width row); selected -> hand-drawn hatch tint, disabled -> muted ink.',

  block: false,
  intrinsic: (node) => {
    const labelW = measureText(textOf(node, 'Menu'), LABEL_FS).w;
    return { w: PAD_X * 2 + labelW, h: ROW_H };
  },
  render: (node, box) => {
    const selected = node.props.selected === true;
    const disabled = node.props.disabled === true;
    let out = '';

    // selected -> a light hand-drawn hatch tint across the full item (drawn under
    // the label), keeping the sketch aesthetic -- the same borderless hatch
    // ToggleButton/TableRow use for their selected state, not a solid flat fill.
    if (selected) out += backgroundHatch(box);

    // disabled -> muted ink, mirroring Control's disabled treatment.
    const ink = disabled ? COLORS.muted : COLORS.ink;
    out += centeredLabel(box, textOf(node, 'Menu'), { fontSize: LABEL_FS, fill: ink });
    return out;
  },
};
