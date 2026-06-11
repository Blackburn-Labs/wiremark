// @ts-check
import { FILLER_STYLES } from './common.js';
import { text, COLORS } from '../draw.js';
import { textIntrinsic, textOf, fontSizeOf } from '../metrics.js';

/** Horizontal inset (px) of the cell text from the cell box edges. */
const PAD_X = 8;
/** Vertical inset (px) baked into the cell's intrinsic height. */
const PAD_Y = 6;

/**
 * TableCell -- one cell of a table row. Keyless text is the label; filler default
 * "Cell". (SPEC ss.5.4; FAMILY 1 -- Table)
 *
 * Strategy (text LEAF -- the recommended Table-family reading, see FAMILIES.md):
 * implemented as a leaf that draws its own label so `align` is REAL (it moves the
 * text anchor), rather than a container whose facade-drawn children can't be
 * re-anchored. `flex: true` is MANDATORY -- equal-flex sibling cells split the
 * TableRow's width evenly, which is what visually aligns columns for rows of equal
 * cell count (engine fact 4 + the ragged-columns ruling). Not `block`: a cell's
 * cross size is its label height; TableRow stretches it on the main axis via flex.
 *
 * `align` (keyed, `keyless:false` per the slice) anchors the label left/center/
 * right within the cell box -- left at the left inset, center at the midpoint,
 * right at the trailing inset.
 *
 * DEVIATION: the spec slice marks TableCell `children:true`, but per the Table
 * family ruling it is implemented as a text leaf so `align` can move the text it
 * draws. Arbitrary nested children are dropped at wireframe fidelity.
 *
 * @type {import('./common.js').ComponentDef}
 */

/**
 * Map an `align` value to the text anchor + the x within `box` to anchor at.
 * @param {string} align @param {{x:number,w:number}} box
 * @returns {{ anchor: 'start'|'middle'|'end', x: number }}
 */
function placement(align, box) {
  if (align === 'center') return { anchor: 'middle', x: box.x + box.w / 2 };
  if (align === 'right') return { anchor: 'end', x: box.x + box.w - PAD_X };
  return { anchor: 'start', x: box.x + PAD_X }; // left (default)
}

export default {
  name: 'TableCell',
  tier: 'v1.0',
  category: 'content',
  text: true,
  props: {
    align: { type: 'enum', values: ['left', 'center', 'right'], default: 'left' },
    filler: { type: 'enum', values: FILLER_STYLES },
  },
  keyless: [{ kind: 'literal', to: 'label' }],
  notes: 'Leaf with flex:true so equal-flex cells split the row width (columns align '
    + 'for equal-count rows). DEVIATION: slice says children:true, but implemented as a '
    + 'text leaf so align moves the label it draws; nested children are dropped.',

  flex: true,
  block: false,
  intrinsic: (node) => textIntrinsic(node, { padX: PAD_X, padY: PAD_Y, fallback: 'Cell' }),
  render: (node, box) => {
    const fs = fontSizeOf(node);
    const { anchor, x } = placement(node.props.align ?? 'left', box);
    return text(x, box.y + box.h / 2 + fs * 0.35, textOf(node, 'Cell'),
      { fontSize: fs, anchor, fill: COLORS.ink, maxW: box.w - 2 * PAD_X });
  },
};
