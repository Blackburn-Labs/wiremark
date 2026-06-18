// @ts-check
import { backgroundHatch, centeredLabel, drawIcon, text, COLORS } from '../draw.js';
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
 * An optional leading `icon` is an icon NAME (`type: 'icon'`, tasks/ICONS.md ss.3):
 * the resolver annotates the artwork onto `node.icons` and the slot draws through
 * `drawIcon` -- clean inked vectors for a known name, the placeholder glyph for an
 * unknown one (`disabled` mutes it too). It is keyed only (`icon=Save`): MenuItem's
 * single literal slot targets the string `label`, so a bare token stays the label,
 * never the icon. When present the box reserves the icon's width and the label is
 * drawn left-aligned after it; with no icon the label stays centered as before.
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
/** Leading-icon slot extent (px). */
const ICON = 16;
/** Gap between the icon slot and the label (px). */
const ICON_GAP = 6;

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
    // No `default`: an unset icon is simply absent, and render guards with
    // `typeof === 'string'` (the resolver does not inject PropDef defaults into
    // `props`; it only annotates a default's artwork onto `node.icons`).
    icon: { type: 'icon' },
  },
  keyless: [
    { kind: 'literal', to: 'label' },
  ],
  notes: 'Horizontal Menubar item, sized to its label (not a full-width row); selected -> hand-drawn hatch tint, disabled -> muted ink.',

  block: false,
  intrinsic: (node) => {
    const labelW = measureText(textOf(node, 'Menu'), LABEL_FS).w;
    // A leading icon adds its slot plus the gap to the label, so the snug box is
    // left pad, icon, gap, label, right pad.
    const iconW = typeof node.props.icon === 'string' ? ICON + ICON_GAP : 0;
    return { w: PAD_X * 2 + iconW + labelW, h: ROW_H };
  },
  render: (node, box) => {
    const selected = node.props.selected === true;
    const disabled = node.props.disabled === true;
    const hasIcon = typeof node.props.icon === 'string';
    let out = '';

    // selected -> a light hand-drawn hatch tint across the full item (drawn under
    // the label), keeping the sketch aesthetic -- the same borderless hatch
    // ToggleButton/TableRow use for their selected state, not a solid flat fill.
    if (selected) out += backgroundHatch(box);

    // disabled -> muted ink, mirroring Control's disabled treatment.
    const ink = disabled ? COLORS.muted : COLORS.ink;
    const label = textOf(node, 'Menu');

    if (hasIcon) {
      // Leading icon, then a left-aligned label -- the content fills the snug box
      // intrinsic reserved (left pad, icon, gap, label, right pad). drawIcon inks
      // a known name and falls back to the placeholder glyph; muted when disabled.
      const iconX = box.x + PAD_X;
      out += drawIcon(node, 'icon', iconX, box.y + (box.h - ICON) / 2, ICON,
        disabled ? { ink: COLORS.muted } : {});
      const textX = iconX + ICON + ICON_GAP;
      out += text(textX, box.y + box.h / 2 + LABEL_FS * 0.35, label,
        { fontSize: LABEL_FS, fill: ink, maxW: box.x + box.w - PAD_X - textX });
    } else {
      out += centeredLabel(box, label, { fontSize: LABEL_FS, fill: ink });
    }
    return out;
  },
};
