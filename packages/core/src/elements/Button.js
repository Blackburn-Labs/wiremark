// @ts-check
import { surface, centeredLabel, COLORS } from '../draw.js';
import { textIntrinsic, textOf } from '../metrics.js';

/**
 * Button -- keyless text (-> label) and variant enum; `primary` is a boolean
 * flag; `to=#id` makes it navigate. Filler default label "Button". (SPEC ss.5.4)
 *
 * Reference strategy (inline leaf): not `block`, so it sizes to its label rather
 * than stretching the container's cross axis; intrinsic is the label plus button
 * padding. Draws a filled surface when `primary`, an outlined one otherwise, with
 * a centered label (bolder when primary). `to=` and children are the facade's job.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Button',
  tier: 'v0.1',
  category: 'content',
  props: {
    label: { type: 'string' },
    variant: { type: 'enum', values: ['text', 'outlined', 'contained'] },
    primary: { type: 'boolean' },
  },
  keyless: [{ kind: 'literal', to: 'label' }, { kind: 'enum', to: 'variant' }],
  notes: 'Filler default label "Button".',

  block: false,
  intrinsic: (node) => textIntrinsic(node, { padX: 16, padY: 9, fallback: 'Button' }),
  render: (node, box) =>
    surface(box, { fill: node.props.primary ? COLORS.accent : 'none' })
    + centeredLabel(box, textOf(node, 'Button'), { weight: node.props.primary ? 700 : 600 }),
};
