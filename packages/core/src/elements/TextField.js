// @ts-check
import { FILLER_STYLES } from './common.js';
import { surface, text, rline, drawIcon, floatingLabel, backgroundHatch, BACKGROUNDS, COLORS } from '../draw.js';
import { measureText, LINE_HEIGHT } from '../metrics.js';

/** Text size for the label/value/helper/caret, its derived line height, the
 *  field heights per size, and the gaps around the field (px). */
const FS = 12;
const LINE_H = Math.ceil(FS * LINE_HEIGHT);
const FIELD_H = { small: 30, medium: 36 };
const GAP = 4;                 // floating-label band -> field and field -> helper vertical gap
const PAD_X = 10;              // inner horizontal padding for field text
const MULTILINE_ROWS = 3;      // default rows for a multiline field without `rows=`

/** The `select` dropdown caret glyph and the run it reserves on the right edge (px). */
const CARET = '▾';        // a small down-triangle
const CARET_W = measureText(CARET, FS).w + 2;

/** Icon slot extent + its gap to the adjacent text (px) -- shared by intrinsic + render. */
const ICON = 14;
const ICON_GAP = 6;

/** Floating-label band height above the field (px): the small label sits ON the
 *  top border, so reserve its half-height as the gap before the field box. */
const FLOAT_FS = 11;
const FLOAT_BAND = Math.ceil(FLOAT_FS * LINE_HEIGHT);

/** size enum -> field height (medium default). @param {*} node */
const fieldHeight = (node) => FIELD_H[node.props.size === 'small' ? 'small' : 'medium'];

/** Rows a multiline field spans: `rows=` (>=1) or a sensible default; 1 when single-line. @param {*} node */
function rowCount(node) {
  if (!node.props.multiline) return 1;
  const r = Number(node.props.rows);
  return Number.isFinite(r) && r >= 1 ? r : MULTILINE_ROWS;
}

/** Total field height for a node (single height, or rows stacked). @param {*} node */
const fieldBoxH = (node) => fieldHeight(node) + (rowCount(node) - 1) * LINE_H;

/** The label string, or undefined when none is set. Read straight from props
 *  (NOT textOf) so an absent label draws nothing and reserves no space -- filler
 *  (`~N`) feeds the field's body text, never resurrects a label. @param {*} node */
function labelStr(node) {
  const l = node.props.label;
  if (typeof l !== 'string' || l.length === 0) return undefined;
  return l + (node.props.required ? ' *' : '');
}

/**
 * The single string drawn inside the field and how to ink it. `value` and
 * `defaultValue` are real content (inked); `placeholder` is a faint prompt shown
 * only when there's no content. One resolver so the field has exactly one
 * in-field text path (not three). @param {*} node
 * @returns {{ str: string, faint: boolean } | null}
 */
function fieldText(node) {
  const content = node.props.value ?? node.props.defaultValue;
  if (typeof content === 'string' && content.length > 0) {
    return { str: content, faint: false };
  }
  if (typeof node.props.placeholder === 'string' && node.props.placeholder.length > 0) {
    return { str: node.props.placeholder, faint: true };
  }
  return null;
}

/** Whether the label should float onto the top border (MUI): the outlined AND
 *  filled variants float, once the field has content OR a placeholder (i.e. once
 *  something is already shown inside the box). `standard` is the deliberate
 *  exception -- a small label hovering above a borderless underline reads oddly at
 *  sketch fidelity, so a standard field with a value simply drops the label.
 *  @param {*} node */
const labelFloats = (node) => {
  const variant = node.props.variant ?? 'outlined';
  return (variant === 'outlined' || variant === 'filled') && fieldText(node) != null;
};

/**
 * Stroke/fill for the field, derived ONCE from error/disabled (error wins for the
 * stroke; disabled mutes and tints the fill). variant layers on top: `filled`
 * adds a subtle fill, `standard`/`outlined` keep it open. @param {*} node
 * @returns {{ stroke: string, fill: string }}
 */
function fieldState(node) {
  const stroke = node.props.error ? COLORS.error : node.props.disabled ? COLORS.muted : COLORS.ink;
  const fill = node.props.disabled ? COLORS.fill
    : node.props.variant === 'filled' ? COLORS.fill
    : 'none';
  return { stroke, fill };
}

