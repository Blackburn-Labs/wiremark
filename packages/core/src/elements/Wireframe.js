// @ts-check
import { FLEX_DIRECTIONS, FILLER_STYLES, PRESETS } from './common.js';
import { rrect, COLORS } from '../draw.js';
import { SPACING } from '../metrics.js';

/**
 * Wireframe -- the frame root. Carries frame-level metadata: #id, a size preset
 * or explicit w/h, background composition, visibility, and the global filler
 * style. `style=`/`sx=` are out of scope. (SPEC ss.5.1)
 *
 * Reference strategy (container): lays its children like a `Stack` -- the child
 * axis comes from `direction` (`row`/`column`, default `column`), the inter-child
 * gap from `spacing=`/`gap=`, and the edge inset from `padding=`/`pad=`, all in MUI
 * spacing units. Both spacing and padding default to 0, so a bare frame draws its
 * children flush to the border; it draws the frame border itself (no outline/
 * elevation). The frame's pixel size and `background=` composition are handled one
 * level up, by the layout engine (frame sizing) and the render facade (composition).
 *
 * The document-wide flow-chart orientation lives in the top-level `Flow LR`/`Flow TD`
 * directive (ss.7.4), NOT a frame prop -- a single diagram has a single orientation.
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
    // Stack-style child layout: axis + gap. The edge inset comes from the
    // universal `padding=`/`pad=` prop (registry.js), now defaulting to 0 -- never
    // redeclare it here (CONVENTION s.7). (CONVENTION ss.4.2)
    direction: { type: 'enum', values: FLEX_DIRECTIONS, default: 'column' },
    spacing: { type: 'number', default: 0, aliases: ['gap'] },
  },
  // `direction` doubles as a keyless enum so `Wireframe row` reads like `Stack row`;
  // its domain is disjoint from the `preset` names, so the two never collide (ss.3).
  keyless: [{ kind: 'id', to: 'id' }, { kind: 'preset', to: 'preset' }, { kind: 'enum', to: 'direction' }],
  notes: 'Frame root. Stack-like child layout (direction/spacing/padding). style=/sx= out of scope (ss.10).',

  // pad defaults to 0 (flush); the universal `padding=` prop overrides it in specFor.
  layoutSpec: (node) => {
    const dir = node.props.direction ?? 'column';
    return {
      axis: dir === 'row' || dir === 'row-reverse' ? 'row' : 'col',
      reverse: dir === 'row-reverse' || dir === 'column-reverse',
      gap: (typeof node.props.spacing === 'number' ? node.props.spacing : 0) * SPACING,
      pad: 0,
    };
  },
  render: (node, box) =>
    rrect(box.x + 1, box.y + 1, box.w - 2, box.h - 2, { stroke: COLORS.ink, strokeWidth: 1.4 }),
};
