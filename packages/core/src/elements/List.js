// @ts-check
/**
 * List -- vertical list container; holds ListItems. (SPEC ss.5.4)
 *
 * Strategy (invisible container): stacks its ListItems in a flush column and
 * draws nothing of its own -- each ListItem renders its own row. Padding and
 * gap are zero so list rows abut, the conventional list look; spacing between
 * lists comes from the surrounding container, not from here.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'List',
  tier: 'v0.1',
  category: 'content',
  container: true,
  props: {},

  layoutSpec: () => ({ axis: 'col', pad: 0, gap: 0 }),
};
