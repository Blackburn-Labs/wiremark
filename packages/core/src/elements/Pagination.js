// @ts-check
import { surface, backgroundHatch, centeredLabel, rline, COLORS } from '../draw.js';
import { SPACING } from '../metrics.js';

/**
 * Pagination -- a row of page-number cells flanked by prev/next chevrons (SPEC
 * ss.5.x Navigation). A leaf that draws its OWN chrome: `count` square cells
 * numbered 1..count, with the `page` cell tinted as the current page, plus a
 * `<` cell on the left and a `>` cell on the right.
 *
 * Strategy (inline leaf): not `block`, so the control sizes to its cells rather
 * than stretching the container's cross axis. Both props are numeric and KEYED
 * only (spec `keyless: false`): `count=` grows the intrinsic width (one cell per
 * page), `page=` selects which cell is highlighted. Out-of-range `page` simply
 * highlights nothing -- a soft, graceful degrade, never a throw.
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Side length of each square cell (px) and the gap between cells. */
const CELL = 28;
const GAP = SPACING / 2; // 4px -- snug, MUI-ish pagination spacing

/** Clamp a numeric prop to a positive integer, falling back to `fallback`. */
const intOf = (v, fallback) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(1, Math.floor(v)) : fallback;

/** @param {import('./common.js').ResolvedNode} node -> visible page-cell count. */
const countOf = (node) => intOf(node.props.count, 1);

export default {
  name: 'Pagination',
  tier: 'v1.0',
  category: 'navigation',
  props: {
    count: { type: 'number', default: 1 },
    page: { type: 'number', default: 1 },
  },
  notes: 'count page cells flanked by prev/next chevrons; page cell is tinted current.',

  block: false,
  intrinsic: (node) => {
    // count numbered cells + 2 chevron cells, each CELL wide, separated by GAP.
    const cells = countOf(node) + 2;
    return { w: cells * CELL + (cells - 1) * GAP, h: CELL };
  },
  render: (node, box) => {
    const count = countOf(node);
    const page = intOf(node.props.page, 1);
    const cells = count + 2;
    // Lay the cells out left-to-right within the box, honoring whatever width the
    // engine handed us (so an explicitly-stretched box keeps even cells).
    const cellW = (box.w - (cells - 1) * GAP) / cells;
    const cellBox = (i) => ({
      x: box.x + i * (cellW + GAP),
      y: box.y,
      w: cellW,
      h: box.h,
    });
    const chevron = (cbox, dir) => {
      // A simple sketch `<` / `>`: two strokes meeting at the cell's near edge.
      const midY = cbox.y + cbox.h / 2;
      const x1 = cbox.x + cbox.w * (dir < 0 ? 0.62 : 0.38);
      const x2 = cbox.x + cbox.w * (dir < 0 ? 0.38 : 0.62);
      const top = cbox.y + cbox.h * 0.32;
      const bot = cbox.y + cbox.h * 0.68;
      return rline(x1, top, x2, midY) + rline(x2, midY, x1, bot);
    };

    let out = '';
    // Left chevron (previous).
    const prev = cellBox(0);
    out += surface(prev) + chevron(prev, -1);
    // Numbered page cells.
    for (let i = 1; i <= count; i++) {
      const cbox = cellBox(i);
      const current = i === page;
      // The current page gets a hatch tint under its border so it reads selected;
      // others are plain bordered cells.
      if (current) out += backgroundHatch(cbox, 'hatch', false, { fill: COLORS.accent });
      out += surface(cbox) + centeredLabel(cbox, String(i), { fontSize: 13, weight: current ? 700 : 400 });
    }
    // Right chevron (next).
    const next = cellBox(cells - 1);
    out += surface(next) + chevron(next, 1);
    return out;
  },
};
