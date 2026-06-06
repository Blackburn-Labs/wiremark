// @ts-check
import { SPACING } from '../metrics.js';
import { text, COLORS } from '../draw.js';

/** Height reserved for the subheader band above the items (px). */
const SUBHEADER_H = 28;
/** Font size of the subheader heading row. */
const SUBHEADER_FS = 13;
/**
 * Negative gap a `dense` list applies between rows: each ListItem is a fixed-height
 * row leaf this container can't reshape, so density is best-effort -- a small
 * negative gap pulls successive rows together (the engine sums gap into the list's
 * height and advances the row cursor by it), compressing the column without
 * touching ListItem. Capped well above row overlap.
 */
const DENSE_GAP = -SPACING;

/**
 * List -- vertical list container; holds ListItems. (SPEC ss.5.4)
 *
 * Strategy (mostly-invisible container): stacks its ListItems in a flush column.
 * By default it draws nothing of its own -- each ListItem renders its own row --
 * and padding/gap are zero so rows abut, the conventional list look; spacing
 * between lists comes from the surrounding container, not from here.
 *
 * Two spec props add chrome/affordances: `dense` (keyed boolean, also settable as
 * a bare `dense` flag) tightens the rows via a negative inter-row gap; `subheader`
 * (keyed string) draws a small heading above the items. A subheader reserves a top
 * band by padding the container (the engine's `pad` is symmetric, so the inset
 * applies all round -- a minor cosmetic cost for wireframe fidelity); the heading
 * text is then drawn in that band in `render`, which can read the laid-out `box`
 * (CONVENTION s.0).
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'List',
  tier: 'v0.1',
  category: 'content',
  container: true,
  props: {
    // Spec marks both keyed (keyless:false). `dense` is still settable as a bare
    // flag -- declaring a boolean prop makes a bare `dense` token resolve to true
    // (CONVENTION s.3) -- while `dense=true` works too.
    dense: { type: 'boolean', default: false },
    subheader: { type: 'string' },
  },
  notes: 'Flush column of ListItems. dense -> tighter rows; subheader -> heading band above items.',

  layoutSpec: (node) => ({
    axis: 'col',
    // A subheader reserves a top band (symmetric pad; see header comment).
    pad: typeof node.props.subheader === 'string' ? SUBHEADER_H : 0,
    gap: node.props.dense === true ? DENSE_GAP : 0,
  }),

  render: (node, box) => {
    const sub = node.props.subheader;
    if (typeof sub !== 'string') return ''; // no chrome unless a subheader is set
    // Sit the heading in the reserved top band, left-aligned with the inset items
    // and vertically centered in the band. Muted, small -- a section label, not a
    // row. Items begin below it (the band is `pad`, so `children[0]` clears it).
    const x = box.x + SUBHEADER_H;
    const y = box.y + SUBHEADER_H / 2 + SUBHEADER_FS * 0.35;
    return text(x, y, sub, { fontSize: SUBHEADER_FS, weight: 600, fill: COLORS.muted });
  },
};
