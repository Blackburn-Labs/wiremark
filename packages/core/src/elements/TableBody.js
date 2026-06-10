// @ts-check
/**
 * TableBody -- the body row-group of a Table (SPEC: MUI Table family).
 *
 * Reference strategy (invisible grouping): TableBody is a transparent `col`
 * container that stacks its TableRows flush against one another -- it draws
 * nothing of its own, exactly like MUI's `<tbody>`. The surrounding Table draws
 * the outer border; each TableRow draws its own divider rule. So TableBody uses
 * `pad: 0, gap: 0` (rows abut, head/body/footer abut) and supplies no `render`,
 * keeping it free the way Stack/Box are when their chrome is off.
 *
 * Per FAMILIES.md (FAMILY 1 -- Table), the column-alignment limitation lives on
 * Table; TableBody only groups rows.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'TableBody',
  tier: 'v1.0',
  category: 'content',
  container: true,
  props: {},
  notes: 'Invisible row-group; stacks TableRows flush (pad:0 gap:0). Draws nothing -- Table supplies the border, TableRow its divider.',

  layoutSpec: () => ({ axis: 'col', pad: 0, gap: 0 }),
};
