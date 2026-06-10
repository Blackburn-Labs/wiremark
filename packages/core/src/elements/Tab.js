// @ts-check
import { centeredLabel } from '../draw.js';
import { textIntrinsic, textOf } from '../metrics.js';

/**
 * Tab -- one labeled tab within a `Tabs` strip. Keyless text is the label;
 * filler default "Tab". (SPEC: Navigation; FAMILIES.md Family 2.)
 *
 * Strategy (inline leaf): `block:false`, so a tab sizes to its label rather than
 * stretching the `Tabs` cross axis -- horizontal tabs sit side by side at their
 * own widths, vertical tabs stack at their own heights. `intrinsic` is the label
 * plus a comfortable tab padding (the MUI tab is roomier than a Chip/Button), so
 * the strip reads as a row of touch targets.
 *
 * No `selected` indicator: the spec slice has no `selected` prop, so a Tab draws
 * a plain centered label and never an underline (per FAMILIES.md -- do not invent
 * one). The strip's baseline rule is `Tabs`' chrome, not the Tab's. `to=#id` and
 * children are the facade's job (universal `to`, CONVENTION s.7).
 *
 * @type {import('./common.js').ComponentDef}
 */

/** Tab label padding + font (px); roomier than a Chip, MUI tab scale. */
const PAD_X = 16;
const PAD_Y = 12;
const FONT_SIZE = 14;

export default {
  name: 'Tab',
  tier: 'v1.0',
  category: 'navigation',
  text: true,
  props: {
    label: { type: 'string' },
    // href/to are the universal nav prop (CONVENTION s.7) -- not redeclared here.
  },
  keyless: [
    { kind: 'literal', to: 'label' },
  ],
  notes: 'Filler default "Tab". No selected indicator -- spec has no selected prop; the baseline rule belongs to Tabs.',

  block: false,
  intrinsic: (node) =>
    textIntrinsic(node, { padX: PAD_X, padY: PAD_Y, fallback: 'Tab', fontSize: FONT_SIZE }),
  render: (node, box) =>
    centeredLabel(box, textOf(node, 'Tab'), { fontSize: FONT_SIZE, weight: 600 }),
};