/** Draw the field chrome: a full box (outlined/filled) or just a bottom rule (standard).
 *  A tinted field (filled/disabled) underlays a borderless hand-drawn hatch so the
 *  border keeps its own normal roughness. */
function fieldBox(node, x, y, w, h) {
  const { stroke, fill } = fieldState(node);
  if (node.props.variant === 'standard') {
    return rline(x, y + h, x + w, y + h, { stroke }); // underline only
  }
  const box = { x, y, w, h };
  // A filled field IS its own opaque surface, so it is an (A)-caller per Task 1's
  // Ruling 1 (CONVENTIONS.md: "TextField filled = base:true"): pass base:true so a
  // solid paper ground is laid under the hatch and content behind can't show
  // through the gaps. The standard/outlined variants have no fill, so no base.
  const tint = fill !== 'none' ? backgroundHatch(box, node.props.background, node.props.denseBackground === true, { base: true }) : '';
  return tint + surface(box, { stroke });
}

/**
 * TextField -- keyless `label`, `variant` and `size` (disjoint enum domains,
 * CONVENTION s.2.1); everything else keyed. The `label` is OPTIONAL: absent, it
 * draws nothing and reserves no space. When present, where it sits follows MUI
 * for the outlined variant -- with no value/placeholder it rests INSIDE the field
 * in muted ink; once a value or placeholder is shown it shrinks and floats ON the
 * top border (a paper knockout keeps the outline from striking through, drawn via
 * the shared `floatingLabel` helper that Select reuses). `helperText` sits below.
 * `value`/`defaultValue` render inside the field; `placeholder` shows faintly when
 * there's no value. `startIcon`/`endIcon` (icon-typed, drawn via `drawIcon`) sit
 * just inside each edge and reserve their width. `error` tints border + helper
 * red, `disabled` mutes them, `size=small` shortens the field, `multiline`/`rows`
 * grow it. (SPEC ss.5.4)
 *
 * Strategy (text leaf, `block` so it fills its column). Defaults: variant
 * `outlined`, size `medium` -- applied in render since the resolver doesn't inject
 * defaults (CONVENTION ss.6). `to=` (universal) makes it clickable. `fullWidth` is
 * accepted but inert in v0.1: TextField always fills its column via `block: true`.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'TextField',
  tier: 'v0.1',
  category: 'inputs',
  text: true,
  props: {
    label: { type: 'string' },
    variant: { type: 'enum', values: ['outlined', 'filled', 'standard'], default: 'outlined' },
    value: { type: 'string' },
    multiline: { type: 'boolean', default: false },
    required: { type: 'boolean', default: false },
    placeholder: { type: 'string' },
    helperText: { type: 'string', aliases: ['helper'] },
    error: { type: 'boolean', default: false },
    disabled: { type: 'boolean', default: false },
    rows: { type: 'number' },
    defaultValue: { type: 'string' },
    size: { type: 'enum', values: ['small', 'medium'], default: 'medium' },
    startIcon: { type: 'icon' },
    endIcon: { type: 'icon' },
    fullWidth: { type: 'boolean', default: false },
    select: { type: 'boolean', default: false },
    background: { type: 'enum', values: BACKGROUNDS, default: 'hatch' },
    denseBackground: { type: 'boolean', default: false },
    // Spec types `filler` as a string (style/seed control); we keep the shared
    // FILLER_STYLES enum to match every other text element (CONVENTION ss.5). The
    // filler *amount* still comes from the bare `~N` token via `text: true`.
    filler: { type: 'enum', values: FILLER_STYLES },
  },
  // variant + size are disjoint enum domains (CONVENTION s.2.1), so both ride
  // keyless slots: `TextField "Bio" filled small` parses in any order.
  keyless: [
    { kind: 'literal', to: 'label' },
    { kind: 'enum', to: 'variant' },
    { kind: 'enum', to: 'size' },
  ],
  notes: 'Optional label; floats onto the outline (MUI) once a value/placeholder shows. helperText below. startIcon/endIcon adornments.',

  block: true,
  intrinsic: (node) => {
    // Reserve the label band ONLY when a label is set: floating reserves the small
    // band above the box; the inside/standard/filled label needs no extra height
    // (it sits within the field). Absent label reserves nothing.
    const label = labelStr(node);
    const labelBand = label !== undefined && labelFloats(node) ? FLOAT_BAND + GAP : 0;
    const helperH = typeof node.props.helperText === 'string' ? GAP + LINE_H : 0;
    const labelW = label !== undefined ? measureText(label, FS).w : 0;
    // Reserve the same horizontal slots render uses, so a content-sized field (a
    // Dialog, a narrow row) is wide enough for its adornments; `block: true` makes
    // it fill a column anyway, but this floor keeps the icons/caret from squeezing
    // the text when the field is NOT stretched.
    const startW = node.props.startIcon ? ICON + ICON_GAP : 0;
    const endW = node.props.endIcon ? ICON + ICON_GAP : (node.props.select ? CARET_W : 0);
    return {
      w: Math.max(160, labelW) + startW + endW,
      h: labelBand + fieldBoxH(node) + helperH,
    };
  },
  render: (node, box) => {
    const label = labelStr(node);
    const floats = label !== undefined && labelFloats(node);
    const fieldY = box.y + (floats ? FLOAT_BAND + GAP : 0);
    const fieldH = fieldBoxH(node);
    const muted = node.props.disabled;
    const ink = muted ? COLORS.muted : COLORS.ink;
    // Optical baseline for in-field text (the caret, the resting label, and the
    // value/placeholder all sit on the FIRST row's center).
    const baseY = fieldY + fieldHeight(node) / 2 + FS * 0.35;

    // Field box first; the floating label (if any) overlays its top border below.
    let out = fieldBox(node, box.x, fieldY, box.w, fieldH);

    // Icon adornments sit just inside each edge of the FIRST row, vertically
    // centered on the single-line field height. They reserve a horizontal inset
    // so in-field text and the caret never collide with them.
    const iconCy = fieldY + (fieldHeight(node) - ICON) / 2;
    const startReserve = node.props.startIcon ? ICON + ICON_GAP : 0;
    if (node.props.startIcon) {
      out += drawIcon(node, 'startIcon', box.x + PAD_X, iconCy, ICON, { ink, diagonal: false });
    }
    if (node.props.endIcon) {
      out += drawIcon(node, 'endIcon', box.x + box.w - PAD_X - ICON, iconCy, ICON, { ink, diagonal: false });
    }
    // Right-edge reserve: an explicit endIcon, else the `select` caret slot.
    const caretReserve = node.props.select ? CARET_W : 0;
    const endReserve = node.props.endIcon ? ICON + ICON_GAP : caretReserve;

    // `select` caret on the right edge (only when no endIcon claims that slot).
    if (node.props.select && !node.props.endIcon) {
      out += text(box.x + box.w - PAD_X, baseY, CARET,
        { fontSize: FS, anchor: 'end', fill: COLORS.muted });
    }

    // Text column inside the field, between the start and end reserves.
    const textX = box.x + PAD_X + startReserve;
    const textMaxW = box.w - PAD_X - startReserve - PAD_X - endReserve;

    // Label placement (only when a label is set):
    //  - floats: small label on the top border with a paper knockout (MUI).
    //  - else: muted label inside the field, on the in-field text baseline. Once
    //    a value/placeholder exists for the non-floating variants (filled/standard)
    //    the field text takes that baseline, so the inside-label is shown only when
    //    the field is otherwise empty (it reads as the resting label, like MUI).
    const ft = fieldText(node);
    if (label !== undefined) {
      if (floats) {
        out += floatingLabel(box.x, fieldY, label,
          { fontSize: FLOAT_FS, fill: ink, indent: PAD_X, maxW: box.w - 2 * PAD_X });
      } else if (!ft) {
        out += text(textX, baseY, label,
          { fontSize: FS, fill: COLORS.muted, maxW: textMaxW });
      }
    }

    // In-field text: value/defaultValue (inked) or a faint placeholder, on the
    // first row's baseline. Suppressed where the inside-label occupies it (handled
    // above: inside-label only shows when ft is null).
    if (ft) {
      const fill = ft.faint || muted ? COLORS.muted : COLORS.ink;
      out += text(textX, baseY, ft.str,
        { fontSize: FS, fill, maxW: textMaxW });
    }

    // Helper line below the field (red on error, else muted).
    if (typeof node.props.helperText === 'string') {
      out += text(box.x, fieldY + fieldH + GAP + FS, node.props.helperText,
        { fontSize: FS, fill: node.props.error ? COLORS.error : COLORS.muted, maxW: box.w });
    }
    return out;
  },
};
