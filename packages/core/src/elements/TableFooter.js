// @ts-check
/**
 * TableFooter -- the footer row group of a Table (FAMILIES.md FAMILY 1). (SPEC ss.5)
 *
 * Reference strategy (invisible grouping container): like TableHead/TableBody, a
 * TableFooter is a transparent `col` grouping that stacks its TableRows with no
 * padding or gap (`pad:0 gap:0`) so the rows abut and align with the head/body
 * above. It draws nothing of its own -- the enclosing Table supplies the outer
 * border, and each TableRow draws its own divider rule. The spec lists no
 * properties, so there is no schema beyond the universal `to=` injected by the
 * registry.
 *
 * Per the engine constraints (FAMILIES.md engine fact 2) columns align only when
 * every row has the same equal-flex cell count; the footer participates in that
 * same ragged-column model as the rest of the family.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'TableFooter',
  tier: 'v1.0',
  category: 'content',
  container: true,
  props: {},
  notes: 'Invisible row-group; stacks TableRows with pad:0 gap:0. Draws no chrome (Table supplies the border).',

  layoutSpec: () => ({ axis: 'col', pad: 0, gap: 0 }),
};
