// @ts-check
import { rcrossbox, centeredLabel } from '../draw.js';
import { parseRatio } from '../metrics.js';

const FALLBACK = { w: 160, h: 120 };
const FLOOR = { w: 80, h: 60 };

/** Caption type size (px) for an `alt` drawn over a sourceless box -- matches
 *  Placeholder's label so the two read identically. */
const LABEL_FONT = 14;
/** Inset (px) kept on each side so the caption ellipsizes before it reaches the
 *  crossed-box outline instead of riding the border. */
const TEXT_INSET = 8;

/**
 * Img -- placeholder image box. It carries the same sizing vocabulary as a box
 * (pixel / percent / flex `w h` tokens via `sizing: true`); `ratio=` (e.g. 16:9)
 * sets aspect; `alt=` is descriptive text; `src=` is the real source. (SPEC
 * ss.5.4, ss.8.3)
 *
 * A wireframe always draws the crossed-box placeholder regardless of source.
 * `src` (the real picture) is otherwise metadata, BUT when no `src` is given an
 * `alt` doubles as a caption: it is drawn centered over the box (like
 * Placeholder's label) so the box says what image belongs there.
 *
 * Strategy (leaf): the classic crossed-box image placeholder. An image is a
 * block leaf -- absent an explicit cross-axis size it fills its container's
 * cross axis like a real <img> stretched to its column width.
 *
 * Sizing precedence (matches the box sizing model, with `ratio` layered on):
 *  - BOTH `w` and `h` given -> the two tokens win and `ratio` is IGNORED
 *    (`aspect` returns undefined, so the engine treats it as a plain sized leaf).
 *  - exactly ONE explicit `px`/`%` dimension + `ratio` -> that dimension drives
 *    layout and `aspect` derives the other from it (e.g. `Img 200px ratio=16:9`),
 *    regardless of whether it lands on the parent's main or cross axis (the
 *    main-axis case is handled by `crossExtent`'s aspect branch in layout.js).
 *    A `flex`/`*` dimension is NOT "one explicit dim" -- it means "fill" -- so
 *    `Img * ratio=16:9` block-fills rather than deriving (layout.js can't resolve
 *    a flex main extent at cross-measure time; this fill is intended, not a gap).
 *  - `ratio` alone -> the cross axis fills (block) and `aspect` derives the main
 *    extent from it, so the box keeps its proportions (e.g. 16:9 in a column).
 *  - nothing -> `intrinsic`; `minSize` keeps an unconstrained one from collapsing.
 *
 * `minSize` is a predicate so it floors only a dimension that nothing else
 * determines: an explicit token or a ratio-derived value is left untouched, so a
 * deliberately small `Img 20px ratio=16:9` is not inflated back to the floor.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Img',
  tier: 'v0.1',
  category: 'content',
  sizing: true,
  props: {
    // width/height (+ w/h aliases) are realized by `sizing: true` (CONVENTION ss.4).
    ratio: { type: 'ratio' },
    alt: { type: 'string' },
    src: { type: 'string' },
  },
  notes: 'Placeholder box; box-style w/h sizing, plus ratio like 16:9 when only one dimension is given. With no src, an alt is drawn as a centered caption over the box.',

  block: true,
  // `ratio` only governs when at most one dimension is pinned: with both given the
  // explicit sizes win, so report no aspect and let the sizing path size the box.
  aspect: (node) =>
    node.size?.w != null && node.size?.h != null
      ? undefined
      : parseRatio(/** @type {string} */ (node.props.ratio)),
  minSize: (node) => {
    const sz = node.size;
    const hasW = sz?.w != null;
    const hasH = sz?.h != null;
    // Sizing tokens are positional and width-first (resolve.js: w = sizes[0]),
    // so height is never pinned without width -- `ratio` therefore only ever
    // derives the HEIGHT from an explicit width, never the reverse. When it does,
    // that derived height is "determined" and must not be floored either.
    const ratio = parseRatio(/** @type {string} */ (node.props.ratio));
    const derivesH = ratio != null && hasW && !hasH;
    return {
      w: hasW ? 0 : FLOOR.w,
      h: hasH || derivesH ? 0 : FLOOR.h,
    };
  },
  intrinsic: () => ({ ...FALLBACK }),
  render: (node, box) => {
    let out = rcrossbox(box.x, box.y, box.w, box.h);
    // With no real source, `alt` doubles as a caption: draw it centered over the
    // crossed box (like Placeholder's label) so the box says what image belongs
    // there. A real `src` IS the picture, so alt stays metadata.
    const alt = typeof node.props.alt === 'string' ? node.props.alt : '';
    if (alt && !node.props.src) {
      out += centeredLabel(box, alt,
        { fontSize: LABEL_FONT, maxW: Math.max(0, box.w - 2 * TEXT_INSET) });
    }
    return out;
  },
};
