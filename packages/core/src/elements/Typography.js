// @ts-check
import { FILLER_STYLES } from './common.js';
import { text, fillerRows } from '../draw.js';
import { fontSizeOf, textOf, measureText, fillerLines, LINE_HEIGHT } from '../metrics.js';

/**
 * Typography -- text. Keyless slots are the text literal (-> label) and the
 * variant enum, in any order. Bare -> filler at the variant's size. (SPEC ss.5.4, ss.6)
 *
 * Reference strategy (text leaf): `block` so it spans the container's cross axis
 * (like a real Typography); intrinsic height grows with filler line count; draws
 * a real string, or squiggle filler rows when only an amount is given.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Typography',
  tier: 'v0.1',
  category: 'content',
  text: true,
  props: {
    label: { type: 'string' },
    variant: {
      type: 'enum',
      values: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6',
               'subtitle1', 'subtitle2', 'body1', 'body2', 'body',
               'caption', 'overline', 'button'],
    },
    filler: { type: 'enum', values: FILLER_STYLES },
  },
  keyless: [{ kind: 'literal', to: 'label' }, { kind: 'enum', to: 'variant' }],
  notes: 'Bare -> filler at the variant size (ss.6).',

  block: true,
  intrinsic: (node) => {
    const fs = fontSizeOf(node);
    if (node.props.label == null && node.filler) {
      return { w: 160, h: Math.ceil(fs * LINE_HEIGHT * fillerLines(node)) };
    }
    return measureText(textOf(node), fs);
  },
  render: (node, box) => {
    const fs = fontSizeOf(node);
    if (node.props.label == null && node.filler) {
      return fillerRows(box.x, box.y, box.w, fillerLines(node), fs);
    }
    const weight = /^h[1-6]$/.test(node.props.variant ?? '') ? 700 : 400;
    return text(box.x, box.y + fs, textOf(node), { fontSize: fs, weight });
  },
};
