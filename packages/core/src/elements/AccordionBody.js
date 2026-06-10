// @ts-check
import { surface } from '../draw.js';
import { SPACING } from '../metrics.js';

/**
 * AccordionBody -- the expanded panel beneath an AccordionHeader. (SPEC: Surfaces)
 *
 * Family note: there is NO `Accordion` parent element. AccordionHeader and
 * AccordionBody are independent SIBLINGS an author stacks one after another
 * (see FAMILIES.md). The two read as a single visual unit because both span the
 * full frame width (containers stretch on their cross axis by default) and the
 * body's bordered panel butts directly against the bar above it.
 *
 * Reference strategy (surface container): a bordered paper panel that stacks its
 * arbitrary children in a padded column. The padding (one spacing unit) and gap
 * set the content off from the panel edge the way MUI's AccordionDetails does.
 * `minSize` keeps an empty body from collapsing, so a bare `AccordionBody` still
 * draws as a visible panel.
 *
 * The body is drawn whether or not the preceding header is `expanded`: siblings
 * cannot read each other through the engine (a child strategy sees only its own
 * node/box), so there is no cross-element collapse link. Authors who want a
 * collapsed look simply omit the body.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'AccordionBody',
  tier: 'v1.0',
  category: 'surfaces',
  container: true,
  props: {},
  notes: 'No Accordion parent: AccordionHeader/AccordionBody are siblings. Always rendered '
    + '(no cross-element link to the header\'s expanded state); omit the body for a collapsed look.',

  layoutSpec: () => ({ axis: 'col', pad: SPACING, gap: SPACING }),
  minSize: { w: 160, h: 40 },
  render: (_node, box) => surface(box),
};
