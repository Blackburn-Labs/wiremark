// @ts-check
/**
 * Container -- centered max-width wrapper. `max=` picks a breakpoint width.
 * (SPEC ss.5.2)
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Container',
  tier: 'v1.0',
  category: 'layout',
  container: true,
  props: {
    max: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'] },
  },
  notes: 'Centered max-width wrapper.',
};
