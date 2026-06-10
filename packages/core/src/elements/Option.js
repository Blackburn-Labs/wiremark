// @ts-check
import { rline, text, iconGlyph, backgroundHatch, COLORS } from '../draw.js';
import { textOf, measureText } from '../metrics.js';

/**
 * Option -- a single row in a Select's dropdown menu. Keyless text is the label
 * (alias `text`); `selected` is a keyless boolean. (SPEC ss.5.4, FAMILIES Select/Option)
 *
 * Strategy (full-width menu-row leaf): `block` so every option fills the Select's
 * cross axis (like ListItem). Fixed row height; a taller row when a `subtext`
 * secondary line is present. Draws, left to right: an optional `startIcon` glyph,
 * the label (with `subtext` beneath it), and at the far right either an optional
 * `endIcon` glyph or, when `selected`, a check mark. A `selected` row also gets a
 * hand-drawn accent hatch tint across the box (matching the house state-highlight
 * look used by ToggleButton/TableRow/Chip -- never a solid fill, which would read
 * as finished UI). The `to=` link wrapper is the facade's job.
 *
 * The `startIcon`/`endIcon` props are icon NAMES: the spec types them `icon`, but
 * `PropType` has no `'icon'`, so they are declared `string` and drawn with the
 * same placeholder glyph Icon uses -- a bordered box with a diagonal stroke
 * (FAMILIES icon ruling). The icon NAME itself is decorative at wireframe fidelity.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Fixed single-line row height (px), matching a ListItem row. */
const ROW_H = 40;
/** Taller row when a `subtext` secondary line is shown. */
const ROW_H_SUB = 52;
/** Horizontal inset for content (px). */
const PAD_X = 12;
/** Placeholder icon glyph extent (px). */
const ICON = 18;
/** Gap between an icon glyph and the adjacent text (px). */
const ICON_GAP = 8;
/** Primary / secondary label font sizes (px). */
const LABEL_FS = 14;
const SUB_FS = 11;

/** Whether this option shows a secondary line. */
const hasSub = (node) => typeof node.props.subtext === 'string' && node.props.subtext.length > 0;

export default {
  name: 'Option',
  tier: 'v1.0',
  category: 'inputs',
  props: {
    // No `default` on the string props: the resolver does not inject PropDef
    // defaults, so an unset prop is simply absent (undefined), which the render
    // checks for with `typeof === 'string'`. `selected` keeps its documented
    // boolean baseline.
    label: { type: 'string', aliases: ['text'] },
    subtext: { type: 'string' },
    selected: { type: 'boolean', default: false },
    startIcon: { type: 'string' },
    endIcon: { type: 'string' },
  },
  keyless: [
    { kind: 'literal', to: 'label' },
  ],
  notes: 'startIcon/endIcon are icon names (spec type `icon`) declared `string` and drawn as Icon\'s placeholder glyph; the name is decorative.',

  block: true,
  intrinsic: (node) => {
    // Width is a sensible minimum -- the menu (Select, a col container) stretches
    // each option to its own width via `block`. Measure the label so a long
    // option still reports a reasonable intrinsic width before stretching.
    const label = textOf(node, 'Option');
    const labelW = measureText(label, LABEL_FS).w;
    const startW = typeof node.props.startIcon === 'string' ? ICON + ICON_GAP : 0;
    const endW = (typeof node.props.endIcon === 'string' || node.props.selected === true) ? ICON + ICON_GAP : 0;
    const w = PAD_X * 2 + startW + labelW + endW;
    return { w: Math.max(120, w), h: hasSub(node) ? ROW_H_SUB : ROW_H };
  },
  render: (node, box) => {
    const selected = node.props.selected === true;
    let out = '';

    // selected -> a hand-drawn accent hatch across the full row (drawn under
    // content), the house state-highlight look (cf. ToggleButton/TableRow/Chip).
    // backgroundHatch hachures it -- never a solid block.
    if (selected) {
      out += backgroundHatch(box, 'hatch', false, { fill: COLORS.accent });
    }

    // Left edge of the text column, after an optional leading icon glyph.
    let textX = box.x + PAD_X;
    if (typeof node.props.startIcon === 'string') {
      out += iconGlyph(box.x + PAD_X, box.y + (box.h - ICON) / 2, ICON);
      textX += ICON + ICON_GAP;
    }

    const label = textOf(node, 'Option');
    if (hasSub(node)) {
      // Two stacked lines: label above its smaller secondary subtext.
      out += text(textX, box.y + box.h / 2 - 2, label, { fontSize: LABEL_FS });
      out += text(textX, box.y + box.h / 2 + SUB_FS + 2, node.props.subtext,
        { fontSize: SUB_FS, fill: COLORS.muted });
    } else {
      out += text(textX, box.y + box.h / 2 + LABEL_FS * 0.35, label, { fontSize: LABEL_FS });
    }

    // Right edge: an explicit endIcon glyph wins; otherwise a check mark when selected.
    const rightX = box.x + box.w - PAD_X - ICON;
    if (typeof node.props.endIcon === 'string') {
      out += iconGlyph(rightX, box.y + (box.h - ICON) / 2, ICON);
    } else if (selected) {
      // A hand-drawn check mark (two strokes) reads as the "chosen" marker.
      const cy = box.y + box.h / 2;
      const cx = rightX;
      out += rline(cx + 2, cy, cx + 6, cy + 5, { stroke: COLORS.ink, strokeWidth: 1.6 });
      out += rline(cx + 6, cy + 5, cx + ICON - 1, cy - 5, { stroke: COLORS.ink, strokeWidth: 1.6 });
    }

    // A faint bottom divider rule, like a list row.
    out += rline(box.x, box.y + box.h, box.x + box.w, box.y + box.h,
      { stroke: COLORS.muted, strokeWidth: 1 });
    return out;
  },
};
