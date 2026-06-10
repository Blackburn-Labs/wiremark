// @ts-check
import { surface } from '../draw.js';

/**
 * ToggleButtonGroup -- a segmented-control container that holds ToggleButtons
 * abutting one another, wrapped in a single unifying border (SPEC: Inputs).
 *
 * Strategy (container): the spec slice marks this `children:false`, but a group
 * with no buttons is meaningless and MUI's ToggleButtonGroup is precisely a row
 * (or column) of ToggleButtons -- so per FAMILIES.md Family 5 this is OVERRIDDEN
 * to a CONTAINER (it defines a `layoutSpec` and declares `container: true`). The
 * deviation is recorded in `notes`.
 *
 * `orientation` (keyless enum, default `horizontal`) drives the axis exactly like
 * Tabs/Stepper: `vertical` -> `col`, otherwise `row`. This is the clean case of a
 * parent prop legitimately shaping its own `layoutSpec`. `pad: 0`, `gap: 0` so the
 * buttons sit flush, reading as one segmented control under the surrounding border.
 *
 * `size` (keyless enum small|medium|large, default `medium`) is a GROUP-level prop
 * in MUI that restyles its children. The engine gives a child only its own node and
 * box (no parent context), so the group cannot resize its buttons -- per FAMILIES.md
 * `size` here is best-effort/parse-only: it parses and lands on `node.props.size`,
 * but density is set per-button via ToggleButton's OWN keyless `size`. Noted below.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'ToggleButtonGroup',
  tier: 'v1.0',
  category: 'inputs',
  container: true,
  props: {
    orientation: { type: 'enum', values: ['horizontal', 'vertical'], default: 'horizontal' },
    size: { type: 'enum', values: ['small', 'medium', 'large'], default: 'medium' },
  },
  // orientation {horizontal,vertical} and size {small,medium,large} are disjoint
  // enum domains (CONVENTION s.2.1), so the two keyless tokens never collide.
  keyless: [
    { kind: 'enum', to: 'orientation' },
    { kind: 'enum', to: 'size' },
  ],
  notes: 'Container override (slice says children:false): holds ToggleButtons. orientation drives axis; size is parse-only/best-effort (the engine gives children no parent context, so the group can\'t resize its buttons -- density is set per-button via ToggleButton\'s own size).',

  layoutSpec: (node) => ({
    axis: node.props.orientation === 'vertical' ? 'col' : 'row',
    pad: 0,
    gap: 0,
  }),
  // A single border around the whole strip ties the abutting buttons into one
  // segmented control; the buttons draw their own chrome inside (facade insets
  // nothing since pad is 0, so the border hugs the button row).
  render: (_node, box) => surface(box),
};
