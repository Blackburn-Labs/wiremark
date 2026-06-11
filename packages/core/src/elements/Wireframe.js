// @ts-check
import { DIRECTIONS, FILLER_STYLES, PRESETS } from './common.js';
import { rrect, COLORS } from '../draw.js';
import { FRAME_PAD, SPACING } from '../metrics.js';

/**
 * Wireframe -- the frame root. Carries frame-level metadata: #id, a size preset
 * or explicit w/h, background composition, visibility, and the global filler
 * style. `style=`/`sx=` are out of scope. (SPEC ss.5.1)
 *
 * Reference strategy (container): lays its children in a column inside the frame
 * padding and draws the frame border. The frame's pixel size and `background=`
 * composition are handled one level up, by the layout engine (frame sizing) and
 * the render facade (composition).
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Wireframe',
  tier: 'v0.1',
  category: 'root',
  container: true,
  props: {
    id: { type: 'id' },
    preset: { type: 'enum', values: PRESETS },
    w: { type: 'number' },
    h: { type: 'number' },
    background: { type: 'ref' },
    // Compose this frame INTO a named region (`Anchor #id`) of its background
    // frame; alias `at=` (tasks/FOREGROUND.md; SPEC ss.5.1.2 proposed).
    anchor: { type: 'ref', aliases: ['at'] },
    visible: { type: 'boolean', default: true },
    filler: { type: 'enum', values: FILLER_STYLES },
    // Multi-frame flow-chart direction (ss.7.4). Keyed-only (`direction=LR`): no
    // keyless slot and no default, so the resolver leaves it undefined unless the
    // author sets it, letting index.js honor "the first frame that declares it".
    direction: { type: 'enum', values: DIRECTIONS },
  },
  keyless: [{ kind: 'id', to: 'id' }, { kind: 'preset', to: 'preset' }],
  notes: 'Frame root. style=/sx= are out of scope (ss.10).',

  layoutSpec: () => ({ axis: 'col', pad: FRAME_PAD, gap: SPACING }),
  render: (node, box) =>
    rrect(box.x + 1, box.y + 1, box.w - 2, box.h - 2, { stroke: COLORS.ink, strokeWidth: 1.4 }),
};
