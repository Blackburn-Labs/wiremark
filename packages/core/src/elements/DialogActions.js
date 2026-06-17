// @ts-check
import { SPACING } from '../metrics.js';

/**
 * DialogActions -- the action button row of a Dialog. The dialog counterpart of
 * CardActions (SPEC: MUI Feedback surface, v1.0).
 *
 * Reference strategy (transparent region): lays its children -- typically a
 * couple of Buttons -- in a padded row and draws nothing of its own; the Dialog
 * supplies the paper sheet beneath. Unlike CardActions, MUI's DialogActions
 * RIGHT-aligns its buttons against the sheet's trailing edge, so the row uses
 * `mainAlign: 'end'` (the engine packs the buttons to the right; if the author
 * gives a child flex/`*`, flex wins and the alignment is moot).
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'DialogActions',
  tier: 'v1.0',
  category: 'feedback',
  container: true,
  props: {},
  notes: 'Action button row of a dialog; right-aligned padded row (MUI DialogActions). The Dialog draws the sheet.',

  layoutSpec: () => ({ axis: 'row', pad: SPACING, gap: SPACING, mainAlign: 'end' }),
};
