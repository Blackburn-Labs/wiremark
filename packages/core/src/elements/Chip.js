// @ts-check
import { FILLER_STYLES } from './common.js';
import { surface, centeredLabel } from '../draw.js';
import { textIntrinsic, textOf } from '../metrics.js';

/**
 * Chip -- compact label token. Keyless text is the label; filler default "Chip".
 * (SPEC ss.5.4)
 *
 * Strategy (inline leaf): not `block`, so the pill sizes to its label rather than
 * stretching the container's cross axis; intrinsic is the label plus a snug pill
 * padding. Draws an outlined surface with a centered, slightly-small label.
 * `to=` and children are the facade's job.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Chip',
  tier: 'v0.1',
  category: 'content',
  text: true,
  props: {
    label: { type: 'string' },
    filler: { type: 'enum', values: FILLER_STYLES },
  },
  keyless: [{ kind: 'literal', to: 'label' }],
  notes: 'Filler default "Chip".',

  block: false,
  intrinsic: (node) => textIntrinsic(node, { padX: 12, padY: 5, fallback: 'Chip' }),
  render: (node, box) =>
    surface(box) + centeredLabel(box, textOf(node, 'Chip'), { fontSize: 13 }),
};
