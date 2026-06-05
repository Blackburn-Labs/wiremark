// @ts-check
import { SPACING } from '../metrics.js';

/**
 * CardActions -- the action button row of a Card. (SPEC ss.5.3)
 *
 * Reference strategy (transparent region): lays its children -- typically a
 * couple of Buttons -- in a padded row and draws nothing of its own; the Card
 * supplies the paper beneath. A single spacing unit of padding and gap keeps the
 * actions tight against the card's lower edge, as MUI's CardActions does.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'CardActions',
  tier: 'v1.0',
  category: 'surfaces',
  container: true,
  props: {},
  notes: 'Action button row of a card.',

  layoutSpec: () => ({ axis: 'row', pad: SPACING, gap: SPACING }),
};
