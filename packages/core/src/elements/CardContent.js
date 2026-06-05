// @ts-check
import { SPACING } from '../metrics.js';

/**
 * CardContent -- the body region of a Card. (SPEC ss.5.3)
 *
 * Reference strategy (transparent region): stacks its children in a padded
 * column and draws nothing of its own -- the surrounding Card supplies the
 * paper. The generous padding (2 spacing units) sets the body off from the card
 * edge the way MUI's CardContent does.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'CardContent',
  tier: 'v1.0',
  category: 'surfaces',
  container: true,
  props: {},
  notes: 'Body region of a card.',

  layoutSpec: () => ({ axis: 'col', pad: SPACING * 2, gap: SPACING }),
};
