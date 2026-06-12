// @ts-check
import { SPACING } from '../metrics.js';

/**
 * DialogContent -- the body region of a Dialog. The dialog counterpart of
 * CardContent (SPEC: MUI Feedback surface, v1.0).
 *
 * Reference strategy (transparent region): stacks its children in a padded
 * column and draws nothing of its own -- the enclosing Dialog supplies the paper
 * sheet. The generous padding (2 spacing units) sets the body off from the sheet
 * edge the way MUI's DialogContent does, matching its CardContent sibling.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'DialogContent',
  tier: 'v1.0',
  category: 'feedback',
  container: true,
  props: {},
  notes: 'Body region of a dialog; transparent padded column (the Dialog draws the sheet).',

  layoutSpec: () => ({ axis: 'col', pad: SPACING * 2, gap: SPACING }),
};
