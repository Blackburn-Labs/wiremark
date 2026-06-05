// @ts-check
import { FILLER_STYLES } from './common.js';
import { surface, text, COLORS } from '../draw.js';
import { textOf, measureText } from '../metrics.js';

/** Label type size, input field height, and the gap between them (px). */
const LABEL_FS = 12;
const FIELD_H = 36;
const GAP = 4;

/**
 * TextField -- keyless label + variant enum; `value=`, `type=`, `multiline`,
 * `required` refine it. Label placement follows the parent Stack direction,
 * MUI-style (no `inline` flag in v0.1). (SPEC ss.5.4)
 *
 * Strategy (text leaf): `block` so it fills its column. The label sits ABOVE
 * the input -- the `col` placement the login form relies on. `value=` renders
 * inside the field; a `password` type masks it with a run of stars.
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
    variant: { type: 'enum', values: ['outlined', 'filled', 'standard'] },
    value: { type: 'string' },
    type: { type: 'enum', values: ['text', 'email', 'password', 'number', 'tel', 'url'] },
    multiline: { type: 'boolean' },
    required: { type: 'boolean' },
    filler: { type: 'enum', values: FILLER_STYLES },
  },
  keyless: [{ kind: 'literal', to: 'label' }, { kind: 'enum', to: 'variant' }],
  notes: 'Label placement follows parent Stack direction (ss.5.4).',

  block: true,
  intrinsic: (node) => {
    const label = textOf(node, 'Label');
    return {
      w: Math.max(160, measureText(label, LABEL_FS).w),
      h: Math.ceil(LABEL_FS * 1.4) + GAP + FIELD_H,
    };
  },
  render: (node, box) => {
    const label = textOf(node, 'Label');
    const fieldY = box.y + Math.ceil(LABEL_FS * 1.4) + GAP;
    let out = text(box.x, box.y + LABEL_FS, label, { fontSize: LABEL_FS, fill: COLORS.muted });
    out += surface({ x: box.x, y: fieldY, w: box.w, h: FIELD_H });

    const value = node.props.value;
    if (typeof value === 'string' && value.length > 0) {
      const shown = node.props.type === 'password' ? '*'.repeat(value.length) : value;
      out += text(box.x + 10, fieldY + FIELD_H / 2 + LABEL_FS * 0.35, shown, { fontSize: LABEL_FS });
    }
    return out;
  },
};
