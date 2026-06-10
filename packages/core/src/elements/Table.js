// @ts-check
import { surface } from '../draw.js';

/**
 * Table -- the outer chrome of the Table family (SPEC ss.5; FAMILIES.md FAMILY 1).
 *
 * Strategy (border-bearing column container): Table is the only family member
 * that draws -- a `surface` border around the whole table. It stacks its
 * groupings (TableHead / TableBody / TableFooter) or bare TableRows in a flush
 * column with `pad: 0` / `gap: 0` so the groups abut and the rows run edge to
 * edge inside the border. The groupings are invisible; the per-row divider rule
 * is drawn by TableRow, so Table itself only contributes the outline.
 *
 * `size` (small|medium, keyless enum) is a MUI density knob. In MUI it tightens
 * EVERY cell's row height, but a cell cannot read its Table's prop through the
 * flexbox-lite engine (no parent context in a child's strategy -- FAMILIES.md
 * engine fact 1), and two sibling rows can't share a row height set here either.
 * Per the architect's ruling it is therefore PARSE-ONLY: it resolves and is
 * keyless, but carries no visual effect -- the border is drawn the same for both
 * values. Documented honestly in `notes` rather than faked.
 *
 * Columns align only when every row has the same cell count: each TableCell is
 * equal-flex, so equal-count rows split their width identically and line up;
 * ragged rows do not. This is the accepted limitation (FAMILIES.md FAMILY 1).
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Table',
  tier: 'v1.0',
  category: 'content',
  container: true,
  props: {
    size: { type: 'enum', values: ['small', 'medium'], default: 'medium' },
  },
  keyless: [
    { kind: 'enum', to: 'size' },
  ],
  notes:
    'Outer table border; stacks TableHead/Body/Footer or bare TableRows flush. '
    + 'size is parse-only (a child cannot read a parent prop through the engine, '
    + 'so density is not propagated). Columns align only for equal cell counts; '
    + 'ragged rows do not (equal-flex cells, no cross-row width sharing).',

  layoutSpec: () => ({ axis: 'col', pad: 0, gap: 0 }),
  // An empty Table still draws as a visible bordered region rather than collapsing.
  minSize: { w: 160, h: 40 },
  render: (_node, box) => surface(box),
};
