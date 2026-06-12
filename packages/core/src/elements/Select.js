// @ts-check
import { surface, text, rline, backgroundHatch, floatingLabel, COLORS } from '../draw.js';
import { measureText } from '../metrics.js';

/**
 * Select -- a dropdown form control. Keyless text is the `label`; keyless
 * `variant` (outlined|filled|standard) styles the closed field's border; keyed
 * `value` (aliases `v`/`val`) is the chosen text shown inside the field.
 * (SPEC ss.5.4, FAMILIES Select/Option)
 *
 * Strategy (col container drawing its own closed-field chrome): a Select renders
 * a TextField-like closed control at the top -- a bordered field band showing the
 * `value` (or, lacking one, the `label`) with a ▾ caret -- and stacks its Options
 * beneath it as the open menu. The field band is reserved with the container's top
 * `pad`, the same trick `List` uses for its subheader: `pad` is symmetric in the
 * engine, so the band height also insets the Options left/right/bottom -- a minor
 * cosmetic cost accepted for wireframe fidelity (the menu rows sit slightly inset
 * under the field). `render` reads the laid-out `box` to draw the field across the
 * full width (CONVENTION s.0); the Options below are drawn by the facade.
 *
 * `variant` picks the field's border like TextField: `outlined`/`filled` draw a
 * full box (filled adds a hatch tint), `standard` draws just a bottom rule. The
 * shown text is `value` if set, else `label`, else a faint placeholder. When a
 * `value` IS set (outlined or filled), the `label` follows MUI and floats onto
 * the top border in a smaller font, over an opaque paper knockout so neither the
 * outline nor a filled field's hatched top edge strikes through it -- via the same
 * `floatingLabel` helper TextField uses, so the look matches (`standard` keeps the
 * label inside, like TextField). Defaults (variant `outlined`) are applied in
 * render since the resolver doesn't inject PropDef defaults (CONVENTION ss.6).
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Closed-field band height (px) -- the top `pad` that reserves the field. */
const FIELD_H = 40;
/** Field text size and inner horizontal padding (px). */
const FS = 13;
const PAD_X = 10;
/** Run reserved at the right inset for the end-anchored ▾ caret (+ a small gap). */
const CARET_W = measureText('▾', FS).w + 4;
/** Small font for the floating label that sits ON the field's top border (MUI). */
const FLOAT_FS = 11;

/** A non-empty string prop, or undefined. @param {*} node @param {string} key */
function strProp(node, key) {
  const v = node.props[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/** The text shown inside the closed field: `value` wins, else `label`. */
function fieldContent(node) {
  const value = strProp(node, 'value');
  if (value !== undefined) return { str: value, faint: false };
  const label = strProp(node, 'label');
  if (label !== undefined) return { str: label, faint: false };
  return { str: 'Select', faint: true };
}

/**
 * Whether the `label` should float onto the field's top border (MUI): like
 * TextField, the outlined AND filled variants float once a `value` is shown (the
 * value then occupies the field, so the label lifts out of the way -- the paper
 * knockout covers the border line and, on a filled field, its hatched top edge).
 * `standard` is the deliberate exception: a small label hovering above a
 * borderless underline reads oddly at sketch fidelity, so a standard Select with
 * a value drops the label. Needs a label to draw. @param {*} node
 */
const labelFloats = (node) => {
  const variant = node.props.variant ?? 'outlined';
  return (variant === 'outlined' || variant === 'filled')
    && strProp(node, 'value') !== undefined
    && strProp(node, 'label') !== undefined;
};

export default {
  name: 'Select',
  tier: 'v1.0',
  category: 'inputs',
  container: true,
  props: {
    // No `default` on `label`/`value`: the resolver does not inject PropDef
    // defaults, so an unset string prop is simply absent (undefined), which the
    // render checks with `typeof === 'string'`. `variant`'s default is applied in
    // render (CONVENTION ss.6).
    label: { type: 'string' },
    variant: { type: 'enum', values: ['outlined', 'filled', 'standard'], default: 'outlined' },
    value: { type: 'string', aliases: ['v', 'val'] },
  },
  keyless: [
    { kind: 'literal', to: 'label' },
    { kind: 'enum', to: 'variant' },
  ],
  notes: 'Closed field band drawn via render, reserved with symmetric top pad (List subheader trick); Options stack beneath. value (else label) is the shown text.',

  layoutSpec: () => ({
    // The field band is reserved as a top pad. pad is symmetric, so it also insets
    // the Options -- accepted cosmetic cost (see header). gap 0 so rows abut.
    axis: 'col',
    pad: FIELD_H,
    gap: 0,
  }),
  // The closed field seats its shown text plus the inner insets and the caret
  // slot -- mirroring how TextField's intrinsic tracks its label, so a Select
  // inside a content-sized surface (a Dialog, a row) asks for enough width to
  // show its value untrimmed instead of the bare 2*pad of an optionless column.
  minSize: (node) => ({ w: measureText(fieldContent(node).str, FS).w + 2 * PAD_X + CARET_W, h: 0 }),

  render: (node, box) => {
    const variant = node.props.variant === 'filled' || node.props.variant === 'standard'
      ? node.props.variant : 'outlined';
    // The field spans the full Select width, in the reserved top band. Its content
    // baseline sits centered in that band.
    const fx = box.x;
    const fy = box.y;
    const fw = box.w;
    const fh = FIELD_H;
    const midY = fy + fh / 2;

    let out = '';
    // Field chrome by variant: standard = underline only; filled = hatch tint +
    // box; outlined = plain box. The filled field is the Select's own opaque
    // surface, so its hatch lays down a paper base first (`base: true`, an (A)
    // caller per CONVENTION s.8) -- otherwise content behind a filled Select shows
    // through the hash gaps. (Task #1 opacity scope, executed here per architect.)
    if (variant === 'standard') {
      out += rline(fx, fy + fh, fx + fw, fy + fh, { stroke: COLORS.ink });
    } else {
      if (variant === 'filled') out += backgroundHatch({ x: fx, y: fy, w: fw, h: fh }, undefined, false, { base: true });
      out += surface({ x: fx, y: fy, w: fw, h: fh });
    }

    // The chosen value (or label) text, faint when it's only a placeholder.
    const fc = fieldContent(node);
    out += text(fx + PAD_X, midY + FS * 0.35, fc.str,
      { fontSize: FS, fill: fc.faint ? COLORS.muted : COLORS.ink, maxW: fw - 2 * PAD_X - CARET_W });

    // A ▾ caret at the right edge, the classic dropdown affordance (cf. TextField
    // `select`).
    out += text(fx + fw - PAD_X, midY + FS * 0.35, '▾',
      { fontSize: FS, anchor: 'end', fill: COLORS.muted });

    // MUI floating label: once a value is shown (outlined), the label lifts onto
    // the top border with an opaque paper knockout so the outline doesn't strike
    // through it. Drawn LAST so the knockout covers the border. Shared helper with
    // TextField -- the look stays identical. (No layout cost: it overlays the
    // existing top border in the reserved field band.)
    if (labelFloats(node)) {
      out += floatingLabel(fx, fy, /** @type {string} */ (strProp(node, 'label')),
        { fontSize: FLOAT_FS, fill: COLORS.ink, indent: PAD_X, maxW: fw - 2 * PAD_X });
    }

    return out;
  },
};
