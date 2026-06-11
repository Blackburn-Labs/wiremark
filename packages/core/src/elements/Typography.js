// @ts-check
import { FILLER_STYLES } from './common.js';
import { text, fillerRows, COLORS } from '../draw.js';
import { fontSizeOf, textOf, measureText, wrapText, fillerLines, LINE_HEIGHT, LOREM } from '../metrics.js';

/**
 * Typography -- text. Keyless slots are the text literal (-> label) and the
 * variant enum, in any order; the variant defaults to `body1` and drives the
 * font size. Bare `~N` -> filler at that size. (SPEC ss.5.4, ss.6)
 *
 * `align` (keyed) places the line within the box -- left/justify/inherit anchor
 * at the left edge, center at the midpoint, right at the trailing edge -- via the
 * `text` helper's text-anchor (justify degrades to left at sketch fidelity).
 * `noWrap` (keyed) pins the MUI single-line form: one line, trimmed to the box
 * with a trailing `…`. Without it (the default) a label that can't fit on one
 * line word-wraps to the box width like a real Typography -- in containers
 * that know their width (columns, grids). Rows measure children without a
 * width, so a row item keeps the single-line + ellipsis form either way.
 *
 * Reference strategy (text leaf): `block` so it spans the container's cross axis
 * (like a real Typography); intrinsic height grows with filler line count; draws
 * a real string, or filler rows when only an amount is given -- squiggle strokes
 * by default, lorem words under `filler=lorem` (own prop or the frame default).
 *
 * @type {import('./common.js').ComponentDef}
 */

/**
 * `filler=lorem` rows (SPEC ss.6): real-ish placeholder words in muted ink
 * instead of squiggle strokes. A words filler (`~Nw`) keeps its exact word
 * count on one line (matching `textOf`); line-count fillers wrap the LOREM
 * bank greedily to the box width, with the last line ragged to ~60% so the
 * silhouette matches `fillerRows`.
 * @param {import('../resolve.js').ResolvedNode} node
 * @param {{x:number,y:number,w:number,h:number}} box
 * @param {number} fs
 * @returns {string}
 */
function loremRows(node, box, fs) {
  const step = fs * LINE_HEIGHT;
  let out = '';
  let i = 0;
  for (let row = 0, rows = fillerLines(node); row < rows; row++) {
    let line;
    if (node.filler?.unit === 'words') {
      line = textOf(node);
    } else {
      const max = row === rows - 1 ? box.w * 0.6 : box.w;
      line = LOREM[i++ % LOREM.length];
      while (measureText(`${line} ${LOREM[i % LOREM.length]}`, fs).w <= max) {
        line += ` ${LOREM[i++ % LOREM.length]}`;
      }
    }
    out += text(box.x, box.y + step * row + fs, line, { fontSize: fs, fill: COLORS.muted });
  }
  return out;
}

/**
 * Headings draw bold; the wrap/trim math must track the drawn weight.
 * @param {import('../resolve.js').ResolvedNode} node @returns {number}
 */
function weightOf(node) {
  return /^h[1-6]$/.test(node.props.variant ?? '') ? 700 : 400;
}

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
  intrinsic: (node, avail) => {
    const fs = fontSizeOf(node);
    if (node.props.label == null && node.filler) {
      return { w: 160, h: Math.ceil(fs * LINE_HEIGHT * fillerLines(node)) };
    }
    const single = measureText(textOf(node), fs);
    // Wrap (the MUI default) when the parent's width is known and one line
    // can't fit; `noWrap` pins the single-line form. Rows measure without a
    // width, so row items stay single-line.
    if (node.props.noWrap === true || !avail || !Number.isFinite(avail.w) || single.w <= /** @type {number} */ (avail.w)) {
      return single;
    }
    const w = /** @type {number} */ (avail.w);
    const lines = wrapText(textOf(node), fs, w, weightOf(node));
    return { w: Math.min(single.w, w), h: Math.ceil(fs * LINE_HEIGHT) * lines.length };
  },
  render: (node, box) => {
    const fs = fontSizeOf(node);
    if (node.props.label == null && node.filler) {
      if (node.props.filler === 'lorem') return loremRows(node, box, fs);
      return fillerRows(box.x, box.y, box.w, fillerLines(node), fs);
    }
    const weight = weightOf(node);
    const { anchor, x } = placement(node.props.align ?? 'inherit', box);
    const str = textOf(node);
    const lines = node.props.noWrap === true ? [str] : wrapText(str, fs, box.w, weight);
    // Clamp to the rows the box can seat (a px-pinned height gives fewer; it
    // also re-syncs the rare wrap/measure disagreement on wide-glyph strings).
    // A dropped tail re-joins the last kept line so its `…` marks the cut.
    const lineH = Math.ceil(fs * LINE_HEIGHT);
    const maxLines = Math.max(1, Math.floor((box.h + 0.01) / lineH));
    const kept = lines.length > maxLines ? lines.slice(0, maxLines) : lines;
    if (kept.length < lines.length) kept[kept.length - 1] = lines.slice(kept.length - 1).join(' ');
    let out = '';
    for (let i = 0; i < kept.length; i++) {
      out += text(x, box.y + fs + lineH * i, kept[i], { fontSize: fs, weight, anchor, maxW: box.w });
    }
    return out;
  },
};
