// @ts-check
/**
 * Box -- generic sized container. Sizing tokens `w h` are order-significant
 * (ss.4) and resolved by the engine; fills naturally when none are given. (SPEC ss.5.2)
 *
 * Reference strategy (sized container): stacks children in a column and draws
 * nothing -- an invisible region whose only job is to carry a size and group
 * content (like MUI's Box). Its `w h` tokens are interpreted by the parent's
 * distribution, so there is no per-element sizing code here.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Box',
  tier: 'v0.1',
  category: 'layout',
  container: true,
  sizing: true,
  props: {},
  notes: 'Generic sized container; sizing is order-significant (ss.4).',

  layoutSpec: () => ({ axis: 'col', gap: 0, pad: 0 }),
};
