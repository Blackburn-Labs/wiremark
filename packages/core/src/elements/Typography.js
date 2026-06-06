// @ts-check
import { FILLER_STYLES } from './common.js';
import { text, fillerRows } from '../draw.js';
import { fontSizeOf, textOf, measureText, fillerLines, LINE_HEIGHT } from '../metrics.js';

/**
 * Typography -- text. Keyless slots are the text literal (-> label) and the
 * variant enum, in any order; the variant defaults to `body1` and drives the
 * font size. Bare `~N` -> filler at that size. (SPEC ss.5.4, ss.6)
 *
 * `align` (keyed) places the line within the box -- left/justify/inherit anchor
 * at the left edge, center at the midpoint, right at the trailing edge -- via the
 * `text` helper's text-anchor (justify degrades to left at sketch fidelity).
 * `noWrap` (keyed) marks the single-line/truncated intent; the leaf already draws
 * one line, so it parses without changing the sketch.
 *
 * Reference strategy (text leaf): `block` so it spans the container's cross axis
 * (like a real Typography); intrinsic height grows with filler line count; draws
 * a real string, or squiggle filler rows when only an amount is given.
 *
 * @type {import('./common.js').ComponentDef}
 */

/**
 * Map an `align` value to the `text` anchor + the x within `box` to anchor at.
 * @param {string} align @param {{x:number,w:number}} box
 * @returns {{ anchor: 'start'|'middle'|'end', x: number }}
 */
function placement(align, box) {
  if (align === 'center') return { anchor: 'middle', x: box.x + box.w / 2 };
  if (align === 'right') return { anchor: 'end', x: box.x + box.w };
  return { anchor: 'start', x: box.x }; // left / justify / inherit
}

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
               'subtitle1', 'subtitle2', 'body1', 'body2',
               'caption', 'overline', 'button'],
      default: 'body1',
    },
    align: {
      type: 'enum',
      values: ['inherit', 'left', 'center', 'right', 'justify'],
      default: 'inherit',
    },
    noWrap: { type: 'boolean', default: false },
    filler: { type: 'enum', values: FILLER_STYLES },
  },
  keyless: [{ kind: 'literal', to: 'label' }, { kind: 'enum', to: 'variant' }],
  notes: 'Bare -> filler at the variant size (ss.6); align + noWrap are keyed.',

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
    const { anchor, x } = placement(node.props.align ?? 'inherit', box);
    return text(x, box.y + fs, textOf(node), { fontSize: fs, weight, anchor });
  },
};
