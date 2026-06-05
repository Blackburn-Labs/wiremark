// @ts-check
/**
 * Spacer -- a flexible gap that pushes siblings apart. No props. (SPEC ss.5.2)
 *
 * Strategy (invisible flexible leaf): `flex` makes the engine give it the
 * leftover main-axis space of its Stack (so it pushes following siblings to the
 * far edge). It needs a Stack with free space on its main axis -- in a column
 * sized to its content there is no slack, so a Spacer there collapses.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Spacer',
  tier: 'v0.1',
  category: 'layout',
  props: {},
  notes: 'Flexible gap; no props. Needs a sized/stretched Stack to have effect.',

  flex: true,
  intrinsic: () => ({ w: 0, h: 0 }),
};
