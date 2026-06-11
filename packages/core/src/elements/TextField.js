// @ts-check
import { FILLER_STYLES } from './common.js';
import { surface, text, rline, backgroundHatch, BACKGROUNDS, COLORS } from '../draw.js';
import { textOf, measureText, LINE_HEIGHT } from '../metrics.js';

/** Text size for the label/value/helper/caret, its derived line height, the
 *  field heights per size, and the gaps around the field (px). */
const FS = 12;
const LINE_H = Math.ceil(FS * LINE_HEIGHT);
const FIELD_H = { small: 30, medium: 36 };
const GAP = 4;                 // label->field and field->helper vertical gap
const PAD_X = 10;              // inner horizontal padding for field text
const MULTILINE_ROWS = 3;      // default rows for a multiline field without `rows=`

/** A muted red for the `error` state -- field-specific, so kept local (not a palette color). */
const ERROR_INK = '#c2473d';

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

/** The label, with a `*` appended when `required`. @param {*} node */
const labelText = (node) => textOf(node, 'Label') + (node.props.required ? ' *' : '');

/**
 * The single string drawn inside the field and how to ink it. `value` and
 * `defaultValue` are real content (inked, password-masked); `placeholder` is a
 * faint prompt shown only when there's no content. One resolver so the field has
 * exactly one in-field text path (not three).
 * @param {*} node @returns {{ str: string, faint: boolean } | null}
 */
function fieldText(node) {
  const content = node.props.value ?? node.props.defaultValue;
  if (typeof content === 'string' && content.length > 0) {
    const str = node.props.type === 'password' ? '*'.repeat(content.length) : content;
    return { str, faint: false };
  }
  if (typeof node.props.placeholder === 'string' && node.props.placeholder.length > 0) {
    return { str: node.props.placeholder, faint: true };
  }
  return null;
}

/**
 * Stroke/fill for the field, derived ONCE from error/disabled (error wins for the
 * stroke; disabled mutes and tints the fill). variant layers on top: `filled`
 * adds a subtle fill, `standard`/`outlined` keep it open. @param {*} node
 * @returns {{ stroke: string, fill: string }}
 */
function fieldState(node) {
  const stroke = node.props.error ? ERROR_INK : node.props.disabled ? COLORS.muted : COLORS.ink;
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
  const tint = fill !== 'none' ? backgroundHatch(box, node.props.background, node.props.denseBackground === true) : '';
  return tint + surface(box, { stroke });
}

/**
 * TextField -- keyless `label` + `variant`; everything else keyed. The label sits
 * ABOVE the input (the `col` placement forms rely on); optional `helperText` sits
 * below it. `value`/`defaultValue` render inside the field (a `password` masks
 * with stars); `placeholder` shows faintly when there's no value. `error` tints
 * the border + helper red, `disabled` mutes them, `size=small` shortens the field,
 * and `multiline`/`rows` grow it. (SPEC ss.5.4)
 *
 * Strategy (text leaf, `block` so it fills its column). Defaults: variant
 * `outlined`, type `text`, size `medium` -- applied in render since the resolver
 * doesn't inject defaults (CONVENTION ss.6). `to=` (universal) makes it clickable.
 * `fullWidth` is accepted but inert in v0.1: TextField always fills its column via
 * `block: true`. The engine now supports a per-node `block` predicate, so honoring
 * `fullWidth=false` to shrink-to-intrinsic (`block: (n) => n.props.fullWidth`) is a
 * cheap follow-up -- deferred for v0.1 so a bare TextField keeps filling the form.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'TextField',
  tier: 'v0.1',
  category: 'content',
  text: true,
  props: {
    label: { type: 'string' },
    variant: { type: 'enum', values: ['outlined', 'filled', 'standard'], default: 'outlined' },
    value: { type: 'string' },
    type: { type: 'enum', values: ['text', 'password', 'email', 'number'], default: 'text' },
    multiline: { type: 'boolean', default: false },
    required: { type: 'boolean', default: false },
    placeholder: { type: 'string' },
    helperText: { type: 'string', aliases: ['helper'] },
    error: { type: 'boolean', default: false },
    disabled: { type: 'boolean', default: false },
    rows: { type: 'number' },
    defaultValue: { type: 'string' },
    size: { type: 'enum', values: ['small', 'medium'], default: 'medium' },
    fullWidth: { type: 'boolean', default: false },
    select: { type: 'boolean', default: false },
    background: { type: 'enum', values: BACKGROUNDS, default: 'hatch' },
    denseBackground: { type: 'boolean', default: false },
    // Spec types `filler` as a string (style/seed control); we keep the shared
    // FILLER_STYLES enum to match every other text element (CONVENTION ss.5). The
    // filler *amount* still comes from the bare `~N` token via `text: true`.
    filler: { type: 'enum', values: FILLER_STYLES },
  },
  keyless: [{ kind: 'literal', to: 'label' }, { kind: 'enum', to: 'variant' }],
  notes: 'Label above the input; helperText below. type drops tel/url (text/password/email/number).',

  block: true,
  intrinsic: (node) => {
    const helperH = typeof node.props.helperText === 'string' ? GAP + LINE_H : 0;
    return {
      w: Math.max(160, measureText(labelText(node), FS).w),
      h: LINE_H + GAP + fieldBoxH(node) + helperH,
    };
  },
  render: (node, box) => {
    const fieldY = box.y + LINE_H + GAP;
    const fieldH = fieldBoxH(node);
    const muted = node.props.disabled;

    // Label row.
    let out = text(box.x, box.y + FS, labelText(node),
      { fontSize: FS, fill: muted ? COLORS.muted : COLORS.ink, maxW: box.w });

    // Field box + a `select` caret on the right edge.
    out += fieldBox(node, box.x, fieldY, box.w, fieldH);
    if (node.props.select) {
      out += text(box.x + box.w - PAD_X, fieldY + fieldH / 2 + FS * 0.35, '▾',
        { fontSize: FS, anchor: 'end', fill: COLORS.muted });
    }

    // In-field text: value/defaultValue (inked, masked) or a faint placeholder.
    const ft = fieldText(node);
    if (ft) {
      const fill = ft.faint || muted ? COLORS.muted : COLORS.ink;
      out += text(box.x + PAD_X, fieldY + fieldHeight(node) / 2 + FS * 0.35, ft.str,
        { fontSize: FS, fill, maxW: box.w - 2 * PAD_X - (node.props.select ? 12 : 0) });
    }

    // Helper line below the field (red on error, else muted).
    if (typeof node.props.helperText === 'string') {
      out += text(box.x, fieldY + fieldH + GAP + FS, node.props.helperText,
        { fontSize: FS, fill: node.props.error ? ERROR_INK : COLORS.muted, maxW: box.w });
    }
    return out;
  },
};
