// @ts-check
import { rcrossbox } from '../draw.js';
import { parseRatio } from '../metrics.js';

/**
 * Img -- placeholder image box. `ratio=` (e.g. 16:9) sets aspect; `alt=` is
 * descriptive text. (SPEC ss.5.4, ss.8.3)
 *
 * Strategy (leaf): the classic crossed-box image placeholder. An image is a
 * block leaf -- it fills its container's cross axis like a real <img> stretched
 * to its column width. When `ratio=` is given, `aspect()` returns a number and
 * the engine derives the main extent from that filled cross extent, so the box
 * keeps its proportions (e.g. 16:9 inside a CardMedia). A bare `Img` has no
 * ratio, so the engine falls back to `intrinsic` for its main extent (height in
 * a column); `minSize` keeps even an unconstrained one from collapsing.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Img',
  tier: 'v0.1',
  category: 'content',
  props: {
    ratio: { type: 'ratio' },
    alt: { type: 'string' },
  },
  notes: 'Placeholder box; ratio like 16:9.',

  block: true,
  aspect: (node) => parseRatio(/** @type {string} */ (node.props.ratio)),
  minSize: { w: 80, h: 60 },
  intrinsic: () => ({ w: 160, h: 120 }),
  render: (node, box) => rcrossbox(box.x, box.y, box.w, box.h),
};
