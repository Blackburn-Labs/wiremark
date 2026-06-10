// @ts-check
import { SPACING } from '../metrics.js';
import { rline, COLORS } from '../draw.js';

/**
 * Tabs -- a strip of Tab labels with a baseline indicator rule. (SPEC ss.5; MUI
 * Tabs). Container whose children are Tabs.
 *
 * Strategy (container with chrome): `orientation` (keyless enum
 * horizontal|vertical) is the one parent prop the engine can honour directly --
 * it drives the layout axis (`vertical` -> a `col` of stacked tabs, else a `row`
 * strip). The classic MUI indicator baseline is drawn as the strip's own chrome:
 * a faint rule along the strip's far edge (the bottom for a horizontal strip, the
 * right for a vertical one), sitting just past the vertically/horizontally
 * centered Tab labels so it never strikes through them. `pad:0` so tabs abut the
 * edges; `gap: SPACING` spaces them.
 *
 * `variant` (standard|scrollable|fullWidth, keyless) parses but is best-effort at
 * wireframe fidelity (engine fact 1: a parent can't restyle a child, and there is
 * no horizontal scroll in a static SVG):
 *  - `fullWidth` would give every tab an equal share of the strip width, but the
 *    parent can't flip a child's `flex`; Tab sizes to its label regardless. Noted.
 *  - `scrollable` has no scroll affordance in a static wireframe. Noted.
 *  - `standard` is the default look.
 *
 * @type {import('./common.js').ComponentDef}
 */
export default {
  name: 'Tabs',
  tier: 'v1.0',
  category: 'navigation',
  container: true,
  props: {
    orientation: { type: 'enum', values: ['horizontal', 'vertical'], default: 'horizontal' },
    variant: { type: 'enum', values: ['standard', 'scrollable', 'fullWidth'], default: 'standard' },
  },
  keyless: [
    { kind: 'enum', to: 'orientation' },
    { kind: 'enum', to: 'variant' },
  ],
  notes: 'orientation drives the axis (vertical -> col, else row). variant is best-effort: fullWidth/scrollable parse only (a parent cannot reflex children, no scroll in a static SVG).',

  // Defaults aren't injected (CONVENTION s.6) -- read orientation defensively and
  // treat anything but the explicit `vertical` token as the horizontal default.
  layoutSpec: (node) => ({
    axis: node.props.orientation === 'vertical' ? 'col' : 'row',
    pad: 0,
    gap: SPACING,
  }),

  render: (node, box) => {
    // The indicator baseline: a faint rule along the strip's far edge. Tabs are
    // block:false leaves centered on the cross axis, so a rule on the edge clears
    // the labels (same trick as ListItem's bottom divider). Vertical strips put
    // the baseline on the right edge; horizontal ones along the bottom.
    if (node.props.orientation === 'vertical') {
      return rline(box.x + box.w, box.y, box.x + box.w, box.y + box.h,
        { stroke: COLORS.muted, strokeWidth: 1 });
    }
    return rline(box.x, box.y + box.h, box.x + box.w, box.y + box.h,
      { stroke: COLORS.muted, strokeWidth: 1 });
  },
};
