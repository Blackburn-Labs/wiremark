// @ts-check
import { rrect, rline, rellipse, backgroundHatch, BACKGROUNDS, COLORS } from '../draw.js';

/**
 * Control -- a single selection input that subsumes the old Checkbox and Switch
 * (SPEC ss.5.4). `variant` picks the glyph (checkbox / radio / switch), `checked`
 * and `disabled` are booleans, and `size` scales the glyph. All four props are
 * keyless: `variant` and `size` are disjoint keyless enums (CONVENTION s.2.1) and
 * `checked` / `disabled` are bare-name boolean flags (s.3), so
 * `Control switch checked large` parses in any order.
 *
 * Strategy (input leaf): a fixed-footprint glyph that keeps its intrinsic size in
 * a row (`block: false`, like the Checkbox/Switch it replaces -- it must NOT
 * stretch to the container cross axis). Renders are ported from the proven
 * Checkbox/Switch drawing code:
 *  - checkbox -> a square; when `checked`, a two-stroke tick inside it.
 *  - radio    -> a circle; when `checked`, a smaller filled dot centered.
 *  - switch   -> a pill track (hand-drawn hatch tint when `checked`) with a round
 *                knob that sits left when off and right when on. The `background`
 *                prop (`hatch`/`crosshatch`) picks the pattern; `denseBackground`
 *                packs its lines closer.
 * `disabled` recolors the strokes (and the checked switch hatch) to the muted ink.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Glyph footprint at `medium` (px). switch is a wide pill; the others square. */
const BASE = {
  checkbox: { w: 18, h: 18 },
  radio: { w: 18, h: 18 },
  switch: { w: 36, h: 20 },
};
/** Multiplier per size; `medium` is 1 so it matches the ported originals exactly. */
const SCALE = { small: 0.78, medium: 1, large: 1.25 };

/** @param {import('./common.js').ResolvedNode} node @returns {'checkbox'|'radio'|'switch'} */
const variantOf = (node) => {
  const v = node.props.variant;
  return v === 'radio' || v === 'switch' ? v : 'checkbox';
};

export default {
  name: 'Control',
  tier: 'v0.1',
  category: 'inputs',
  props: {
    variant: { type: 'enum', values: ['radio', 'checkbox', 'switch'], default: 'checkbox' },
    checked: { type: 'boolean', default: false },
    disabled: { type: 'boolean', default: false },
    size: { type: 'enum', values: ['small', 'medium', 'large'], default: 'medium' },
    background: { type: 'enum', values: BACKGROUNDS, default: 'hatch' },
    denseBackground: { type: 'boolean', default: false },
  },
  keyless: [
    { kind: 'enum', to: 'variant' },
    { kind: 'enum', to: 'size' },
  ],
  notes: 'Replaces Checkbox + Switch; variant/size keyless enums, checked/disabled keyless bools.',

  block: false,
  intrinsic: (node) => {
    const base = BASE[variantOf(node)];
    const k = SCALE[node.props.size] ?? 1;
    return { w: Math.round(base.w * k), h: Math.round(base.h * k) };
  },
  render: (node, box) => {
    const checked = node.props.checked === true;
    const disabled = node.props.disabled === true;
    const ink = disabled ? COLORS.muted : COLORS.ink;     // strokes + radio dot
    const variant = variantOf(node);

    if (variant === 'switch') {
      // Pill track hatches with the "on" tint when checked (muted when disabled);
      // borderless hatch + its own border, so the pill outline keeps its roughness.
      // Knob slides L->R.
      const tint = checked
        ? backgroundHatch(box, node.props.background, node.props.denseBackground === true, disabled ? { fill: COLORS.muted } : {})
        : '';
      const track = tint + rrect(box.x, box.y, box.w, box.h, { stroke: ink });
      const d = box.h - 4;                 // knob diameter, 2px inset top & bottom
      const r = d / 2;
      const cy = box.y + box.h / 2;
      const cx = checked ? box.x + box.w - 2 - r : box.x + 2 + r;
      return track + rellipse(cx, cy, d, d, { stroke: ink });
    }

    if (variant === 'radio') {
      // Outer ring; a smaller filled dot marks the selected state.
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      let out = rellipse(cx, cy, box.w, box.h, { stroke: ink });
      if (checked) out += rellipse(cx, cy, box.w * 0.5, box.h * 0.5, { stroke: ink, fill: ink, fillStyle: 'solid' });
      return out;
    }

    // checkbox: a square, plus a two-stroke tick when checked.
    let out = rrect(box.x, box.y, box.w, box.h, { stroke: ink });
    if (checked) {
      const x1 = box.x + box.w * 0.22;
      const y1 = box.y + box.h * 0.52;
      const x2 = box.x + box.w * 0.42;
      const y2 = box.y + box.h * 0.74;
      const x3 = box.x + box.w * 0.80;
      const y3 = box.y + box.h * 0.28;
      const opts = { stroke: ink, strokeWidth: 1.6 };
      out += rline(x1, y1, x2, y2, opts) + rline(x2, y2, x3, y3, opts);
    }
    return out;
  },
};
